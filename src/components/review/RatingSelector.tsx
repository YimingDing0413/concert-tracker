import { cn } from '@/lib/utils';
import { OVERALL_VIBE_LABELS } from '@/types/concertReview';

interface RatingSelectorProps {
  value: number;
  max?: number;
  onChange: (value: number) => void;
  size?: 'lg' | 'md';
}

export function RatingSelector({
  value,
  max = 10,
  onChange,
  size = 'lg',
}: RatingSelectorProps) {
  const vibe = value > 0 ? OVERALL_VIBE_LABELS[value] : 'Tap a score';

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p
          className={cn(
            'font-bold tracking-tight text-foreground',
            size === 'lg' ? 'text-4xl tabular-nums' : 'text-2xl tabular-nums'
          )}
        >
          {value > 0 ? value : '—'}
          {value > 0 && (
            <span className="ml-1 text-lg font-medium text-muted-foreground">/ {max}</span>
          )}
        </p>
        <p className="mt-1 text-sm font-medium text-primary">{vibe}</p>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: max }, (_, i) => {
          const score = i + 1;
          const active = score === value;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-2xl border text-sm font-bold transition-all active:scale-95',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_24px_-4px] shadow-primary/50'
                  : 'border-border/60 bg-card/80 text-foreground hover:border-primary/40 hover:bg-primary/10'
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
