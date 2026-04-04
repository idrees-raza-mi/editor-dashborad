export default function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--border)',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              border: 'none',
              background: 'none',
              color: isActive ? 'var(--black)' : 'var(--mid)',
              borderBottom: isActive ? '2px solid var(--black)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
              fontFamily: 'var(--font-body)',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
