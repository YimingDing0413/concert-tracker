import { api } from '@/api';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const current = await api.getCurrentUser();
    const resolved = current ?? readStoredUser();
    setUser(resolved);
    writeStoredUser(resolved);
  }, []);

  useEffect(() => {
    api
      .getCurrentUser()
      .then((current) => current ?? readStoredUser())
      .then((u) => {
        setUser(u);
        writeStoredUser(u);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const u = await api.login(credentials);
    setUser(u);
    writeStoredUser(u);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const u = await api.signUp(input);
    setUser(u);
    writeStoredUser(u);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
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
