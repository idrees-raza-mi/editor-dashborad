import { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Info, RefreshCw, ExternalLink, Square, Pencil } from 'lucide-react';
import ConfiguratorCanvas from './ConfiguratorCanvas';
import ShapeCreator from './ShapeCreator';
import Button from '../ui/Button';
import PRESET_SHAPES from '../../data/presetShapes';

const CATEGORIES = ['Shapes', 'Arches', 'Rectangles', 'Hearts', 'Stars', 'Animals', 'Custom'];

// Unit conversion — 96 DPI (1 cm = 96/2.54 px)
const CM_TO_PX = 96 / 2.54;
const pxToCm = px => Math.round(px / CM_TO_PX * 10) / 10;
const cmToPx = cm => Math.round(cm * CM_TO_PX);

function UnitToggle({ unit, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--cream2)',
      borderRadius: 20,
      padding: 2,
      border: '1px solid var(--border)',
    }}>
      {['px', 'cm'].map(u => (
        <button
          key={u}
          onClick={() => onChange(u)}
          style={{
            padding: '2px 9px',
            fontSize: 11,
            fontWeight: unit === u ? 700 : 400,
            borderRadius: 18,
            border: 'none',
            cursor: 'pointer',
            background: unit === u ? 'var(--gold)' : 'transparent',
            color: unit === u ? 'white' : 'var(--mid)',
            fontFamily: 'var(--font-body)',
            transition: 'all 0.12s',
          }}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function NumericInput({ value, onChange, min = 0, step = 1, style, placeholder }) {
  const [local, setLocal] = useState(String(value ?? ''));
  useEffect(() => { setLocal(String(value ?? '')); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      placeholder={placeholder}
      style={style}
      onChange={e => {
        const raw = e.target.value;
        if (/^[0-9.]*$/.test(raw)) setLocal(raw);
      }}
      onBlur={() => {
        const n = parseFloat(local);
        const valid = isNaN(n) || n < min ? min : n;
        setLocal(String(valid));
        onChange(valid);
      }}
    />
  );
}

const cfgInput = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '7px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  background: 'white',
  color: 'var(--black)',
  outline: 'none',
};

function getShapeName(svgPath) {
  if (!svgPath) return null;
  const preset = PRESET_SHAPES.find(s => s.svgPath === svgPath);
  return preset ? preset.name : 'Custom shape';
}

export default function CanvasConfigMode({
  variants,
  setVariants,
  canvasName,
  setCanvasName,
  canvasCategory,
  setCanvasCategory,
  onCanvasReady,
}) {
  const [activeVariantId, setActiveVariantId] = useState(variants[0]?.id || '');
  const [refreshKey, setRefreshKey]           = useState(0);
  const [shapeCreatorOpen, setShapeCreatorOpen] = useState(false);
  const [unit, setUnit]                       = useState('px');
  const configuratorCanvasRef                 = useRef(null);

  const activeVariant = variants.find(v => v.id === activeVariantId) || variants[0];

  function updateActiveVariant(changes) {
    setVariants(prev => prev.map(v =>
      v.id === activeVariantId ? { ...v, ...changes } : v
    ));
  }

  function addVariant() {
    if (variants.length >= 3) return;
    const newV = {
      id: 'cv-' + Date.now(),
      label: '',
      price: '',
      canvasWidth: 400,
      canvasHeight: 500,
      svgPath: null,
      backgroundColor: '#ffffff',
    };
    setVariants(prev => [...prev, newV]);
    setActiveVariantId(newV.id);
  }

  function removeVariant(id) {
    if (variants.length <= 1) return;
    const remaining = variants.filter(v => v.id !== id);
    setVariants(remaining);
    setActiveVariantId(remaining[0].id);
  }

  function testInEditor() {
    const config = {
      name: canvasName,
      canvasWidth: activeVariant.canvasWidth,
      canvasHeight: activeVariant.canvasHeight,
      svgClipPath: activeVariant.svgPath,
      backgroundColor: activeVariant.backgroundColor,
    };
    sessionStorage.setItem('__editor_test_config__', JSON.stringify(config));
    const editorUrl = import.meta.env.VITE_CUSTOMER_EDITOR_URL || 'http://localhost:5174';
    window.open(editorUrl + '?mode=admin-preview', '_blank');
  }

  if (!activeVariant) return null;

  const shapeName = getShapeName(activeVariant.svgPath);

  return (
    <div className="canvas-config-layout">
      {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
      <div className="canvas-config-left">

        {/* Settings card */}
        <div className="config-card">
          <div className="config-section-label">Canvas Settings</div>

          <div className="config-field">
            <label>Canvas Name</label>
            <input style={cfgInput} value={canvasName} placeholder="e.g. Bear Board, Arch Sign"
              onChange={e => setCanvasName(e.target.value)} />
          </div>

          <div className="config-field">
            <label>Category</label>
            <select style={cfgInput} value={canvasCategory} onChange={e => setCanvasCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Variant tabs */}
        <div className="variant-tabs">
          {variants.map((v, i) => (
            <button
              key={v.id}
              className={`variant-tab ${v.id === activeVariantId ? 'active' : ''}`}
              onClick={() => setActiveVariantId(v.id)}
            >
              {v.label || `Variant ${i + 1}`}
            </button>
          ))}
          {variants.length < 3 && (
            <Button variant="outline" icon={Plus} size="sm" onClick={addVariant}>
              Add Size
            </Button>
          )}
        </div>

        {/* Active variant settings */}
        <div className="config-card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            Variant Settings — {activeVariant.label || 'Unnamed'}
          </div>

          <div className="config-field-row config-field">
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 5 }}>Size Label</label>
              <input style={cfgInput} value={activeVariant.label} placeholder="e.g. 2FT, 3FT"
                onChange={e => updateActiveVariant({ label: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 5 }}>Price</label>
              <div className="price-input-wrapper">
                <span>£</span>
                <NumericInput style={cfgInput} value={activeVariant.price} min={0} step={0.01} placeholder="89.99"
                  onChange={val => updateActiveVariant({ price: val })} />
              </div>
            </div>
          </div>

          {/* Unit toggle */}
          <div className="config-field" style={{ paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--mid)' }}>Unit:</span>
              <UnitToggle unit={unit} onChange={setUnit} />
              {unit === 'cm' && (
                <span style={{ fontSize: 11, color: 'var(--light)' }}>
                  {activeVariant.canvasWidth} × {activeVariant.canvasHeight} px
                </span>
              )}
            </div>
          </div>

          <div className="config-field-row config-field">
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 5 }}>
                Width ({unit})
              </label>
              <NumericInput
                style={cfgInput}
                value={unit === 'cm' ? pxToCm(activeVariant.canvasWidth) : activeVariant.canvasWidth}
                min={unit === 'cm' ? 1 : 50}
                step={unit === 'cm' ? 0.1 : 1}
                onChange={n => updateActiveVariant({ canvasWidth: unit === 'cm' ? cmToPx(n) : Math.round(n) })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 5 }}>
                Height ({unit})
              </label>
              <NumericInput
                style={cfgInput}
                value={unit === 'cm' ? pxToCm(activeVariant.canvasHeight) : activeVariant.canvasHeight}
                min={unit === 'cm' ? 1 : 50}
                step={unit === 'cm' ? 0.1 : 1}
                onChange={n => updateActiveVariant({ canvasHeight: unit === 'cm' ? cmToPx(n) : Math.round(n) })}
              />
            </div>
          </div>

          <div className="config-field">
            <label>Background Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={activeVariant.backgroundColor || '#ffffff'}
                onChange={e => updateActiveVariant({ backgroundColor: e.target.value })}
                style={{ width: 36, height: 28, border: '1px solid var(--border)', borderRadius: 4, padding: 2, cursor: 'pointer' }} />
              <span style={{ fontSize: 12, color: 'var(--mid)', fontFamily: 'var(--font-mono)' }}>
                {activeVariant.backgroundColor || '#ffffff'}
              </span>
            </div>
          </div>

          {/* Shape boundary section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <div className="config-section-label" style={{ marginBottom: 10 }}>Shape Boundary</div>

            <div className="shape-current-display">
              {activeVariant.svgPath ? (
                <>
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
                    <path
                      d={(() => {
                        try {
                          const preset = PRESET_SHAPES.find(s => s.svgPath === activeVariant.svgPath);
                          if (preset?.svgPath) {
                            // Simple inline scale approximation for thumbnail
                            return activeVariant.svgPath;
                          }
                          return activeVariant.svgPath;
                        } catch { return ''; }
                      })()}
                      fill="var(--mid)"
                      transform="scale(0.08)"
                    />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>
                      {shapeName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--green-tx)', marginTop: 2 }}>Applied</div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
                      {activeVariant.svgPath.length} chars
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Square size={20} color="var(--light)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--mid)' }}>
                    Rectangle — no shape boundary
                  </span>
                </>
              )}
            </div>

            {activeVariant.svgPath ? (
              <Button
                variant="outline"
                icon={Pencil}
                onClick={() => setShapeCreatorOpen(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Change Shape
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={Square}
                onClick={() => setShapeCreatorOpen(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Set Shape
              </Button>
            )}
          </div>

          {variants.length > 1 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <Button variant="ghost" icon={Trash2} size="sm"
                style={{ color: 'var(--red-tx)' }}
                onClick={() => removeVariant(activeVariantId)}>
                Remove this variant
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
      <div className="canvas-config-right">

        {/* Live preview header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="config-section-label" style={{ marginBottom: 0 }}>Live Preview</span>
          <Button variant="ghost" icon={RefreshCw} size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            Refresh
          </Button>
        </div>

        {/* ConfiguratorCanvas */}
        <ConfiguratorCanvas
          key={`${activeVariant.id}-${activeVariant.canvasWidth}-${activeVariant.canvasHeight}-${refreshKey}`}
          variant={activeVariant}
          onCanvasReady={fc => { 
            configuratorCanvasRef.current = fc; 
            if (onCanvasReady) onCanvasReady(fc);
          }}
        />

        {/* Test in editor */}
        <Button variant="outline" icon={ExternalLink} size="sm" onClick={testInEditor}
          style={{ alignSelf: 'flex-start' }}>
          Test in Customer Editor
        </Button>

        {/* Instructions card */}
        <div className="instructions-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} color="var(--blue-tx)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-tx)' }}>
              How to set up the shape boundary
            </span>
          </div>
          <ol>
            <li>Click "Set Shape" and pick from the preset library or upload your own SVG</li>
            <li>The shape defines the printable area customers will design inside</li>
            <li>Each variant (2FT, 3FT, 4FT) can have a different shape</li>
            <li>The live preview shows how the shape looks on the canvas</li>
            <li>Click "Test in Customer Editor" to preview from the customer's perspective</li>
          </ol>
          <a href="https://vectorizer.ai" target="_blank" rel="noreferrer">
            Free tool: vectorizer.ai to convert images to SVG
          </a>
        </div>
      </div>

      {/* ShapeCreator modal */}
      {shapeCreatorOpen && (
        <ShapeCreator
          isOpen={shapeCreatorOpen}
          currentSvgPath={activeVariant.svgPath}
          variantLabel={activeVariant.label || 'Variant'}
          targetWidth={activeVariant.canvasWidth}
          targetHeight={activeVariant.canvasHeight}
          onConfirm={(svgPath) => {
            updateActiveVariant({ svgPath });
            setRefreshKey(k => k + 1);
          }}
          onClose={() => setShapeCreatorOpen(false)}
        />
      )}
    </div>
  );
}
