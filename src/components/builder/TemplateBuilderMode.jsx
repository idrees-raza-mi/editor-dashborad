import { useRef, useState, useEffect } from 'react';
import LayersPanel from './LayersPanel';
import BuilderCanvas from './BuilderCanvas';
import PermissionsPanel from './PermissionsPanel';
import VariantsEditor from './VariantsEditor';
import Button from '../ui/Button';
import { Undo2, Redo2, Type, ImageIcon, Square, PaintBucket } from 'lucide-react';

// ── Toggle switch ──────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      title={disabled ? 'Not applicable' : (checked ? 'Click to disable' : 'Click to enable')}
      style={{
        position: 'relative',
        width: 34,
        height: 18,
        borderRadius: 9,
        background: disabled ? 'var(--cream2)' : checked ? 'var(--gold)' : '#C8BFB0',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.18s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: checked && !disabled ? 18 : 2,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: disabled ? 'var(--light)' : 'white',
        transition: 'left 0.18s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        display: 'block',
      }} />
    </button>
  );
}

const COMP_ROWS = [
  { key: 'text',       label: 'Text',       Icon: Type,        hasAllowAdd: true  },
  { key: 'image',      label: 'Image',      Icon: ImageIcon,   hasAllowAdd: true  },
  { key: 'shape',      label: 'Shape',      Icon: Square,      hasAllowAdd: true  },
  { key: 'background', label: 'Background', Icon: PaintBucket, hasAllowAdd: false },
];

const CATEGORIES = ['Birthday', 'Engagement', 'Baby Shower', 'Wedding', 'Other'];

function getElementName(type, elements) {
  const count = elements.filter(e => e.type === type).length + 1;
  const labels = { text: 'Text', image: 'Image', shape: 'Shape', background: 'Background' };
  return `${labels[type] || type} ${count}`;
}

const settingInputStyle = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '7px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  background: 'white',
  width: '100%',
  outline: 'none',
};

