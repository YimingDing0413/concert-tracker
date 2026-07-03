import { MessageThreadRow } from '@/components/cards/MessageThreadRow';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MessageThread } from '@/types';
import { Link } from 'react-router-dom';

interface MessageThreadListProps {
  threads: MessageThread[];
  currentUserId: string;
  activeThreadId?: string | null;
  loading?: boolean;
}

export function MessageThreadList({
  threads,
  currentUserId,
  activeThreadId,
  loading,
}: MessageThreadListProps) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading conversations…</p>;
  }

  if (threads.length === 0) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          title="No messages yet"
          description="Message someone from a ticket post or member profile."
          action={
            <Link to="/feed" className="text-sm font-medium text-primary">
              Browse feed →
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ul>
      {threads.map((thread) => (
        <MessageThreadRow
          key={thread.id}
          thread={thread}
          currentUserId={currentUserId}
          activeThreadId={activeThreadId}
        />
      ))}
    </ul>
  );
}
