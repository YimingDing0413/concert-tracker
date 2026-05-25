import { api } from '@/api';
import { ConcertActions } from '@/components/concert/ConcertActions';
import { ConcertTimingGrid } from '@/components/concert/ConcertTiming';
import { SetlistDisplay } from '@/components/concert/SetlistDisplay';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StarRating } from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import type { ConcertDetail, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [userConcert, setUserConcert] = useState<UserConcert | null>(null);
  const [rating, setRating] = useState<ConcertRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [c, ucs, r] = await Promise.all([
      api.getConcert(id),
      api.getUserConcerts(user.id),
      api.getRating(user.id, id),
    ]);
    setConcert(c);
    setUserConcert(ucs.find((uc) => uc.concertId === id) ?? null);
    setRating(r);
  }, [id, user]);

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
      <ConcertTimingGrid timing={concert.timing} />
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
