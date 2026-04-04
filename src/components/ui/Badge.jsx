export default function Badge({ status }) {
  const isUploaded = status === 'uploaded';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      background: isUploaded ? 'var(--green-bg)' : 'var(--cream2)',
      color: isUploaded ? 'var(--green-tx)' : 'var(--mid)',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: isUploaded ? 'var(--green-tx)' : 'var(--light)',
        flexShrink: 0,
      }} />
      {isUploaded ? 'Uploaded' : 'Not Uploaded'}
    </span>
  );
}
