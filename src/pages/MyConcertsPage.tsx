import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { ProfileReviewListItem } from '@/components/review/ProfileReviewListItem';
import { YearEndWrapUp } from '@/components/wrap-up/year-end/YearEndWrapUp';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FilterChip } from '@/components/ui/FilterChip';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import {
  getConcertReview,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { averageOverallRating, formatOverallRating } from '@/utils/format';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { Sparkles, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

type Tab = 'attended' | 'going' | 'reviewed' | 'wrapped';

const TABS: Tab[] = ['attended', 'going', 'reviewed', 'wrapped'];

const TAB_LABELS: Record<Tab, string> = {
  attended: 'Been',
  going: 'Going',
  reviewed: 'Reviewed',
  wrapped: 'Wrapped',
};

function parseTab(value: string | null): Tab {
  if (value === 'going' || value === 'reviewed' || value === 'wrapped') return value;
  return 'attended';
}

export function MyConcertsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get('tab')));
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concertMap, setConcertMap] = useState<Record<string, Partial<Concert>>>({});
  const [ratings, setRatings] = useState<ConcertRating[]>([]);
  const [reviews, setReviews] = useState<ConcertReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const syncedReviews = await syncConcertReviewsFromServer(user.id);
    setReviews(syncedReviews);

    const ucs = await api.getUserConcerts(user.id);
    setUserConcerts(ucs);

    const map: Record<string, Partial<Concert>> = {};
    await Promise.all(
      ucs.map(async (uc) => {
        if (uc.concertSnapshot) {
          map[uc.concertId] = uc.concertSnapshot;
          return;
        }
        if (uc.isManual && uc.manualConcert) {
          map[uc.concertId] = uc.manualConcert;
          return;
        }
        try {
          const detail = await api.getConcert(uc.concertId);
          if (detail) map[uc.concertId] = detail;
        } catch {
          /* placeholder */
        }
      })
    );
    setConcertMap(map);

    const ratingList = await Promise.all(
      ucs.map((uc) => api.getRating(user.id, uc.concertId))
    );
    setRatings(ratingList.filter((r): r is ConcertRating => r !== null));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  function selectTab(next: Tab) {
    setTab(next);
    setSearchParams(next === 'attended' ? {} : { tab: next }, { replace: true });
  }

  const counts = useMemo(() => {
    const c: Record<'attended' | 'going', number> = { going: 0, attended: 0 };
    for (const uc of userConcerts) {
      if (uc.status === 'going' || uc.status === 'attended') c[uc.status] += 1;
    }
    return { ...c, reviewed: reviews.length };
  }, [userConcerts, reviews]);

  const filtered = useMemo(() => {
    const list = userConcerts.filter((uc) => uc.status === tab);
    return sortUserConcertsByDate(list, concertMap);
  }, [userConcerts, tab, concertMap]);

  const reviewStats = useMemo(() => {
    const avg = averageOverallRating(reviews.map((r) => r.overallRating));
    return { avg, display: formatOverallRating(avg) };
  }, [reviews]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="My Concerts" subtitle="Loading your diary…" />
        <ListRowSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My Concerts</h1>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <FilterChip
            key={t}
            active={tab === t}
            onClick={() => selectTab(t)}
            aria-selected={tab === t}
          >
            {TAB_LABELS[t]}
            {t === 'attended' || t === 'going' || t === 'reviewed'
              ? ` (${counts[t]})`
              : ''}
          </FilterChip>
        ))}
      </div>

      {tab === 'attended' && (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              title="No shows yet"
              description="After a show, mark it attended on the event page — then rate it here."
              action={
                <Link to="/" className="text-sm font-medium text-primary">
                  Discover concerts →
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((uc) => {
                const c = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
                const rating = ratings.find((r) => r.concertId === uc.concertId);
                const hasReview = user ? Boolean(getConcertReview(user.id, uc.concertId)) : false;
                const reviewState = {
                  backTo: '/my-concerts',
                  concertSnapshot: concertMap[uc.concertId],
                };
                const stop = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                };
                return (
                  <ConcertCard
                    key={uc.id}
                    concert={c}
                    userConcert={uc}
                    rating={rating}
                    concertId={uc.concertId}
                    backTo="/my-concerts"
                    variant="compact"
                    showCta={false}
                    action={
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={hasReview ? 'secondary' : 'primary'}
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            stop(e);
                            navigate(`/concert/${uc.concertId}/review`, { state: reviewState });
                          }}
                        >
                          <Star className="size-4" aria-hidden />
                          {hasReview ? 'Edit rating' : 'Rate'}
                        </Button>
                        {hasReview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={(e) => {
                              stop(e);
                              navigate(`/concert/${uc.concertId}/wrap-up`, { state: reviewState });
                            }}
                          >
                            <Sparkles className="size-4" aria-hidden />
                            Wrap-up
                          </Button>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'going' && (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              title="No upcoming shows"
              description="Find an upcoming concert and tap Mark going on the event page."
              action={
                <Link to="/" className="text-sm font-medium text-primary">
                  Discover concerts →
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((uc) => (
                <ConcertCard
                  key={uc.id}
                  concert={resolveConcertForUserConcert(uc, concertMap[uc.concertId])}
                  userConcert={uc}
                  concertId={uc.concertId}
                  backTo="/my-concerts"
                  variant="compact"
                  showCta={false}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'reviewed' && (
        <section className="space-y-4">
          <SectionHeader
            title="Your reviews"
            subtitle={
              reviewStats.avg != null
                ? `Average across ${reviews.length} review${reviews.length === 1 ? '' : 's'}: ${reviewStats.display}`
                : undefined
            }
          />
          {reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Rate a show you've been to from the Been tab."
              action={
                <button
                  type="button"
                  onClick={() => selectTab('attended')}
                  className="text-sm font-medium text-primary"
                >
                  Go to Been →
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ProfileReviewListItem review={review} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'wrapped' && user && <YearEndWrapUp userId={user.id} />}
    </div>
  );
}
