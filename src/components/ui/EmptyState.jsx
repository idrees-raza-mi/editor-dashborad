import Button from './Button';

export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {Icon && <Icon size={40} color="var(--light)" style={{ marginBottom: 16 }} />}
      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 18,
        color: 'var(--black)',
        margin: 0,
      }}>
        {title}
      </h3>
      {message && (
        <p style={{
          fontSize: 14,
          color: 'var(--mid)',
          marginTop: 8,
          maxWidth: 320,
          lineHeight: 1.6,
        }}>
          {message}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 20 }}>
          <Button variant="primary" onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  );
}
