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
export async function saveTemplateToShopify(template) {
  const fields = {
    name:              template.name,
    category:          template.category || '',
    canvas_width:      String(template.canvasWidth  || 800),
    canvas_height:     String(template.canvasHeight || 600),
    background_color:  template.backgroundColor || '#ffffff',
    template_json:     JSON.stringify(template.templateJSON || {}),
    preview_image_url: template.previewImageUrl || '',
    variants_json:     JSON.stringify(template.variants || []),
    created_at:        template.createdAt || new Date().toISOString(),
  };

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
    node.fields.forEach(({ key, value }) => { f[key] = value; });
    return {
      id:              node.id,
      metaobjectId:    node.id,
      name:            f.name            || 'Untitled',
      category:        f.category        || '',
      canvasWidth:     parseInt(f.canvas_width)  || 800,
      canvasHeight:    parseInt(f.canvas_height) || 600,
      backgroundColor: f.background_color || '#ffffff',
      templateJSON:    f.template_json   ? JSON.parse(f.template_json)  : null,
      previewImageUrl: f.preview_image_url || null,
      variants:        f.variants_json   ? JSON.parse(f.variants_json) : [],
      status:          'uploaded',
      createdAt:       f.created_at      || '',
      elements:        0,
      editableFields:  0,
    };
  });
}

// ---------------------------------------------------------------------------
// Canvases
// ---------------------------------------------------------------------------

/**
 * Save (create or update) a canvas_config metaobject.
 * Returns { id, handle } of the saved metaobject.
 */
export async function saveCanvasToShopify(canvas) {
  const fields = {
    name:          canvas.name,
    category:      canvas.category || '',
    variants_json: JSON.stringify(canvas.variants || []),
    created_at:    canvas.createdAt || new Date().toISOString(),
  };

  if (canvas.metaobjectId) {
    return callAdminProxy('updateMetaobject', { id: canvas.metaobjectId, fields });
  }
  return callAdminProxy('createMetaobject', { type: 'canvas_config', fields });
}

/**
 * Fetch all canvas_config metaobjects from Shopify.
 * Returns an array of canvas objects shaped for AppContext.
 */
export async function fetchCanvasesFromShopify() {
  const result = await callAdminProxy('listMetaobjects', { type: 'canvas_config', first: 50 });
  if (!result?.nodes) return [];

  return result.nodes.map(node => {
    const f = {};
    node.fields.forEach(({ key, value }) => { f[key] = value; });
    return {
      id:           node.id,
      metaobjectId: node.id,
      name:         f.name          || 'Untitled',
      category:     f.category      || '',
      variants:     f.variants_json ? JSON.parse(f.variants_json) : [],
      status:       'uploaded',
      createdAt:    f.created_at    || '',
    };
  });
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
