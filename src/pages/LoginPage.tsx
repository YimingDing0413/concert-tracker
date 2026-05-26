import { Button } from '@/components/ui/Button';
import { HttpApiError } from '@/api/http';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      const msg =
        err instanceof HttpApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <span className="logo">Encore</span>
        <p>Track shows. Rate nights. Never forget a setlist.</p>
      </div>
      <form className="auth-form card" onSubmit={handleSubmit}>
        <h2>Log in</h2>
        {error && <p className="form-error">{error}</p>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </Button>
        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
        <p className="auth-hint muted">
          This build accepts any email/password for sign-in (password is not validated).
        </p>
      </form>
    </div>
  );
}
