import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await authAPI.register(username.trim(), password);
      if (data.error) {
        setError(data.error);
        return;
      }
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
      setError('');
      alert('Account created. Sign in with your username and password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <div className="login-page">
      <div className="login-card card">
        <h2>ChoirMate</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Choir Management System
        </p>
        {!isSignUp && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            First time? Use username <strong>admin</strong> and password <strong>admin</strong>.
          </p>
        )}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                className="btn-link"
                style={{ fontSize: '0.8rem', padding: 0, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--primary-color)' }}
                onClick={() => setShowPasswords((p) => !p)}
              >
                {showPasswords ? 'Hide password' : 'Show password'}
              </button>
            </div>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={isSignUp ? 4 : undefined}
            />
            {!isSignUp && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                <Link to="/reset-password" className="btn-link">Forgot password?</Link>
              </p>
            )}
          </div>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={4}
              />
            </div>
          )}
          {error && (
            <p className="form-error" style={{ marginBottom: '1rem', color: 'var(--danger-color)' }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting
              ? isSignUp
                ? 'Creating account...'
                : 'Signing in...'
              : isSignUp
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button type="button" className="btn-link" onClick={() => { setMode('signin'); setError(''); }}>
                Sign in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className="btn-link" onClick={() => { setMode('signup'); setError(''); }}>
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default Login;
