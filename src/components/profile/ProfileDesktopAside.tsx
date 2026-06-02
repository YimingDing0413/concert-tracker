import { ConcertCard } from '@/components/concert/ConcertCard';
import { ProfileReviewListItem } from '@/components/review/ProfileReviewListItem';
import { Button } from '@/components/ui/app-button';
import type { ProfileActivityStats } from '@/lib/profileStats';
import type { Concert, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { Calendar, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileDesktopAsideProps {
  stats: ProfileActivityStats;
  userConcerts: UserConcert[];
  concertMap: Record<string, Partial<Concert>>;
  reviews: ConcertReview[];
  onOpenWrapTab: () => void;
  onOpenReviewsTab: () => void;
}

export function ProfileDesktopAside({
  stats,
  userConcerts,
  concertMap,
  reviews,
  onOpenWrapTab,
  onOpenReviewsTab,
}: ProfileDesktopAsideProps) {
  const recent = sortUserConcertsByDate(
    userConcerts.filter((uc) => uc.status === 'attended'),
    concertMap
  ).slice(0, 2);

  const latestReview = [...reviews].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )[0];

  return (
    <aside className="hidden space-y-4 lg:block">
      {stats.concertsThisYear > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3.5" aria-hidden />
            {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.concertsThisYear}</p>
          <p className="text-sm text-muted-foreground">Concerts this year</p>
        </div>
      )}

      {stats.avgRating != null && (
        <button
          type="button"
          onClick={onOpenReviewsTab}
          className="w-full rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-colors hover:border-primary/30"
        >
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Star className="size-3.5 text-primary" aria-hidden />
            Average rating
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.avgRatingDisplay}</p>
          <p className="text-sm text-muted-foreground">
            Across {stats.reviews} review{stats.reviews === 1 ? '' : 's'}
          </p>
        </button>
      )}

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/80 to-card/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Year wrap-up
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn your reviews into a shareable story.
        </p>
        <Button size="sm" className="mt-3 w-full rounded-full" onClick={onOpenWrapTab}>
          Create Year Wrap-Up
        </Button>
      </div>

      {latestReview && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Latest review
          </p>
          <ProfileReviewListItem review={latestReview} />
        </section>
      )}

      {recent.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity
          </p>
          <ul className="space-y-3">
            {recent.map((uc) => (
              <li key={uc.id}>
                <ConcertCard
                  concert={resolveConcertForUserConcert(uc, concertMap[uc.concertId])}
                  userConcert={uc}
                  concertId={uc.concertId}
                  backTo="/profile"
                  variant="poster"
                  showCta={false}
                />
              </li>
            ))}
          </ul>
          <Link to="/profile" className="text-xs font-medium text-primary no-underline">
            View all concerts →
          </Link>
        </section>
      )}
    </aside>
  );
}
