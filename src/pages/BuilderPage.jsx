import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, ChevronRight, LayoutTemplate, Layers, PenTool } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import TemplateBuilderMode from '../components/builder/TemplateBuilderMode';
import CanvasConfigMode from '../components/builder/CanvasConfigMode';
import ExportProgressModal from '../components/modals/ExportProgressModal';
import ExportPreviewModal from '../components/modals/ExportPreviewModal';
import { buildTemplateJSON, buildTemplateMetaobjectFields, buildCanvasMetaobjectFields } from '../utils/exportTemplate';
import { callAdminProxy } from '../utils/shopifyAdmin';

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
  const [sizeOption, setSizeOption]     = useState('simple'); // 'simple' | 'load' | 'create'
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
    let width = customW, height = customH;

    if (sizeOption === 'load' && selectedCanvasId) {
      const c = canvases.find(cv => cv.id === selectedCanvasId);
      if (c?.variants?.[0]) {
        width  = c.variants[0].canvasWidth;
        height = c.variants[0].canvasHeight;
      }
    }

    onComplete({
      productName,
      canvasConfig: { width, height, backgroundColor: bgColor },
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
                  <p style={{ fontSize: 13, color: 'var(--light)' }}>No canvases saved yet.</p>
                ) : (
                  <select
                    style={{ ...inputStyle, fontSize: 13 }}
                    value={selectedCanvasId}
                    onChange={e => setSelectedCanvasId(e.target.value)}
                  >
                    {canvases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.variants[0]?.canvasWidth}×{c.variants[0]?.canvasHeight}px
                      </option>
                    ))}
                  </select>
                )
              )}
            </div>

            {/* Option 3: Create new shape */}
            <div
              onClick={() => setSizeOption('create')}
              style={{
                border: `2px solid ${sizeOption === 'create' ? 'var(--black)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                cursor: 'pointer',
                background: sizeOption === 'create' ? 'var(--cream)' : 'white',
                transition: 'all 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PenTool size={16} color="var(--mid)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>Create New Shape</span>
                <span style={{ fontSize: 12, color: 'var(--light)', marginLeft: 'auto' }}>Canvas Configurator (Phase 07)</span>
              </div>
              {sizeOption === 'create' && (
                <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 8 }}>
                  Canvas shape builder coming in Phase 07. For now, use Simple Size or Load Canvas.
                </p>
              )}
            </div>

          </div>
        </div>

        <Button
          variant="primary"
          icon={ChevronRight}
          onClick={handleStart}
          disabled={!canStart || sizeOption === 'create'}
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
  const { addCanvas, addTemplate } = useAppContext();

  const [mode, setMode]           = useState(params.get('mode') || 'template');
  const [setupDone, setSetupDone] = useState(false);
  const [canvasConfig, setCanvasConfig] = useState({ width: 600, height: 500, backgroundColor: '#FAF7F2' });

  const [elements, setElements]               = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Template state
  const [variants, setVariants]           = useState([
    { id: 'v1', label: '', price: '', canvasWidth: 600, canvasHeight: 500 },
  ]);
  const [activeVariantId, setActiveVariantId] = useState('v1');
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

  function updateStep(stepId, status) {
    setExportSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
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

      // Step 2: Upload preview image (skip in dev)
      updateStep('image', 'active');
      let previewImageUrl = '';
      if (!isDev) {
        // Production: actual image upload would go here
        // For now we skip since canvas capture requires additional work
        previewImageUrl = '';
      } else {
        await sleep(600);
      }
      updateStep('image', 'done');

      // Step 3: Save metaobject
      updateStep('save', 'active');
      const fields = buildTemplateMetaobjectFields(
        {
          name: templateName,
          category: templateCategory,
          canvasWidth: canvasConfig.width,
          canvasHeight: canvasConfig.height,
          backgroundColor: canvasConfig.backgroundColor,
          templateJSON,
        },
        variants,
        previewImageUrl
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
          variants,
          templateJSON,
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
          variants,
          templateJSON,
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
      // Step 1: Build config
      updateStep('build', 'active');
      const fields = buildCanvasMetaobjectFields(
        { name: canvasName, category: canvasCategory },
        canvasVariants
      );
      await sleep(400);
      updateStep('build', 'done');

      // Step 2: Save metaobject
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
            <Button variant="primary" icon={Save} onClick={handleSaveCanvas}>
              Save Canvas Config
            </Button>
          ) : (
            <>
              <Button variant="outline" icon={Save} disabled>Save Draft</Button>
              <Button variant="primary" icon={Upload} onClick={handleExportTemplate} disabled={!setupDone}>
                Export &amp; Save
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
            variants={variants}
            setVariants={setVariants}
            activeVariantId={activeVariantId}
            setActiveVariantId={setActiveVariantId}
            templateName={templateName}
            setTemplateName={setTemplateName}
            templateCategory={templateCategory}
            setTemplateCategory={setTemplateCategory}
            componentSettings={componentSettings}
            onComponentSettingsChange={setComponentSettings}
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
        />
      )}
    </div>
  );
}
