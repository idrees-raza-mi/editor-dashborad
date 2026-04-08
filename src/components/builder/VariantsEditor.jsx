import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

// Decouples display string from numeric state — fixes React controlled number input issues
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

function FieldInput({ label, children }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--mid)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  background: 'white',
  width: '100%',
  outline: 'none',
};

export default function VariantsEditor({ variants, onChange, type = 'template', maxVariants = 3 }) {
  function addVariant() {
    if (variants.length >= maxVariants) return;
    const newV = {
      id: 'v-' + Date.now(),
      label: '',
      price: '',
      canvasWidth: 600,
      canvasHeight: 500,
      ...(type === 'canvas' ? { svgPath: '' } : {}),
    };
    onChange([...variants, newV]);
  }

  function removeVariant(id) {
    if (variants.length <= 1) return;
    onChange(variants.filter(v => v.id !== id));
  }

  function updateVariant(id, field, value) {
    onChange(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  }

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      marginTop: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mid)', fontWeight: 600 }}>
          Size Variants
        </span>
        {variants.length < maxVariants && (
          <Button variant="outline" icon={Plus} size="sm" onClick={addVariant}>
            Add Variant
          </Button>
        )}
      </div>

      {/* Variant cards */}
      {variants.map((variant, idx) => (
        <div key={variant.id} style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginTop: 10,
          background: 'var(--cream)',
          position: 'relative',
        }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)' }}>
              Variant {idx + 1}
            </span>
            {variants.length > 1 && (
              <button
                onClick={() => removeVariant(variant.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--red-tx)', display: 'flex', alignItems: 'center', padding: 2,
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* 2-column grid of fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FieldInput label="Size Label">
              <input
                style={inputStyle}
                value={variant.label}
                placeholder="e.g. 2FT"
                onChange={e => updateVariant(variant.id, 'label', e.target.value)}
              />
            </FieldInput>

            <FieldInput label="Price">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--mid)', flexShrink: 0 }}>£</span>
                <NumericInput
                  style={inputStyle}
                  value={variant.price}
                  min={0}
                  step={0.01}
                  placeholder="29.99"
                  onChange={val => updateVariant(variant.id, 'price', val)}
                />
              </div>
            </FieldInput>

            <FieldInput label="Width (px)">
              <NumericInput
                style={inputStyle}
                value={variant.canvasWidth}
                min={50}
                placeholder="600"
                onChange={val => updateVariant(variant.id, 'canvasWidth', val)}
              />
            </FieldInput>

            <FieldInput label="Height (px)">
              <NumericInput
                style={inputStyle}
                value={variant.canvasHeight}
                min={50}
                placeholder="500"
                onChange={val => updateVariant(variant.id, 'canvasHeight', val)}
              />
            </FieldInput>
          </div>

          {/* SVG Path (canvas type only) */}
          {type === 'canvas' && (
            <div style={{ marginTop: 10 }}>
              <FieldInput label="SVG Clip Path">
                <textarea
                  rows={3}
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 11, resize: 'vertical' }}
                  value={variant.svgPath || ''}
                  placeholder="M 45,80 C 45,44 ..."
                  onChange={e => updateVariant(variant.id, 'svgPath', e.target.value)}
                />
              </FieldInput>
              <p style={{ fontSize: 11, color: 'var(--light)', marginTop: 4 }}>
                Paste SVG path data for this size's shape boundary
              </p>

              {/* SVG preview */}
              {variant.svgPath?.trim() ? (
                <div style={{
                  background: 'var(--cream2)', height: 60, borderRadius: 4,
                  marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 400 500" style={{ height: 50 }} fill="var(--mid)">
                    <path d={variant.svgPath} />
                  </svg>
                </div>
              ) : (
                <div style={{
                  height: 40, border: '2px dashed var(--border)', borderRadius: 4,
                  marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: 'var(--light)',
                }}>
                  No path set
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {variants.length >= maxVariants && (
        <p style={{ fontSize: 11, color: 'var(--light)', marginTop: 8 }}>
          Maximum {maxVariants} variants reached
        </p>
      )}
    </div>
  );
}
