import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { otherParticipant } from '@/lib/social/messagesApi';
import type { MessageThread } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { messageThreadPath } from '@/lib/social/messagesApi';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';

interface MessageThreadRowProps {
  thread: MessageThread;
  currentUserId: string;
  activeThreadId?: string | null;
}

export function MessageThreadRow({
  thread,
  currentUserId,
  activeThreadId,
}: MessageThreadRowProps) {
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
            (routeActive || isActive) && 'bg-surface-2',
            !(routeActive || isActive) && 'hover:bg-surface-2/60'
          )
        }
      >
        <Avatar className="size-12">
          <AvatarImage src={other?.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/15 font-display text-base font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-display text-sm font-semibold">{name}</p>
            {time && <span className="shrink-0 text-[0.65rem] text-muted-foreground">{time}</span>}
          </div>
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
          <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
        )}
      </NavLink>
    </li>
  );
}
