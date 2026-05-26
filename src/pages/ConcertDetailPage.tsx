import { api } from '@/api';
import { ConcertActions } from '@/components/concert/ConcertActions';
import { CommunityShowTiming } from '@/components/concert/CommunityShowTiming';
import { SetlistDisplay } from '@/components/concert/SetlistDisplay';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiNotice } from '@/components/ui/ApiNotice';
import { StarRating } from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import type {
  AggregatedShowTiming,
  ConcertDetail,
  ConcertRating,
  ShowReportInput,
  UserConcert,
} from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

type ConcertLocationState = {
  concertSnapshot?: Partial<ConcertDetail>;
};

export function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [userConcert, setUserConcert] = useState<UserConcert | null>(null);
  const [rating, setRating] = useState<ConcertRating | null>(null);
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
      const state = (location.state ?? {}) as ConcertLocationState;
      const snapshot = state.concertSnapshot;
      const merged =
        snapshot && c?.source === 'mock' ? ({ ...c, ...snapshot, id: c.id } as ConcertDetail) : c;
      setConcert(merged);
      setUserConcert(null);
      setRating(null);
      setShowTiming(timing.aggregated);
      setShowReportCount(timing.reports.length);
      return;
    }
    const [c, ucs, r, timing] = await Promise.all([
      api.getConcert(id),
      api.getUserConcerts(user.id),
      api.getRating(user.id, id),
      timingPromise,
    ]);
    const state = (location.state ?? {}) as ConcertLocationState;
    const snapshot = state.concertSnapshot;
    // If this concert came from a list (e.g. Setlist.fm-derived past shows),
    // keep the real artist/venue/date we already have even if the API falls back to mock.
    const merged =
      snapshot && c?.source === 'mock' ? ({ ...c, ...snapshot, id: c.id } as ConcertDetail) : c;
    setConcert(merged);
    setUserConcert(ucs.find((uc) => uc.concertId === id) ?? null);
    setRating(r);
    setShowTiming(timing.aggregated);
    setShowReportCount(timing.reports.length);
  }, [id, user, location.state]);

  async function handleSubmitShowInfo(input: ShowReportInput) {
    if (!user || !id) {
      throw new Error('Sign in to submit show info.');
    }
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
    if (!user || !id) return;
    setActionLoading(true);
    try {
      const uc = await api.setConcertStatus(user.id, id, status);
      setUserConcert(uc);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error || !concert) return <p className="muted">{error || 'Concert not found.'}</p>;

  const displaySetlist =
    concert.status === 'past' ? concert.setlist : concert.predictedSetlist ?? concert.setlist;

  return (
    <div className="page detail-page">
      <PageHeader
        title={concert.artistName}
        subtitle={`${concert.venueName} · ${formatLocation(concert.city, concert.state, concert.country)}`}
        backTo="/"
      />
      <ApiNotice source={concert.source} />
      {concert.imageUrl && (
        <img src={concert.imageUrl} alt="" className="detail-hero-img" />
      )}
      <div className="concert-meta-block">
        <p>
          <strong>{formatDate(concert.date)}</strong>
          {concert.startTime && ` · ${formatTime(concert.startTime)}`}
        </p>
        {concert.openers?.length ? (
          <p className="muted">With {concert.openers.join(', ')}</p>
        ) : (
          <p className="muted">Openers: Not available yet</p>
        )}
        {concert.ticketUrl && (
          <a href={concert.ticketUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
            Get tickets
          </a>
        )}
      </div>
      {showTiming && (
        <CommunityShowTiming
          aggregated={showTiming}
          reportCount={showReportCount}
          onSubmit={handleSubmitShowInfo}
          submitting={timingSubmitting}
        />
      )}
      {user && (
        <ConcertActions
          status={userConcert?.status}
          loading={actionLoading}
          onGoing={() => setStatus('going')}
          onAttended={() => setStatus('attended')}
          onRate={() => navigate(`/concert/${id}/rate`)}
        />
      )}
      {rating && (
        <section className="rating-preview card">
          <h3>Your rating</h3>
          <StarRating value={rating.overall} readonly />
          {rating.review && <p className="review-snippet">{rating.review}</p>}
          <Link to={`/concert/${id}/rate`}>Edit review →</Link>
        </section>
      )}
      <SetlistDisplay setlist={displaySetlist} />
      {userConcert?.notes && (
        <section className="card">
          <h3>Your notes</h3>
          <p className="notes-block">{userConcert.notes}</p>
        </section>
      )}
    </div>
  );
}
