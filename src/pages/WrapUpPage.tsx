import { ConcertWrapUp } from '@/components/wrap-up/ConcertWrapUp';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  getConcertReview,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import { useAuth } from '@/context/AuthContext';
import { getConcertNavState } from '@/utils/concertNav';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

export function WrapUpPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void syncConcertReviewsFromServer(user.id).finally(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [user]);

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

  const review = getConcertReview(user.id, id);

  if (review === null) {
    return <Navigate to={`/concert/${id}/review`} replace state={location.state} />;
  }

  return <ConcertWrapUp review={review} backTo={navState.backTo ?? backTo} />;
}
