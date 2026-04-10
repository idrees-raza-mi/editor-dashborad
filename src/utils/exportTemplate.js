// Schema version 5.4.0 — includes component_permissions block and element_type per object

const DEFAULT_COMPONENT_SETTINGS = {
  text:       { enabled: true,  allow_add: false },
  image:      { enabled: true,  allow_add: false },
  shape:      { enabled: false, allow_add: false },
  background: { enabled: true },
};

export function buildTemplateJSON(elements, canvasConfig, componentSettings) {
  const cs = componentSettings || DEFAULT_COMPONENT_SETTINGS;

  const component_permissions = {
    text: {
      enabled:   cs.text?.enabled   ?? true,
      allow_add: cs.text?.allow_add ?? false,
    },
    image: {
      enabled:   cs.image?.enabled   ?? true,
      allow_add: cs.image?.allow_add ?? false,
    },
    shape: {
      enabled:   cs.shape?.enabled   ?? false,
      allow_add: cs.shape?.allow_add ?? false,
    },
    background: {
      enabled: cs.background?.enabled ?? true,
    },
  };

  return {
    version: '5.4.0',
    schemaVersion: '2.0',
    component_permissions,
    canvasWidth:  canvasConfig.width,
    canvasHeight: canvasConfig.height,
    background:   canvasConfig.backgroundColor,
    objects: elements.map(el => {
      const isText  = el.type === 'text';
      const p       = el.permissions || {};

      // Map admin element type to export element_type
      const element_type =
        el.type === 'text'       ? 'text'       :
        el.type === 'image'      ? 'image'      :
        el.type === 'shape'      ? 'shape'      :
        el.type === 'background' ? 'background' :
        el.type;

      // Fabric type for the customer editor to recreate
      const fabricType =
        el.type === 'text'       ? 'i-text' :
        el.type === 'background' ? 'rect'   :
        el.type === 'shape'      ? 'rect'   :
        el.type === 'image'      ? 'image'  :
        el.fabricType || 'rect';

      const permissions = {
        content:  p.content  || 'fixed',
        position: p.position || 'locked',
        size:     p.size     || 'locked',
        rotation: p.rotation || 'locked',
        delete:   p.delete   || 'no',
        // Font permissions always present — 'locked' by default for non-text types
        font_family: isText ? (p.font_family || 'locked') : 'locked',
        font_size:   isText ? (p.font_size   || 'locked') : 'locked',
        font_color:  isText ? (p.font_color  || 'locked') : 'locked',
      };

      const obj = {
        type:         fabricType,
        element_type,
        id:           el.id,
        label:        el.label    || null,
        required:     el.required || false,
        editable:     permissions.content !== 'fixed',
        permissions,
        left:         el.left  || 0,
        top:          el.top   || 0,
        originX:      el.originX || 'left',
        originY:      el.originY || 'top',
      };

      if (isText) {
        obj.text       = el.text       || '';
        obj.fontSize   = el.fontSize   || 32;
        obj.fontFamily = el.fontFamily || 'Playfair Display';
        obj.fill       = el.fill       || '#1C1A17';
        obj.fontWeight = el.fontWeight || 'normal';
        obj.fontStyle  = el.fontStyle  || 'normal';
      }

      if (el.type === 'shape') {
        obj.width       = el.width  || 160;
        obj.height      = el.height || 90;
        obj.fill        = el.fill   || '#E8E0D4';
        obj.rx          = el.rx     || 0;
        obj.ry          = el.ry     || 0;
        obj.stroke      = el.stroke      || null;
        obj.strokeWidth = el.strokeWidth || 0;
      }

      if (el.type === 'background') {
        obj.isCanvasBackground = true;   // flag: customer editor should skip on shaped canvas
        obj.fill   = el.fill || canvasConfig.backgroundColor;
        obj.width  = canvasConfig.width;
        obj.height = canvasConfig.height;
        obj.left   = 0;
        obj.top    = 0;
      }

      if (el.type === 'image') {
        obj.src     = el.src     || null;
        obj.scaleX  = el.scaleX  ?? 1;
        obj.scaleY  = el.scaleY  ?? 1;
        obj.opacity = el.opacity ?? 1;
      }

      return obj;
    }),
  };
}

// 96 DPI: 1 cm = 96/2.54 px
const pxToCm = px => String(Math.round(px * 2.54 / 96 * 100) / 100);

function formatPrice(price) {
  if (!price && price !== 0) return '';
  const s = String(price);
  return s.startsWith('£') ? s : `£${s}`;
}

export function buildTemplateMetaobjectFields(template, previewFileId) {
  const w = template.canvasWidth;
  const h = template.canvasHeight;

  const availableSizes = (template.variants || []).map((v, i) => ({
    id:           v.id || String(i + 1),
    label:        v.label  || `Size ${i + 1}`,
    price:        formatPrice(v.price),
    width:        v.canvasWidth  || w,
    height:       v.canvasHeight || h,
    templateJSON: v.templateJSON || null,   // per-variant layout JSON
  }));

  const fields = {
    name:             template.name,
    category:         template.category || '',
    canvas_width:     String(Math.round(w)),
    canvas_height:    String(Math.round(h)),
    canvas_width_cm:  pxToCm(w),
    canvas_height_cm: pxToCm(h),
    background_color: template.backgroundColor || '#ffffff',
    template_json:    JSON.stringify(template.templateJSON),
    available_size:   JSON.stringify(availableSizes),
    version:          '5.4.0',
    status:           'active',
  };

  if (template.svgClipPath) fields.svg_clip_path = template.svgClipPath;
  if (previewFileId)        fields.preview_image  = previewFileId;

  return fields;
}

// Canvas summary — aggregates all variants into a single fields object
export function buildCanvasMetaobjectFields(canvas, variants) {
  return {
    name:          canvas.name,
    category:      canvas.category || '',
    variant_count: String((variants || []).length),
    variants_json: JSON.stringify(
      (variants || []).map(v => ({
        id:              v.id,
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
}

// One variant → one design_canvas metaobject
export function buildCanvasVariantFields(canvas, variant) {
  const w = variant.canvasWidth  || 400;
  const h = variant.canvasHeight || 500;
  return {
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
}

// Build one full templateJSON per variant, each using its own elements and dimensions.
// variantElements: { [variantId]: elements[] }
export function buildAllVariantsJSON(variantElements, variants, canvasConfig, componentSettings) {
  return variants.map(variant => {
    const els = variantElements[variant.id] || [];
    const variantCanvasConfig = {
      ...canvasConfig,
      width:  variant.canvasWidth  || canvasConfig.width,
      height: variant.canvasHeight || canvasConfig.height,
    };
    const templateJSON = buildTemplateJSON(els, variantCanvasConfig, componentSettings);
    return {
      id:           variant.id,
      label:        variant.label        || 'Size',
      price:        variant.price        || '',
      canvasWidth:  variant.canvasWidth  || canvasConfig.width,
      canvasHeight: variant.canvasHeight || canvasConfig.height,
      templateJSON,
    };
  });
}

export function exportCanvasAsDataURL(canvasEl) {
  if (!canvasEl) return null;
  return canvasEl.toDataURL('image/png', 0.85);
}
