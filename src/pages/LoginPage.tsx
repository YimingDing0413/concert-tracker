import { Button } from '@/components/ui/app-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HttpApiError } from '@/api/http';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

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
    <div className="relative flex min-h-dvh flex-col justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
      <div className="relative mx-auto w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="logo text-display-lg">Encore</h1>
          <p className="text-muted-foreground">Track shows. Rate nights. Never forget a setlist.</p>
        </div>

        <div className="rounded-3xl bg-surface-2 p-6 sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="font-display text-xl font-semibold">Log in</h2>
            <p className="text-sm text-muted-foreground">Welcome back to your concert journal.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-surface-3 border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-surface-3 border-transparent"
              />
            </div>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Signing in…' : 'Log in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here?{' '}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
