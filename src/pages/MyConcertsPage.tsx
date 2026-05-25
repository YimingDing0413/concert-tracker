import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

type Tab = 'going' | 'attended' | 'saved';

export function MyConcertsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('going');
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
          /* skip unresolved */
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

  const filtered = useMemo(
    () => userConcerts.filter((uc) => uc.status === tab),
    [userConcerts, tab]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page">
      <h1>My Concerts</h1>
      <div className="tabs" role="tablist">
        {(['going', 'attended', 'saved'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'going' ? 'Going' : t === 'attended' ? 'Attended' : 'Saved'}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${tab} concerts`}
          description="Search for a show, open it, and tap Mark Going — or add a show manually."
        />
      ) : (
        <div className="card-list">
          {filtered.map((uc) => {
            const c = concertMap[uc.concertId];
            if (!c?.artistName && !c?.venueName) return null;
            const rating = ratings.find((r) => r.concertId === uc.concertId);
            return (
              <ConcertCard
                key={uc.id}
                concert={c}
                userConcert={uc}
                rating={rating}
                concertId={uc.concertId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
