import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import './ticket-card.css';

export interface TicketCardProps {
  artist: string;
  venue?: string;
  city?: string;
  date: string;
  rating?: number;
  variant?: 'paper' | 'outline';
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
}

function formatStubDate(date: string): { monthDay: string; year: string } {
  const d = new Date(date.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) {
    return { monthDay: date.slice(0, 10) || '—', year: '' };
  }
  return {
    monthDay: d
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      .toUpperCase(),
    year: String(d.getFullYear()),
  };
}

export function TicketCard({
  artist,
  venue,
  city,
  date,
  rating,
  variant = 'paper',
  onClick,
  footer,
  className,
}: TicketCardProps) {
  const stub = formatStubDate(date);
  const place = [venue, city].filter(Boolean).join(' · ');
  const rated = rating != null && rating > 0;
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'ticket-card w-full overflow-hidden text-left transition-transform',
        onClick && 'cursor-pointer active:scale-[0.99]',
        variant === 'paper'
          ? 'bg-[var(--encore-paper,#F3EBDD)] text-[var(--encore-ink,#1A1714)]'
          : 'border border-border/60 bg-card text-foreground',
        className
      )}
    >
      <div className="flex min-h-[5.5rem]">
        <div className="min-w-0 flex-1 px-4 py-3.5 pr-3">
          <p className="font-display text-lg font-bold leading-tight tracking-tight">{artist}</p>
          {place ? (
            <p
              className={cn(
                'mt-1 truncate text-sm',
                variant === 'paper' ? 'text-black/55' : 'text-muted-foreground'
              )}
            >
              {place}
            </p>
          ) : null}
          {footer ? <div className="mt-2">{footer}</div> : null}
        </div>
        <div
          className={cn(
            'flex w-[84px] shrink-0 flex-col items-center justify-center gap-1 px-2 py-3',
            variant === 'paper' ? 'text-[var(--encore-ink,#1A1714)]' : 'text-foreground'
          )}
        >
          <span className="font-mono text-[11px] font-medium tracking-[0.08em]">{stub.monthDay}</span>
          {stub.year ? (
            <span className="font-mono text-[10px] tracking-[0.08em] opacity-70">{stub.year}</span>
          ) : null}
          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold">
            {rated ? (
              <>
                <Star
                  className="size-3 fill-[var(--encore-gold,#F2C14E)] text-[var(--encore-gold,#F2C14E)]"
                  aria-hidden
                />
                {rating}
              </>
            ) : (
              <span className="opacity-60">Not rated</span>
            )}
          </span>
        </div>
      </div>
    </Comp>
  );
}