export default function TemplateBuilderMode({
  elements,
  setElements,
  selectedElementId,
  setSelectedElementId,
  canvasConfig,
  onCanvasConfigChange,
  variants,
  setVariants,
  activeVariantId,
  setActiveVariantId,
  templateName,
  setTemplateName,
  templateCategory,
  setTemplateCategory,
  componentSettings,
  onComponentSettingsChange,
  onCanvasReady,
}) {
  const canvasRef           = useRef(null);
  const imageInputRef       = useRef(null);
  const pendingImageElement = useRef(null);
  const prevVariantIdRef    = useRef(activeVariantId);
  const canvasConfigInitRef = useRef(true);

  // ── Undo / Redo history ─────────────────────────────────────────
  const historyRef    = useRef([[]]);
  const historyIdxRef = useRef(0);

  function pushHistory(newElements) {
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newElements)));
    historyIdxRef.current = historyRef.current.length - 1;
  }

  function undo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const prev = JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current]));
    setElements(prev);
    setSelectedElementId(null);
    setTimeout(() => syncPermissionsToCanvas(prev), 50);
  }

  function redo() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const prev = JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current]));
    setElements(prev);
    setSelectedElementId(null);
    setTimeout(() => syncPermissionsToCanvas(prev), 50);
  }

  const selectedElement = elements.find(e => e.id === selectedElementId) || null;

  // ── Image handling ──────────────────────────────────────────────
  function triggerImageUpload(pendingEl) {
    pendingImageElement.current = pendingEl;
    imageInputRef.current?.click();
  }

  function handleImageFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const el = { ...pendingImageElement.current, src: url, left: 60, top: 60, scaleX: 1, scaleY: 1, opacity: 1 };
    setElements(prev => {
      const next = [...prev, el];
      pushHistory(next);
      return next;
    });
    setSelectedElementId(el.id);
    e.target.value = '';
  }

  function handleImageReplace(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const el = pendingImageElement.current;
    setElements(prev => {
      const next = prev.map(existing => existing.id === el.id ? { ...existing, src: url } : existing);
      pushHistory(next);
      return next;
    });
    e.target.value = '';
  }

  // ── Add element ─────────────────────────────────────────────────
  function handleAddElement(type) {
    const newEl = {
      id: 'el-' + Date.now(),
      type,
      name: getElementName(type, elements),
      left: 60,
      top: 60,
      label: '',
      required: false,
      permissions: {
        content: 'fixed',
        position: 'locked',
        size: 'locked',
        rotation: 'locked',
        font_family: 'locked',
        font_size: 'locked',
        font_color: 'locked',
      },
    };

    if (type === 'text') {
      newEl.text = 'New Text';
      newEl.fontFamily = 'Playfair Display';
      newEl.fontSize = 36;
      newEl.fill = '#1C1A17';
      newEl.fontWeight = 'normal';
      newEl.fontStyle = 'normal';
    }
    if (type === 'shape') {
      newEl.width = 160;
      newEl.height = 90;
      newEl.fill = '#E8E0D4';
      newEl.rx = 0;
      newEl.ry = 0;
    }
    if (type === 'background') {
      newEl.fill = canvasConfig.backgroundColor;
    }
    if (type === 'image') {
      triggerImageUpload(newEl);
      return;
    }

    setElements(prev => {
      const next = [...prev, newEl];
      pushHistory(next);
      return next;
    });
    setSelectedElementId(newEl.id);
  }

  // ── Delete element ──────────────────────────────────────────────
  function handleDeleteElement(id) {
    setElements(prev => {
      const next = prev.filter(el => el.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedElementId === id) setSelectedElementId(null);
  }

  // ── Canvas event handlers ───────────────────────────────────────
  function handleElementMoved(id, left, top) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, left, top } : el));
  }

  function handleElementResized(id, scaleX, scaleY, width, height) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, scaleX, scaleY, width, height } : el));
  }

  function handleElementTextChanged(id, newText) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, text: newText } : el));
  }

  function handleReplaceImage(id) {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    pendingImageElement.current = { ...el };
    imageInputRef.current?.click();
  }

  // ── Clear all ────────────────────────────────────────────────────
  function handleClearAll() {
    pushHistory([]);
    setElements([]);
    setSelectedElementId(null);
  }

  // ── Permission + style update with canvas sync ──────────────────
  function syncPermissionsToCanvas(updatedElements) {
    if (!canvasRef.current) return;
    const fc = canvasRef.current;
    fc.getObjects().forEach(obj => {
      const el = updatedElements.find(e => e.id === obj.id);
      if (!el) return;
      const p = el.permissions || {};
      obj.lockMovementX = p.position === 'locked';
      obj.lockMovementY = p.position === 'locked';
      obj.lockScalingX  = p.size === 'locked';
      obj.lockScalingY  = p.size === 'locked';
      obj.lockRotation  = p.rotation === 'locked';
      obj.setControlsVisibility({
        ml: p.size !== 'locked', mr: p.size !== 'locked',
        mt: p.size !== 'locked', mb: p.size !== 'locked',
        mtr: p.rotation !== 'locked',
      });
      if (p.content !== 'fixed') {
        obj.set({ borderColor: '#2196F3', cornerColor: '#2196F3', borderDashArray: [5, 3] });
      } else {
        obj.set({ borderColor: '#B8965A', cornerColor: '#B8965A', borderDashArray: null });
      }
      // Font/delete permission flags — stored on Fabric object as visual indicators.
      // Admin keeps full editing access; flags are for export serialisation only.
      obj.__fontLocked     = p.font_family === 'locked';
      obj.__fontSizeLocked = p.font_size   === 'locked';
      obj.__colorLocked    = p.font_color  === 'locked';
      obj.__preventDelete  = p.delete === 'no';
    });
    fc.renderAll();
  }

  function handleUpdateElement(updated) {
    setElements(prev => {
      const next = prev.map(el => el.id === updated.id ? updated : el);
      setTimeout(() => syncPermissionsToCanvas(next), 0);
      return next;
    });
  }

  // ── B7: Resize background rect when canvasConfig changes ──────────
  useEffect(() => {
    if (canvasConfigInitRef.current) { canvasConfigInitRef.current = false; return; }
    setElements(prev => prev.map(el => {
      if (el.type === 'background') {
        return { ...el, width: canvasConfig.width, height: canvasConfig.height, left: 0, top: 0 };
      }
      return el;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasConfig.width, canvasConfig.height]);

  // ── Variant switch: scale element positions proportionally ────────
  useEffect(() => {
    const prevId = prevVariantIdRef.current;
    if (prevId === activeVariantId) return;
    const prevVariant = variants.find(v => v.id === prevId);
    const newVariant  = variants.find(v => v.id === activeVariantId);
    prevVariantIdRef.current = activeVariantId;
    if (!prevVariant || !newVariant) return;
    const sx = prevVariant.canvasWidth  > 0 ? newVariant.canvasWidth  / prevVariant.canvasWidth  : 1;
    const sy = prevVariant.canvasHeight > 0 ? newVariant.canvasHeight / prevVariant.canvasHeight : 1;
    setElements(prev => prev.map(el => ({
      ...el,
      left:     el.left  * sx,
      top:      el.top   * sy,
      width:    el.width  ? el.width  * sx : el.width,
      height:   el.height ? el.height * sy : el.height,
      fontSize: el.fontSize ? Math.round(el.fontSize * Math.min(sx, sy)) : el.fontSize,
    })));
    if (onCanvasConfigChange) {
      onCanvasConfigChange(prev => ({ ...prev, width: newVariant.canvasWidth, height: newVariant.canvasHeight }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariantId]);

  return (
    <div>
      {/* Canvas config header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--mid)' }}>
          Canvas: {canvasConfig.width} × {canvasConfig.height}px
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant="ghost" icon={Undo2} size="sm" onClick={undo}>Undo</Button>
          <Button variant="ghost" icon={Redo2} size="sm" onClick={redo}>Redo</Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div style={{
        display: 'flex',
        height: 520,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}>
        <LayersPanel
          elements={elements}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onAddElement={handleAddElement}
          onDeleteElement={handleDeleteElement}
          componentSettings={componentSettings}
        />
        <BuilderCanvas
          elements={elements}
          selectedElementId={selectedElementId}
          canvasConfig={canvasConfig}
          variants={variants}
          activeVariantId={activeVariantId}
          onSelectElement={setSelectedElementId}
          onElementMoved={handleElementMoved}
          onElementResized={handleElementResized}
          onElementTextChanged={handleElementTextChanged}
          onDeleteElement={handleDeleteElement}
          onClearAll={handleClearAll}
          onCanvasReady={fc => { canvasRef.current = fc; if (onCanvasReady) onCanvasReady(fc); }}
          onVariantChange={setActiveVariantId}
          onUndo={undo}
          onRedo={redo}
        />
        <PermissionsPanel
          element={selectedElement}
          onChange={handleUpdateElement}
          onReplaceImage={handleReplaceImage}
          canvasRef={canvasRef}
        />
      </div>

      {/* Component Settings */}
      {componentSettings && onComponentSettingsChange && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--mid)',
            fontWeight: 600,
            marginBottom: 12,
          }}>
            Component Settings
          </div>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'white',
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px',
              padding: '8px 16px',
              background: 'var(--cream)',
              borderBottom: '1px solid var(--border)',
            }}>
              {['Component', 'Enabled', 'Allow Add New'].map(h => (
                <div key={h} style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--mid)',
                }}>
                  {h}
                </div>
              ))}
            </div>
            {/* Rows */}
            {COMP_ROWS.map(({ key, label, Icon, hasAllowAdd }, idx) => {
              const cs       = componentSettings[key] || {};
              const enabled  = cs.enabled ?? true;
              const allowAdd = cs.allow_add ?? false;
              const isLast   = idx === COMP_ROWS.length - 1;
              return (
                <div
                  key={key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px',
                    padding: '12px 16px',
                    alignItems: 'center',
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    background: enabled ? 'white' : '#FFFAF5',
                  }}
                >
                  {/* Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={15} color={enabled ? 'var(--black)' : 'var(--light)'} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: enabled ? 'var(--black)' : 'var(--light)' }}>
                      {label}
                    </span>
                  </div>
                  {/* Enabled toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ToggleSwitch
                      checked={enabled}
                      onChange={val => onComponentSettingsChange({
                        ...componentSettings,
                        [key]: { ...cs, enabled: val },
                      })}
                    />
                    <span style={{ fontSize: 12, color: enabled ? 'var(--green-tx, #2E7D32)' : 'var(--red-tx, #C62828)' }}>
                      {enabled ? 'On' : 'Off'}
                    </span>
                  </div>
                  {/* Allow Add toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasAllowAdd ? (
                      <>
                        <ToggleSwitch
                          checked={allowAdd}
                          disabled={!enabled}
                          onChange={val => onComponentSettingsChange({
                            ...componentSettings,
                            [key]: { ...cs, allow_add: val },
                          })}
                        />
                        <span style={{ fontSize: 12, color: !enabled ? 'var(--light)' : allowAdd ? 'var(--green-tx, #2E7D32)' : 'var(--mid)' }}>
                          {!enabled ? '—' : allowAdd ? 'Yes' : 'No'}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--light)' }}>N/A</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Template Settings */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mid)',
          fontWeight: 600,
          marginBottom: 12,
        }}>
          Template Settings
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 4 }}>
              Template Name
            </label>
            <input
              style={settingInputStyle}
              value={templateName}
              placeholder="e.g. Happy Birthday Classic"
              onChange={e => setTemplateName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--mid)', marginBottom: 4 }}>
              Category
            </label>
            <select
              style={settingInputStyle}
              value={templateCategory}
              onChange={e => setTemplateCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Variants editor */}
      <VariantsEditor
        variants={variants}
        onChange={setVariants}
        type="template"
        maxVariants={3}
      />

      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (pendingImageElement.current?.id && elements.find(el => el.id === pendingImageElement.current.id)) {
            handleImageReplace(e);
          } else {
            handleImageFileSelected(e);
          }
        }}
      />
    </div>
  );
}
