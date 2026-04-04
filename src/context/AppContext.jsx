import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_TEMPLATES, MOCK_CANVASES } from '../data/mockData';
import { callAdminProxy } from '../utils/shopifyAdmin';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('psadmin-templates');
      return saved ? JSON.parse(saved) : MOCK_TEMPLATES;
    } catch { return MOCK_TEMPLATES; }
  });

  const [canvases, setCanvases] = useState(() => {
    try {
      const saved = localStorage.getItem('psadmin-canvases');
      return saved ? JSON.parse(saved) : MOCK_CANVASES;
    } catch { return MOCK_CANVASES; }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('psadmin-templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('psadmin-canvases', JSON.stringify(canvases));
  }, [canvases]);

  // Load real data from Shopify on mount (only if env vars are configured)
  useEffect(() => {
    if (!import.meta.env.VITE_SHOPIFY_STORE || !import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN) return;
    async function loadFromShopify() {
      try {
        const result = await callAdminProxy('listMetaobjects', { type: 'design_template', first: 50 });
        if (result && result.nodes) {
          const shopifyTemplates = result.nodes.map(node => {
            const fields = {};
            node.fields.forEach(f => { fields[f.key] = f.value; });
            return {
              id:              node.id,
              name:            fields.name || 'Untitled',
              category:        fields.category || '',
              canvasWidth:     parseInt(fields.canvas_width)  || 800,
              canvasHeight:    parseInt(fields.canvas_height) || 600,
              backgroundColor: fields.background_color || '#ffffff',
              templateJSON:    fields.template_json ? JSON.parse(fields.template_json) : null,
              previewImageUrl: fields.preview_image_url || null,
              variants:        fields.variants_json ? JSON.parse(fields.variants_json) : [],
              status:          'uploaded',
              metaobjectId:    node.id,
              createdAt:       fields.created_at || '',
              elements:        0,
              editableFields:  0,
            };
          });
          setTemplates(shopifyTemplates);
        }
      } catch (err) {
        console.warn('Could not load from Shopify, using local state:', err);
      }
    }
    loadFromShopify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateTemplate(id, changes) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  }

  function updateCanvas(id, changes) {
    setCanvases(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function addTemplate(template) {
    setTemplates(prev => [...prev, template]);
  }

  function addCanvas(canvas) {
    setCanvases(prev => [...prev, canvas]);
  }

  function deleteTemplate(id) {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  function deleteCanvas(id) {
    setCanvases(prev => prev.filter(c => c.id !== id));
  }

  return (
    <AppContext.Provider value={{
      templates,
      canvases,
      updateTemplate,
      updateCanvas,
      addTemplate,
      addCanvas,
      deleteTemplate,
      deleteCanvas,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
