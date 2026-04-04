import { NavLink } from 'react-router-dom';
import { LayoutTemplate, Palette, Settings } from 'lucide-react';

const navItems = [
  { to: '/templates', icon: LayoutTemplate, label: 'Templates & Canvases' },
  { to: '/builder',   icon: Palette,        label: 'Template Builder' },
  { to: '/settings',  icon: Settings,       label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      background: 'var(--black2)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontStyle: 'italic',
          fontSize: 17,
          color: 'white',
          fontWeight: 400,
        }}>
          Parties &amp; Signs
        </div>
        <div style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--light)',
          marginTop: 4,
        }}>
          Admin Dashboard
        </div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginTop: 20 }} />
      </div>

      {/* Nav */}
      <nav style={{ paddingTop: 12 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
              borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
              background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'all 0.15s',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: 20 }}>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          Connected store:
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {import.meta.env.VITE_SHOPIFY_STORE}
        </div>
      </div>
    </aside>
  );
}
