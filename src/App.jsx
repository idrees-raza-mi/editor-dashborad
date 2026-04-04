import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import PageShell from './components/layout/PageShell';
import TemplatesPage from './pages/TemplatesPage';
import BuilderPage from './pages/BuilderPage';
import SettingsPage from './pages/SettingsPage';
import './styles/global.css';
import './styles/theme.css';
import './styles/layout.css';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <PageShell>
          <Routes>
            <Route path="/" element={<Navigate to="/templates" replace />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/builder" element={<BuilderPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </PageShell>
      </BrowserRouter>
    </AppProvider>
  );
}
