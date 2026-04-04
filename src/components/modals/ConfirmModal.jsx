import ModalOverlay from './ModalOverlay';
import Button from '../ui/Button';

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div style={{
        width: 400,
        background: 'white',
        borderRadius: 'var(--radius)',
        padding: 28,
      }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--black)' }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--mid)', marginTop: 8 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
