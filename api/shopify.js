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

  let action, data;
  try {
    ({ action, data } = req.body || {});
  } catch (parseErr) {
    return res.status(400).json({ error: 'Invalid request body: ' + parseErr.message });
  }

  const STORE = process.env.SHOPIFY_STORE_URL;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const ENDPOINT = `${STORE}/admin/api/2024-01/graphql.json`;

  if (!STORE || !TOKEN) {
    return res.status(500).json({ error: 'Missing SHOPIFY_STORE_URL or SHOPIFY_ADMIN_TOKEN env vars' });
  }

  const shopifyRequest = async (query, variables) => {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Shopify HTTP ${r.status}: ${text.slice(0, 300)}`);
    }
    const json = await r.json();
    if (json.errors) {
      const msg = Array.isArray(json.errors)
        ? (json.errors[0]?.message || JSON.stringify(json.errors[0]))
        : String(json.errors);
      throw new Error(msg);
    }
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
                fields {
                  key
                  value
                  reference {
                    ... on MediaImage {
                      id
                      image { url }
                    }
                  }
                }
              }
            }
          }
        `;
        const result = await shopifyRequest(query, { type: data.type, first: data.first || 50 });
        return res.json(result.metaobjects);
      }

      case 'ping': {
        // Diagnostic: test Shopify connectivity and token permissions
        const query = `query { shop { name myshopifyDomain plan { displayName } } }`;
        const result = await shopifyRequest(query, {});
        return res.json({ ok: true, shop: result.shop.name, domain: result.shop.myshopifyDomain, plan: result.shop.plan?.displayName });
      }

      case 'createProduct': {
        // Shopify auto-creates a "Default Title" variant on every new product.
        // We must UPDATE that variant (not create a new one) to set price.
        // For multiple variants we update the first, then create the rest.
        const hasMultiple = data.variants && data.variants.length > 1;

        // Step 1: Create product — also fetch the auto-created default variant id.
        const createQuery = `
          mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
              product {
                id
                handle
                title
                onlineStoreUrl
                variants(first: 1) { edges { node { id } } }
              }
              userErrors { field message }
            }
          }
        `;
        const productInput = {
          title: data.title,
          descriptionHtml: data.description || '',
          vendor: data.vendor || 'Parties & Signs',
          productType: data.productType || 'Sign',
          tags: data.tags || ['customizable'],
          status: 'ACTIVE',
          ...(hasMultiple ? { options: ['Size'] } : {}),
        };
        const createResult = await shopifyRequest(createQuery, { input: productInput });
        if (createResult.productCreate.userErrors.length > 0) {
          throw new Error(createResult.productCreate.userErrors[0].message);
        }
        const product = createResult.productCreate.product;
        const defaultVariantId = product.variants?.edges?.[0]?.node?.id;

        // Step 2: Update the auto-created default variant with correct price / sku / option.
        if (data.variants && data.variants.length > 0 && defaultVariantId) {
          const updateQuery = `
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants { id title price }
                userErrors { field message }
              }
            }
          `;
          const firstV = data.variants[0];
          const updateResult = await shopifyRequest(updateQuery, {
            productId: product.id,
            variants: [{
              id: defaultVariantId,
              price: String(firstV.price),
              inventoryPolicy: 'CONTINUE',
              ...(firstV.sku ? { inventoryItem: { sku: firstV.sku } } : {}),
              ...(hasMultiple ? { optionValues: [{ name: firstV.label, optionName: 'Size' }] } : {}),
            }],
          });
          if (updateResult.productVariantsBulkUpdate.userErrors.length > 0) {
            throw new Error(updateResult.productVariantsBulkUpdate.userErrors[0].message);
          }

          // Step 3 (multi-variant only): Create remaining variants.
          if (hasMultiple && data.variants.length > 1) {
            const bulkCreateQuery = `
              mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkCreate(productId: $productId, variants: $variants) {
                  productVariants { id title price }
                  userErrors { field message }
                }
              }
            `;
            const remaining = data.variants.slice(1).map(v => ({
              price: String(v.price),
              inventoryPolicy: 'CONTINUE',
              ...(v.sku ? { inventoryItem: { sku: v.sku } } : {}),
              optionValues: [{ name: v.label, optionName: 'Size' }],
            }));
            const bulkResult = await shopifyRequest(bulkCreateQuery, {
              productId: product.id,
              variants: remaining,
            });
            if (bulkResult.productVariantsBulkCreate.userErrors.length > 0) {
              throw new Error(bulkResult.productVariantsBulkCreate.userErrors[0].message);
            }
          }
        }

        return res.json({ id: product.id, handle: product.handle, title: product.title, onlineStoreUrl: product.onlineStoreUrl });
      }

      case 'setProductMetafields': {
        const query = `
          mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { id key namespace value }
              userErrors { field message }
            }
          }
        `;
        const result = await shopifyRequest(query, {
          metafields: data.metafields.map(mf => ({
            ownerId: data.ownerId,
            namespace: mf.namespace || 'custom',
            key: mf.key,
            type: mf.type,
            value: mf.value,
          })),
        });
        if (result.metafieldsSet.userErrors.length > 0) {
          throw new Error(result.metafieldsSet.userErrors[0].message);
        }
        return res.json(result.metafieldsSet.metafields);
      }

      case 'attachProductImage': {
        const query = `
          mutation productCreateMedia(
            $productId: ID!
            $media: [CreateMediaInput!]!
          ) {
            productCreateMedia(productId: $productId, media: $media) {
              media {
                ... on MediaImage {
                  id
                  image { url }
                }
              }
              mediaUserErrors { field message }
            }
          }
        `;
        const result = await shopifyRequest(query, {
          productId: data.productId,
          media: [{
            originalSource: data.imageUrl,
            mediaContentType: 'IMAGE',
            alt: data.alt || '',
          }],
        });
        return res.json(result.productCreateMedia.media[0]);
      }

      case 'getProduct': {
        const query = `
          query getProduct($id: ID!) {
            product(id: $id) {
              id handle title status
              variants(first: 20) {
                edges { node { id title price } }
              }
              metafields(first: 10) {
                edges { node { id key namespace value } }
              }
            }
          }
        `;
        const result = await shopifyRequest(query, { id: data.id });
        return res.json(result.product);
      }

      case 'getFile': {
        const query = `
          query getFile($id: ID!) {
            node(id: $id) {
              ... on MediaImage {
                id
                image { url }
              }
            }
          }
        `;
        const result = await shopifyRequest(query, { id: data.id });
        return res.json(result.node);
      }

      case 'listProducts': {
        const query = `
          query listProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  handle
                  title
                  status
                  createdAt
                  images(first: 1) {
                    edges { node { url } }
                  }
                  metafields(first: 10) {
                    edges { node { key namespace value } }
                  }
                }
              }
            }
          }
        `;
        const result = await shopifyRequest(query, { first: data.first || 50 });
        return res.json(result.products);
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('Shopify admin proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
