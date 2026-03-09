import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';

function ResetPassword() {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await authAPI.resetPassword(username.trim(), newPassword);
      if (data.error) {
        setError(data.error);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <h2>Reset password</h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Enter your username and choose a new password.
        </p>
        {success ? (
          <>
            <p style={{ marginBottom: '1rem', color: 'var(--success-color)', fontWeight: 600 }}>
              Password reset. You can sign in with your new password.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
              Back to Sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your login username"
                required
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>New password</label>
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={4}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={4}
                required
              />
            </div>
            {error && (
              <p className="form-error" style={{ marginBottom: '1rem', color: 'var(--danger-color)' }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          <Link to="/login" className="btn-link">Back to Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
