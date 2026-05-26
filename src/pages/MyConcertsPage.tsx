import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type Tab = 'going' | 'attended' | 'saved';

const TAB_LABELS: Record<Tab, string> = {
  going: 'Going',
  attended: 'Attended',
  saved: 'Saved',
};

export function MyConcertsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('going');
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concertMap, setConcertMap] = useState<Record<string, Partial<Concert>>>({});
  const [ratings, setRatings] = useState<ConcertRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
          /* keep placeholder from resolveConcertForUserConcert */
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
    const c: Record<Tab, number> = { going: 0, attended: 0, saved: 0 };
    for (const uc of userConcerts) {
      if (uc.status in c) c[uc.status as Tab] += 1;
    }
    return c;
  }, [userConcerts]);

  const filtered = useMemo(() => {
    const list = userConcerts.filter((uc) => uc.status === tab);
    return sortUserConcertsByDate(list, concertMap);
  }, [userConcerts, tab, concertMap]);

  async function handleRemove(uc: UserConcert) {
    if (!user) return;
    setRemovingId(uc.id);
    try {
      await api.removeUserConcert(user.id, uc.id);
      await load();
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  const totalTracked = userConcerts.length;

  return (
    <div className="page my-concerts-page">
      <header className="my-concerts-header">
        <div>
          <h1>My Shows</h1>
          <p className="page-subtitle muted">
            {totalTracked === 0
              ? 'Track as many concerts as you like — each show is saved separately.'
              : `${totalTracked} show${totalTracked === 1 ? '' : 's'} tracked · saved on this device`}
          </p>
        </div>
        <Link to="/add-concert" className="btn btn-secondary btn-sm">
          Add show
        </Link>
      </header>

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
            {TAB_LABELS[t]}
            <span className="tab-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[tab].toLowerCase()} shows`}
          description={
            tab === 'going'
              ? 'Open any concert and tap Mark Going. You can track multiple upcoming shows at once.'
              : tab === 'attended'
                ? 'After a show, mark it attended or add a rating from the concert page.'
                : 'Add a manual show and choose Saved as the status.'
          }
        />
      ) : (
        <div className="my-concerts-list">
          {filtered.map((uc) => {
            const c = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
            const rating = ratings.find((r) => r.concertId === uc.concertId);
            return (
              <div key={uc.id} className="my-concert-row">
                <ConcertCard
                  concert={c}
                  userConcert={uc}
                  rating={rating}
                  concertId={uc.concertId}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="my-concert-remove"
                  disabled={removingId === uc.id}
                  onClick={() => handleRemove(uc)}
                >
                  {removingId === uc.id ? 'Removing…' : 'Remove'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
