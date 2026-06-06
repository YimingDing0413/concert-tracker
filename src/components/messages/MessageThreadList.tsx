import { MessageThreadListItem } from '@/components/messages/MessageThreadListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MessageThread } from '@/types';
import { Link } from 'react-router-dom';

interface MessageThreadListProps {
  threads: MessageThread[];
  currentUserId: string;
  loading?: boolean;
}

export function MessageThreadList({ threads, currentUserId, loading }: MessageThreadListProps) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading conversations…</p>;
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Message someone from a ticket post or member profile."
        action={
          <Link to="/feed" className="text-sm font-medium text-primary">
            Browse feed →
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map((thread) => (
        <MessageThreadListItem key={thread.id} thread={thread} currentUserId={currentUserId} />
      ))}
    </ul>
  );
}
