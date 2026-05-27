import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RatingStars } from '@/components/ui/RatingStars';
import { useAuth } from '@/context/AuthContext';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { averageRating } from '@/utils/format';
import { Calendar, LogOut, MapPinned, Music2, Plus, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [ratings, setRatings] = useState<ConcertRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([api.getUserConcerts(user.id), api.getConcerts()])
      .then(async ([ucs, all]) => {
        setUserConcerts(ucs);
        setConcerts(all);
        const rs = await Promise.all(
          ucs.map((uc) => api.getRating(user.id, uc.concertId))
        );
        setRatings(rs.filter((r): r is ConcertRating => r !== null));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const attended = userConcerts.filter((uc) => uc.status === 'attended');
    const artistCounts = new Map<string, number>();
    const venueCounts = new Map<string, number>();
    for (const uc of attended) {
      const c = concerts.find((x) => x.id === uc.concertId) ?? uc.concertSnapshot;
      const artist = c?.artistName;
      const venue = c?.venueName;
      if (artist) artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
      if (venue) venueCounts.set(venue, (venueCounts.get(venue) ?? 0) + 1);
    }
    const topArtists = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topVenues = [...venueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      attended: attended.length,
      total: userConcerts.length,
      avg: averageRating(ratings.map((r) => r.overall)),
      topArtists,
      topVenues,
    };
  }, [userConcerts, concerts, ratings]);

  const recent = useMemo(() => {
    return [...userConcerts]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [userConcerts]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="space-y-6">
        <ListRowSkeleton count={3} />
      </div>
    );
  }

  function resolveConcert(uc: UserConcert) {
    if (uc.concertSnapshot) return uc.concertSnapshot as Partial<Concert>;
    if (uc.isManual && uc.manualConcert) return uc.manualConcert as Partial<Concert>;
    return concerts.find((c) => c.id === uc.concertId);
  }

  return (
    <div className="space-y-8 pb-4">
      <div className="flex flex-col items-center rounded-3xl border border-border/60 bg-card/50 p-6 text-center shadow-lg md:flex-row md:items-start md:text-left">
        <Avatar className="size-20 border-2 border-primary/30 md:mr-5">
          <AvatarImage src={user.avatarUrl} alt="" />
          <AvatarFallback className="bg-primary/20 text-2xl text-primary">
            {user.displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="mt-4 min-w-0 flex-1 md:mt-0">
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-muted-foreground">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm text-foreground/90">{user.bio}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <Button render={<Link to="/add" />} size="sm" className="gap-1">
              <Plus className="size-4" aria-hidden />
              Add concert
            </Button>
            <Button render={<Link to="/map" />} size="sm" variant="secondary" className="gap-1">
              <MapPinned className="size-4" aria-hidden />
              Map
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1">
              <LogOut className="size-4" aria-hidden />
              Log out
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Concerts" value={stats.total} icon={Calendar} />
        <StatCard label="Attended" value={stats.attended} icon={Music2} />
        <StatCard label="Avg rating" value={stats.avg ?? '—'} icon={Star} />
      </div>

      {(stats.topArtists.length > 0 || stats.topVenues.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {stats.topArtists.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <SectionHeader title="Favorite artists" />
              <ul className="space-y-2 text-sm">
                {stats.topArtists.map(([name, count]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="truncate font-medium">{name}</span>
                    <span className="shrink-0 text-muted-foreground">{count} shows</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {stats.topVenues.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <SectionHeader title="Favorite venues" />
              <ul className="space-y-2 text-sm">
                {stats.topVenues.map(([name, count]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="truncate font-medium">{name}</span>
                    <span className="shrink-0 text-muted-foreground">{count}×</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <section>
        <SectionHeader title="Recent concerts" actionTo="/my-concerts" actionLabel="See all" />
        {recent.length === 0 ? (
          <EmptyState
            title="No concerts yet"
            description="Discover shows or add one manually."
            action={
              <Link to="/" className="text-sm font-medium text-primary">
                Discover →
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {recent.map((uc) => {
              const c = resolveConcert(uc);
              const r = ratings.find((x) => x.concertId === uc.concertId);
              return c ? (
                <ConcertCard
                  key={uc.id}
                  concert={c}
                  userConcert={uc}
                  rating={r}
                  concertId={uc.concertId}
                  variant="compact"
                  showCta={false}
                />
              ) : null;
            })}
          </div>
        )}
      </section>

      {ratings.length > 0 && (
        <section>
          <SectionHeader title="Your reviews" />
          <ul className="space-y-3">
            {ratings.map((r) => {
              const c = concerts.find((x) => x.id === r.concertId);
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border/60 bg-card/40 p-4"
                >
                  <Link to={`/concert/${r.concertId}`} className="font-semibold text-foreground no-underline hover:text-primary">
                    {c?.artistName ?? 'Concert'}
                  </Link>
                  <div className="mt-2">
                    <RatingStars value={r.overall} readonly size="sm" />
                  </div>
                  {r.review && <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link
        to="/map"
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-8 text-sm font-medium text-primary no-underline hover:bg-primary/10"
      >
        <MapPinned className="size-5" aria-hidden />
        Preview your concert map
      </Link>
    </div>
  );
}
