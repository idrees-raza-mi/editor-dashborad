import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const ERROR_MESSAGES = {
  'auth/invalid-credential':      'Incorrect email or password.',
  'auth/user-not-found':          'No account found with this email.',
  'auth/wrong-password':          'Incorrect password.',
  'auth/too-many-requests':       'Too many attempts. Try again later.',
  'auth/invalid-email':           'Please enter a valid email address.',
  'auth/user-disabled':           'This account has been disabled.',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/templates', { replace: true });
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--black)',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Event Besties
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--mid)',
            marginTop: 6,
          }}>
            Admin Dashboard
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 32,
          boxShadow: 'var(--shadow)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--black)',
            margin: '0 0 24px 0',
          }}>
            Sign in
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <div style={inputWrapStyle}>
                <Mail size={16} color="var(--light)" style={{ flexShrink: 0 }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapStyle}>
                <Lock size={16} color="var(--light)" style={{ flexShrink: 0 }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--red-bg)',
                color: 'var(--red-tx)',
                border: '1px solid var(--red-tx)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              icon={LogIn}
              loading={loading}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '10px 14px' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 12,
          color: 'var(--light)',
          fontFamily: 'var(--font-body)',
        }}>
          Manage accounts in Firebase Console
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--black2)',
  fontFamily: 'var(--font-body)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'var(--cream)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '0 12px',
  height: 42,
};

const inputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  color: 'var(--black)',
};
