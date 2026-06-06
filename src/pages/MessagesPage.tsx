import { MessageThreadList } from '@/components/messages/MessageThreadList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { getMessageThreads } from '@/lib/social/messagesApi';
import type { MessageThread } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMessageThreads();
      setThreads(data);
    } catch {
      setError('Could not load messages. Make sure you are logged in.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-6 pb-4">
      <SectionHeader title="Messages" subtitle="Your conversations" />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {user && (
        <MessageThreadList threads={threads} currentUserId={user.id} loading={loading} />
      )}
    </div>
  );
}
