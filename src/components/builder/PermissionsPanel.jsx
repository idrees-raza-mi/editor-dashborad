import { useState } from 'react';
import { Lock, Move, Maximize, RotateCw, Type, ALargeSmall, Palette, Bold, Italic, ImageIcon, Trash2, Wand2 } from 'lucide-react';
import { removeBackground } from '../../utils/removeBackground';

const FONTS = [
  'Playfair Display', 'Jost', 'Lora', 'Merriweather', 'Montserrat',
  'Open Sans', 'Raleway', 'Dancing Script', 'Great Vibes', 'Roboto',
  'Poppins', 'Cormorant Garamond', 'EB Garamond', 'Libre Baskerville', 'Source Sans 3',
];

function PillToggle({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--cream2)',
      borderRadius: 20,
      padding: 2,
    }}>
      {options.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '5px 8px',
              fontSize: 11,
              borderRadius: 18,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? 'white' : 'transparent',
              color: isActive ? 'var(--black)' : 'var(--mid)',
              fontWeight: isActive ? 600 : 400,
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              transition: 'all 0.12s',
              fontFamily: 'var(--font-body)',
            }}
          >
            {opt.icon && <opt.icon size={11} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--mid)',
        fontWeight: 600,
        marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function updatePerm(element, key, value, onChange) {
  onChange({ ...element, permissions: { ...element.permissions, [key]: value } });
}

