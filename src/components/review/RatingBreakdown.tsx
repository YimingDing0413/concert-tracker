import { cn } from '@/lib/utils';
import { BREAKDOWN_LABELS } from '@/types/concertReview';
import type { ConcertReviewDraft } from '@/types/concertReview';

interface RatingBreakdownProps {
  values: ConcertReviewDraft;
  onChange: (key: keyof ConcertReviewDraft, value: number) => void;
}

export function RatingBreakdown({ values, onChange }: RatingBreakdownProps) {
  return (
    <div className="space-y-3">
      {BREAKDOWN_LABELS.map(({ key, label, emoji }) => {
        const current = values[key] as number | undefined;
        return (
          <div
            key={key}
            className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {emoji} {label}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {current ? `${current}/5` : '—'}
              </span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => onChange(key, score)}
                  className={cn(
                    'h-11 flex-1 rounded-xl border text-sm font-bold transition-all active:scale-95',
                    current === score
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
