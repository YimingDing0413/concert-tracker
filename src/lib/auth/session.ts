import type { User } from '@/types';

const TOKEN_KEY = 'encore_auth_token';
const USER_STORAGE_KEY = 'encore_user';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Read userId from the Bearer token payload (UI only — server still verifies the signature). */
export function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAuthSession(): void {
  setAuthToken(null);
  writeStoredUser(null);
}

export function getTokenUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
    const decoded = atob((token + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon <= 0) return null;
    const rest = decoded.slice(0, lastColon);
    const expSep = rest.lastIndexOf(':');
    if (expSep <= 0) return null;
    const userId = rest.slice(0, expSep).trim();
    return userId || null;
  } catch {
    return null;
  }
}
