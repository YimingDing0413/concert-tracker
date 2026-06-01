import { api } from '@/api';
import { ConcertActions } from '@/components/concert/ConcertActions';
import { CommunityShowTiming } from '@/components/concert/CommunityShowTiming';
import { SetlistDisplay } from '@/components/concert/SetlistDisplay';
import { EntityIconBadge } from '@/components/ui/EntityIconBadge';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiNotice } from '@/components/ui/ApiNotice';
import { useAuth } from '@/context/AuthContext';
import type {
  AggregatedShowTiming,
  ConcertDetail,
  ShowReportInput,
  UserConcert,
} from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { getConcertNavState } from '@/utils/concertNav';
import { TicketCtaLink } from '@/components/ui/TicketCtaLink';
import { Calendar, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

export function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const navState = getConcertNavState(location.state);
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [userConcert, setUserConcert] = useState<UserConcert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showTiming, setShowTiming] = useState<AggregatedShowTiming | null>(null);
  const [showReportCount, setShowReportCount] = useState(0);
  const [timingSubmitting, setTimingSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const timingPromise = api.getShowTiming(id, user?.id);
    if (!user) {
      const [c, timing] = await Promise.all([api.getConcert(id), timingPromise]);
      const snapshot = navState.concertSnapshot;
      const merged =
        snapshot && c?.source === 'mock' ? ({ ...c, ...snapshot, id: c.id } as ConcertDetail) : c;
      setConcert(merged);
      setUserConcert(null);
      setShowTiming(timing.aggregated);
      setShowReportCount(timing.reports.length);
      return;
    }
    const [c, ucs, timing] = await Promise.all([
      api.getConcert(id),
      api.getUserConcerts(user.id),
      timingPromise,
    ]);
    const snapshot = navState.concertSnapshot;
    const merged =
      snapshot && c?.source === 'mock' ? ({ ...c, ...snapshot, id: c.id } as ConcertDetail) : c;
    setConcert(merged);
    setUserConcert(ucs.find((uc) => uc.concertId === id) ?? null);
    setShowTiming(timing.aggregated);
    setShowReportCount(timing.reports.length);
  }, [id, user, navState.concertSnapshot]);

  async function handleSubmitShowInfo(input: ShowReportInput) {
    if (!user || !id) throw new Error('Sign in to submit show info.');
    setTimingSubmitting(true);
    try {
      const result = await api.submitShowReport(id, user.id, input);
      setShowTiming(result.aggregated);
      setShowReportCount(result.reports.length);
    } finally {
      setTimingSubmitting(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    load().catch(() => setError('Could not load event')).finally(() => setLoading(false));
  }, [id, load]);

  async function setStatus(status: 'going' | 'attended') {
    if (!user || !id || !concert) return;
    setActionLoading(true);
    try {
      const uc = await api.setConcertStatus(user.id, id, status, concert);
      setUserConcert(uc);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <LoadingSpinner label="Loading concert…" />
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center text-muted-foreground">
        {error || 'Concert not found.'}
      </div>
    );
  }

  const displaySetlist =
    concert.status === 'past' ? concert.setlist : concert.predictedSetlist ?? concert.setlist;
  const backTo = navState.backTo ?? '/';

  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-card/80 to-background">
        <div className="mx-auto max-w-lg px-4 py-4 md:max-w-3xl">
          <SolidBackButton to={backTo} className="mb-4" />
          <ApiNotice source={concert.source} />
          <div className="mt-4 flex gap-4">
            <EntityIconBadge name={concert.artistName} imageUrl={concert.imageUrl} size="lg" />
            <div className="min-w-0 flex-1 pt-0.5">
              <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                {concert.artistName}
              </h1>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {concert.venueName} · {formatLocation(concert.city, concert.state, concert.country)}
                </span>
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground/90">
                <Calendar className="size-4 shrink-0" aria-hidden />
                {formatDate(concert.date)}
                {concert.startTime && ` · ${formatTime(concert.startTime)}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-6 md:max-w-3xl">
        {concert.ticketUrl && <TicketCtaLink href={concert.ticketUrl} />}

        {user && (
          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your concert
            </h2>
            <ConcertActions
              concertStatus={concert.status}
              userStatus={userConcert?.status}
              loading={actionLoading}
              onGoing={() => setStatus('going')}
              onAttended={() => setStatus('attended')}
            />
            {concert.status === 'past' && (
              <p className="mt-3 text-xs text-muted-foreground">
                Been to this show? Mark it attended, then rate it from{' '}
                <Link to="/my-concerts" className="font-medium text-primary">
                  My Concerts
                </Link>
                .
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Event info</h2>
          {concert.openers?.length ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Openers: </span>
              {concert.openers.join(', ')}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Openers unknown — help the community by adding show info below.
            </p>
          )}
          {concert.tourName && (
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Tour: </span>
              {concert.tourName}
            </p>
          )}
        </section>

        {showTiming && (
          <CommunityShowTiming
            aggregated={showTiming}
            reportCount={showReportCount}
            onSubmit={handleSubmitShowInfo}
            submitting={timingSubmitting}
          />
        )}

        <SetlistDisplay setlist={displaySetlist} />

        {userConcert?.notes && (
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-2 text-lg font-semibold">Your notes</h2>
            <p className="text-sm text-muted-foreground">{userConcert.notes}</p>
          </section>
        )}

        {concert.venueId && (
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-2 text-lg font-semibold">Venue</h2>
            <p className="font-medium">{concert.venueName}</p>
            <p className="text-sm text-muted-foreground">
              {formatLocation(concert.city, concert.state, concert.country)}
            </p>
            <Link
              to={`/venue/${encodeURIComponent(concert.venueId)}`}
              className="mt-3 inline-flex text-sm font-medium text-primary"
            >
              View venue →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
