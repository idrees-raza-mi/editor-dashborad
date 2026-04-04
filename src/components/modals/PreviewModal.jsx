import { useState } from 'react';
import { X, Upload, RefreshCw, Copy, Download, Layers } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

function DetailRow({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mid)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--black)' }}>{children}</div>
    </div>
  );
}

export default function PreviewModal({ item, type, onClose, onUpload }) {
  const [copied, setCopied] = useState(false);

  function handleCopyJSON() {
    navigator.clipboard.writeText(JSON.stringify(item.templateJSON, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadJSON() {
    const blob = new Blob([JSON.stringify(item.templateJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const firstVariant = item.variants?.[0];

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{
        width: 720,
        maxHeight: '85vh',
        background: 'white',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        display: 'flex',
        position: 'relative',
      }}>
        {/* Left half */}
        <div style={{
          width: 300,
          flexShrink: 0,
          background: type === 'template' ? item.backgroundColor : 'var(--cream2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 10,
          padding: 24,
          position: 'relative',
        }}>
          {type === 'template' ? (
            <>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--black)', textAlign: 'center' }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', background: 'rgba(0,0,0,0.08)', padding: '2px 8px', borderRadius: 10 }}>
                {item.category}
              </div>
              <div style={{ position: 'absolute', bottom: 16, fontSize: 11, color: 'var(--mid)' }}>
                {item.variants?.length} size {item.variants?.length === 1 ? 'variant' : 'variants'}
              </div>
            </>
          ) : (
            firstVariant?.svgPath ? (
              <svg viewBox="0 0 400 500" style={{ width: 120, height: 120 }} fill="var(--mid)">
                <path d={firstVariant.svgPath} />
              </svg>
            ) : (
              <Layers size={48} color="var(--light)" />
            )
          )}
        </div>

        {/* Right half */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, position: 'relative' }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--mid)', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 16, paddingRight: 28 }}>
            {item.name}
          </h2>

          {/* Details */}
          {type === 'template' && (
            <>
              <DetailRow label="Canvas Size">{item.canvasWidth} × {item.canvasHeight}</DetailRow>
              <DetailRow label="Elements">{item.elements}</DetailRow>
              <DetailRow label="Editable Fields">{item.editableFields}</DetailRow>
              <DetailRow label="Category">{item.category}</DetailRow>
            </>
          )}
          {type === 'canvas' && (
            <DetailRow label="Category">{item.category}</DetailRow>
          )}
          <DetailRow label="Status"><Badge status={item.status} /></DetailRow>
          <DetailRow label="Created">{item.createdAt}</DetailRow>
          <DetailRow label="Metaobject ID">
            {item.metaobjectId ?? <span style={{ color: 'var(--light)' }}>Not uploaded</span>}
          </DetailRow>

          {/* Variants */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mid)', margin: '16px 0 8px' }}>
            Size Variants
          </div>
          {item.variants?.length ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {item.variants.map((v, i) => (
                <div key={v.id} style={{
                  display: 'flex', gap: 16, padding: '8px 12px', fontSize: 13,
                  borderBottom: i < item.variants.length - 1 ? '1px solid var(--border)' : 'none',
                  color: 'var(--black)',
                }}>
                  <span style={{ fontWeight: 600, width: 40 }}>{v.label}</span>
                  <span style={{ color: 'var(--mid)' }}>{v.canvasWidth} × {v.canvasHeight}</span>
                  <span style={{ marginLeft: 'auto' }}>${v.price}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--light)', fontSize: 13 }}>No variants configured</div>
          )}

          {/* JSON section (template only) */}
          {type === 'template' && item.templateJSON && (
            <>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--mid)', margin: '16px 0 8px' }}>
                Template JSON
              </div>
              <pre style={{
                background: 'var(--black)',
                color: '#A5D6A7',
                borderRadius: 'var(--radius-sm)',
                padding: 12,
                fontSize: 11,
                lineHeight: 1.5,
                maxHeight: 140,
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {JSON.stringify(item.templateJSON, null, 2)}
              </pre>
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            {type === 'template' && (
              <>
                <Button variant="ghost" icon={Copy} size="sm" onClick={handleCopyJSON}>
                  {copied ? 'Copied!' : 'Copy JSON'}
                </Button>
                <Button variant="ghost" icon={Download} size="sm" onClick={handleDownloadJSON}>
                  Download JSON
                </Button>
              </>
            )}
            {item.status === 'not_uploaded' ? (
              <Button variant="primary" icon={Upload} size="sm" onClick={() => onUpload(item.id)}>
                Upload to Shopify
              </Button>
            ) : (
              <Button variant="outline" icon={RefreshCw} size="sm" onClick={() => onUpload(item.id)}>
                Re-upload
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
