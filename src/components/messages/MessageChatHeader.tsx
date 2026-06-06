import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { otherParticipant } from '@/lib/social/messagesApi';
import type { MessageThread } from '@/types';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MessageChatHeaderProps {
  thread: MessageThread;
  currentUserId: string;
  showBack?: boolean;
}

export function MessageChatHeader({ thread, currentUserId, showBack }: MessageChatHeaderProps) {
  const other = otherParticipant(thread, currentUserId);
  const name = other?.displayName || other?.username || 'Member';
  const initial = name.replace('@', '').slice(0, 1).toUpperCase();

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur-md">
      {showBack && (
        <Link
          to="/messages"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground no-underline transition-colors hover:bg-muted/60 md:hidden"
          aria-label="Back to inbox"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      )}

      {other?.userId ? (
        <Link
          to={`/member/${encodeURIComponent(other.userId)}`}
          className="flex min-w-0 flex-1 items-center gap-3 no-underline"
        >
          <Avatar className="size-9 border border-border/50">
            <AvatarImage src={other.avatarUrl} alt="" />
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {other.username && (
              <p className="truncate text-xs text-muted-foreground">@{other.username}</p>
            )}
          </div>
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-9 border border-border/50">
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <p className="truncate text-sm font-semibold">{name}</p>
        </div>
      )}
    </header>
  );
}
