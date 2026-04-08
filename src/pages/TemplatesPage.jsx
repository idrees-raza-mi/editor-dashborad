import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { saveTemplateToShopify, saveCanvasToShopify, uploadPreviewImage } from '../services/shopifyAdmin';
import { publishTemplateAsProduct, updateProductTemplate } from '../utils/shopifyProduct';
import StatCard from '../components/ui/StatCard';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import TemplateGrid from '../components/templates/TemplateGrid';
import CanvasGrid from '../components/templates/CanvasGrid';
import PreviewModal from '../components/modals/PreviewModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import PublishProductModal from '../components/modals/PublishProductModal';

const TABS = [
  { id: 'templates', label: 'Premade Templates' },
  { id: 'canvases', label: 'Custom Canvases' },
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { templates, canvases, updateTemplate, updateCanvas } = useAppContext();
  const [activeTab, setActiveTab] = useState('templates');

  const [previewItem, setPreviewItem] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [uploadItem, setUploadItem] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Publish modal state
  const [publishItem, setPublishItem]     = useState(null); // template object to publish
  const [updateLoading, setUpdateLoading] = useState(null); // template id being updated

  const uploadedTemplates = templates.filter(t => t.status === 'uploaded').length;
  const uploadedCanvases = canvases.filter(c => c.status === 'uploaded').length;
  const uploadedCount = activeTab === 'templates' ? uploadedTemplates : uploadedCanvases;

  const allDates = [...templates, ...canvases].map(i => i.createdAt).sort().reverse();
  const lastUpdated = allDates[0] ?? '—';

  function handlePreview(item, type) {
    setPreviewItem(item);
    setPreviewType(type);
  }

  function handleUpload(id, type) {
    if (type === 'canvas') {
      // Canvases keep the existing metaobject flow
      setUploadItem({ id, type });
      return;
    }
    // Templates: publish as product or update existing product
    const item = templates.find(t => t.id === id);
    if (!item) return;
    if (item.productId) {
      handleTemplateUpdate(item);
    } else {
      setPublishItem(item);
    }
  }

  async function handleTemplateUpdate(item) {
    if (!item.templateJSON) {
      setUploadError('No template JSON found. Open the template in the builder first.');
      return;
    }
    setUpdateLoading(item.id);
    try {
      await updateProductTemplate({
        productId: item.productId,
        templateJSON: item.templateJSON,
        designType: 'template',
      });
      updateTemplate(item.id, { status: 'published' });
    } catch (err) {
      setUploadError(err.message || 'Update failed. Check your Shopify credentials.');
    } finally {
      setUpdateLoading(null);
    }
  }

  async function handleTemplatePublish(productDetails, onProgress) {
    if (!publishItem) return;
    const { productTitle, productDescription, selectedVariants } = productDetails;

    const result = await publishTemplateAsProduct({
      templateJSON: publishItem.templateJSON || {},
      canvasDataUrl: null,
      productTitle,
      productDescription,
      variants: selectedVariants,
      designType: 'template',
      onProgress,
    });

    updateTemplate(publishItem.id, {
      productId: result.productId,
      productHandle: result.productHandle,
      status: 'published',
      previewImageUrl: result.imageUrl || publishItem.previewImageUrl,
    });

    return result;
  }

  async function handleConfirmUpload() {
    setUploadLoading(true);
    setUploadError('');
    try {
      const item = uploadItem.type === 'template'
        ? templates.find(t => t.id === uploadItem.id)
        : canvases.find(c => c.id === uploadItem.id);

      if (uploadItem.type === 'template') {
        // Upload preview image if a data URL exists but no CDN URL yet
        let previewImageUrl = item.previewImageUrl || '';
        if (item.previewDataUrl && !previewImageUrl) {
          previewImageUrl = await uploadPreviewImage(
            item.previewDataUrl,
            `preview-${item.id}.png`
          );
        }

        const result = await saveTemplateToShopify({ ...item, previewImageUrl });
        updateTemplate(item.id, {
          status: 'uploaded',
          metaobjectId: result.id,
          previewImageUrl,
        });
      }

      if (uploadItem.type === 'canvas') {
        const result = await saveCanvasToShopify(item);
        const savedVariants = item.variants.map((v, i) => ({
          ...v,
          metaobjectId: result.variants?.[i]?.metaobjectId || null,
        }));
        updateCanvas(item.id, {
          status: 'uploaded',
          metaobjectId: result.id,
          variants: savedVariants,
        });
      }

      setUploadItem(null);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Upload failed. Check your Shopify credentials.');
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates &amp; Canvases</h1>
          <p className="page-subtitle">Manage your premade templates and custom canvas designs</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="outline" icon={Plus} onClick={() => navigate('/builder?mode=template')}>
            New Template
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/builder?mode=canvas')}>
            New Canvas
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Templates" value={templates.length} />
        <StatCard label="Custom Canvases" value={canvases.length} />
        <StatCard label="Uploaded" value={uploadedCount} />
        <StatCard label="Last Updated" value={lastUpdated} />
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div style={{ marginTop: 24 }}>
        {activeTab === 'templates' ? (
          <TemplateGrid
            templates={templates}
            onPreview={item => handlePreview(item, 'template')}
            onEdit={item => navigate(`/builder?mode=template&id=${item.id}`)}
            onUpload={item => handleUpload(item.id, 'template')}
          />
        ) : (
          <CanvasGrid
            canvases={canvases}
            onPreview={item => handlePreview(item, 'canvas')}
            onEdit={item => navigate(`/builder?mode=canvas&id=${item.id}`)}
            onUpload={item => handleUpload(item.id, 'canvas')}
          />
        )}
      </div>

      {/* Modals */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          type={previewType}
          onClose={() => setPreviewItem(null)}
          onUpload={id => {
            setPreviewItem(null);
            setUploadItem({ id, type: previewType });
          }}
        />
      )}
      {uploadError && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--red-bg)', color: 'var(--red-tx)',
          border: '1px solid var(--red-tx)', borderRadius: 'var(--radius)',
          padding: '12px 18px', fontSize: 13, fontFamily: 'var(--font-body)',
          boxShadow: 'var(--shadow)', zIndex: 1000, maxWidth: 480,
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError('')}
            style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-tx)', fontWeight: 600, fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      )}
      {uploadItem && (
        <ConfirmModal
          title="Upload to Shopify"
          message={`This will ${uploadItem && (uploadItem.type === 'template' ? templates : canvases).find(i => i.id === uploadItem.id)?.metaobjectId ? 'update the existing' : 'create a new'} Metaobject in your Shopify store. Continue?`}
          confirmLabel="Upload"
          confirmVariant="primary"
          onConfirm={handleConfirmUpload}
          onCancel={() => { setUploadItem(null); setUploadError(''); }}
          loading={uploadLoading}
        />
      )}

      {publishItem && (
        <PublishProductModal
          isOpen={!!publishItem}
          templateName={publishItem.name || ''}
          variants={publishItem.variants || []}
          designType="template"
          templateJSON={publishItem.templateJSON || null}
          onConfirm={handleTemplatePublish}
          onClose={() => setPublishItem(null)}
        />
      )}

      {/* Update loading toast */}
      {updateLoading && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--black)', color: 'white',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '12px 18px', fontSize: 13, fontFamily: 'var(--font-body)',
          boxShadow: 'var(--shadow)', zIndex: 1000,
        }}>
          Updating product metafields…
        </div>
      )}
    </div>
  );
}
