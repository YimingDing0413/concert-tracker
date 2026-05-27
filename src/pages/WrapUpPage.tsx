import { ConcertWrapUp } from '@/components/wrap-up/ConcertWrapUp';
import { getConcertReview } from '@/lib/concertReviewsLocal';
import { useAuth } from '@/context/AuthContext';
import { getConcertNavState } from '@/utils/concertNav';
import { Navigate, useLocation, useParams } from 'react-router-dom';

export function WrapUpPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const navState = getConcertNavState(location.state);
  const backTo = id ? `/concert/${id}` : '/';

  if (!id) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/login" replace />;

  const review = getConcertReview(user.id, id);

  if (review === null) {
    return <Navigate to={`/concert/${id}/review`} replace state={location.state} />;
  }

  return <ConcertWrapUp review={review} backTo={navState.backTo ?? backTo} />;
}
