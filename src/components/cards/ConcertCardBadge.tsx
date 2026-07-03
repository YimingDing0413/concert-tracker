import { cn } from '@/lib/utils';
import { Check, MapPin, Sparkles, Star, Ticket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ConcertCardBadgeType =
  | 'spotify-pick'
  | 'nearby'
  | 'want-tickets'
  | 'attended'
  | 'going'
  | 'saved';

const BADGE_META: Record<
  ConcertCardBadgeType,
  { label: string; icon: LucideIcon; className: string }
> = {
  'spotify-pick': {
    label: 'Spotify Pick',
    icon: Sparkles,
    className: 'border-spotify/30 bg-spotify/15 text-spotify',
  },
  nearby: {
    label: 'Nearby',
    icon: MapPin,
    className: 'border-primary/30 bg-primary/15 text-primary',
  },
  'want-tickets': {
    label: 'Want Tickets',
    icon: Ticket,
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
  attended: {
    label: 'Attended',
    icon: Check,
    className: 'border-white/20 bg-white/10 text-white/90',
  },
  going: {
    label: 'Going',
    icon: Star,
    className: 'border-primary/40 bg-primary/20 text-primary-foreground',
  },
  saved: {
    label: 'Saved',
    icon: Ticket,
    className: 'border-white/15 bg-white/10 text-white/80',
  },
};

interface ConcertCardBadgeProps {
  type: ConcertCardBadgeType;
  className?: string;
}

export function ConcertCardBadge({ type, className }: ConcertCardBadgeProps) {
  const meta = BADGE_META[type];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide backdrop-blur-md',
        meta.className,
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function badgeFromUserConcertStatus(
  status?: 'going' | 'attended' | 'saved'
): ConcertCardBadgeType | undefined {
  if (status === 'going') return 'going';
  if (status === 'attended') return 'attended';
  if (status === 'saved') return 'want-tickets';
  return undefined;
}
