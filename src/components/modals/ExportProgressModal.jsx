import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import Button from '../ui/Button';

function StepIcon({ status }) {
  if (status === 'pending') return <Clock size={16} color="var(--light)" />;
  if (status === 'active') return (
    <Loader
      size={16}
      color="var(--gold)"
      style={{ animation: 'spin 0.8s linear infinite' }}
    />
  );
  if (status === 'done') return <CheckCircle size={16} color="var(--green-tx)" />;
  if (status === 'error') return <XCircle size={16} color="var(--red-tx)" />;
  return null;
}

export default function ExportProgressModal({ visible, steps, error, onRetry, onClose }) {
  if (!visible) return null;

  const allDone = steps.length > 0 && steps.every(s => s.status === 'done');

  return (
    <ModalOverlay onClose={error ? onClose : undefined}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        padding: 28,
        width: 440,
        maxWidth: '95vw',
      }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 6 }}>
          Saving to Shopify
        </h2>
        <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20 }}>
          Please wait while your design is uploaded.
        </p>

        {/* Steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map(step => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StepIcon status={step.status} />
              <span style={{
                fontSize: 14,
                color: (step.status === 'active' || step.status === 'done')
                  ? 'var(--black)'
                  : 'var(--light)',
                fontWeight: step.status === 'active' ? 600 : 400,
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error box */}
        {error && (
          <div style={{
            marginTop: 20,
            background: 'var(--red-bg)',
            border: '1px solid var(--red-tx)',
            borderRadius: 'var(--radius-sm)',
            padding: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            <XCircle size={16} color="var(--red-tx)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--red-tx)' }}>{error}</span>
          </div>
        )}

        {/* Button row */}
        {error && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={onRetry}>Retry</Button>
          </div>
        )}
        {allDone && !error && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="primary" icon={CheckCircle} onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
