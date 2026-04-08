export default function StatCard({ label, value }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--mid)',
        fontWeight: 600,
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 28,
        color: 'var(--black)',
        fontWeight: 600,
      }}>
        {value}
      </div>
    </div>
  );
}
