import { api } from '@/api';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TicketCard } from '@/components/ui/TicketCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useProfileConcerts } from '@/hooks/useProfileConcerts';
import { localDateISO } from '@/lib/logConcert';
import { getYearEndStats, getYearEntries } from '@/lib/yearEndWrapUp';
import { resolveConcertForUserConcert } from '@/utils/userConcert';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

function daysUntil(dateIso: string, today = localDateISO()): number | null {
  const day = dateIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = Date.parse(`${today}T12:00:00`);
  const end = Date.parse(`${day}T12:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function daysLabel(n: number | null): string {
  if (n == null) return '';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

export function HomePage() {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const today = localDateISO();
  const { userConcerts, concertMap, loading, reload } = useProfileConcerts(user?.id);
  const [actionId, setActionId] = useState<string | null>(null);

  const { yearEntries, stats, upcomingGoing, pastGoing } = useMemo(() => {
    // Same pipeline as Wrapped so totals stay in sync (incl. deduped duplicates).
    const entries = getYearEntries(userConcerts, [], year, concertMap);
    const yearStats = getYearEndStats(entries, year);
    const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    const goingRows = userConcerts
      .filter((uc) => uc.status === 'going')
      .map((uc) => {
        const concert = resolveConcertForUserConcert(uc, concertMap[uc.concertId]);
        const date = (concert.date ?? '').slice(0, 10);
        return { uc, concert, date, days: daysUntil(date, today) };
      })
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      yearEntries: recent,
      stats: yearStats,
      upcomingGoing: goingRows.filter((r) => r.date >= today),
      pastGoing: goingRows.filter((r) => r.date < today),
    };
  }, [userConcerts, concertMap, year, today]);

  async function markAttended(concertId: string, snapshot: ReturnType<typeof resolveConcertForUserConcert>) {
    if (!user) return;
    setActionId(concertId);
    try {
      await api.setConcertStatus(user.id, concertId, 'attended', {
        ...snapshot,
        id: concertId,
      });
      await reload();
    } finally {
      setActionId(null);
    }
  }

  async function dismissGoing(userConcertId: string) {
    if (!user) return;
    setActionId(userConcertId);
    try {
      await api.removeUserConcert(user.id, userConcertId);
      await reload();
    } finally {
      setActionId(null);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-8 pb-8 pt-4">
        <p className="logo text-3xl">Encore</p>
        <div className="space-y-3">
          <h1 className="text-display-lg tracking-tight">Your year of shows, in one place.</h1>
          <p className="text-muted-foreground">
            Log every concert in under 30 seconds. Build a shareable Wrapped when the year wraps.
          </p>
        </div>
        <div
          className="flex aspect-[9/14] max-h-[22rem] items-end overflow-hidden rounded-3xl p-6"
          style={{
            background: 'linear-gradient(155deg, #FF5A1F 0%, #2A2723 48%, #0C0B0A 100%)',
          }}
        >
          <div className="space-y-1 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Sample</p>
            <p className="text-5xl font-black tabular-nums">24</p>
            <p className="text-lg font-semibold">shows in {year}</p>
            <p className="text-sm text-white/70">Made with Encore</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button fullWidth render={<Link to="/signup" />}>
            Get started
          </Button>
          <Button fullWidth variant="secondary" render={<Link to="/discover" />}>
            Search shows
          </Button>
        </div>
      </div>
    );
  }

  const initial = (user.displayName || user.email || 'U').trim().charAt(0).toUpperCase();
  const showCount = stats.totalShows;
  const recentAttended = yearEntries.slice(0, 3);
  const comingEmpty = upcomingGoing.length === 0 && pastGoing.length === 0;

  return (
    <div className="space-y-8 pb-8">
      <header className="flex items-center justify-between gap-3">
        <p className="logo text-2xl">Encore</p>
        <Link
          to="/profile"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open profile"
        >
          <Avatar size="lg">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <section className="space-y-4 rounded-3xl border border-border/50 bg-card/40 px-5 py-8 text-center sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Your {year}
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your year…</p>
        ) : (
          <>
            <p className="font-display text-6xl font-black tabular-nums tracking-tight sm:text-7xl">
              {showCount}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats.uniqueArtists} {stats.uniqueArtists === 1 ? 'artist' : 'artists'} ·{' '}
              {stats.uniqueVenues} {stats.uniqueVenues === 1 ? 'venue' : 'venues'}
            </p>
          </>
        )}
        <Button fullWidth render={<Link to="/log" />} className="mt-2">
          Log a show
        </Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Coming up</h2>
          <Link to="/discover" className="text-xs font-semibold text-primary no-underline">
            Discover →
          </Link>
        </div>

        {pastGoing.length > 0 && (
          <ul className="space-y-2">
            {pastGoing.map(({ uc, concert, date }) => (
              <li
                key={uc.id}
                className="rounded-2xl border border-border/50 bg-card/50 p-3"
              >
                <p className="text-sm font-semibold">
                  Did you go? Log it — {concert.artistName ?? 'Show'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[concert.venueName, concert.city, date].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={actionId === uc.concertId || actionId === uc.id}
                    onClick={() => void markAttended(uc.concertId, concert)}
                  >
                    I was there
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionId === uc.concertId || actionId === uc.id}
                    onClick={() => void dismissGoing(uc.id)}
                  >
                    Didn&apos;t go
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {comingEmpty ? (
          <EmptyState
            title="Nothing on your list yet"
            description="Find a show to go to."
            action={
              <Button render={<Link to="/discover" />} size="sm" variant="secondary">
                Find a show to go to
              </Button>
            }
          />
        ) : upcomingGoing.length > 0 ? (
          <div className="carousel-scroll gap-3">
            {upcomingGoing.map(({ uc, concert, date, days }) => (
              <Link
                key={uc.id}
                to={`/concert/${encodeURIComponent(uc.concertId)}`}
                state={{ backTo: '/', concertSnapshot: concert }}
                className="block w-[min(85vw,20rem)] shrink-0 no-underline"
              >
                <TicketCard
                  artist={concert.artistName ?? 'Show'}
                  venue={concert.venueName}
                  city={concert.city}
                  date={date}
                  variant="outline"
                  footer={
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {daysLabel(days)}
                    </span>
                  }
                />
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Recently logged</h2>
          <Link to="/profile" className="text-xs font-semibold text-primary no-underline">
            See all →
          </Link>
        </div>
        {recentAttended.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Shows you mark “I was there” show up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentAttended.map((entry) => (
              <li key={entry.concertId}>
                <Link
                  to={`/concert/${encodeURIComponent(entry.concertId)}`}
                  state={{
                    backTo: '/',
                    concertSnapshot: {
                      artistName: entry.artistName,
                      venueName: entry.venueName,
                      city: entry.city,
                      date: entry.date,
                      imageUrl: entry.imageUrl,
                    },
                  }}
                  className="block no-underline"
                >
                  <TicketCard
                    artist={entry.artistName}
                    venue={entry.venueName}
                    city={entry.city}
                    date={entry.date}
                    variant="paper"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showCount >= 1 && (
        <section>
          <Link
            to="/wrapped"
            className="flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 no-underline transition-colors hover:border-primary/40"
          >
            <div>
              <p className="text-sm font-semibold">Preview your {year} Wrapped</p>
              <p className="text-xs text-muted-foreground">
                {showCount} {showCount === 1 ? 'show' : 'shows'} so far →
              </p>
            </div>
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white"
              style={{
                background: 'linear-gradient(145deg, #FF5A1F, #F2C14E)',
              }}
              aria-hidden
            >
              {showCount}
            </span>
          </Link>
        </section>
      )}
    </div>
  );
}
