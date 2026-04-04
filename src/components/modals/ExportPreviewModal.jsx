import { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import Button from '../ui/Button';

const COMPONENT_LABELS = {
  text:       'Text',
  image:      'Image',
  shape:      'Shape',
  background: 'Background',
};

function PermTable({ cp }) {
  const rows = [
    { key: 'text',       label: 'Text',       allowAdd: cp.text?.allow_add },
    { key: 'image',      label: 'Image',      allowAdd: cp.image?.allow_add },
    { key: 'shape',      label: 'Shape',      allowAdd: cp.shape?.allow_add },
    { key: 'background', label: 'Background', allowAdd: null },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {['Component', 'Enabled', 'Allow Add'].map(h => (
            <th key={h} style={{
              padding: '6px 10px', textAlign: 'left', fontSize: 10,
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--mid)', borderBottom: '1px solid var(--border)',
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, label, allowAdd }) => {
          const enabled = cp[key]?.enabled ?? true;
          return (
            <tr key={key}>
              <td style={{ padding: '8px 10px', fontWeight: 500, color: 'var(--black)', borderBottom: '1px solid var(--border)' }}>
                {label}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11,
                  fontWeight: 600,
                  background: enabled ? 'var(--green-bg)' : 'var(--red-bg)',
                  color: enabled ? 'var(--green-tx)' : 'var(--red-tx)',
                }}>
                  {enabled ? 'Yes' : 'No'}
                </span>
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                {allowAdd === null ? (
                  <span style={{ fontSize: 11, color: 'var(--light)' }}>N/A</span>
                ) : (
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11,
                    fontWeight: 600,
                    background: allowAdd ? 'var(--green-bg)' : 'var(--cream2)',
                    color: allowAdd ? 'var(--green-tx)' : 'var(--mid)',
                  }}>
                    {allowAdd ? 'Yes' : 'No'}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ExportPreviewModal({
  visible,
  templateJSON,
  templateName,
  canvasConfig,
  onCancel,
  onConfirm,
}) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied, setCopied]     = useState(false);

  if (!visible || !templateJSON) return null;

  const cp = templateJSON.component_permissions || {};

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(templateJSON, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <ModalOverlay onClose={onCancel}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        width: 720,
        maxWidth: '96vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>
            Review Before Export
          </h2>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4, marginBottom: 0 }}>
            Verify the permission configuration before saving to Shopify.
          </p>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Two-column layout: preview left, details right */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
            {/* Canvas preview thumbnail */}
            <div style={{
              width: 140,
              height: 100,
              flexShrink: 0,
              background: canvasConfig?.backgroundColor || '#FAF7F2',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-mono)' }}>
                  {canvasConfig?.width ?? templateJSON.canvasWidth}×{canvasConfig?.height ?? templateJSON.canvasHeight}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', marginTop: 2 }}>px</div>
              </div>
            </div>

            {/* Template info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 4 }}>
                {templateName || 'Untitled Template'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 4 }}>
                Schema v{templateJSON.version} · {templateJSON.objects?.length ?? 0} element{templateJSON.objects?.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                {templateJSON.objects?.filter(o => o.editable).length ?? 0} editable field{templateJSON.objects?.filter(o => o.editable).length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Component permissions table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
              fontWeight: 600, color: 'var(--mid)', marginBottom: 10,
            }}>
              Component Permissions
            </div>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}>
              <PermTable cp={cp} />
            </div>
          </div>

          {/* Collapsible JSON viewer */}
          <div>
            <button
              onClick={() => setJsonOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--mid)', padding: 0,
                fontFamily: 'var(--font-body)',
              }}
            >
              {jsonOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {jsonOpen ? 'Hide' : 'Show'} exported JSON
            </button>

            {jsonOpen && (
              <div style={{ marginTop: 10, position: 'relative' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white', borderRadius: 'var(--radius-sm)', fontSize: 11,
                    padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre style={{
                  background: '#1C1A17',
                  color: '#E8DCC8',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 14px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  overflow: 'auto',
                  maxHeight: 320,
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  {JSON.stringify(templateJSON, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          flexShrink: 0,
          background: 'var(--cream)',
        }}>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" icon={CheckCircle} onClick={onConfirm}>
            Confirm Export &amp; Save
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
