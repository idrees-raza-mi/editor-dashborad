import { createContext, useContext, useState, useEffect } from 'react';
import { callAdminProxy } from '../utils/shopifyAdmin';

const AppContext = createContext(null);

// Bump this version whenever stored data shape changes to auto-clear stale cache
const STORAGE_VERSION = '2';

function clearStaleStorage() {
  const stored = localStorage.getItem('psadmin-version');
  if (stored !== STORAGE_VERSION) {
    localStorage.removeItem('psadmin-templates');
    localStorage.removeItem('psadmin-canvases');
    localStorage.setItem('psadmin-version', STORAGE_VERSION);
  }
}

export function AppProvider({ children }) {
  const [templates, setTemplates] = useState(() => {
    try {
      clearStaleStorage();
      const saved = localStorage.getItem('psadmin-templates');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [canvases, setCanvases] = useState(() => {
    try {
      const saved = localStorage.getItem('psadmin-canvases');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('psadmin-templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('psadmin-canvases', JSON.stringify(canvases));
  }, [canvases]);

  // Load products from Shopify on mount (published templates/canvases via metafields)
  useEffect(() => {
    if (!import.meta.env.VITE_SHOPIFY_STORE || !import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN) return;
    async function loadFromShopify() {
      try {
        const result = await callAdminProxy('listProducts', { first: 50 });
        if (result?.edges) {
          const templates = [];
          const canvases = [];

          for (const { node: product } of result.edges) {
            const metafields = product.metafields?.edges || [];
            let designType = null;
            let templateJSON = null;

            for (const { node: mf } of metafields) {
              if (mf.key === 'design_type') designType = mf.value;
              if (mf.key === 'template_json' && mf.value) {
                try { templateJSON = JSON.parse(mf.value); } catch {}
              }
            }

            const imageUrl = product.images?.edges[0]?.node?.url || null;

            if (designType === 'template' || (templateJSON && templateJSON.objects)) {
              templates.push({
                id:              product.id,
                name:            product.title,
                category:        '',
                canvasWidth:     templateJSON?.canvasWidth  || 800,
                canvasHeight:    templateJSON?.canvasHeight || 600,
                backgroundColor: templateJSON?.background || '#ffffff',
                templateJSON:    templateJSON,
                previewImageUrl: imageUrl,
                variants:        templateJSON?.variants || [],
                status:          'published',
                productId:       product.id,
                productHandle:   product.handle,
                createdAt:        product.createdAt?.split('T')[0] || '',
              });
            }

            if (designType === 'canvas') {
              canvases.push({
                id:              product.id,
                name:            product.title,
                category:        '',
                status:          'published',
                productId:       product.id,
                productHandle:   product.handle,
                createdAt:       product.createdAt?.split('T')[0] || '',
                variants:        templateJSON?.variants || [],
                previewImageUrl: imageUrl,
              });
            }
          }

          setTemplates(templates);
          setCanvases(canvases);
        }
      } catch (err) {
        console.warn('Could not load from Shopify:', err);
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
