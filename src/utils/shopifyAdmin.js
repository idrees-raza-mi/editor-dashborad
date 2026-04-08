const getBase = () =>
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin;

export async function callAdminProxy(action, data) {
  const res = await fetch(getBase() + '/api/shopify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
    },
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Proxy failed');
  return json;
}

export async function uploadImageToShopify(blob, filename) {
  // Step 1: Stage
  const staged = await callAdminProxy('stagedUpload', {
    filename,
    mimeType: blob.type,
    fileSize: blob.size,
  });

  // Step 2: Upload to S3
  const formData = new FormData();
  staged.parameters.forEach(({ name, value }) => formData.append(name, value));
  formData.append('file', blob, filename);
  const uploadRes = await fetch(staged.url, { method: 'POST', body: formData });
  if (!uploadRes.ok) throw new Error('S3 upload failed');

  // Step 3: Create file in Shopify
  const fileRecord = await callAdminProxy('createFile', {
    originalSource: staged.resourceUrl,
    contentType: 'IMAGE',
  });

  // Wait briefly for processing
  await new Promise(r => setTimeout(r, 1500));

  const cdnUrl = fileRecord.image?.url;
  if (!cdnUrl) throw new Error('No CDN URL returned');
  return { cdnUrl, fileId: fileRecord.id || null };
}
