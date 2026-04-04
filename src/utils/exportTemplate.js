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
        obj.fill   = el.fill || canvasConfig.backgroundColor;
        obj.width  = canvasConfig.width;
        obj.height = canvasConfig.height;
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

export function buildTemplateMetaobjectFields(template, variants, previewImageUrl) {
  return {
    name:              template.name,
    category:          template.category,
    canvas_width:      String(template.canvasWidth),
    canvas_height:     String(template.canvasHeight),
    background_color:  template.backgroundColor,
    template_json:     JSON.stringify(template.templateJSON),
    preview_image_url: previewImageUrl || '',
    variants_json:     JSON.stringify(variants),
    created_at:        new Date().toISOString(),
  };
}

export function buildCanvasMetaobjectFields(canvas, variants) {
  return {
    name:         canvas.name,
    category:     canvas.category,
    variants_json: JSON.stringify(variants),
    created_at:   new Date().toISOString(),
  };
}

export function exportCanvasAsDataURL(canvasEl) {
  if (!canvasEl) return null;
  return canvasEl.toDataURL('image/png', 0.85);
}
