import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { callAdminProxy } from '../utils/shopifyAdmin';
import StatCard from '../components/ui/StatCard';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import TemplateGrid from '../components/templates/TemplateGrid';
import CanvasGrid from '../components/templates/CanvasGrid';
import PreviewModal from '../components/modals/PreviewModal';
import ConfirmModal from '../components/modals/ConfirmModal';

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
    setUploadItem({ id, type });
  }

  async function handleConfirmUpload() {
    setUploadLoading(true);
    try {
      const item = uploadItem.type === 'template'
        ? templates.find(t => t.id === uploadItem.id)
        : canvases.find(c => c.id === uploadItem.id);

      if (uploadItem.type === 'template') {
        const fields = {
          name: item.name,
          category: item.category || '',
          canvas_width: String(item.canvasWidth),
          canvas_height: String(item.canvasHeight),
          background_color: item.backgroundColor || '#ffffff',
          template_json: JSON.stringify(item.templateJSON),
          preview_image_url: item.previewImageUrl || '',
          variants_json: JSON.stringify(item.variants || []),
          created_at: item.createdAt || new Date().toISOString(),
        };
        let result;
        if (item.metaobjectId) {
          result = await callAdminProxy('updateMetaobject', { id: item.metaobjectId, fields });
        } else {
          result = await callAdminProxy('createMetaobject', { type: 'design_template', fields });
        }
        updateTemplate(item.id, { status: 'uploaded', metaobjectId: result.id });
      }

      if (uploadItem.type === 'canvas') {
        const fields = {
          name: item.name,
          category: item.category || '',
          variants_json: JSON.stringify(item.variants || []),
          created_at: item.createdAt || new Date().toISOString(),
        };
        let result;
        if (item.metaobjectId) {
          result = await callAdminProxy('updateMetaobject', { id: item.metaobjectId, fields });
        } else {
          result = await callAdminProxy('createMetaobject', { type: 'canvas_config', fields });
        }
        updateCanvas(item.id, { status: 'uploaded', metaobjectId: result.id });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadLoading(false);
      setUploadItem(null);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
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
      {uploadItem && (
        <ConfirmModal
          title="Upload to Shopify"
          message="This will create a new Metaobject in your Shopify store. Continue?"
          confirmLabel="Upload"
          confirmVariant="primary"
          onConfirm={handleConfirmUpload}
          onCancel={() => setUploadItem(null)}
          loading={uploadLoading}
        />
      )}
    </div>
  );
}
