import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { messageThreadPath, otherParticipant } from '@/lib/social/messagesApi';
import type { MessageThread } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';

interface MessageThreadListItemProps {
  thread: MessageThread;
  currentUserId: string;
  activeThreadId?: string | null;
}

export function MessageThreadListItem({
  thread,
  currentUserId,
  activeThreadId,
}: MessageThreadListItemProps) {
  const other = otherParticipant(thread, currentUserId);
  const name = other?.displayName || other?.username || 'Member';
  const initial = name.replace('@', '').slice(0, 1).toUpperCase();
  const preview = thread.lastMessageText ?? 'Start the conversation.';
  const time = thread.lastMessageAt ? formatRelativeTime(thread.lastMessageAt) : '';
  const isActive = activeThreadId === thread.id;

  return (
    <li>
      <NavLink
        to={messageThreadPath(thread.id)}
        className={({ isActive: routeActive }) =>
          cn(
            'flex items-center gap-3 px-4 py-3 no-underline transition-colors',
            (routeActive || isActive) && 'bg-muted/50',
            !(routeActive || isActive) && 'hover:bg-muted/30'
          )
        }
      >
        <Avatar className="size-14 border border-border/40">
          <AvatarImage src={other?.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-semibold">{name}</p>
            {time && <span className="shrink-0 text-xs text-muted-foreground">{time}</span>}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                'truncate text-sm',
                thread.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}
            >
              {preview}
            </p>
            {thread.unread && (
              <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
            )}
          </div>
        </div>
      </NavLink>
    </li>
  );
}
