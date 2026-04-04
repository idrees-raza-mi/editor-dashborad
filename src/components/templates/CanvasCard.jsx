import { useState } from 'react';
import { Eye, Edit2, Upload, RefreshCw, Layers } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

// ── Renders the canvas shape as an SVG thumbnail ───────────────────
function CanvasThumbnail({ variant }) {
  const bg    = variant?.backgroundColor || '#FAF7F2';
  const path  = variant?.svgPath;
  const vw    = variant?.canvasWidth  || 400;
  const vh    = variant?.canvasHeight || 500;

  if (!path) {
    // No shape set → show a plain rectangle with the background colour
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: bg,
      }}>
        <div style={{
          width: 80,
          height: Math.round(80 * (vh / vw)),
          background: bg,
          border: '2px solid rgba(0,0,0,0.12)',
          borderRadius: 4,
          maxHeight: 100,
        }} />
        <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontFamily: 'var(--font-mono)' }}>
          {vw} × {vh}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream2)',
      position: 'relative',
    }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        style={{ width: 90, height: 110, display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow / outline */}
        <path d={path} fill="rgba(0,0,0,0.08)" transform="translate(3,4)" />
        {/* Shape filled with background colour */}
        <path d={path} fill={bg} stroke="rgba(0,0,0,0.18)" strokeWidth={vw * 0.012} />
      </svg>
      <span style={{
        position: 'absolute',
        bottom: 6,
        right: 8,
        fontSize: 9,
        color: 'rgba(0,0,0,0.35)',
        fontFamily: 'var(--font-mono)',
      }}>
        {vw} × {vh}
      </span>
    </div>
  );
}

export default function CanvasCard({ canvas, onPreview, onEdit, onUpload }) {
  const [hovered, setHovered] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeVariant = canvas.variants[activeIdx] || canvas.variants[0];

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
      {/* Shape Preview */}
      <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
        <CanvasThumbnail variant={activeVariant} />

        {/* Variant switcher — shown when multiple variants exist */}
        {canvas.variants.length > 1 && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            gap: 4,
          }}>
            {canvas.variants.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setActiveIdx(i)}
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.18)',
                  cursor: 'pointer',
                  background: i === activeIdx ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
                  color:      i === activeIdx ? 'white'            : 'var(--black)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: i === activeIdx ? 700 : 400,
                  transition: 'all 0.12s',
                }}
              >
                {v.label || `V${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 8 }}>
          {canvas.name}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {canvas.variants.map(v => (
            <span key={v.id} style={{
              fontSize: 11,
              background: 'var(--cream2)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: 10,
              color: 'var(--mid)',
            }}>
              {v.label} — £{v.price}
            </span>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 8 }}>
          {canvas.category}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

        <Badge status={canvas.status} />

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Button variant="ghost" icon={Eye} size="sm" onClick={() => onPreview(canvas)}>Preview</Button>
          <Button variant="ghost" icon={Edit2} size="sm" onClick={() => onEdit(canvas)}>Edit</Button>
        </div>

        <div style={{ marginTop: 8 }}>
          {canvas.status === 'not_uploaded' ? (
            <Button
              variant="primary"
              icon={Upload}
              size="sm"
              onClick={() => onUpload(canvas)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Upload to Shopify
            </Button>
          ) : (
            <Button
              variant="outline"
              icon={RefreshCw}
              size="sm"
              onClick={() => onUpload(canvas)}
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
