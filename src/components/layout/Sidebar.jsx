import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutTemplate, Palette, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/templates', icon: LayoutTemplate, label: 'Templates & Canvases' },
  { to: '/builder',   icon: Palette,        label: 'Template Builder' },
  { to: '/settings',  icon: Settings,       label: 'Settings' },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="app-sidebar" style={{
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
      <div className="sidebar-brand" style={{ padding: '24px 20px 20px' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontStyle: 'italic',
          fontSize: 17,
          color: 'white',
          fontWeight: 400,
        }}>
          Event Besties
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
            className="sidebar-nav-link"
            title={label}
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
              if (!e.currentTarget.getAttribute('aria-current')) {
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
            <Icon size={16} style={{ flexShrink: 0 }} />
            <span className="sidebar-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: 20 }}>
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
          marginBottom: 16,
        }}>
          {import.meta.env.VITE_SHOPIFY_STORE}
        </div>

        {/* Signed-in user + logout */}
        {currentUser && (
          <>
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 8,
            }}>
              {currentUser.email}
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                padding: '6px 10px',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
