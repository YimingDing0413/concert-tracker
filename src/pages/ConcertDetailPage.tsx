import { api } from '@/api';
import { ConcertActions } from '@/components/concert/ConcertActions';
import { CommunityShowTiming } from '@/components/concert/CommunityShowTiming';
import { SetlistDisplay } from '@/components/concert/SetlistDisplay';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiNotice } from '@/components/ui/ApiNotice';
import { useAuth } from '@/context/AuthContext';
import type {
  AggregatedShowTiming,
  Concert,
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

function mergeConcertDetail(
  apiConcert: ConcertDetail | null,
  snapshot?: Partial<Concert>
): ConcertDetail | null {
  if (!apiConcert && !snapshot) return null;
  if (!apiConcert) return snapshot as ConcertDetail;
  if (!snapshot) return apiConcert;

  return {
    ...apiConcert,
    ...snapshot,
    id: apiConcert.id,
    imageUrl: apiConcert.imageUrl ?? snapshot.imageUrl,
    artistName: snapshot.artistName || apiConcert.artistName,
    venueName: snapshot.venueName || apiConcert.venueName,
    city: snapshot.city || apiConcert.city,
    state: snapshot.state ?? apiConcert.state,
    country: snapshot.country || apiConcert.country,
    date: snapshot.date || apiConcert.date,
    startTime: snapshot.startTime ?? apiConcert.startTime,
    setlist: apiConcert.setlist,
    predictedSetlist: apiConcert.predictedSetlist,
    artist: apiConcert.artist,
    venue: apiConcert.venue,
  };
}

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
      setConcert(mergeConcertDetail(c, snapshot));
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
    setConcert(mergeConcertDetail(c, snapshot));
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

  async function setStatus(status: 'going' | 'attended' | 'saved') {
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
      {/* Cinematic hero */}
      <div className="relative">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="poster-gradient absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-black/20" />
          <div className="absolute inset-x-0 top-0 p-4">
            <SolidBackButton to={backTo} className="bg-black/40 backdrop-blur-sm" />
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-8">
            <ApiNotice source={concert.source} />
            <h1 className="text-display-xl text-white">{concert.artistName}</h1>
            <p className="flex items-start gap-2 text-sm text-white/80">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {concert.venueName} · {formatLocation(concert.city, concert.state, concert.country)}
              </span>
            </p>
            <p className="flex items-center gap-2 text-sm font-medium text-white/90">
              <Calendar className="size-4 shrink-0" aria-hidden />
              {formatDate(concert.date)}
              {concert.startTime && ` · ${formatTime(concert.startTime)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-8 px-4 py-6 md:max-w-3xl">
        {concert.ticketUrl && <TicketCtaLink href={concert.ticketUrl} />}

        {user && (
          <section className="space-y-3">
            <ConcertActions
              concertId={id!}
              concertStatus={concert.status}
              userStatus={userConcert?.status}
              loading={actionLoading}
              onGoing={() => setStatus('going')}
              onWant={() => setStatus('saved')}
              onAttended={() => setStatus('attended')}
            />
            {concert.status === 'past' && (
              <p className="text-xs text-muted-foreground">
                Been to this show? Mark attended, then leave a review.
              </p>
            )}
          </section>
        )}

        <section className="space-y-3 rounded-2xl bg-surface-2 p-4">
          <h2 className="font-display text-base font-semibold">Event info</h2>
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
            <p className="text-sm">
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
          <section className="rounded-2xl bg-surface-2 p-4">
            <h2 className="mb-2 font-display text-base font-semibold">Your notes</h2>
            <p className="text-sm text-muted-foreground">{userConcert.notes}</p>
          </section>
        )}

        {concert.venueId && (
          <section className="rounded-2xl bg-surface-2 p-4">
            <h2 className="mb-2 font-display text-base font-semibold">Venue</h2>
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
