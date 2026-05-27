import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { FilterChip } from '@/components/ui/FilterChip';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { averageRating } from '@/utils/format';
import { resolveConcertForUserConcert, sortUserConcertsByDate } from '@/utils/userConcert';
import { Calendar, MapPin, Plus, Star, Ticket } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type Tab = 'going' | 'attended' | 'saved';

const TAB_LABELS: Record<Tab, string> = {
  going: 'Upcoming',
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

  const stats = useMemo(() => {
    const attended = userConcerts.filter((uc) => uc.status === 'attended');
    const going = userConcerts.filter((uc) => uc.status === 'going');
    const avg = averageRating(ratings.map((r) => r.overall));
    const venueCounts = new Map<string, number>();
    for (const uc of attended) {
      const v = concertMap[uc.concertId]?.venueName;
      if (v) venueCounts.set(v, (venueCounts.get(v) ?? 0) + 1);
    }
    const favoriteVenue =
      [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return { attended: attended.length, going: going.length, avg, favoriteVenue };
  }, [userConcerts, ratings, concertMap]);

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
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Concerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your shows, ratings, and memories — saved on this device.
          </p>
        </div>
        <Button render={<Link to="/add" />} size="sm" className="shrink-0 gap-1">
          <Plus className="size-4" aria-hidden />
          Add
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attended" value={stats.attended} icon={Ticket} />
        <StatCard label="Upcoming" value={stats.going} icon={Calendar} />
        <StatCard label="Avg rating" value={stats.avg ?? '—'} icon={Star} />
        <StatCard
          label="Favorite venue"
          value={stats.favoriteVenue.length > 14 ? `${stats.favoriteVenue.slice(0, 12)}…` : stats.favoriteVenue}
          icon={MapPin}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(['going', 'attended', 'saved'] as Tab[]).map((t) => (
          <FilterChip key={t} active={tab === t} onClick={() => setTab(t)} aria-selected={tab === t}>
            {TAB_LABELS[t]} ({counts[t]})
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[tab].toLowerCase()} shows`}
          description={
            tab === 'going'
              ? 'Find a concert and tap Mark Going on the event page.'
              : tab === 'attended'
                ? 'After a show, mark it attended or leave a rating.'
                : 'Save shows you are considering for later.'
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={removingId === uc.id}
                  onClick={() => handleRemove(uc)}
                >
                  {removingId === uc.id ? 'Removing…' : 'Remove from my concerts'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
