import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Mic2 } from 'lucide-react';

interface EntityIconBadgeProps {
  name: string;
  /** Small square artist/entity image — fixed size, never stretched. */
  imageUrl?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { box: 'size-11', icon: 'size-5', text: 'text-base' },
  md: { box: 'size-14', icon: 'size-6', text: 'text-lg' },
  lg: { box: 'size-16', icon: 'size-7', text: 'text-xl' },
};

/** Compact avatar — shows API image at fixed size, or icon/initial fallback. */
export function EntityIconBadge({
  name,
  imageUrl,
  icon: Icon = Mic2,
  size = 'md',
  className,
}: EntityIconBadgeProps) {
  const s = sizeClasses[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        decoding="async"
        className={cn(
          'shrink-0 rounded-2xl border border-border/60 object-cover object-center shadow-sm',
          s.box,
          className
        )}
      />
    );
  }

  const initial = name.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/30 via-card to-background',
        s.box,
        className
      )}
      aria-hidden
    >
      <span className={cn(s.text, 'font-bold text-primary')}>{initial}</span>
      <Icon className={cn(s.icon, 'sr-only')} />
      <span className="sr-only">{name}</span>
    </div>
  );
}
