import { createContext, useContext, useState } from 'react';
import { MOCK_TEMPLATES, MOCK_CANVASES } from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [canvases, setCanvases] = useState(MOCK_CANVASES);

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
