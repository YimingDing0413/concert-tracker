import { api } from '@/api';
import { HttpApiError } from '@/api/http';
import {
  clearAuthSession,
  getAuthToken,
  getTokenUserId,
  readStoredUser,
  writeStoredUser,
} from '@/lib/auth/session';
import { clearMvpUser } from '@/lib/auth/mvpUser';
import {
  migrateLegacyLocalReviews,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
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

function hydrateReviewsForUser(userId: string): void {
  migrateLegacyLocalReviews(userId);
  void syncConcertReviewsFromServer(userId).catch((err) => {
    console.warn('[reviews] Sync after auth failed', err);
  });
}

function applyAuthUser(user: User | null, previousId?: string | null): void {
  if (user && previousId && previousId !== user.id) {
    clearMvpUser();
  }
}

/** Restore session from Bearer token — never resurrect a stale cached profile. */
async function restoreSession(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) {
    const stale = readStoredUser();
    if (stale) clearAuthSession();
    return null;
  }

  try {
    const current = await api.getCurrentUser();
    if (!current?.id) {
      clearAuthSession();
      return null;
    }

    const tokenUserId = getTokenUserId();
    if (tokenUserId && tokenUserId !== current.id) {
      clearAuthSession();
      return null;
    }

    writeStoredUser(current);
    return current;
  } catch (err) {
    if (err instanceof HttpApiError && err.status === 401) {
      clearAuthSession();
      return null;
    }

    const stored = readStoredUser();
    const tokenUserId = getTokenUserId();
    if (stored?.id && tokenUserId && stored.id === tokenUserId) {
      return stored;
    }

    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const previousId = user?.id ?? readStoredUser()?.id ?? null;
    const restored = await restoreSession();
    applyAuthUser(restored, previousId);
    setUser(restored);
    if (restored) hydrateReviewsForUser(restored.id);
  }, [user?.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 4000);

    void restoreSession()
      .then((u) => {
        setUser(u);
        if (u) hydrateReviewsForUser(u.id);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== 'encore_auth_token' && event.key !== 'encore_user') return;
      void restoreSession().then((u) => setUser(u));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const previousId = readStoredUser()?.id ?? null;
    const u = await api.login(credentials);
    if (!u?.id) {
      throw new HttpApiError(
        'Login failed — API did not return a user. Check /api/health on your deployment.'
      );
    }
    applyAuthUser(u, previousId);
    setUser(u);
    writeStoredUser(u);
    hydrateReviewsForUser(u.id);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const previousId = readStoredUser()?.id ?? null;
    const u = await api.signUp(input);
    if (!u?.id) {
      throw new HttpApiError('Sign up failed — API did not return a user.');
    }
    applyAuthUser(u, previousId);
    setUser(u);
    writeStoredUser(u);
    hydrateReviewsForUser(u.id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* clear locally even if API fails */
    }
    clearAuthSession();
    clearMvpUser();
    setUser(null);
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
