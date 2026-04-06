import Sidebar from './Sidebar';

export default function PageShell({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main className="app-main" style={{
        marginLeft: 220,
        flex: 1,
        overflowY: 'auto',
        background: 'var(--cream)',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}
