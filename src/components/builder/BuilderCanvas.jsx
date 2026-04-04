import { useEffect, useRef, useState } from 'react';
import { Canvas, IText, Rect, FabricImage } from 'fabric';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

const MAX_DISPLAY = 520;

export default function BuilderCanvas({
  elements,
  selectedElementId,
  canvasConfig,
  variants = [],
  activeVariantId,
  onSelectElement,
  onElementMoved,
  onElementResized,
  onElementTextChanged,
  onDeleteElement,
  onClearAll,
  onCanvasReady,
  onVariantChange,
  onUndo,
  onRedo,
}) {
  const canvasElRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const isSyncingRef = useRef(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // Active variant dimensions override canvasConfig
  const activeVariant = variants.find(v => v.id === activeVariantId);
  const effectiveWidth  = activeVariant?.canvasWidth  || canvasConfig.width;
  const effectiveHeight = activeVariant?.canvasHeight || canvasConfig.height;

  const scaleX = MAX_DISPLAY / effectiveWidth;
  const scaleY = 420 / effectiveHeight;
  const displayScale = Math.min(scaleX, scaleY, 1);

  // ── INITIALIZATION ──────────────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current) return;

    const fc = new Canvas(canvasElRef.current, {
      width: effectiveWidth,
      height: effectiveHeight,
      backgroundColor: canvasConfig.backgroundColor || '#ffffff',
      preserveObjectStacking: true,
    });

    canvasInstanceRef.current = fc;

    fc.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj && obj.id) onSelectElement(obj.id);
    });
    fc.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj && obj.id) onSelectElement(obj.id);
    });
    fc.on('selection:cleared', () => onSelectElement(null));

    fc.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj || !obj.id) return;
      onElementMoved(obj.id, Math.round(obj.left), Math.round(obj.top));
      onElementResized(obj.id, obj.scaleX, obj.scaleY,
        Math.round(obj.getScaledWidth()), Math.round(obj.getScaledHeight()));
    });

    fc.on('text:changed', (e) => {
      const obj = e.target;
      if (!obj || !obj.id) return;
      onElementTextChanged(obj.id, obj.text);
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        const active = fc.getActiveObject();
        if (active && active.id) {
          fc.remove(active);
          fc.discardActiveObject();
          fc.renderAll();
          onDeleteElement(active.id);  // notify React state
          onSelectElement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    setCanvasReady(true);
    onCanvasReady(fc);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      fc.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── RESIZE canvas when active variant changes ───────────────────
  useEffect(() => {
    const fc = canvasInstanceRef.current;
    if (!fc || !canvasReady) return;
    fc.setDimensions({ width: effectiveWidth, height: effectiveHeight });
    fc.renderAll();
  }, [effectiveWidth, effectiveHeight, canvasReady]);

  // ── SYNC: elements → canvas ─────────────────────────────────────
  useEffect(() => {
    if (!canvasInstanceRef.current || !canvasReady) return;
    const fc = canvasInstanceRef.current;
    isSyncingRef.current = true;

    const elementIds = elements.map(e => e.id);

    // Remove objects no longer in elements
    fc.getObjects().forEach(obj => {
      if (obj.id && !elementIds.includes(obj.id)) fc.remove(obj);
    });

    // Add or update objects
    for (const el of elements) {
      const existing = fc.getObjects().find(o => o.id === el.id);

      if (existing) {
        if (el.type === 'text') {
          existing.set({
            text: el.text,
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            fill: el.fill,
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
          });
        }
        if (el.type === 'shape') {
          existing.set({
            fill: el.fill,
            stroke: el.stroke || null,
            strokeWidth: el.strokeWidth || 0,
            width: el.width || existing.width,
            height: el.height || existing.height,
            rx: el.rx || 0,
            ry: el.ry || 0,
          });
        }
        if (el.type === 'background') {
          existing.set({ fill: el.fill });
        }
        if (el.type === 'image' && el.opacity !== undefined) {
          existing.set({ opacity: el.opacity });
        }
        existing.setCoords();
      } else {
        if (el.type === 'text') {
          const obj = new IText(el.text || 'New Text', {
            id: el.id,
            left: el.left || 50,
            top: el.top || 50,
            fontSize: el.fontSize || 32,
            fontFamily: el.fontFamily || 'Playfair Display',
            fill: el.fill || '#1C1A17',
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
          });
          fc.add(obj);
        } else if (el.type === 'shape') {
          const obj = new Rect({
            id: el.id,
            left: el.left || 50,
            top: el.top || 50,
            width: el.width || 150,
            height: el.height || 80,
            fill: el.fill || '#E8E0D4',
            stroke: el.stroke || null,
            strokeWidth: el.strokeWidth || 0,
            rx: el.rx || 0,
            ry: el.ry || 0,
          });
          fc.add(obj);
        } else if (el.type === 'background') {
          const obj = new Rect({
            id: el.id,
            left: 0, top: 0,
            width: fc.width,
            height: fc.height,
            fill: el.fill || '#FAF7F2',
            selectable: true,
            evented: true,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hoverCursor: 'default',
          });
          fc.add(obj);
          fc.sendObjectToBack(obj);
        } else if (el.type === 'image' && el.src) {
          FabricImage.fromURL(el.src, { crossOrigin: 'anonymous' }).then(img => {
            img.id = el.id;
            img.set({
              left: el.left || 50,
              top: el.top || 50,
              scaleX: el.scaleX || 1,
              scaleY: el.scaleY || 1,
              opacity: el.opacity !== undefined ? el.opacity : 1,
            });
            fc.add(img);
            fc.renderAll();
          });
        }
      }
    }

    // Sync selection
    const selectedObj = fc.getObjects().find(o => o.id === selectedElementId);
    if (selectedElementId && selectedObj) {
      if (fc.getActiveObject() !== selectedObj) fc.setActiveObject(selectedObj);
    } else if (!selectedElementId) {
      fc.discardActiveObject();
    }

    fc.renderAll();
    isSyncingRef.current = false;
  }, [elements, selectedElementId, canvasReady]);

  function handleClearAll() {
    const fc = canvasInstanceRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = canvasConfig.backgroundColor || '#ffffff';
    fc.renderAll();
    onSelectElement(null);
    onClearAll(); // clear React state too
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="canvas-toolbar">
        <span className="canvas-toolbar-label">
          {effectiveWidth} × {effectiveHeight} px
        </span>
        <div className="canvas-toolbar-actions">
          <Button variant="ghost" icon={ZoomIn} size="sm" onClick={() => {
            const fc = canvasInstanceRef?.current;
            if (!fc) return;
            const zoom = Math.min(fc.getZoom() * 1.15, 5);
            fc.setZoom(zoom);
            fc.renderAll();
          }} />
          <Button variant="ghost" icon={ZoomOut} size="sm" onClick={() => {
            const fc = canvasInstanceRef?.current;
            if (!fc) return;
            const zoom = Math.max(fc.getZoom() * 0.87, 0.2);
            fc.setZoom(zoom);
            fc.renderAll();
          }} />
          <Button variant="ghost" icon={RotateCcw} size="sm" onClick={onUndo}>Undo</Button>
          <Button variant="ghost" icon={RotateCw}  size="sm" onClick={onRedo}>Redo</Button>
          <Button variant="ghost" icon={Trash2} size="sm" onClick={handleClearAll}>Clear All</Button>
        </div>
      </div>

      {/* Variant switcher */}
      {variants.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, padding: '8px 12px',
          borderBottom: '1px solid var(--border)', background: 'white', flexShrink: 0,
        }}>
          {variants.map(v => {
            const isActive = v.id === activeVariantId;
            return (
              <button
                key={v.id}
                onClick={() => onVariantChange(v.id)}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: isActive ? 600 : 400,
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--black)' : 'var(--cream2)',
                  color: isActive ? 'white' : 'var(--mid)',
                  fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                }}
              >
                {v.label || `Variant ${variants.indexOf(v) + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas area */}
      <div className="canvas-area-bg">
        <div style={{
          position: 'relative',
          width: effectiveWidth * displayScale,
          height: effectiveHeight * displayScale,
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
      </div>
    </div>
  );
}
