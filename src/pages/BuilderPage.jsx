import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, ChevronRight, LayoutTemplate, Layers, RefreshCw, AlertCircle, Store } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import TemplateBuilderMode from '../components/builder/TemplateBuilderMode';
import CanvasConfigMode from '../components/builder/CanvasConfigMode';
import ExportProgressModal from '../components/modals/ExportProgressModal';
import ExportPreviewModal from '../components/modals/ExportPreviewModal';
import PublishProductModal from '../components/modals/PublishProductModal';
import { buildTemplateJSON, buildTemplateMetaobjectFields, buildCanvasMetaobjectFields, buildCanvasVariantFields, buildAllVariantsJSON } from '../utils/exportTemplate';
import { callAdminProxy, uploadImageToShopify } from '../utils/shopifyAdmin';
import { publishTemplateAsProduct } from '../utils/shopifyProduct';
import { hasUnsavedBlobUrls } from '../utils/sanitizeTemplateJSON';
import { readSVGFile, validateSVGFile, parseSVGToElements } from '../utils/svgImporter';

const MODE_TABS = [
  { id: 'template', label: 'Premade Template' },
  { id: 'canvas',   label: 'Canvas Config' },
];

const inputStyle = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  background: 'white',
  width: '100%',
  outline: 'none',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Wait for all fabric Image objects to finish loading
const waitForCanvasImages = (fabricCanvas) => {
  return new Promise((resolve) => {
    if (!fabricCanvas) { resolve(); return; }
    const objects = fabricCanvas.getObjects();
    const imageObjects = objects.filter(obj => obj.type === 'image');
    if (imageObjects.length === 0) { resolve(); return; }
    
    let loadedCount = 0;
    const total = imageObjects.length;
    
    imageObjects.forEach(img => {
      const el = img.getElement ? img.getElement() : null;
      if (el && el.complete && el.naturalWidth > 0) {
        loadedCount++;
        if (loadedCount === total) resolve();
      } else if (el) {
        el.onload = () => { loadedCount++; if (loadedCount === total) resolve(); };
        el.onerror = () => { loadedCount++; if (loadedCount === total) resolve(); };
      } else {
        loadedCount++;
        if (loadedCount === total) resolve();
      }
    });
    
    setTimeout(resolve, 5000);
  });
};

// Capture high-resolution preview image
const captureHighResPreview = async (fabricCanvas) => {
  if (!fabricCanvas) return null;
  
  await waitForCanvasImages(fabricCanvas);
  await new Promise(r => requestAnimationFrame(r));
  fabricCanvas.renderAll();
  await new Promise(r => setTimeout(r, 300));
  
  const savedBg = fabricCanvas.backgroundColor;
  if (!savedBg || savedBg === 'transparent' || savedBg === '') {
    fabricCanvas.setBackgroundColor('#ffffff', () => {});
    fabricCanvas.renderAll();
  }
  
  const dataUrl = fabricCanvas.toDataURL({
    format: 'jpeg',
    quality: 0.92,
    multiplier: 2
  });
  
  if (savedBg) {
    fabricCanvas.setBackgroundColor(savedBg, () => {});
    fabricCanvas.renderAll();
  }
  
  return dataUrl;
};
const isDev = window.location.hostname === 'localhost';

