import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PageShell from './components/layout/PageShell';
import TemplatesPage from './pages/TemplatesPage';
import BuilderPage from './pages/BuilderPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import './styles/global.css';
import './styles/theme.css';
import './styles/layout.css';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter basename="/admin">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <PageShell>
                    <Routes>
                      <Route path="/" element={<Navigate to="/templates" replace />} />
                      <Route path="/templates" element={<TemplatesPage />} />
                      <Route path="/builder" element={<BuilderPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </PageShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
