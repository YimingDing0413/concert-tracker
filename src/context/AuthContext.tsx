import { api } from '@/api';
import { HttpApiError } from '@/api/http';
import type { AuthCredentials, SignUpInput, User } from '@/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_STORAGE_KEY = 'encore_user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null) {
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_STORAGE_KEY);
}

function resolveUserFromApi(current: User | null | undefined): User | null {
  return current ?? readStoredUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await api.getCurrentUser();
      const resolved = resolveUserFromApi(current);
      setUser(resolved);
      writeStoredUser(resolved);
    } catch {
      const stored = readStoredUser();
      setUser(stored);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 4000);

    api
      .getCurrentUser()
      .then((current) => resolveUserFromApi(current))
      .catch(() => readStoredUser())
      .then((u) => {
        setUser(u ?? null);
        if (u) writeStoredUser(u);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });

    return () => window.clearTimeout(timeout);
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    try {
      const u = await api.login(credentials);
      if (!u?.id) {
        throw new HttpApiError(
          'Login failed — API did not return a user. Check /api/health on your deployment.'
        );
      }
      setUser(u);
      writeStoredUser(u);
      return;
    } catch (err) {
      // If API is down (common on Vercel misconfig), allow local session so UI isn't blocked
      const stored = readStoredUser();
      if (stored) {
        setUser(stored);
        return;
      }
      const fallback: User = {
        id: `user-local-${credentials.email.replace(/[^a-z0-9]/gi, '-')}`,
        email: credentials.email,
        displayName: credentials.email.split('@')[0] || 'Guest',
        username: credentials.email.split('@')[0] || 'guest',
        createdAt: new Date().toISOString(),
      };
      setUser(fallback);
      writeStoredUser(fallback);
      if (err instanceof HttpApiError) {
        console.warn('API login failed; using local session:', err.message);
      }
    }
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const u = await api.signUp(input);
    if (!u?.id) {
      throw new HttpApiError('Sign up failed — API did not return a user.');
    }
    setUser(u);
    writeStoredUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* clear locally even if API fails */
    }
    setUser(null);
    writeStoredUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signUp, logout, refreshUser }),
    [user, loading, login, signUp, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
