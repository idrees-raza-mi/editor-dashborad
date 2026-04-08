/**
 * src/services/shopifyAdmin.js
 * High-level Shopify service layer.
 * All functions call the Vercel serverless proxy — never the Admin API directly.
 */

import { callAdminProxy } from '../utils/shopifyAdmin';

const getOrigin = () =>
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin;

// ---------------------------------------------------------------------------
// Low-level proxy wrapper (mirrors callAdminProxy but named for clarity)
// ---------------------------------------------------------------------------
export async function shopifyQuery(action, data) {
  return callAdminProxy(action, data);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Save (create or update) a template metaobject.
 * Returns { id, handle } of the saved metaobject.
 */
const pxToCm = px => String(Math.round(px * 2.54 / 96 * 100) / 100);

function formatPrice(price) {
  if (!price && price !== 0) return '';
  const s = String(price);
  return s.startsWith('£') ? s : `£${s}`;
}

export async function saveTemplateToShopify(template) {
  const w = template.canvasWidth  || 800;
  const h = template.canvasHeight || 600;

  const availableSizes = (template.variants || []).map((v, i) => ({
    id:     v.id || String(i + 1),
    label:  v.label  || `Size ${i + 1}`,
    price:  formatPrice(v.price),
    width:  v.canvasWidth  || w,
    height: v.canvasHeight || h,
  }));

  const fields = {
    name:             template.name,
    category:         template.category || '',
    canvas_width:     String(Math.round(w)),
    canvas_height:    String(Math.round(h)),
    canvas_width_cm:  pxToCm(w),
    canvas_height_cm: pxToCm(h),
    background_color: template.backgroundColor || '#ffffff',
    template_json:    JSON.stringify(template.templateJSON || {}),
    available_sizes:  JSON.stringify(availableSizes),
    version:          '5.4.0',
    status:           'active',
  };

  if (template.svgClipPath)  fields.svg_clip_path = template.svgClipPath;
  if (template.previewFileId) fields.preview_image = template.previewFileId;

  if (template.metaobjectId) {
    return callAdminProxy('updateMetaobject', { id: template.metaobjectId, fields });
  }
  return callAdminProxy('createMetaobject', { type: 'design_template', fields });
}

/**
 * Fetch all design_template metaobjects from Shopify.
 * Returns an array of template objects shaped for AppContext.
 */
export async function fetchTemplatesFromShopify() {
  const result = await callAdminProxy('listMetaobjects', { type: 'design_template', first: 50 });
  if (!result?.nodes) return [];

  return result.nodes.map(node => {
    const f = {};
    const refs = {};
    node.fields.forEach(({ key, value, reference }) => {
      f[key] = value;
      if (reference) refs[key] = reference;
    });
    return {
      id:              node.id,
      metaobjectId:    node.id,
      name:            f.name             || 'Untitled',
      category:        f.category         || '',
      canvasWidth:     parseInt(f.canvas_width)   || 800,
      canvasHeight:    parseInt(f.canvas_height)  || 600,
      backgroundColor: f.background_color || '#ffffff',
      svgClipPath:     f.svg_clip_path    || null,
      templateJSON:    f.template_json    ? JSON.parse(f.template_json)    : null,
      variants:        f.available_sizes  ? JSON.parse(f.available_sizes)  : [],
      previewImageUrl: refs.preview_image?.image?.url || null,
      previewFileId:   f.preview_image    || null,
      status:          f.status           || 'active',
      version:         f.version          || '',
      createdAt:       '',
      elements:        0,
      editableFields:  0,
    };
  });
}

// ---------------------------------------------------------------------------
// Canvases
// ---------------------------------------------------------------------------

/**
 * Save all variants of a canvas — one design_canvas metaobject per variant.
 * Returns array of { variantId, metaobjectId }.
 */
export async function saveCanvasToShopify(canvas) {
  const variants = canvas.variants || [];
  const results  = [];

  for (const variant of variants) {
    const w = variant.canvasWidth  || 400;
    const h = variant.canvasHeight || 500;
    const fields = {
      name:             canvas.name,
      category:         canvas.category || '',
      canvas_width:     String(Math.round(w)),
      canvas_height:    String(Math.round(h)),
      canvas_width_cm:  pxToCm(w),
      canvas_height_cm: pxToCm(h),
      svg_clip_path:    variant.svgPath         || '',
      background_color: variant.backgroundColor || '#ffffff',
      size_label:       variant.label           || '',
      price:            formatPrice(variant.price),
      status:           'active',
    };

    let result;
    if (variant.metaobjectId) {
      result = await callAdminProxy('updateMetaobject', { id: variant.metaobjectId, fields });
    } else {
      result = await callAdminProxy('createMetaobject', { type: 'design_canvas', fields });
    }
    results.push({ variantId: variant.id, metaobjectId: result.id });
  }

  // Return first result's id for backwards-compat with callers that use result.id
  return { id: results[0]?.metaobjectId || null, variants: results };
}

/**
 * Fetch all design_canvas metaobjects and group by name into canvas objects.
 */
export async function fetchCanvasesFromShopify() {
  const result = await callAdminProxy('listMetaobjects', { type: 'design_canvas', first: 100 });
  if (!result?.nodes) return [];

  // Group individual size metaobjects by canvas name
  const grouped = {};
  result.nodes.forEach(node => {
    const f = {};
    node.fields.forEach(({ key, value }) => { f[key] = value; });
    const name = f.name || 'Untitled';
    if (!grouped[name]) {
      grouped[name] = {
        id:           node.id,
        metaobjectId: node.id,
        name,
        category:     f.category || '',
        status:       'uploaded',
        createdAt:    '',
        variants:     [],
      };
    }
    grouped[name].variants.push({
      id:              node.id,
      metaobjectId:    node.id,
      label:           f.size_label       || '',
      price:           (f.price || '').replace('£', ''),
      canvasWidth:     parseInt(f.canvas_width)  || 400,
      canvasHeight:    parseInt(f.canvas_height) || 500,
      svgPath:         f.svg_clip_path    || null,
      backgroundColor: f.background_color || '#ffffff',
    });
  });

  return Object.values(grouped);
}

// ---------------------------------------------------------------------------
// Image upload
// ---------------------------------------------------------------------------

/**
 * Upload a preview image (Blob or data URL string) via api/upload.js.
 * Returns the Shopify CDN URL string.
 */
export async function uploadPreviewImage(imageSource, filename = 'preview.png') {
  // Accept either a Blob or a base64 data URL string
  let imageBase64;
  if (typeof imageSource === 'string') {
    imageBase64 = imageSource; // already a data URL
  } else {
    // Convert Blob → base64 data URL
    imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(imageSource);
    });
  }

  const mimeType = imageBase64.match(/^data:([^;]+);/)?.[1] || 'image/png';

  const res = await fetch(getOrigin() + '/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || '',
    },
    body: JSON.stringify({ filename, mimeType, imageBase64 }),
  });

  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Upload failed');
  return json.cdnUrl;
}
