import { Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: 480,
      }}>
        <Palette size={48} color="var(--light)" style={{ marginBottom: 20 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 8 }}>
          Coming Soon
        </h2>
        <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6 }}>
          Store settings and configuration will be available here.
        </p>
      </div>
    </div>
  );
}