// Unit conversion — 96 DPI standard (1 inch = 96 px, 1 cm = 96/2.54 px)
const CM_TO_PX = 96 / 2.54;
const pxToCm = px  => Math.round(px  / CM_TO_PX * 10) / 10;   // 1 decimal place
const cmToPx = cm  => Math.round(cm  * CM_TO_PX);

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
          onClick={e => { e.stopPropagation(); onChange(u); }}
          style={{
            padding: '3px 10px',
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

const TEMPLATE_STEPS = [
  { id: 'build', label: 'Building template JSON...' },
  { id: 'image', label: 'Uploading preview image...' },
  { id: 'save',  label: 'Saving to Shopify Metaobjects...' },
  { id: 'done',  label: 'Done!' },
];

const CANVAS_STEPS = [
  { id: 'build', label: 'Building canvas config...' },
  { id: 'save',  label: 'Saving to Shopify Metaobjects...' },
  { id: 'done',  label: 'Done!' },
];

// ── Canvas Setup Screen ──────────────────────────────────────────
function CanvasSetup({ onComplete }) {
  const { canvases } = useAppContext();
  const [productName, setProductName]   = useState('');
  const [sizeOption, setSizeOption]     = useState('simple'); // 'simple' | 'load'
  const [customW, setCustomW]           = useState(600);
  const [customH, setCustomH]           = useState(500);
  const [bgColor, setBgColor]           = useState('#FAF7F2');
  const [unit, setUnit]                 = useState('px');
  const [selectedCanvasId, setSelectedCanvasId] = useState(canvases[0]?.id || '');

  const dispW = unit === 'cm' ? pxToCm(customW) : customW;
  const dispH = unit === 'cm' ? pxToCm(customH) : customH;

  function handleWChange(val) {
    const n = Number(val);
    if (isNaN(n) || n <= 0) return;
    setCustomW(unit === 'cm' ? cmToPx(n) : n);
  }
  function handleHChange(val) {
    const n = Number(val);
    if (isNaN(n) || n <= 0) return;
    setCustomH(unit === 'cm' ? cmToPx(n) : n);
  }

  function handleStart() {
    let width = customW, height = customH, svgPath = null, bg = bgColor;

    if (sizeOption === 'load' && selectedCanvasId) {
      const c = canvases.find(cv => cv.id === selectedCanvasId);
      if (c?.variants?.[0]) {
        width   = c.variants[0].canvasWidth;
        height  = c.variants[0].canvasHeight;
        svgPath = c.variants[0].svgPath   || null;
        bg      = c.variants[0].backgroundColor || bgColor;
      }
    }

    onComplete({
      productName,
      canvasConfig: { width, height, backgroundColor: bg, svgPath },
    });
  }

  const canStart = productName.trim().length > 0;

  return (
    <div style={{ maxWidth: 580, margin: '40px auto' }}>
      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 32,
      }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 6 }}>
          Set Up Your Template
        </h2>
        <p style={{ color: 'var(--mid)', fontSize: 13, marginBottom: 28 }}>
          Name your product and choose the canvas size before building.
        </p>

        {/* Product name */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Product Name
          </label>
          <input
            style={inputStyle}
            value={productName}
            placeholder="e.g. Happy Birthday Banner"
            onChange={e => setProductName(e.target.value)}
          />
        </div>

        {/* Canvas size options */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Canvas Size
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Option 1: Simple size */}
            <div
              onClick={() => setSizeOption('simple')}
              style={{
                border: `2px solid ${sizeOption === 'simple' ? 'var(--black)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                cursor: 'pointer',
                background: sizeOption === 'simple' ? 'var(--cream)' : 'white',
                transition: 'all 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sizeOption === 'simple' ? 12 : 0 }}>
                <LayoutTemplate size={16} color="var(--mid)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>Simple Size</span>
                <span style={{ fontSize: 12, color: 'var(--light)', marginLeft: 'auto' }}>Set width & height</span>
              </div>
              {sizeOption === 'simple' && (
                <div onClick={e => e.stopPropagation()}>
                  {/* Unit toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>Unit:</span>
                    <UnitToggle unit={unit} onChange={setUnit} />
                    {unit === 'cm' && (
                      <span style={{ fontSize: 11, color: 'var(--light)' }}>
                        ({customW} × {customH} px)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mid)', display: 'block', marginBottom: 4 }}>
                        Width ({unit})
                      </label>
                      <input
                        style={{ ...inputStyle, fontSize: 13 }}
                        type="number"
                        min={unit === 'cm' ? 1 : 100}
                        step={unit === 'cm' ? 0.1 : 1}
                        value={dispW}
                        onChange={e => handleWChange(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mid)', display: 'block', marginBottom: 4 }}>
                        Height ({unit})
                      </label>
                      <input
                        style={{ ...inputStyle, fontSize: 13 }}
                        type="number"
                        min={unit === 'cm' ? 1 : 100}
                        step={unit === 'cm' ? 0.1 : 1}
                        value={dispH}
                        onChange={e => handleHChange(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mid)', display: 'block', marginBottom: 4 }}>Background</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                          style={{ width: 36, height: 32, border: '1px solid var(--border)', borderRadius: 4, padding: 2, cursor: 'pointer' }} />
                        <span style={{ fontSize: 11, color: 'var(--mid)' }}>{bgColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Option 2: Load canvas */}
            <div
              onClick={() => setSizeOption('load')}
              style={{
                border: `2px solid ${sizeOption === 'load' ? 'var(--black)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                cursor: 'pointer',
                background: sizeOption === 'load' ? 'var(--cream)' : 'white',
                transition: 'all 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sizeOption === 'load' ? 12 : 0 }}>
                <Layers size={16} color="var(--mid)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>Load Canvas</span>
                <span style={{ fontSize: 12, color: 'var(--light)', marginLeft: 'auto' }}>Use a saved canvas shape</span>
              </div>
              {sizeOption === 'load' && (
                canvases.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--light)' }}>No canvases saved yet. Create one in Canvas Config first.</p>
                ) : (
                  <div onClick={e => e.stopPropagation()}>
                    {/* Canvas picker */}
                    <select
                      style={{ ...inputStyle, fontSize: 13, marginBottom: 12 }}
                      value={selectedCanvasId}
                      onChange={e => setSelectedCanvasId(e.target.value)}
                    >
                      {canvases.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.variants.length} variant{c.variants.length !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Preview of selected canvas */}
                    {(() => {
                      const sel = canvases.find(c => c.id === selectedCanvasId);
                      if (!sel) return null;
                      return (
                        <div style={{
                          background: 'var(--cream2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: 12,
                          display: 'flex',
                          gap: 14,
                          alignItems: 'flex-start',
                        }}>
                          {/* Shape SVG preview */}
                          <div style={{
                            width: 72, height: 72, flexShrink: 0,
                            background: 'white', border: '1px solid var(--border)',
                            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {sel.variants[0]?.svgPath ? (
                              <svg
                                viewBox={`0 0 ${sel.variants[0].canvasWidth} ${sel.variants[0].canvasHeight}`}
                                style={{ width: 54, height: 54 }}
                              >
                                <path
                                  d={sel.variants[0].svgPath}
                                  fill={sel.variants[0].backgroundColor || '#FAF7F2'}
                                  stroke="rgba(0,0,0,0.2)"
                                  strokeWidth={sel.variants[0].canvasWidth * 0.014}
                                />
                              </svg>
                            ) : (
                              <div style={{
                                width: 44, height: 44,
                                background: sel.variants[0]?.backgroundColor || '#FAF7F2',
                                border: '1.5px solid rgba(0,0,0,0.15)',
                                borderRadius: 3,
                              }} />
                            )}
                          </div>
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', marginBottom: 6 }}>
                              {sel.name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {sel.variants.map(v => (
                                <span key={v.id} style={{
                                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                  background: 'white', border: '1px solid var(--border)',
                                  color: 'var(--mid)',
                                }}>
                                  {v.label || 'Variant'} — {v.canvasWidth}×{v.canvasHeight}px
                                  {v.svgPath ? ' · shape' : ' · rect'}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--green-tx)', marginTop: 6 }}>
                              Shape boundary will be applied to the builder canvas
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )
              )}
            </div>

          </div>
        </div>

        <Button
          variant="primary"
          icon={ChevronRight}
          onClick={handleStart}
          disabled={!canStart}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Start Building
        </Button>
        {!canStart && (
          <p style={{ fontSize: 11, color: 'var(--light)', marginTop: 8, textAlign: 'center' }}>
            Enter a product name to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main BuilderPage ─────────────────────────────────────────────
export default function BuilderPage() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const { addCanvas, addTemplate, templates, canvases } = useAppContext();

  const [mode, setMode]           = useState(params.get('mode') || 'template');
  const [setupDone, setSetupDone] = useState(false);
  const [canvasConfig, setCanvasConfig] = useState({ width: 600, height: 500, backgroundColor: '#FAF7F2' });

  const [selectedElementId, setSelectedElementId] = useState(null);

  // Template state
  const [variants, setVariants]           = useState([
    { id: 'v1', label: '', price: '', canvasWidth: 600, canvasHeight: 500 },
  ]);
  const [activeVariantId, setActiveVariantId] = useState('v1');

  // ── Per-variant element storage ──────────────────────────────────
  // Each variant gets its own independent elements array.
  // Shape: { [variantId]: elements[] }
  // IMPORTANT: declared after activeVariantId to avoid Temporal Dead Zone.
  const [variantElements, setVariantElements] = useState({ 'v1': [] });

  // Derived: the active variant's elements (stable reference when unchanged)
  const elements = variantElements[activeVariantId] || variantElements['v1'] || [];

  // Setter — always writes into the currently active variant's slot
  const setElements = useCallback((updaterOrValue) => {
    setVariantElements(prev => {
      const current = prev[activeVariantId] || [];
      const next = typeof updaterOrValue === 'function'
        ? updaterOrValue(current)
        : updaterOrValue;
      return { ...prev, [activeVariantId]: next };
    });
  }, [activeVariantId]);
  const [templateName, setTemplateName]       = useState('');
  const [templateCategory, setTemplateCategory] = useState('Birthday');

  // Component permissions state (lifted here so buildTemplateJSON can access it)
  const [componentSettings, setComponentSettings] = useState({
    text:       { enabled: true,  allow_add: false },
    image:      { enabled: true,  allow_add: false },
    shape:      { enabled: false, allow_add: false },
    background: { enabled: true },
  });

  // Export preview modal state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewJSON, setPreviewJSON]       = useState(null);

  // Canvas config state
  const [canvasName, setCanvasName]           = useState('');
  const [canvasCategory, setCanvasCategory]   = useState('Shapes');
  const [canvasVariants, setCanvasVariants]   = useState([{
    id: 'cv-' + Date.now(),
    label: '', price: '',
    canvasWidth: 400, canvasHeight: 500,
    svgPath: null, backgroundColor: '#ffffff',
  }]);
  const configuratorCanvasRef = useRef(null);
  const canvasInstanceRef     = useRef(null);
  const svgImportInputRef     = useRef(null);

  // SVG import state
  const [importing,    setImporting]    = useState(false);
  const [importError,  setImportError]  = useState(null);

  // ── B2: Load existing template/canvas for editing ─────────────────
  useEffect(() => {
    const editId   = params.get('id');
    const editMode = params.get('mode');
    if (!editId) return;

    if (editMode === 'template') {
      const existing = templates.find(t => t.id === editId);
      if (!existing) return;
      const tj = existing.templateJSON;
      if (tj) {
        setCanvasConfig({
          width:           tj.canvasWidth  || existing.canvasWidth  || 800,
          height:          tj.canvasHeight || existing.canvasHeight || 600,
          backgroundColor: tj.background  || existing.backgroundColor || '#ffffff',
          name:            existing.name,
        });
        if (tj.component_permissions) setComponentSettings(tj.component_permissions);
        // Restore elements and wire them into the correct variant slot
        let restored = [];
        if (tj.objects) {
          restored = tj.objects.map(obj => ({
            id:           obj.id || ('el-' + Date.now() + Math.random()),
            type:         obj.element_type || 'text',
            name:         obj.label || obj.element_type || 'Element',
            left:         obj.left  || 0,
            top:          obj.top   || 0,
            width:        obj.width,
            height:       obj.height,
            scaleX:       obj.scaleX || 1,
            scaleY:       obj.scaleY || 1,
            angle:        obj.angle  || 0,
            text:         obj.text   || '',
            fontFamily:   obj.fontFamily || 'Arial',
            fontSize:     obj.fontSize   || 32,
            fill:         obj.fill       || '#000000',
            fontWeight:   obj.fontWeight || 'normal',
            fontStyle:    obj.fontStyle  || 'normal',
            src:          obj.src   || null,
            fabricType:   obj.type  || 'i-text',
            label:        obj.label || '',
            required:     obj.required || false,
            element_type: obj.element_type || 'text',
            permissions:  obj.permissions || {
              content: 'fixed', position: 'locked', size: 'locked',
              rotation: 'locked', delete: 'no',
              font_family: 'locked', font_size: 'locked', font_color: 'locked',
            },
          }));
        }
        setTemplateName(existing.name || '');
        setTemplateCategory(existing.category || 'Birthday');
        if (existing.variants?.length > 0) {
          const firstVarId = existing.variants[0].id;
          // Write restored elements directly into the first variant's slot
          setVariantElements({ [firstVarId]: restored });
          setVariants(existing.variants);
          setActiveVariantId(firstVarId);
        } else if (restored.length > 0) {
          setVariantElements({ 'v1': restored });
        }
        setSetupDone(true);
        setMode('template');
      }
    }

    if (editMode === 'canvas') {
      const existing = canvases.find(c => c.id === editId);
      if (!existing) return;
      setCanvasName(existing.name || '');
      setCanvasCategory(existing.category || 'Shapes');
      if (existing.variants?.length > 0) setCanvasVariants(existing.variants);
      setMode('canvas');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast
  const [toast, setToast] = useState(null);
  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  // Export progress modal state
  const [exportVisible, setExportVisible] = useState(false);
  const [exportSteps, setExportSteps]     = useState([]);
  const [exportError, setExportError]     = useState(null);
  const lastExportAction = useRef(null);

  // Publish modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishResult, setPublishResult]       = useState(null);
  const [existingProductId, setExistingProductId] = useState(null); // eslint-disable-line no-unused-vars

  // Blob URL warning — images not yet uploaded to Shopify CDN
  const [hasBlobImages, setHasBlobImages] = useState(false);
  useEffect(() => {
    const json = buildTemplateJSON(elements, canvasConfig, componentSettings);
    setHasBlobImages(hasUnsavedBlobUrls(json));
  }, [elements]);

  function handlePublishClick() {
    const currentJSON = buildTemplateJSON(elements, canvasConfig, componentSettings);
    if (hasUnsavedBlobUrls(currentJSON)) {
      console.info('[Builder] Template contains blob URLs — they will be uploaded to Shopify during publish');
    }
    setShowPublishModal(true);
  }

  function updateStep(stepId, status) {
    setExportSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
  }

  // ── Variant tab switch — saves current variant, loads next ───────
  // If the target variant has no elements yet, seeds a proportionally
  // scaled copy of the current variant's elements as a starting point.
  function handleVariantChange(newVariantId) {
    if (newVariantId === activeVariantId) return;

    const prevVariant = variants.find(v => v.id === activeVariantId);
    const newVariant  = variants.find(v => v.id === newVariantId);

    // Seed the new variant with a scaled copy if it's empty
    if (newVariant && prevVariant) {
      setVariantElements(prev => {
        if (prev[newVariantId] && prev[newVariantId].length > 0) return prev;
        const sx = prevVariant.canvasWidth  > 0 ? newVariant.canvasWidth  / prevVariant.canvasWidth  : 1;
        const sy = prevVariant.canvasHeight > 0 ? newVariant.canvasHeight / prevVariant.canvasHeight : 1;
        const seeded = (prev[activeVariantId] || []).map(el => ({
          ...el,
          id:       el.id + '-' + newVariantId,
          left:     (el.left  || 0) * sx,
          top:      (el.top   || 0) * sy,
          width:    el.width  ? el.width  * sx : el.width,
          height:   el.height ? el.height * sy : el.height,
          fontSize: el.fontSize ? Math.round(el.fontSize * Math.min(sx, sy)) : el.fontSize,
        }));
        return { ...prev, [newVariantId]: seeded };
      });
    }

    setActiveVariantId(newVariantId);
  }

  // ── Variants list change (add / remove from VariantsEditor) ──────
  function handleVariantsChange(newVariants) {
    const oldIds        = new Set(variants.map(v => v.id));
    const addedVariants = newVariants.filter(v => !oldIds.has(v.id));
    const removedIds    = variants.filter(v => !newVariants.some(nv => nv.id === v.id)).map(v => v.id);

    setVariants(newVariants);

    // Remove element snapshots for deleted variants
    if (removedIds.length > 0) {
      setVariantElements(prev => {
        const next = { ...prev };
        removedIds.forEach(id => { delete next[id]; });
        return next;
      });
    }

    // Seed element snapshots for newly added variants
    if (addedVariants.length > 0) {
      const srcVariant = variants.find(v => v.id === activeVariantId) || variants[0];
      setVariantElements(prev => {
        const srcEls = prev[srcVariant?.id] || [];
        const next   = { ...prev };
        addedVariants.forEach(nv => {
          const sx = srcVariant?.canvasWidth  > 0 ? (nv.canvasWidth  || srcVariant.canvasWidth)  / srcVariant.canvasWidth  : 1;
          const sy = srcVariant?.canvasHeight > 0 ? (nv.canvasHeight || srcVariant.canvasHeight) / srcVariant.canvasHeight : 1;
          next[nv.id] = srcEls.map(el => ({
            ...el,
            id:       el.id + '-' + nv.id,
            left:     (el.left  || 0) * sx,
            top:      (el.top   || 0) * sy,
            width:    el.width  ? el.width  * sx : el.width,
            height:   el.height ? el.height * sy : el.height,
            fontSize: el.fontSize ? Math.round(el.fontSize * Math.min(sx, sy)) : el.fontSize,
          }));
        });
        return next;
      });
    }
  }

  function handleSetupComplete({ productName, canvasConfig: cfg }) {
    setTemplateName(productName);
    setCanvasConfig(cfg);
    setVariants(prev => prev.map((v, i) => i === 0
      ? { ...v, canvasWidth: cfg.width, canvasHeight: cfg.height }
      : v
    ));
    setSetupDone(true);
  }

  async function runExportTemplate() {
    setExportVisible(true);
    setExportSteps(TEMPLATE_STEPS.map(s => ({ ...s, status: 'pending' })));
    setExportError(null);

    try {
      // Step 1: Build JSON
      updateStep('build', 'active');
      const templateJSON = buildTemplateJSON(elements, canvasConfig, componentSettings);
      await sleep(400);
      updateStep('build', 'done');

      // Step 2: Upload preview image
      updateStep('image', 'active');
      let previewImageUrl = '';
      let previewFileId   = '';
      try {
        const fc = canvasInstanceRef?.current;
        if (fc) {
          const dataUrl = await captureHighResPreview(fc);
          const response = await fetch(dataUrl);
          const blob     = await response.blob();
          const filename = (templateName || 'template').replace(/\s+/g, '-').toLowerCase()
            + '-preview-' + Date.now() + '.jpg';
          if (!isDev) {
            const uploaded = await uploadImageToShopify(blob, filename);
            previewImageUrl = uploaded.cdnUrl  || '';
            previewFileId   = uploaded.fileId  || '';
          } else {
            await sleep(600);
          }
        }
      } catch (imgErr) {
        console.warn('Preview image upload failed, continuing without it:', imgErr);
      }
      updateStep('image', 'done');

      // Step 3: Save metaobject
      updateStep('save', 'active');

      // Build independent per-variant JSON from each variant's own elements snapshot
      const variantsWithJSON = buildAllVariantsJSON(variantElements, variants, canvasConfig, componentSettings);

      const fields = buildTemplateMetaobjectFields(
        {
          name:            templateName,
          category:        templateCategory,
          canvasWidth:     canvasConfig.width,
          canvasHeight:    canvasConfig.height,
          backgroundColor: canvasConfig.backgroundColor,
          svgClipPath:     canvasConfig.svgPath || null,
          templateJSON,
          variants:        variantsWithJSON,
        },
        previewFileId
      );

      if (!isDev) {
        const metaobject = await callAdminProxy('createMetaobject', {
          type: 'design_template',
          fields,
        });
        addTemplate({
          id: 'tpl-' + Date.now(),
          name: templateName,
          canvasWidth: canvasConfig.width,
          canvasHeight: canvasConfig.height,
          backgroundColor: canvasConfig.backgroundColor,
          category: templateCategory,
          elements: elements.length,
          editableFields: elements.filter(e => e.permissions?.content !== 'fixed').length,
          status: 'uploaded',
          metaobjectId: metaobject.id,
          variants: variantsWithJSON,
          templateJSON,
          previewImageUrl,
          previewFileId,
          createdAt: new Date().toISOString().split('T')[0],
        });
      } else {
        await sleep(500);
        addTemplate({
          id: 'tpl-' + Date.now(),
          name: templateName || 'New Template',
          canvasWidth: canvasConfig.width,
          canvasHeight: canvasConfig.height,
          backgroundColor: canvasConfig.backgroundColor,
          category: templateCategory,
          elements: elements.length,
          editableFields: elements.filter(e => e.permissions?.content !== 'fixed').length,
          status: 'not_uploaded',
          metaobjectId: null,
          variants: variantsWithJSON,
          templateJSON,
          previewImageUrl,
          previewFileId,
          createdAt: new Date().toISOString().split('T')[0],
        });
      }
      updateStep('save', 'done');
      updateStep('done', 'done');

    } catch (err) {
      setExportError(err.message);
    }
  }

  async function runSaveCanvas() {
    if (!canvasName.trim()) {
      showToast('Please enter a canvas name', 'error');
      return;
    }
    const incomplete = canvasVariants.filter(v => !v.label || !v.price);
    if (incomplete.length > 0) {
      showToast('Please complete all variant labels and prices', 'error');
      return;
    }

    setExportVisible(true);
    setExportSteps(CANVAS_STEPS.map(s => ({ ...s, status: 'pending' })));
    setExportError(null);

    try {
      // Step 1: Build config (single metaobject with all variants in variants_json)
      updateStep('build', 'active');
      const fields = buildCanvasMetaobjectFields(
        { name: canvasName, category: canvasCategory },
        canvasVariants
      );
      await sleep(400);
      updateStep('build', 'done');

      // Step 2: Save as single canvas_config metaobject
      updateStep('save', 'active');

      let metaobjectId = null;
      if (!isDev) {
        const metaobject = await callAdminProxy('createMetaobject', {
          type: 'canvas_config',
          fields,
        });
        metaobjectId = metaobject.id;
      } else {
        await sleep(500);
      }

      addCanvas({
        id: 'cvs-' + Date.now(),
        name: canvasName,
        category: canvasCategory,
        status: isDev ? 'not_uploaded' : 'uploaded',
        metaobjectId,
        createdAt: new Date().toISOString().split('T')[0],
        variants: canvasVariants,
      });

      updateStep('save', 'done');
      updateStep('done', 'done');

    } catch (err) {
      setExportError(err.message);
    }
  }

  function handleExportClose() {
    const allDone = exportSteps.every(s => s.status === 'done');
    setExportVisible(false);
    if (allDone) {
      navigate('/templates');
    }
  }

  function handleExportRetry() {
    if (lastExportAction.current === 'template') runExportTemplate();
    else runSaveCanvas();
  }

  async function handleSVGImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    const validation = validateSVGFile(file);
    if (!validation.valid) {
      setImportError(validation.error);
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const svgString = await readSVGFile(file);

      const importedElements = await parseSVGToElements(
        svgString,
        canvasConfig.width  || 800,
        canvasConfig.height || 600
      );

      if (importedElements.length === 0) {
        setImportError('No elements found in this SVG file. Try simplifying it in Illustrator.');
        return;
      }

      setElements(importedElements);
      setMode('template');
      console.info(`Imported ${importedElements.length} elements from SVG.`);

    } catch (err) {
      setImportError('Failed to parse SVG: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  function handleExportTemplate() {
    if (!templateName.trim()) {
      showToast('Please enter a template name', 'error');
      return;
    }
    if (elements.length === 0) {
      showToast('Please add at least one element', 'error');
      return;
    }
    if (variants.length === 0) {
      showToast('Please add at least one size variant', 'error');
      return;
    }
    const incomplete = variants.filter(v => !v.label || !v.price);
    if (incomplete.length > 0) {
      showToast('Please complete all variant details (label and price)', 'error');
      return;
    }
    // Build preview JSON and show review modal before actually exporting
    const json = buildTemplateJSON(elements, canvasConfig, componentSettings);
    setPreviewJSON(json);
    setPreviewVisible(true);
    lastExportAction.current = 'template';
  }

  function handlePreviewConfirm() {
    setPreviewVisible(false);
    runExportTemplate();
  }

  function handleSaveCanvas() {
    lastExportAction.current = 'canvas';
    runSaveCanvas();
  }

  function handleSaveDraft() {
    if (!templateName.trim()) {
      showToast('Please enter a template name', 'error');
      return;
    }
    const templateJSON = buildTemplateJSON(elements, canvasConfig, componentSettings);
    const draft = {
      name: templateName,
      category: templateCategory,
      templateJSON,
      variants,
      canvasConfig,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      'template_draft_' + templateName.replace(/\s+/g, '_').toLowerCase(),
      JSON.stringify(draft)
    );
    showToast('Draft saved', 'success');
  }

  async function handlePublish(productDetails, onProgress) {
    const { productTitle, productDescription, selectedVariants } = productDetails;

    // Build independent per-variant JSON for every variant
    const allVariantsJSON = buildAllVariantsJSON(variantElements, variants, canvasConfig, componentSettings);

    // Primary templateJSON = active variant (backwards compat for shopifyProduct.js)
    const primaryTemplateJSON =
      allVariantsJSON.find(v => v.id === activeVariantId)?.templateJSON ||
      allVariantsJSON[0]?.templateJSON ||
      buildTemplateJSON(elements, canvasConfig, componentSettings);

    // Enrich the selected variants with their own templateJSON
    const selectedVariantsWithJSON = selectedVariants.map(sv => {
      const match = allVariantsJSON.find(v => v.id === sv.id);
      return match ? { ...sv, templateJSON: match.templateJSON } : sv;
    });

    let canvasDataUrl = null;
    try {
      const fc = canvasInstanceRef.current;
      console.log('[PUBLISH] Canvas ref:', !!fc);
      if (fc) {
        canvasDataUrl = fc.toDataURL({ format: 'png', quality: 0.85 });
        console.log('[PUBLISH] Data URL length:', canvasDataUrl?.length);
      }
    } catch (e) {
      console.warn('Canvas capture failed:', e);
    }

    const result = await publishTemplateAsProduct({
      templateJSON: primaryTemplateJSON,
      canvasDataUrl,
      productTitle,
      productDescription,
      variants: selectedVariantsWithJSON,
      designType: 'template',
      onProgress,
    });

    setPublishResult(result);

    addTemplate({
      id: 'tpl-' + Date.now(),
      name: productTitle,
      productId: result.productId,
      productHandle: result.productHandle,
      status: 'published',
      templateJSON: primaryTemplateJSON,
      previewImageUrl: result.imageUrl,
      variants: selectedVariantsWithJSON,
      createdAt: new Date().toISOString().split('T')[0],
    });

    return result;
  }

  async function handlePublishCanvas(productDetails, onProgress) {
    const { productTitle, productDescription, selectedVariants } = productDetails;

    // Get preview image from configurator canvas
    let canvasDataUrl = null;
    try {
      const fc = configuratorCanvasRef.current;
      console.log('[PUBLISH CANVAS] Canvas ref:', !!fc);
      if (fc) {
        canvasDataUrl = fc.toDataURL({ format: 'png', quality: 0.85 });
        console.log('[PUBLISH CANVAS] Data URL length:', canvasDataUrl?.length);
      }
    } catch (e) {
      console.warn('Canvas capture failed:', e);
    }

    // Build variants JSON from canvasVariants
    const variantsData = canvasVariants.map(v => ({
      id: v.id,
      label: v.label,
      price: v.price,
      canvasWidth: v.canvasWidth,
      canvasHeight: v.canvasHeight,
      svgPath: v.svgPath,
      backgroundColor: v.backgroundColor,
    }));

    const result = await publishTemplateAsProduct({
      templateJSON: { design_type: 'canvas', variants: variantsData },
      canvasDataUrl,
      productTitle,
      productDescription,
      variants: selectedVariants,
      designType: 'canvas',
      onProgress,
    });

    setPublishResult(result);

    addCanvas({
      id: 'cvs-' + Date.now(),
      name: productTitle,
      category: canvasCategory,
      productId: result.productId,
      productHandle: result.productHandle,
      status: 'published',
      metaobjectId: null,
      createdAt: new Date().toISOString().split('T')[0],
      variants: canvasVariants,
      previewImageUrl: result.imageUrl || null,
    });

    return result;
  }

  return (
    <div className="page-content">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Export Preview Modal — shown before upload for admin review */}
      <ExportPreviewModal
        visible={previewVisible}
        templateJSON={previewJSON}
        templateName={templateName}
        canvasConfig={canvasConfig}
        onCancel={() => setPreviewVisible(false)}
        onConfirm={handlePreviewConfirm}
      />

      {/* Export Progress Modal */}
      <ExportProgressModal
        visible={exportVisible}
        steps={exportSteps}
        error={exportError}
        onRetry={handleExportRetry}
        onClose={handleExportClose}
      />

      {/* Publish Product Modal */}
      {showPublishModal && (
        <PublishProductModal
          isOpen={showPublishModal}
          templateName={mode === 'template' ? templateName : canvasName}
          variants={mode === 'template' ? variants : canvasVariants}
          designType={mode}
          templateJSON={mode === 'template'
            ? (elements.length > 0 ? buildTemplateJSON(elements, canvasConfig, componentSettings) : null)
            : { design_type: 'canvas', variants: canvasVariants }}
          onConfirm={mode === 'template' ? handlePublish : handlePublishCanvas}
          onClose={() => setShowPublishModal(false)}
        />
      )}

      {/* Page Header */}
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="ghost" icon={ArrowLeft} size="sm" onClick={() => navigate('/templates')} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>Template Builder</h1>
          {(mode === 'template' ? templateName : canvasName) && (
            <span style={{ fontSize: 13, color: 'var(--mid)' }}>
              — {mode === 'template' ? templateName : canvasName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {mode === 'canvas' ? (
            <>
              <Button variant="primary" icon={Store} onClick={() => setShowPublishModal(true)} disabled={!canvasName.trim()}>
                Publish to Shopify
              </Button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn-import-svg"
                  onClick={() => svgImportInputRef.current?.click()}
                  disabled={importing}
                  title="Import SVG file exported from Adobe Illustrator"
                >
                  {importing
                    ? <><RefreshCw size={15} className="spin" /> Importing...</>
                    : <><Upload size={15} /> Import SVG</>
                  }
                </button>
                {importError && (
                  <span className="import-error-inline">
                    <AlertCircle size={13} /> {importError}
                  </span>
                )}
              </div>
              {hasBlobImages && (
                <div className="blob-warning-notice">
                  ⚠ Some images are not yet uploaded to Shopify. They will be uploaded automatically when you publish.
                </div>
              )}
              <Button variant="outline" icon={Save} onClick={handleSaveDraft} disabled={!setupDone}>Save Draft</Button>
              <Button variant="primary" icon={Store} onClick={handlePublishClick} disabled={!setupDone}>
                Publish to Shopify
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {MODE_TABS.map(tab => {
          const isActive = tab.id === mode;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              style={{
                padding: '10px 18px', fontSize: 13,
                fontWeight: isActive ? 600 : 500, border: 'none', background: 'none',
                color: isActive ? 'var(--black)' : 'var(--mid)',
                borderBottom: isActive ? '2px solid var(--black)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1, fontFamily: 'var(--font-body)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Hidden SVG import input */}
      <input
        ref={svgImportInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleSVGImport}
      />

      {/* Tab content */}
      {mode === 'template' ? (
        !setupDone ? (
          <CanvasSetup onComplete={handleSetupComplete} />
        ) : (
          <TemplateBuilderMode
            elements={elements}
            setElements={setElements}
            selectedElementId={selectedElementId}
            setSelectedElementId={setSelectedElementId}
            canvasConfig={canvasConfig}
            onCanvasConfigChange={setCanvasConfig}
            variants={variants}
            setVariants={handleVariantsChange}
            activeVariantId={activeVariantId}
            setActiveVariantId={handleVariantChange}
            templateName={templateName}
            setTemplateName={setTemplateName}
            templateCategory={templateCategory}
            setTemplateCategory={setTemplateCategory}
            componentSettings={componentSettings}
            onComponentSettingsChange={setComponentSettings}
            onCanvasReady={fc => { canvasInstanceRef.current = fc; }}
          />
        )
      ) : (
        <CanvasConfigMode
          variants={canvasVariants}
          setVariants={setCanvasVariants}
          canvasName={canvasName}
          setCanvasName={setCanvasName}
          canvasCategory={canvasCategory}
          setCanvasCategory={setCanvasCategory}
          onCanvasReady={fc => { configuratorCanvasRef.current = fc; }}
        />
      )}
    </div>
  );
}
