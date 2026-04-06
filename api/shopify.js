export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate request using shared secret
  const adminSecret   = process.env.ADMIN_API_SECRET;
  const requestSecret = req.headers['x-admin-secret'];
  if (adminSecret && requestSecret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, data } = req.body;
  const STORE = process.env.SHOPIFY_STORE_URL;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const ENDPOINT = `${STORE}/admin/api/2024-01/graphql.json`;

  const shopifyRequest = async (query, variables) => {
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
  };

  try {
    switch (action) {
      case 'stagedUpload': {
        const query = `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
            userErrors { field message }
          }
        }`;
        const result = await shopifyRequest(query, {
          input: [
            {
              resource: 'FILE',
              filename: data.filename,
              mimeType: data.mimeType,
              fileSize: String(data.fileSize),
              httpMethod: 'POST',
            },
          ],
        });
        return res.json(result.stagedUploadsCreate.stagedTargets[0]);
      }

      case 'createFile': {
        const query = `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { id image { url } status } }
            userErrors { field message }
          }
        }`;
        const result = await shopifyRequest(query, {
          files: [{ originalSource: data.originalSource, contentType: 'IMAGE' }],
        });
        return res.json(result.fileCreate.files[0]);
      }

      case 'createMetaobject': {
        const query = `mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject { id handle }
            userErrors { field message }
          }
        }`;
        const fields = Object.entries(data.fields).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        const result = await shopifyRequest(query, {
          metaobject: { type: data.type, fields },
        });
        if (result.metaobjectCreate.userErrors.length > 0) {
          throw new Error(result.metaobjectCreate.userErrors[0].message);
        }
        return res.json(result.metaobjectCreate.metaobject);
      }

      case 'updateMetaobject': {
        const query = `mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
            metaobject { id handle }
            userErrors { field message }
          }
        }`;
        const fields = Object.entries(data.fields).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        const result = await shopifyRequest(query, {
          id: data.id,
          metaobject: { fields },
        });
        return res.json(result.metaobjectUpdate.metaobject);
      }

      case 'listMetaobjects': {
        const query = `
          query ListMetaobjects($type: String!, $first: Int!) {
            metaobjects(type: $type, first: $first) {
              nodes {
                id
                type
                fields { key value }
              }
            }
          }
        `;
        const result = await shopifyRequest(query, { type: data.type, first: data.first || 50 });
        return res.json(result.metaobjects);
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('Shopify admin proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
