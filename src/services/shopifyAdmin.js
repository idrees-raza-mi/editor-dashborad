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

export async function shopifyQuery(action, data) {
  return callAdminProxy(action, data);
}

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
  if (template.previewFileId) fields.preview_image  = template.previewFileId;

  if (template.metaobjectId) {
    return callAdminProxy('updateMetaobject', { id: template.metaobjectId, fields });
  }
  return callAdminProxy('createMetaobject', { type: 'design_template', fields });
}

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
      editableFields: 0,
    };
  });
}

export async function saveCanvasToShopify(canvas) {
  const variants = canvas.variants || [];
  const fields = {
    name:          canvas.name,
    category:      canvas.category || '',
    variants_json: JSON.stringify(
      variants.map((v, i) => ({
        id:              v.id || String(i + 1),
        label:           v.label           || '',
        price:           formatPrice(v.price),
        canvasWidth:     v.canvasWidth      || 400,
        canvasHeight:    v.canvasHeight     || 500,
        svgPath:         v.svgPath          || null,
        backgroundColor: v.backgroundColor || '#ffffff',
      }))
    ),
    status: 'active',
  };

  if (canvas.metaobjectId) {
    return callAdminProxy('updateMetaobject', { id: canvas.metaobjectId, fields });
  }
  return callAdminProxy('createMetaobject', { type: 'canvas_config', fields });
}

export async function fetchCanvasesFromShopify() {
  const result = await callAdminProxy('listMetaobjects', { type: 'canvas_config', first: 100 });
  if (!result?.nodes) return [];

  return result.nodes.map(node => {
    const f = {};
    node.fields.forEach(({ key, value }) => { f[key] = value; });
    return {
      id:           node.id,
      metaobjectId: node.id,
      name:         f.name          || 'Untitled',
      category:     f.category     || '',
      status:       f.status        || 'uploaded',
      createdAt:    f.created_at   || '',
      variants:     f.variants_json ? JSON.parse(f.variants_json) : [],
    };
  });
}

export async function uploadPreviewImage(imageSource, filename = 'preview.png') {
  let imageBase64;
  if (typeof imageSource === 'string') {
    imageBase64 = imageSource;
  } else {
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