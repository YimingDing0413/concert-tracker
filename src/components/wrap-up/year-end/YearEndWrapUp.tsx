import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TicketCard } from '@/components/ui/TicketCard';
import { YearEndDownloadButton } from '@/components/wrap-up/year-end/YearEndDownloadButton';
import { YearEndStatsCards } from '@/components/wrap-up/year-end/YearEndStatsCards';
import { YearEndTemplateSelector } from '@/components/wrap-up/year-end/YearEndTemplateSelector';
import {
  YearEndExportCanvas,
  YearEndWrapUpPreview,
} from '@/components/wrap-up/year-end/YearEndWrapUpPreview';
import { YearSelector } from '@/components/wrap-up/year-end/YearSelector';
import { useProfileConcerts } from '@/hooks/useProfileConcerts';
import { getAllConcertReviews, syncConcertReviewsFromServer } from '@/lib/concertReviewsLocal';
import {
  getYearEndStats,
  getYearEntries,
  getYearsWithEntries,
} from '@/lib/yearEndWrapUp';
import type { ConcertReview, YearEndTemplateId } from '@/types/concertReview';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface YearEndWrapUpProps {
  userId: string;
}

export function YearEndWrapUp({ userId }: YearEndWrapUpProps) {
  const currentYear = new Date().getFullYear();
  const [syncTick, setSyncTick] = useState(0);
  const { userConcerts, concertMap, loading: concertsLoading } = useProfileConcerts(userId);

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

  const allReviews = useMemo(
    () => getAllConcertReviews(userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, syncTick]
  );

  const years = useMemo(
    () => getYearsWithEntries(userConcerts, allReviews, concertMap),
    [userConcerts, allReviews, concertMap]
  );

  const [year, setYear] = useState<number>(() =>
    years.includes(currentYear) ? currentYear : years[0] ?? currentYear
  );

  useEffect(() => {
    if (years.length && !years.includes(year)) {
      setYear(years.includes(currentYear) ? currentYear : years[0]);
    }
  }, [years, year, currentYear]);

  const [template, setTemplate] = useState<YearEndTemplateId>('collage');
  const exportRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(
    () => getYearEntries(userConcerts, allReviews, year, concertMap),
    [userConcerts, allReviews, year, concertMap]
  );
  const reviews = useMemo(
    () => entries.map((e) => e.review).filter((r): r is ConcertReview => Boolean(r)),
    [entries]
  );
  const photos = useMemo(() => {
    const fromReviews = entries.flatMap((e) => e.review?.photoDataUrls ?? []);
    if (fromReviews.length > 0) return fromReviews;
    return entries.map((e) => e.imageUrl).filter((u): u is string => Boolean(u));
  }, [entries]);
  const stats = useMemo(() => getYearEndStats(entries, year), [entries, year]);

  const hasShows = entries.length > 0;
  const sparse = entries.length > 0 && entries.length <= 2;
  const hasReviewPhotos = entries.some((e) => (e.review?.photoDataUrls?.length ?? 0) > 0);
  const yearInProgress = year === currentYear;
  const headline = yearInProgress
    ? `${year} so far: ${stats.totalShows} ${stats.totalShows === 1 ? 'show' : 'shows'}`
    : `Your ${year} Concert Wrap-Up`;

  if (concertsLoading && syncTick === 0 && userConcerts.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Your Concert Wrap-Up</h2>
        <p className="text-sm text-muted-foreground">Loading your year…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">{headline}</h2>
        <p className="text-sm text-muted-foreground">
          {hasShows
            ? 'Driven by every show you marked “I was there.” Reviews just add flavor.'
            : 'A year of shows, songs, and memories.'}
        </p>
      </div>

      {years.length > 0 && <YearSelector years={years} value={year} onChange={setYear} />}

      {!hasShows ? (
        <EmptyState
          title={`No shows logged for ${year} yet.`}
          description="Mark shows as “I was there” to build your Wrapped — ratings are optional."
          action={
            <Button render={<Link to="/log" />} size="sm">
              Log a show
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {!hasReviewPhotos && (
            <p className="text-sm text-muted-foreground">
              Tip: add a photo to a review anytime — your wrap-up looks great either way.
            </p>
          )}

          {sparse ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card/50 px-5 py-8 text-center">
                <p className="text-5xl font-black tabular-nums tracking-tight">{stats.totalShows}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.totalShows === 1 ? 'show' : 'shows'}
                  {stats.uniqueArtists > 0
                    ? ` · ${stats.uniqueArtists} ${stats.uniqueArtists === 1 ? 'artist' : 'artists'}`
                    : ''}
                </p>
              </div>
              <ul className="space-y-3">
                {entries.map((entry) => (
                  <li key={entry.concertId}>
                    <TicketCard
                      artist={entry.artistName}
                      venue={entry.venueName}
                      city={entry.city}
                      date={entry.date}
                      rating={entry.review?.overallRating}
                      variant="paper"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <YearEndStatsCards stats={stats} />
          )}

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
              entries={entries}
            />
          </section>

          <YearEndDownloadButton exportRef={exportRef} year={year} />

          <YearEndExportCanvas
            template={template}
            stats={stats}
            reviews={reviews}
            photos={photos}
            entries={entries}
            exportRef={exportRef}
          />
        </div>
      )}
    </div>
  );
}
