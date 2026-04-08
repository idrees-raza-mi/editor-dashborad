import { callAdminProxy, uploadImageToShopify } from './shopifyAdmin';

export async function publishTemplateAsProduct(params) {
  const {
    templateJSON,
    canvasDataUrl,
    productTitle,
    productDescription,
    variants,
    designType,
    onProgress,
  } = params;

  // Step 1 — Create product with variants
  onProgress('Creating Shopify product...', 1, 4);
  const product = await callAdminProxy('createProduct', {
    title: productTitle,
    description: productDescription || '',
    variants: variants.map(v => ({
      label: v.label,
      price: v.price,
      sku: `${productTitle.replace(/\s+/g, '-').toLowerCase()}-${v.label}`,
    })),
  });

  const productId = product.id;

  // Step 2 — Upload canvas PNG as product image
  onProgress('Uploading product image...', 2, 4);
  let imageUrl = null;
  try {
    if (canvasDataUrl) {
      const response = await fetch(canvasDataUrl);
      const blob = await response.blob();
      const uploadResult = await uploadImageToShopify(
        blob,
        productTitle.replace(/\s+/g, '-').toLowerCase() + '-preview.png'
      );
      imageUrl = uploadResult.cdnUrl;
      await callAdminProxy('attachProductImage', {
        productId,
        imageUrl,
        alt: productTitle,
      });
    }
  } catch (imgErr) {
    console.warn('Image upload failed, continuing:', imgErr);
  }

  // Step 3 — Store template JSON on product metafield
  onProgress('Saving template data...', 3, 4);

  const templateJsonString = JSON.stringify(templateJSON);
  if (templateJsonString.length > 120000) {
    throw new Error(
      'Template JSON is too large (' +
      Math.round(templateJsonString.length / 1024) +
      'KB). Shopify metafield limit is 128KB. ' +
      'Simplify the template and try again.'
    );
  }

  await callAdminProxy('setProductMetafields', {
    ownerId: productId,
    metafields: [
      {
        key: 'template_json',
        namespace: 'custom',
        type: 'json',
        value: templateJsonString,
      },
      {
        key: 'design_type',
        namespace: 'custom',
        type: 'single_line_text_field',
        value: designType || 'template',
      },
      {
        key: 'editor_version',
        namespace: 'custom',
        type: 'single_line_text_field',
        value: '5.4.0',
      },
    ],
  });

  onProgress('Done!', 4, 4);

  return {
    productId,
    productHandle: product.handle,
    productUrl: product.onlineStoreUrl,
    imageUrl,
  };
}

export async function updateProductTemplate(params) {
  const { productId, templateJSON, designType } = params;

  const templateJsonString = JSON.stringify(templateJSON);
  if (templateJsonString.length > 120000) {
    throw new Error('Template JSON too large. Simplify and try again.');
  }

  await callAdminProxy('setProductMetafields', {
    ownerId: productId,
    metafields: [
      {
        key: 'template_json',
        namespace: 'custom',
        type: 'json',
        value: templateJsonString,
      },
      {
        key: 'design_type',
        namespace: 'custom',
        type: 'single_line_text_field',
        value: designType || 'template',
      },
    ],
  });

  return { success: true };
}
