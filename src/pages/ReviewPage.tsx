import { api } from '@/api';
import { ConcertReviewFlow } from '@/components/review/ConcertReviewFlow';
import { getConcertReview, saveConcertReview } from '@/lib/concertReviewsLocal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ConcertDetail } from '@/types';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getConcert(id)
      .then(setConcert)
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return <Navigate to="/" replace />;
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

  const existingReview = getConcertReview(id);

  return (
    <ConcertReviewFlow
      concert={concert}
      existingReview={existingReview}
      onSave={(review) => {
        saveConcertReview(review);
        navigate(`/concert/${id}`, { state: location.state });
      }}
      onCreateWrapUp={(review) => {
        saveConcertReview(review);
        navigate(`/concert/${id}/wrap-up`, { state: location.state });
      }}
      onCancel={() => navigate(`/concert/${id}`, { state: location.state })}
    />
  );
}
