import { loadSVGFromString, util } from 'fabric';

function getElementType(fabricObj) {
  switch (fabricObj.type) {
    case 'i-text':
    case 'text':
    case 'textbox':
      return 'text';
    case 'image':
      return 'image';
    case 'rect':
    case 'circle':
    case 'ellipse':
    case 'triangle':
    case 'path':
    case 'group':
      return 'shape';
    default:
      return 'shape';
  }
}

function getElementName(fabricObj, index) {
  const type = getElementType(fabricObj);
  if (type === 'text') {
    const text = fabricObj.text || '';
    return text.slice(0, 20) || `Text ${index}`;
  }
  if (type === 'image') return `Image ${index}`;
  return `Shape ${index}`;
}

export function validateSVGFile(file) {
  const isSVG = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
  if (!isSVG) {
    return {
      valid: false,
      error: 'Please upload an SVG file. Export your .ai file as SVG from Illustrator first.',
    };
  }
  if (file.size >= 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }
  return { valid: true, error: null };
}

export function readSVGFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function parseSVGToElements(svgString, targetCanvasWidth, targetCanvasHeight) {
  // Fabric.js v7 — loadSVGFromString returns a Promise
  const { objects, options } = await loadSVGFromString(svgString);

  const svgWidth  = options.width  || 800;
  const svgHeight = options.height || 600;

  const scaleX = targetCanvasWidth  / svgWidth;
  const scaleY = targetCanvasHeight / svgHeight;
  const scale  = Math.min(scaleX, scaleY, 1);

  const timestamp = Date.now();

  return (objects || [])
    .filter(obj => obj != null)
    .map((obj, index) => {
      const elementType = getElementType(obj);

      let pathData = null;
      if (obj.path) {
        try {
          pathData = util.joinPath ? util.joinPath(obj.path) : null;
        } catch (_) {
          pathData = null;
        }
      }

      return {
        id:          `imported-${index}-${timestamp}`,
        type:        elementType,
        name:        getElementName(obj, index),
        left:        (obj.left  || 0) * scale,
        top:         (obj.top   || 0) * scale,
        width:       obj.width  != null ? obj.width  * scale : undefined,
        height:      obj.height != null ? obj.height * scale : undefined,
        scaleX:      (obj.scaleX || 1) * scale,
        scaleY:      (obj.scaleY || 1) * scale,
        angle:       obj.angle  || 0,
        fill:        obj.fill   || '#000000',
        stroke:      obj.stroke || null,
        strokeWidth: obj.strokeWidth || 0,
        opacity:     obj.opacity !== undefined ? obj.opacity : 1,

        // Text-specific
        text:       obj.text       || '',
        fontFamily: obj.fontFamily || 'Arial',
        fontSize:   obj.fontSize   ? obj.fontSize * scale : 24,
        fontWeight: obj.fontWeight || 'normal',
        fontStyle:  obj.fontStyle  || 'normal',
        textAlign:  obj.textAlign  || 'left',

        // Path-specific
        pathData,

        fabricType:   obj.type,
        element_type: elementType,

        label:    '',
        required: false,
        permissions: {
          content:     'fixed',
          position:    'locked',
          size:        'locked',
          rotation:    'locked',
          delete:      'no',
          font_family: 'locked',
          font_size:   'locked',
          font_color:  'locked',
        },
      };
    });
}
