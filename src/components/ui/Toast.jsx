import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      borderRadius: 'var(--radius)',
      background: isSuccess ? 'var(--green-bg)' : 'var(--red-bg)',
      border: `1px solid ${isSuccess ? 'var(--green-tx)' : 'var(--red-tx)'}`,
      color: isSuccess ? 'var(--green-tx)' : 'var(--red-tx)',
      fontSize: 13,
      fontWeight: 500,
      boxShadow: 'var(--shadow)',
      minWidth: 260,
      maxWidth: 400,
    }}>
      {isSuccess
        ? <CheckCircle size={16} style={{ flexShrink: 0 }} />
        : <AlertCircle size={16} style={{ flexShrink: 0 }} />
      }
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'inherit', display: 'flex', padding: 0,
      }}>
        <X size={14} />
      </button>
    </div>
  );
}
