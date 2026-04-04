import { useEffect, useRef, useState } from 'react';
import { Canvas, Path, Rect } from 'fabric';
import { isValidSvgPath, scaleSvgPathToCanvas } from '../../utils/svgPathUtils';

const MAX_DISPLAY_WIDTH  = 480;
const MAX_DISPLAY_HEIGHT = 420;

// NOTE: Prompt used fabric.Canvas, fabric.Path (v5 globals) and
// canvas.setBackgroundColor(color, callback) — not available in v7.
// Fixed: named imports + canvas.backgroundColor = color; canvas.requestRenderAll()

export default function ConfiguratorCanvas({ variant, onCanvasReady }) {
  const canvasElRef      = useRef(null);
  const canvasInstanceRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const scaleX = MAX_DISPLAY_WIDTH  / variant.canvasWidth;
  const scaleY = MAX_DISPLAY_HEIGHT / variant.canvasHeight;
  const displayScale = Math.min(scaleX, scaleY, 1);

  // ── Init / re-init when dimensions change ──────────────────────
  useEffect(() => {
    if (!canvasElRef.current) return;

    if (canvasInstanceRef.current) {
      canvasInstanceRef.current.dispose();
      canvasInstanceRef.current = null;
    }

    const fc = new Canvas(canvasElRef.current, {
      width: variant.canvasWidth,
      height: variant.canvasHeight,
      backgroundColor: variant.backgroundColor || '#ffffff',
      selection: false,
      interactive: false,
    });

    canvasInstanceRef.current = fc;
    setCanvasReady(true);
    if (onCanvasReady) onCanvasReady(fc);
    drawCanvasContent(fc, variant);

    return () => {
      if (canvasInstanceRef.current) {
        canvasInstanceRef.current.dispose();
        canvasInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.canvasWidth, variant.canvasHeight]);

  // ── Redraw when SVG path or bg color changes ───────────────────
  useEffect(() => {
    if (!canvasInstanceRef.current || !canvasReady) return;
    drawCanvasContent(canvasInstanceRef.current, variant);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.svgPath, variant.backgroundColor, canvasReady]);

  function drawCanvasContent(fc, v) {
    fc.clear();
    // v7: no setBackgroundColor method — set directly
    fc.backgroundColor = v.backgroundColor || '#ffffff';
    fc.clipPath = null;

    if (v.svgPath && isValidSvgPath(v.svgPath)) {
      const scaledPathStr = scaleSvgPathToCanvas(v.svgPath, v.canvasWidth, v.canvasHeight, 16);
      if (scaledPathStr) {
        // Clip path — hides content outside shape
        fc.clipPath = new Path(scaledPathStr, {
          absolutePositioned: true,
          selectable: false,
          evented: false,
        });

        // Zone fill — light blue to show printable area
        fc.add(new Path(scaledPathStr, {
          fill: 'rgba(33,150,243,0.08)',
          stroke: '#2196F3',
          strokeWidth: 2,
          strokeDashArray: [8, 4],
          selectable: false,
          evented: false,
        }));

        // Outer red guide
        fc.add(new Path(scaledPathStr, {
          fill: 'transparent',
          stroke: '#e74c3c',
          strokeWidth: 1.5,
          selectable: false,
          evented: false,
        }));
      }
    } else {
      // Rectangle canvas — dashed rect guide
      fc.add(new Rect({
        left: 16, top: 16,
        width: v.canvasWidth - 32,
        height: v.canvasHeight - 32,
        fill: 'rgba(33,150,243,0.05)',
        stroke: '#2196F3',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false,
      }));
    }

    fc.requestRenderAll();
  }

  // Status indicator
  let statusClass = 'none', statusText = 'Rectangle canvas — no shape boundary';
  if (variant.svgPath) {
    if (isValidSvgPath(variant.svgPath)) {
      statusClass = 'valid';
      statusText = '✓ Shape boundary applied';
    } else {
      statusClass = 'invalid';
      statusText = '⚠ Invalid SVG path — check format';
    }
  }

  return (
    <div style={{
      background: 'var(--cream2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 24,
      gap: 12,
    }}>
      {/* Scaled canvas wrapper */}
      <div className="configurator-canvas-wrapper" style={{
        width: variant.canvasWidth * displayScale,
        height: variant.canvasHeight * displayScale,
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          transform: `scale(${displayScale})`,
          transformOrigin: 'top left',
          position: 'absolute',
        }}>
          <canvas ref={canvasElRef} />
        </div>
      </div>

      {/* Dimension label */}
      <div style={{ fontSize: 12, color: 'var(--mid)', fontFamily: 'var(--font-mono)' }}>
        {variant.canvasWidth} × {variant.canvasHeight} px
      </div>

      {/* Status */}
      <div className="canvas-status-row">
        <div className={`canvas-status-dot ${statusClass}`} />
        <span style={{
          fontSize: 12,
          color: statusClass === 'valid' ? 'var(--green-tx)' : statusClass === 'invalid' ? 'var(--amber-tx)' : 'var(--mid)',
        }}>
          {statusText}
        </span>
      </div>
    </div>
  );
}
