import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { YearEndDownloadButton } from '@/components/wrap-up/year-end/YearEndDownloadButton';
import { YearEndStatsCards } from '@/components/wrap-up/year-end/YearEndStatsCards';
import { YearEndTemplateSelector } from '@/components/wrap-up/year-end/YearEndTemplateSelector';
import {
  YearEndExportCanvas,
  YearEndWrapUpPreview,
} from '@/components/wrap-up/year-end/YearEndWrapUpPreview';
import { YearSelector } from '@/components/wrap-up/year-end/YearSelector';
import {
  getReviewsForYear,
  getYearEndStats,
  getYearsWithReviews,
} from '@/lib/yearEndWrapUp';
import { syncConcertReviewsFromServer } from '@/lib/concertReviewsLocal';
import type { YearEndTemplateId } from '@/types/concertReview';
import { ImageOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface YearEndWrapUpProps {
  userId: string;
}

export function YearEndWrapUp({ userId }: YearEndWrapUpProps) {
  const currentYear = new Date().getFullYear();
  // Bump after hydrating reviews from the account so memoized values recompute.
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void syncConcertReviewsFromServer(userId).then(() => {
      if (active) setSyncTick((t) => t + 1);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const years = useMemo(
    () => getYearsWithReviews(userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, syncTick]
  );

  const [year, setYear] = useState<number>(() =>
    years.includes(currentYear) ? currentYear : years[0] ?? currentYear
  );

  // Once reviews hydrate, snap to a year that actually has data.
  useEffect(() => {
    if (years.length && !years.includes(year)) {
      setYear(years.includes(currentYear) ? currentYear : years[0]);
    }
  }, [years, year, currentYear]);

  const [template, setTemplate] = useState<YearEndTemplateId>('collage');
  const exportRef = useRef<HTMLDivElement>(null);

  const reviews = useMemo(
    () => getReviewsForYear(userId, year),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, year, syncTick]
  );
  const photos = useMemo(() => reviews.flatMap((r) => r.photoDataUrls ?? []), [reviews]);
  const stats = useMemo(() => getYearEndStats(reviews, year), [reviews, year]);

  const hasReviews = reviews.length > 0;
  const hasPhotos = photos.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Your {year} Concert Wrap-Up</h2>
        <p className="text-sm text-muted-foreground">A year of shows, songs, and memories.</p>
      </div>

      {years.length > 0 && <YearSelector years={years} value={year} onChange={setYear} />}

      {!hasReviews ? (
        <EmptyState
          title={`No concerts reviewed for ${year} yet.`}
          description="Rate the shows you've been to and they'll show up in your wrap-up."
          action={
            <Button render={<Link to="/my-concerts" />} size="sm">
              Review a concert
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {!hasPhotos && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <ImageOff className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>Add photos to your reviews to make your wrap-up more personal.</p>
            </div>
          )}

          <YearEndStatsCards stats={stats} />

          <section className="space-y-3">
            <p className="text-sm font-semibold">Choose a template</p>
            <YearEndTemplateSelector value={template} onChange={setTemplate} />
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold">Preview</p>
            <YearEndWrapUpPreview
              template={template}
              stats={stats}
              reviews={reviews}
              photos={photos}
            />
          </section>

          <YearEndDownloadButton exportRef={exportRef} year={year} />

          <YearEndExportCanvas
            template={template}
            stats={stats}
            reviews={reviews}
            photos={photos}
            exportRef={exportRef}
          />
        </div>
      )}
    </div>
  );
}
