import { useState, useRef, useEffect } from 'react';
import { Eye, Edit2, Upload, RefreshCw } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

function MetaTag({ children }) {
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 7px',
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--cream2)',
      color: 'var(--mid)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// ── Renders the actual template design onto a canvas thumbnail ──────
function TemplateThumbnail({ templateJSON, backgroundColor }) {
  const canvasRef = useRef(null);
  const cw = templateJSON?.canvasWidth  || 800;
  const ch = templateJSON?.canvasHeight || 600;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw() {
      ctx.clearRect(0, 0, cw, ch);

      // Canvas background
      ctx.fillStyle = templateJSON?.background || backgroundColor || '#FAF7F2';
      ctx.fillRect(0, 0, cw, ch);

      const objects = templateJSON?.objects || [];

      for (const obj of objects) {
        // ── Rect (background or shape) ──────────────────────────
        if (obj.type === 'rect' && obj.fill && obj.fill !== 'transparent') {
          ctx.fillStyle = obj.fill;
          const x = obj.left || 0;
          const y = obj.top  || 0;
          const w = obj.width  || cw;
          const h = obj.height || ch;
          const r = obj.rx || 0;
          if (r > 0 && ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, w, h);
          }
          // Stroke (hollow shapes)
          if (obj.stroke && obj.strokeWidth) {
            ctx.strokeStyle = obj.stroke;
            ctx.lineWidth   = obj.strokeWidth;
            if (r > 0 && ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, r);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
        }

        // ── Text ────────────────────────────────────────────────
        if (obj.type === 'i-text' || obj.element_type === 'text') {
          const fontSize   = obj.fontSize   || 32;
          const fontFamily = obj.fontFamily || 'Playfair Display';
          const weight     = obj.fontWeight === 'bold'   ? 'bold'   : 'normal';
          const style      = obj.fontStyle  === 'italic' ? 'italic' : 'normal';
          ctx.font         = `${style} ${weight} ${fontSize}px "${fontFamily}"`;
          ctx.fillStyle    = obj.fill || '#1C1A17';
          ctx.textBaseline = 'top';
          ctx.textAlign    = obj.originX === 'center' ? 'center'
                           : obj.originX === 'right'  ? 'right'
                           : 'left';
          ctx.fillText(obj.text || '', obj.left || 0, obj.top || 0);
        }

        // ── Image ───────────────────────────────────────────────
        if (obj.type === 'image' && obj.src) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.globalAlpha = obj.opacity ?? 1;
            ctx.drawImage(img,
              obj.left   || 0,
              obj.top    || 0,
              img.naturalWidth  * (obj.scaleX ?? 1),
              img.naturalHeight * (obj.scaleY ?? 1),
            );
            ctx.globalAlpha = 1;
          };
          img.src = obj.src;
        }
      }
    }

    // Wait for fonts (Google Fonts) before drawing so text renders correctly
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(draw);
    } else {
      draw();
    }
  }, [templateJSON, backgroundColor, cw, ch]);

  // Scale to fit the 280px card thumbnail area while preserving aspect ratio
  const THUMB_W = 280;
  const THUMB_H = 160;
  const scale   = Math.min(THUMB_W / cw, THUMB_H / ch);
  const dispW   = Math.round(cw * scale);
  const dispH   = Math.round(ch * scale);

  return (
    <canvas
      ref={canvasRef}
      width={cw}
      height={ch}
      style={{
        width:   dispW,
        height:  dispH,
        display: 'block',
      }}
    />
  );
}

export default function TemplateCard({ template, onPreview, onEdit, onUpload }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 280,
        flexShrink: 0,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: hovered ? 'var(--shadow)' : 'none',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Thumbnail — prefers Shopify preview image, falls back to rendered */}
      <div style={{
        height: 160,
        background: template.backgroundColor || '#FAF7F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {template.previewImageUrl ? (
          <img 
            src={template.previewImageUrl} 
            alt={template.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : template.templateJSON ? (
          <TemplateThumbnail
            templateJSON={template.templateJSON}
            backgroundColor={template.backgroundColor}
          />
        ) : (
          // Fallback if no templateJSON stored yet
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            color: 'var(--black)',
            textAlign: 'center',
            padding: '0 12px',
          }}>
            {template.name}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 8 }}>
          {template.name}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <MetaTag>{template.canvasWidth}×{template.canvasHeight}</MetaTag>
          <MetaTag>{template.elements} elements</MetaTag>
          <MetaTag>{template.editableFields} editable</MetaTag>
        </div>

        <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 8 }}>
          {template.variants.length} size {template.variants.length === 1 ? 'variant' : 'variants'}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

        <Badge status={template.status} />

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Button variant="ghost" icon={Eye} size="sm" onClick={() => onPreview(template)}>Preview</Button>
          <Button variant="ghost" icon={Edit2} size="sm" onClick={() => onEdit(template)}>Edit</Button>
        </div>

        <div style={{ marginTop: 8 }}>
          {template.status === 'not_uploaded' ? (
            <Button
              variant="primary"
              icon={Upload}
              size="sm"
              onClick={() => onUpload(template)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Upload to Shopify
            </Button>
          ) : (
            <Button
              variant="outline"
              icon={RefreshCw}
              size="sm"
              onClick={() => onUpload(template)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Re-upload
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
