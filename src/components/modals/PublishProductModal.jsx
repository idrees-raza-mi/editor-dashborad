import { useState } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, ShoppingBag, X, RefreshCw } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import Button from '../ui/Button';

export default function PublishProductModal({
  isOpen,
  templateName = '',
  variants = [],
  designType = 'template',
  templateJSON = null,
  onConfirm,
  onClose,
}) {
  const [productTitle, setProductTitle]           = useState(templateName);
  const [productDescription, setProductDescription] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState(variants.map(v => v.id));
  const [publishing, setPublishing]               = useState(false);
  const [publishStep, setPublishStep]             = useState('');
  const [publishProgress, setPublishProgress]     = useState(0);
  const [publishError, setPublishError]           = useState(null);
  const [publishResult, setPublishResult]         = useState(null);

  if (!isOpen) return null;

  const jsonSizeKB = templateJSON
    ? Math.round(JSON.stringify(templateJSON).length / 1024)
    : null;
  const isLargeJson = jsonSizeKB !== null && jsonSizeKB > 100;

  const selectedVariants = variants.filter(v => selectedVariantIds.includes(v.id));
  const canSubmit = productTitle.trim().length > 0 && selectedVariants.length > 0;

  function toggleVariant(id) {
    setSelectedVariantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (!canSubmit || publishing) return;
    setPublishing(true);
    setPublishError(null);
    setPublishProgress(0);
    setPublishStep('Starting...');
    try {
      const result = await onConfirm(
        { productTitle: productTitle.trim(), productDescription, selectedVariants },
        (msg, step, total) => {
          setPublishStep(msg);
          setPublishProgress(Math.round((step / total) * 100));
        }
      );
      setPublishResult(result);
    } catch (err) {
      setPublishError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────
  if (publishResult) {
    const numericId = publishResult.productId?.split('/').pop();
    const store     = import.meta.env.VITE_SHOPIFY_STORE;
    const adminUrl  = store && numericId
      ? `https://${store}/admin/products/${numericId}`
      : null;

    return (
      <ModalOverlay onClose={onClose}>
        <div className="publish-product-modal">
          <div className="publish-modal-header">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>
              Publish to Shopify Store
            </h2>
          </div>

          <div className="publish-modal-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <CheckCircle size={52} color="var(--green-tx)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 6 }}>
              Product Created!
            </h3>
            <p style={{ color: 'var(--mid)', fontSize: 13, marginBottom: 20 }}>
              {publishResult.productHandle
                ? `/products/${publishResult.productHandle}`
                : productTitle}
            </p>

            {adminUrl && (
              <a
                href={adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: 'var(--gold)', textDecoration: 'none',
                  fontSize: 14, fontWeight: 500, marginBottom: 28,
                }}
              >
                View in Shopify Admin <ExternalLink size={14} />
              </a>
            )}

            {publishResult.productHandle && (
              <div style={{ textAlign: 'left', marginTop: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 6 }}>
                  Copy this handle for your Shopify theme:
                </p>
                <code style={{
                  display: 'block',
                  background: '#f5f5f5',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  color: 'var(--black)',
                  fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-all',
                }}>
                  {publishResult.productHandle}
                </code>
              </div>
            )}
          </div>

          <div className="publish-modal-footer">
            <Button variant="primary" icon={CheckCircle} onClick={onClose}>Done</Button>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  // ── Progress state ────────────────────────────────────────────
  if (publishing) {
    return (
      <ModalOverlay onClose={() => {}}>
        <div className="publish-product-modal">
          <div className="publish-modal-header">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>
              Publishing to Shopify...
            </h2>
          </div>

          <div className="publish-modal-body" style={{ padding: '40px 32px' }}>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 20, textAlign: 'center' }}>
              {publishStep}
            </p>
            <div className="publish-progress-track">
              <div
                className="publish-progress-fill"
                style={{ width: `${publishProgress}%` }}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--light)', marginTop: 10, textAlign: 'center' }}>
              Please don't close this window
            </p>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  // ── Form state ────────────────────────────────────────────────
  return (
    <ModalOverlay onClose={onClose}>
      <div className="publish-product-modal">
        <div className="publish-modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 4 }}>
              Publish to Shopify Store
            </h2>
            <p style={{ fontSize: 13, color: 'var(--mid)' }}>
              This will create a product with your design attached
            </p>
          </div>
        </div>

        <div className="publish-modal-body">
          {/* Error */}
          {publishError && (
            <div className="publish-error-box">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{publishError}</span>
              <button
                onClick={() => setPublishError(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--red-tx)', fontWeight: 700, fontSize: 16, lineHeight: 1,
                }}
              >×</button>
            </div>
          )}

          {/* Product Title */}
          <div className="publish-field">
            <label className="publish-field-label">Product Title *</label>
            <input
              className="publish-field-input"
              value={productTitle}
              onChange={e => setProductTitle(e.target.value)}
              placeholder="e.g. Happy Birthday Banner"
            />
          </div>

          {/* Description */}
          <div className="publish-field">
            <label className="publish-field-label">Description (optional)</label>
            <textarea
              className="publish-field-input"
              rows={3}
              value={productDescription}
              onChange={e => setProductDescription(e.target.value)}
              placeholder="Describe your product..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="publish-field">
              <label className="publish-field-label">Size Variants</label>
              <div className="publish-variant-list">
                {variants.map(v => (
                  <label key={v.id} className="publish-variant-row">
                    <input
                      type="checkbox"
                      checked={selectedVariantIds.includes(v.id)}
                      onChange={() => toggleVariant(v.id)}
                    />
                    <span style={{ flex: 1 }}>{v.label || 'Variant'}</span>
                    {v.price && (
                      <span style={{ color: 'var(--mid)', fontSize: 13 }}>
                        £{v.price}
                      </span>
                    )}
                  </label>
                ))}
                {selectedVariants.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--red-tx)', marginTop: 4 }}>
                    Select at least one variant
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Design type badge */}
          <div className="publish-field">
            <div className="publish-type-badge">
              <ShoppingBag size={13} />
              <span>{designType === 'template' ? 'Template Design' : 'Custom Canvas'}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 6 }}>
              Template JSON will be attached to this product
            </p>
          </div>

          {/* JSON size indicator */}
          {jsonSizeKB !== null && (
            <div className={`publish-size-badge ${isLargeJson ? 'warn' : 'ok'}`}>
              {isLargeJson
                ? <><AlertCircle size={13} /> Large template ({jsonSizeKB}KB) — close to 128KB limit</>
                : <><CheckCircle size={13} /> Size OK ({jsonSizeKB}KB)</>
              }
            </div>
          )}
        </div>

        <div className="publish-modal-footer">
          <Button variant="outline" icon={X} onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={ShoppingBag}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Create Product &amp; Publish
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
