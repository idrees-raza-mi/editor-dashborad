import { callAdminProxy, uploadImageToShopify } from './shopifyAdmin';
import { sanitizeTemplateJSON, hasUnsavedBlobUrls } from './sanitizeTemplateJSON';

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
      console.log('[SHOPIFY] Got canvasDataUrl, length:', canvasDataUrl.length);
      const response = await fetch(canvasDataUrl);
      const blob = await response.blob();
      console.log('[SHOPIFY] Blob size:', blob.size, 'type:', blob.type);
      const uploadResult = await uploadImageToShopify(
        blob,
        productTitle.replace(/\s+/g, '-').toLowerCase() + '-preview.png'
      );
      console.log('[SHOPIFY] Upload result:', uploadResult);
      imageUrl = uploadResult.cdnUrl;
      console.log('[SHOPIFY] Attaching image to product:', productId, imageUrl);
      await callAdminProxy('attachProductImage', {
        productId,
        imageUrl,
        alt: productTitle,
      });
    } else {
      console.log('[SHOPIFY] No canvasDataUrl provided, skipping image upload');
    }
  } catch (imgErr) {
    console.warn('Image upload failed, continuing:', imgErr);
  }

  // Step 3 — Sanitize blob URLs, then store template JSON on product metafield
  let cleanTemplateJSON = templateJSON;
  if (hasUnsavedBlobUrls(templateJSON)) {
    onProgress('Uploading embedded images to Shopify...', 2.5, 4);
    try {
      cleanTemplateJSON = await sanitizeTemplateJSON(
        templateJSON,
        (msg) => onProgress(msg, 2.5, 4)
      );
    } catch (sanitizeErr) {
      console.error('Image sanitization error:', sanitizeErr);
      // Continue with original JSON — do not block publish
    }
  }

  onProgress('Saving template data...', 3, 4);

  const templateJsonString = JSON.stringify(cleanTemplateJSON);
  if (templateJsonString.length > 120000) {
    throw new Error(
      'Template JSON is too large (' +
      Math.round(templateJsonString.length / 1024) +
      'KB). Shopify metafield limit is 128KB. ' +
      'Reduce the number of elements or image complexity.'
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
  const { productId, designType } = params;
  let { templateJSON } = params;

  if (hasUnsavedBlobUrls(templateJSON)) {
    try {
      templateJSON = await sanitizeTemplateJSON(templateJSON);
    } catch (err) {
      console.error('Image sanitization error on update:', err);
    }
  }

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
