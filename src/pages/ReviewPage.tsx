import { api } from '@/api';
import { ConcertReviewFlow } from '@/components/review/ConcertReviewFlow';
import {
  getConcertReview,
  saveConcertReview,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import type { ConcertDetail } from '@/types';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getConcert(id).then(setConcert),
      user ? syncConcertReviewsFromServer(user.id) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [id, user]);

  if (!id) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </div>
    );
  }
  if (!concert) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center text-muted-foreground">
        Concert not found.
      </div>
    );
  }

  const existingReview = getConcertReview(user.id, id);

  return (
    <ConcertReviewFlow
      concert={concert}
      userId={user.id}
      existingReview={existingReview}
      onSave={async (review) => {
        await saveConcertReview(review);
        navigate(`/concert/${id}`, { state: location.state });
      }}
      onCreateWrapUp={async (review) => {
        await saveConcertReview(review);
        navigate(`/concert/${id}/wrap-up`, { state: location.state });
      }}
      onCancel={() => navigate(`/concert/${id}`, { state: location.state })}
    />
  );
}
