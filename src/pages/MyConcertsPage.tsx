import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FilterChip } from '@/components/ui/FilterChip';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import { getConcertReview } from '@/lib/concertReviewsLocal';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { Sparkles, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type Tab = 'attended' | 'going';

const TABS: Tab[] = ['attended', 'going'];

const TAB_LABELS: Record<Tab, string> = {
  attended: 'Been',
  going: 'Going',
};

export function MyConcertsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('attended');
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concertMap, setConcertMap] = useState<Record<string, Partial<Concert>>>({});
  const [ratings, setRatings] = useState<ConcertRating[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { going: 0, attended: 0 };
    for (const uc of userConcerts) {
      if (uc.status === 'going' || uc.status === 'attended') c[uc.status] += 1;
    }
    return c;
  }, [userConcerts]);

  const filtered = useMemo(() => {
    const list = userConcerts.filter((uc) => uc.status === tab);
    return sortUserConcertsByDate(list, concertMap);
  }, [userConcerts, tab, concertMap]);

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
          <FilterChip key={t} active={tab === t} onClick={() => setTab(t)} aria-selected={tab === t}>
            {TAB_LABELS[t]} ({counts[t]})
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'going' ? 'No upcoming shows' : 'No shows yet'}
          description={
            tab === 'going'
              ? 'Find an upcoming concert and tap Mark going on the event page.'
              : 'After a show, mark it attended on the event page — then rate it here.'
          }
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
            const reviewState = { backTo: '/my-concerts', concertSnapshot: concertMap[uc.concertId] };
            const stop = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
            };
            return (
              <div key={uc.id} className="space-y-2">
                <ConcertCard
                  concert={c}
                  userConcert={uc}
                  rating={rating}
                  concertId={uc.concertId}
                  backTo="/my-concerts"
                  variant="compact"
                  showCta={false}
                  action={
                    tab === 'attended' ? (
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
                    ) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
