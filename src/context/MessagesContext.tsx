import { useAuth } from '@/context/AuthContext';
import { getMessageThreads } from '@/lib/social/messagesApi';
import type { MessageThread } from '@/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface MessagesContextValue {
  threads: MessageThread[];
  loading: boolean;
  error: string;
  refreshThreads: () => Promise<void>;
  patchThread: (threadId: string, patch: Partial<MessageThread>) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshThreads = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getMessageThreads();
      setThreads(data);
    } catch {
      setError('Could not load messages.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  const patchThread = useCallback((threadId: string, patch: Partial<MessageThread>) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? { ...thread, ...patch } : thread))
    );
  }, []);

  const value = useMemo(
    () => ({ threads, loading, error, refreshThreads, patchThread }),
    [threads, loading, error, refreshThreads, patchThread]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
