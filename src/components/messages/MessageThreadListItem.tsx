import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { otherParticipant } from '@/lib/social/messagesApi';
import type { MessageThread } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface MessageThreadListItemProps {
  thread: MessageThread;
  currentUserId: string;
}

export function MessageThreadListItem({ thread, currentUserId }: MessageThreadListItemProps) {
  const other = otherParticipant(thread, currentUserId);
  const name = other?.displayName || other?.username || 'Member';
  const initial = name.replace('@', '').slice(0, 1).toUpperCase();
  const preview = thread.lastMessageText ?? 'Start the conversation.';
  const time = thread.lastMessageAt ? formatRelativeTime(thread.lastMessageAt) : '';

  return (
    <li>
      <Link
        to={`/messages/${thread.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-3 py-3 no-underline transition-colors hover:border-primary/25 hover:bg-card/70"
      >
        <Avatar className="size-11 border border-border/50">
          <AvatarImage src={other?.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-semibold">{name}</p>
            {time && <span className="shrink-0 text-xs text-muted-foreground">{time}</span>}
          </div>
          {other?.username && (
            <p className="truncate text-xs text-muted-foreground">@{other.username}</p>
          )}
          <p
            className={cn(
              'mt-0.5 truncate text-sm',
              thread.unread ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}
          >
            {preview}
          </p>
        </div>
        {thread.unread && (
          <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
        )}
      </Link>
    </li>
  );
}
