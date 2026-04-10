const getProxyUrl = () =>
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000/admin/api/shopify'
    : `${window.location.origin}/admin/api/shopify`;

export async function callAdminProxy(action, data) {
  const res = await fetch(getProxyUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
    },
    body: JSON.stringify({ action, data }),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server error (HTTP ${res.status}) — check Vercel function logs`);
  }

  if (!res.ok || json.error) throw new Error(json.error || 'Proxy failed');
  return json;
}

export async function uploadImageToShopify(blob, filename) {
  console.log('[UPLOAD] Starting upload, filename:', filename, 'size:', blob.size);
  
  // Step 1: Stage
  const staged = await callAdminProxy('stagedUpload', {
    filename,
    mimeType: blob.type,
    fileSize: blob.size,
  });
  console.log('[UPLOAD] Staged:', staged);

  // Step 2: Upload to S3
  const formData = new FormData();
  staged.parameters.forEach(({ name, value }) => formData.append(name, value));
  formData.append('file', blob, filename);
  const uploadRes = await fetch(staged.url, { method: 'POST', body: formData });
  console.log('[UPLOAD] S3 upload status:', uploadRes.status);
  if (!uploadRes.ok) throw new Error('S3 upload failed');

  // Step 3: Create file in Shopify
  const fileRecord = await callAdminProxy('createFile', {
    originalSource: staged.resourceUrl,
    contentType: 'IMAGE',
  });
  console.log('[UPLOAD] File record:', fileRecord);

  // Poll for URL — Shopify processes images asynchronously, small compressed files should be fast
  let cdnUrl = fileRecord?.image?.url;
  let fileId = fileRecord?.id;

  if (!cdnUrl && fileId) {
    console.log('[UPLOAD] URL not ready, polling (up to 20 attempts × 3s = 60s)...');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const refreshed = await callAdminProxy('getFile', { id: fileId });
      console.log(`[UPLOAD] Poll ${i + 1}/20 status=${refreshed?.status} url=${refreshed?.image?.url}`);
      cdnUrl = refreshed?.image?.url;
      if (cdnUrl) break;
      if (refreshed?.status === 'FAILED') {
        throw new Error('Shopify reported file processing failed');
      }
    }
  }

  console.log('[UPLOAD] CDN URL:', cdnUrl);
  if (!cdnUrl) throw new Error('No CDN URL returned after 60s — try again.');
  return { cdnUrl, fileId };
}
