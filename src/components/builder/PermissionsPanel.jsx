import { useState, useEffect, useRef } from 'react';
import { Lock, Move, Maximize, RotateCw, Type, ALargeSmall, Palette, Bold, Italic, ImageIcon, Trash2, Wand2 } from 'lucide-react';
import { removeBackground } from '../../utils/removeBackground';

const FONT_LIST = [
  // Google Fonts
  { label: 'Playfair Display',          value: 'Playfair Display',          source: 'google' },
  { label: 'Great Vibes',               value: 'Great Vibes',               source: 'google' },
  { label: 'Montserrat',                value: 'Montserrat',                source: 'google' },
  { label: 'Bebas Neue',                value: 'Bebas Neue',                source: 'google' },
  { label: 'Pacifico',                  value: 'Pacifico',                  source: 'google' },
  { label: 'Dancing Script',            value: 'Dancing Script',            source: 'google' },
  { label: 'Oswald',                    value: 'Oswald',                    source: 'google' },
  { label: 'Lobster',                   value: 'Lobster',                   source: 'google' },
  { label: 'Raleway',                   value: 'Raleway',                   source: 'google' },
  { label: 'Cinzel',                    value: 'Cinzel',                    source: 'google' },
  { label: 'Sacramento',                value: 'Sacramento',                source: 'google' },
  { label: 'Abril Fatface',             value: 'Abril Fatface',             source: 'google' },
  { label: 'Josefin Sans',              value: 'Josefin Sans',              source: 'google' },
  { label: 'Satisfy',                   value: 'Satisfy',                   source: 'google' },
  { label: 'Righteous',                 value: 'Righteous',                 source: 'google' },
  { label: 'Ranchers',                  value: 'Ranchers',                  source: 'google' },
  { label: 'Creepster',                 value: 'Creepster',                 source: 'google' },
  { label: 'Archivo Black',             value: 'Archivo Black',             source: 'google' },
  { label: 'Rammetto One',              value: 'Rammetto One',              source: 'google' },
  { label: 'Jockey One',                value: 'Jockey One',                source: 'google' },
  { label: 'Berkshire Swash',           value: 'Berkshire Swash',           source: 'google' },
  { label: 'Architects Daughter',       value: 'Architects Daughter',       source: 'google' },
  { label: 'Bodoni Moda',               value: 'Bodoni Moda',               source: 'google' },
  { label: 'Press Start 2P',            value: 'Press Start 2P',            source: 'google' },
  { label: 'Aclonica',                  value: 'Aclonica',                  source: 'google' },
  { label: 'Glacial Indifference',      value: 'Glacial Indifference',      source: 'google' },
  { label: 'Permanent Marker',          value: 'Permanent Marker',          source: 'google' },
  { label: 'Titan One',                 value: 'Titan One',                 source: 'google' },
  { label: 'Lilita One',                value: 'Lilita One',                source: 'google' },
  { label: 'Baloo 2',                   value: 'Baloo 2',                   source: 'google' },
  // Self-hosted
  { label: 'Graphik Web',               value: 'Graphik Web',               source: 'local' },
  { label: 'Sandrina',                  value: 'Sandrina',                  source: 'local' },
  { label: 'Aspire Pasque Serif',       value: 'Aspire Pasque Serif',       source: 'local' },
  { label: 'Aspire Pasque Script',      value: 'Aspire Pasque Script',      source: 'local' },
  { label: 'Amalfi Coast',              value: 'Amalfi Coast',              source: 'local' },
  { label: 'Darline Serif',             value: 'Darline Serif',             source: 'local' },
  { label: 'Darline Script',            value: 'Darline Script',            source: 'local' },
  { label: 'Buka Bird',                 value: 'Buka Bird',                 source: 'local' },
  { label: 'Safira March Light',        value: 'Safira March Light',        source: 'local' },
  { label: 'Broadway',                  value: 'Broadway',                  source: 'local' },
  { label: 'Wild Dream',                value: 'Wild Dream',                source: 'local' },
  { label: 'Bhutan',                    value: 'Bhutan',                    source: 'local' },
  { label: 'Garden Sans',               value: 'Garden Sans',               source: 'local' },
  { label: 'Gabriel Weiss Friends Font',value: 'Gabriel Weiss Friends Font',source: 'local' },
  { label: 'Beauty Dina',               value: 'Beauty Dina',               source: 'local' },
  { label: 'Minecrafter',               value: 'Minecrafter',               source: 'local' },
  { label: 'Landmark',                  value: 'Landmark',                  source: 'local' },
  { label: 'Gulya Script',              value: 'Gulya Script',              source: 'local' },
  { label: 'Evallia',                   value: 'Evallia',                   source: 'local' },
  { label: 'Funkhouse',                 value: 'Funkhouse',                 source: 'local' },
  { label: 'Cooper Std Black',          value: 'Cooper Std Black',          source: 'local' },
  { label: 'Candy Shop',                value: 'Candy Shop',                source: 'local' },
  { label: 'Brown Sugar',               value: 'Brown Sugar',               source: 'local' },
  { label: 'Mattosa Script',            value: 'Mattosa Script',            source: 'local' },
  { label: 'Butter Mellow',             value: 'Butter Mellow',             source: 'local' },
  { label: 'Babes & Bridal',            value: 'Babes & Bridal',            source: 'local' },
  { label: 'Arrafah',                   value: 'Arrafah',                   source: 'local' },
  { label: 'Anggelica Merona',          value: 'Anggelica Merona',          source: 'local' },
  { label: 'Harry Potter',              value: 'Harry Potter',              source: 'local' },
  { label: 'GGEyesome Script',          value: 'GGEyesome Script',          source: 'local' },
  { label: 'Magneto',                   value: 'Magneto',                   source: 'local' },
  { label: 'Frankfurter',               value: 'Frankfurter',               source: 'local' },
  { label: 'SB-Bold',                   value: 'SB-Bold',                   source: 'local' },
  { label: 'Elyn Alina',                value: 'Elyn Alina',                source: 'local' },
  { label: 'Charlemagne',               value: 'Charlemagne',               source: 'local' },
  { label: 'GROBOLD',                   value: 'GROBOLD',                   source: 'local' },
  { label: 'Baleria',                   value: 'Baleria',                   source: 'local' },
  { label: 'Behavior Indihome Regular', value: 'Behavior Indihome Regular', source: 'local' },
  { label: 'Baropetha Signature',       value: 'Baropetha Signature',       source: 'local' },
  { label: 'Amsterdam',                 value: 'Amsterdam',                 source: 'local' },
  { label: 'Retro Signature',           value: 'Retro Signature',           source: 'local' },
  { label: 'Anything Script',           value: 'Anything Script',           source: 'local' },
  { label: 'Northwell',                 value: 'Northwell',                 source: 'local' },
  { label: 'Qanelas Thin',              value: 'Qanelas Thin',              source: 'local' },
  { label: 'Father Farmhouse Sans',     value: 'Father Farmhouse Sans',     source: 'local' },
  { label: 'Father Farmhouse Script',   value: 'Father Farmhouse Script',   source: 'local' },
  { label: 'Wrexham',                   value: 'Wrexham',                   source: 'local' },
  { label: '5Aughles ia',               value: '5Aughles ia',               source: 'local' },
];

