import { ConcertWrapUp } from '@/components/wrap-up/ConcertWrapUp';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  getConcertReviewWithPhotos,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import type { ConcertReview } from '@/types/concertReview';
import { useAuth } from '@/context/AuthContext';
import { getConcertNavState } from '@/utils/concertNav';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

export function WrapUpPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);
  const [review, setReview] = useState<ConcertReview | null | undefined>(undefined);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    void syncConcertReviewsFromServer(user.id)
      .then(() => getConcertReviewWithPhotos(user.id, id))
      .then((loaded) => {
        if (active) setReview(loaded);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [user, id]);

  const navState = getConcertNavState(location.state);
  const backTo = id ? `/concert/${id}` : '/';

  if (!id) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/login" replace />;

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </div>
    );
  }

  if (review === null || review === undefined) {
    return <Navigate to={`/concert/${id}/review`} replace state={location.state} />;
  }

  return <ConcertWrapUp review={review} backTo={navState.backTo ?? backTo} />;
}