export default function PermissionsPanel({ element, onChange, onReplaceImage, canvasRef }) {
  const [removingBg, setRemovingBg] = useState(false);
  const [removeBgError, setRemoveBgError] = useState(null);

  function handleRemoveBackground() {
    if (!canvasRef?.current) return;
    const fc = canvasRef.current;
    const obj = fc.getObjects().find(o => o.id === element.id);
    if (!obj) return;
    setRemoveBgError(null);
    removeBackground(fc, obj,
      () => setRemovingBg(true),
      () => setRemovingBg(false),
      (msg) => { setRemovingBg(false); setRemoveBgError(msg); }
    );
  }
  if (!element) {
    return (
      <div style={{
        width: 260,
        flexShrink: 0,
        background: 'white',
        borderLeft: '1px solid var(--border)',
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <p style={{ fontSize: 13, color: 'var(--light)', textAlign: 'center' }}>
          Select an element in the layers panel to set permissions
        </p>
      </div>
    );
  }

  const p = element.permissions || {};
  const isText = element.type === 'text';
  const isShape = element.type === 'shape';
  const isBackground = element.type === 'background';
  const isImage = element.type === 'image';

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: 'white',
      borderLeft: '1px solid var(--border)',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mid)', fontWeight: 600 }}>
          Permissions
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginTop: 4 }}>
          {element.name}
        </div>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 10,
          background: 'var(--cream2)', color: 'var(--mid)',
          border: '1px solid var(--border)', display: 'inline-block', marginTop: 4,
        }}>
          {element.type}
        </span>
      </div>

      {/* STYLE SECTION */}
      <div className="style-section">
        <div className="style-section-label">Style</div>

        {isText && (
          <>
            <div className="style-field">
              <label>Text Content</label>
              <textarea
                rows={2}
                value={element.text || ''}
                onChange={e => onChange({ ...element, text: e.target.value })}
              />
            </div>
            <div className="style-field">
              <label>Font Family</label>
              <select
                value={element.fontFamily || 'Playfair Display'}
                onChange={e => onChange({ ...element, fontFamily: e.target.value })}
              >
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="style-row" style={{ marginBottom: 10 }}>
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Size</label>
                <input
                  type="number" min={8} max={200}
                  value={element.fontSize || 32}
                  onChange={e => onChange({ ...element, fontSize: Number(e.target.value) })}
                />
              </div>
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Color</label>
                <div className="style-row-color">
                  <input
                    type="color"
                    value={element.fill || '#1C1A17'}
                    onChange={e => onChange({ ...element, fill: e.target.value })}
                  />
                  <span>{element.fill || '#1C1A17'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onChange({ ...element, fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
                style={{
                  padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: element.fontWeight === 'bold' ? 'var(--cream2)' : 'white',
                  fontWeight: 'bold', fontFamily: 'var(--font-body)',
                }}
              >
                <Bold size={13} />
              </button>
              <button
                onClick={() => onChange({ ...element, fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
                style={{
                  padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: element.fontStyle === 'italic' ? 'var(--cream2)' : 'white',
                  fontStyle: 'italic', fontFamily: 'var(--font-body)',
                }}
              >
                <Italic size={13} />
              </button>
            </div>
          </>
        )}

        {isShape && (
          <>
            {/* Hollow toggle */}
            <div className="style-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={element.hollow || false}
                  onChange={e => onChange({
                    ...element,
                    hollow: e.target.checked,
                    fill: e.target.checked ? 'transparent' : (element._solidFill || '#E8E0D4'),
                    _solidFill: e.target.checked ? (element.fill !== 'transparent' ? element.fill : element._solidFill || '#E8E0D4') : element._solidFill,
                    stroke: e.target.checked ? (element.stroke || '#1C1A17') : element.stroke,
                    strokeWidth: e.target.checked ? (element.strokeWidth || 3) : element.strokeWidth,
                  })}
                />
                Hollow (outline only)
              </label>
            </div>
            {!element.hollow && (
              <div className="style-field">
                <label>Fill Color</label>
                <div className="style-row-color">
                  <input type="color" value={element.fill || '#E8E0D4'} onChange={e => onChange({ ...element, fill: e.target.value, _solidFill: e.target.value })} />
                  <span>{element.fill || '#E8E0D4'}</span>
                </div>
              </div>
            )}
            {element.hollow && (
              <div className="style-field">
                <label>Outline Color</label>
                <div className="style-row-color">
                  <input type="color" value={element.stroke || '#1C1A17'} onChange={e => onChange({ ...element, stroke: e.target.value })} />
                  <span style={{ marginRight: 8 }}>{element.stroke || '#1C1A17'}</span>
                  <input type="number" min={1} max={20} value={element.strokeWidth || 3}
                    onChange={e => onChange({ ...element, strokeWidth: Number(e.target.value) })}
                    style={{ width: 48, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontSize: 12 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--light)' }}>px</span>
                </div>
              </div>
            )}
            <div className="style-row">
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Width</label>
                <input type="number" min={10} value={element.width || 150} onChange={e => onChange({ ...element, width: Number(e.target.value) })} />
              </div>
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Height</label>
                <input type="number" min={10} value={element.height || 80} onChange={e => onChange({ ...element, height: Number(e.target.value) })} />
              </div>
            </div>
            <div className="style-field" style={{ marginTop: 8 }}>
              <label>Border Radius (0–50)</label>
              <input type="number" min={0} max={50} value={element.rx || 0} onChange={e => onChange({ ...element, rx: Number(e.target.value), ry: Number(e.target.value) })} />
            </div>
          </>
        )}

        {isBackground && (
          <>
            <div className="style-field">
              <label>Fill Color</label>
              <div className="style-row-color">
                <input type="color" value={element.fill || '#FAF7F2'} onChange={e => onChange({ ...element, fill: e.target.value })} />
                <span>{element.fill || '#FAF7F2'}</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--light)' }}>Background fills the entire canvas</p>
          </>
        )}

        {isImage && (
          <>
            <div className="style-field" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => onReplaceImage && onReplaceImage(element.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'white', fontSize: 12, color: 'var(--black)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <ImageIcon size={13} /> Replace
              </button>
              <button
                onClick={handleRemoveBackground}
                disabled={removingBg}
                title="Remove background via local API (port 8080)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: removingBg ? 'not-allowed' : 'pointer',
                  background: 'white', fontSize: 12, color: 'var(--black)',
                  fontFamily: 'var(--font-body)', opacity: removingBg ? 0.6 : 1,
                }}
              >
                <Wand2 size={13} /> {removingBg ? 'Removing…' : 'Remove BG'}
              </button>
            </div>
            {removeBgError && (
              <p style={{ fontSize: 11, color: 'var(--red-tx)', marginBottom: 6 }}>
                {removeBgError}
              </p>
            )}
            <div className="style-field">
              <label>Opacity ({element.opacity !== undefined ? Math.round(element.opacity * 100) : 100}%)</label>
              <input
                type="range" min={0} max={100}
                value={element.opacity !== undefined ? Math.round(element.opacity * 100) : 100}
                onChange={e => onChange({ ...element, opacity: Number(e.target.value) / 100 })}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>

      {/* CONTENT */}
      <Section label="Content">
        <PillToggle
          options={[
            { value: 'fixed',        label: 'Fixed' },
            { value: 'replaceable',  label: 'Replaceable' },
            { value: 'full_control', label: 'Full Control' },
          ]}
          value={p.content || 'fixed'}
          onChange={v => updatePerm(element, 'content', v, onChange)}
        />
      </Section>

      {/* POSITION */}
      <Section label="Position">
        <PillToggle
          options={[
            { value: 'locked',  label: 'Locked',  icon: Lock },
            { value: 'dynamic', label: 'Dynamic', icon: Move },
          ]}
          value={p.position || 'locked'}
          onChange={v => updatePerm(element, 'position', v, onChange)}
        />
      </Section>

      {/* SIZE */}
      <Section label="Size">
        <PillToggle
          options={[
            { value: 'locked',  label: 'Locked',  icon: Lock },
            { value: 'dynamic', label: 'Dynamic', icon: Maximize },
          ]}
          value={p.size || 'locked'}
          onChange={v => updatePerm(element, 'size', v, onChange)}
        />
      </Section>

      {/* ROTATION */}
      <Section label="Rotation">
        <PillToggle
          options={[
            { value: 'locked',  label: 'Locked',  icon: Lock },
            { value: 'dynamic', label: 'Dynamic', icon: RotateCw },
          ]}
          value={p.rotation || 'locked'}
          onChange={v => updatePerm(element, 'rotation', v, onChange)}
        />
      </Section>

      {/* DELETE */}
      <Section label="Delete">
        <PillToggle
          options={[
            { value: 'no',  label: 'Not Allowed', icon: Lock },
            { value: 'yes', label: 'Allowed',     icon: Trash2 },
          ]}
          value={p.delete || 'no'}
          onChange={v => updatePerm(element, 'delete', v, onChange)}
        />
        <p style={{ fontSize: 11, color: 'var(--light)', marginTop: 6 }}>
          Allow customer to delete this element
        </p>
      </Section>

      {/* FONT (text only) */}
      {isText && (
        <>
          <Section label="Font Family">
            <PillToggle
              options={[
                { value: 'locked',  label: 'Locked',  icon: Lock },
                { value: 'dynamic', label: 'Dynamic', icon: Type },
              ]}
              value={p.font_family || 'locked'}
              onChange={v => updatePerm(element, 'font_family', v, onChange)}
            />
          </Section>
          <Section label="Font Size">
            <PillToggle
              options={[
                { value: 'locked',  label: 'Locked',  icon: Lock },
                { value: 'dynamic', label: 'Dynamic', icon: ALargeSmall },
              ]}
              value={p.font_size || 'locked'}
              onChange={v => updatePerm(element, 'font_size', v, onChange)}
            />
          </Section>
          <Section label="Font Color">
            <PillToggle
              options={[
                { value: 'locked',  label: 'Locked',  icon: Lock },
                { value: 'dynamic', label: 'Dynamic', icon: Palette },
              ]}
              value={p.font_color || 'locked'}
              onChange={v => updatePerm(element, 'font_color', v, onChange)}
            />
          </Section>
        </>
      )}

      {/* FIELD SETTINGS */}
      <Section label="Field Settings">
        <div className="style-field">
          <label>Customer-facing label</label>
          <input
            type="text"
            value={element.label || ''}
            placeholder="e.g. Your Name"
            onChange={e => onChange({ ...element, label: e.target.value })}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={element.required || false}
            onChange={e => onChange({ ...element, required: e.target.checked })}
          />
          Required field
        </label>
      </Section>
    </div>
  );
}
