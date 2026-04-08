/**
 * api/upload.js
 * Vercel serverless endpoint — complete staged upload pipeline.
 * Accepts: POST { filename, mimeType, imageBase64 }
 * Returns: { cdnUrl }
 *
 * Flow: stagedUploadsCreate → S3 POST → fileCreate → poll → cdnUrl
 */

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminSecret   = process.env.ADMIN_API_SECRET;
  const requestSecret = req.headers['x-admin-secret'];
  if (adminSecret && requestSecret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { filename, mimeType, imageBase64 } = req.body || {};
  if (!filename || !mimeType || !imageBase64) {
    return res.status(400).json({ error: 'filename, mimeType, imageBase64 are required' });
  }

  const STORE    = process.env.SHOPIFY_STORE_URL;
  const TOKEN    = process.env.SHOPIFY_ADMIN_TOKEN;
  const ENDPOINT = `${STORE}/admin/api/2024-01/graphql.json`;

  async function gql(query, variables) {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await r.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  }

  try {
    // Decode base64 to buffer
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileSize = imageBuffer.length;

    // Step 1: Get presigned S3 target from Shopify
    const stageData = await gql(
      `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { field message }
        }
      }`,
      {
        input: [{
          resource: 'FILE',
          filename,
          mimeType,
          fileSize: String(fileSize),
          httpMethod: 'POST',
        }],
      }
    );

    const errors = stageData.stagedUploadsCreate.userErrors;
    if (errors.length > 0) throw new Error(errors[0].message);

    const target = stageData.stagedUploadsCreate.stagedTargets[0];

    // Step 2: Upload to S3
    const formData = new FormData();
    target.parameters.forEach(({ name, value }) => formData.append(name, value));
    formData.append('file', new Blob([imageBuffer], { type: mimeType }), filename);

    const s3Res = await fetch(target.url, { method: 'POST', body: formData });
    if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);

    // Step 3: Register file in Shopify Files
    const fileData = await gql(
      `mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files { ... on MediaImage { id image { url } status } }
          userErrors { field message }
        }
      }`,
      { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE' }] }
    );

    const fileErrors = fileData.fileCreate.userErrors;
    if (fileErrors.length > 0) throw new Error(fileErrors[0].message);

    const file = fileData.fileCreate.files[0];

    // Step 4: Poll until Shopify has processed the image (max 10s)
    let cdnUrl = file?.image?.url || null;
    if (!cdnUrl) {
      const fileId = file?.id;
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollData = await gql(
          `query getFile($id: ID!) {
            node(id: $id) { ... on MediaImage { image { url } status } }
          }`,
          { id: fileId }
        );
        cdnUrl = pollData?.node?.image?.url || null;
        if (cdnUrl) break;
      }
    }

    if (!cdnUrl) throw new Error('Shopify did not return a CDN URL after polling');

    return res.json({ cdnUrl, fileId: file?.id || null });
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
