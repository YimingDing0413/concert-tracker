import { Button } from '@/components/ui/app-button';
import type { ProfileActivityStats } from '@/lib/profileStats';
import { Calendar, Sparkles, Star } from 'lucide-react';

interface ProfileHighlightsRowProps {
  stats: ProfileActivityStats;
  onOpenReviews: () => void;
  onOpenWrap: () => void;
}

export function ProfileHighlightsRow({
  stats,
  onOpenReviews,
  onOpenWrap,
}: ProfileHighlightsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <Calendar className="size-4 text-primary" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">This year</p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {stats.concertsThisYear}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">concerts</span>
      </div>

      <button
        type="button"
        onClick={onOpenReviews}
        className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 px-4 py-3.5 text-left transition-colors hover:border-primary/25 hover:bg-card/60"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15">
            <Star className="size-4 text-amber-400" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Avg rating</p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {stats.avgRating != null ? stats.avgRatingDisplay : '—'}
            </p>
          </div>
        </div>
        {stats.reviews > 0 && (
          <span className="text-xs text-muted-foreground">
            {stats.reviews} review{stats.reviews === 1 ? '' : 's'}
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="size-4 text-primary" aria-hidden />
          </span>
          <p className="text-sm font-medium leading-snug">Year wrap-up</p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0 rounded-full" onClick={onOpenWrap}>
          Create
        </Button>
      </div>
    </div>
  );
}
