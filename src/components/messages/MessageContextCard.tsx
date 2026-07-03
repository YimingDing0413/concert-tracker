import type { MessageThread } from '@/types';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Calendar, MapPin, Music2, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MessageContextCardProps {
  thread: MessageThread;
}

export function MessageContextCard({ thread }: MessageContextCardProps) {
  if (!thread.artistName && !thread.eventId) return null;

  const isTicket = thread.contextType === 'looking_for_tickets';

  return (
    <div className={cn('space-y-2 rounded-xl p-3', isTicket ? 'bg-ticket-soft' : 'bg-surface-2')}>
      {isTicket && (
        <p className="flex items-center gap-1.5 text-xs text-ticket">
          <Ticket className="size-3.5" aria-hidden />
          Ticket conversation
        </p>
      )}
      <div className="flex items-start gap-3">
        <span className="poster-gradient flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Music2 className="size-4 text-white/80" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">{thread.artistName}</p>
          {thread.venueName && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {thread.venueName}
            </p>
          )}
          {thread.eventDate && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3 shrink-0" aria-hidden />
              {formatDate(thread.eventDate)}
            </p>
          )}
        </div>
        {thread.eventId && (
          <Link to={`/concert/${thread.eventId}`} className="shrink-0 text-xs font-medium text-primary">
            View
          </Link>
        )}
      </div>
      {isTicket && (
        <p className="text-xs text-muted-foreground">
          Encore does not verify ticket sellers or process payments. Be careful when buying
          tickets.
        </p>
      )}
    </div>
  );
}