const LOCAL_FONT_VALUES = FONT_LIST.filter(f => f.source === 'local').map(f => f.value);

function NumericInput({ value, onChange, min = 0, max, style, className }) {
  const [local, setLocal] = useState(String(value ?? ''));
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setLocal(String(value ?? ''));
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      style={style}
      className={className}
      onChange={e => {
        const raw = e.target.value;
        if (/^[0-9.]*$/.test(raw)) setLocal(raw);
      }}
      onBlur={() => {
        let n = parseFloat(local);
        if (isNaN(n) || n < min) n = min;
        if (max !== undefined && n > max) n = max;
        setLocal(String(n));
        onChange(n);
      }}
    />
  );
}

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
  const [removingBg, setRemovingBg]       = useState(false);
  const [removeBgError, setRemoveBgError] = useState(null);
  const [missingFonts, setMissingFonts]   = useState(new Set());

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    document.fonts.ready.then(() => {
      const missing = new Set();
      LOCAL_FONT_VALUES.forEach(fontName => {
        if (!document.fonts.check(`16px "${fontName}"`)) missing.add(fontName);
      });
      setMissingFonts(missing);
    });
  }, []);

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
                style={{ fontFamily: element.fontFamily || 'Playfair Display' }}
              >
                {FONT_LIST.map(f => (
                  <option
                    key={f.value}
                    value={f.value}
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}{f.source === 'local' && missingFonts.has(f.value) ? ' (File missing)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="style-row" style={{ marginBottom: 10 }}>
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Size</label>
                <NumericInput
                  min={8} max={200}
                  value={element.fontSize || 32}
                  onChange={n => onChange({ ...element, fontSize: n })}
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
                  <NumericInput min={1} max={20} value={element.strokeWidth || 3}
                    onChange={n => onChange({ ...element, strokeWidth: n })}
                    style={{ width: 48, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontSize: 12 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--light)' }}>px</span>
                </div>
              </div>
            )}
            <div className="style-row">
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Width</label>
                <NumericInput min={10} value={element.width || 150} onChange={n => onChange({ ...element, width: n })} />
              </div>
              <div className="style-field" style={{ marginBottom: 0 }}>
                <label>Height</label>
                <NumericInput min={10} value={element.height || 80} onChange={n => onChange({ ...element, height: n })} />
              </div>
            </div>
            <div className="style-field" style={{ marginTop: 8 }}>
              <label>Border Radius (0–50)</label>
              <NumericInput min={0} max={50} value={element.rx || 0} onChange={n => onChange({ ...element, rx: n, ry: n })} />
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
