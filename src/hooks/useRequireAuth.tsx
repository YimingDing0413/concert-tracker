import { RequireAuthDialog } from '@/components/auth/RequireAuthDialog';
import { useAuth } from '@/context/AuthContext';
import { sanitizeNextPath } from '@/lib/auth/nextPath';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

type RequireAuthOptions = {
  /** Where to return after login/signup. Defaults to current location. */
  next?: string;
};

type RequireAuthFn = (action?: () => void, options?: RequireAuthOptions) => boolean;

const RequireAuthContext = createContext<RequireAuthFn | null>(null);

export function RequireAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('/');

  const requireAuth = useCallback<RequireAuthFn>(
    (action, options) => {
      if (user) {
        action?.();
        return true;
      }
      const fallback = `${location.pathname}${location.search}`;
      setNext(sanitizeNextPath(options?.next ?? fallback, '/'));
      setOpen(true);
      return false;
    },
    [user, location.pathname, location.search]
  );

  const value = useMemo(() => requireAuth, [requireAuth]);

  return (
    <RequireAuthContext.Provider value={value}>
      {children}
      <RequireAuthDialog open={open} onOpenChange={setOpen} next={next} />
    </RequireAuthContext.Provider>
  );
}

export function useRequireAuth(): RequireAuthFn {
  const ctx = useContext(RequireAuthContext);
  if (!ctx) {
    throw new Error('useRequireAuth must be used within RequireAuthProvider');
  }
  return ctx;
}
