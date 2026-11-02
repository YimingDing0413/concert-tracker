import { api } from '@/api';
import { ConcertReviewFlow } from '@/components/review/ConcertReviewFlow';
import {
  getConcertReviewWithPhotos,
  saveConcertReview,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import { concertDetailFromUserConcert } from '@/lib/logConcert';
import { createReviewFeedPost } from '@/lib/social/feedApi';
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
  const [existingReview, setExistingReview] = useState<Awaited<
    ReturnType<typeof getConcertReviewWithPhotos>
  >>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    Promise.all([
      api.getConcert(id),
      api.getUserConcerts(user.id),
      syncConcertReviewsFromServer(user.id),
      getConcertReviewWithPhotos(user.id, id),
    ])
      .then(([catalog, ucs, , review]) => {
        const uc = ucs.find((row) => row.concertId === id);
        const fromUser = uc ? concertDetailFromUserConcert(uc) : null;
        const snap = (location.state as { concertSnapshot?: Partial<ConcertDetail> } | null)
          ?.concertSnapshot;
        setConcert(
          catalog ??
            fromUser ??
            (snap
              ? concertDetailFromUserConcert({
                  id: `uc-temp`,
                  userId: user.id,
                  concertId: id,
                  status: 'attended',
                  concertSnapshot: snap,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              : null)
        );
        setExistingReview(review ?? null);
      })
      .finally(() => setLoading(false));
  }, [id, user, location.state]);

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

  async function persistReview(
    review: Parameters<typeof saveConcertReview>[0]
  ): Promise<void> {
    await saveConcertReview(review);
    try {
      await api.setConcertStatus(user!.id, review.eventId, 'attended', {
        id: concert!.id,
        artistName: concert!.artistName,
        venueName: concert!.venueName,
        city: concert!.city,
        state: concert!.state,
        country: concert!.country,
        date: concert!.date,
        imageUrl: concert!.imageUrl,
        status: 'past',
        artistId: concert!.artistId,
        venueId: concert!.venueId,
      });
    } catch {
      /* review saved; status best-effort */
    }

    const state = location.state as {
      createFeedPost?: boolean;
      concertSnapshot?: { city?: string; imageUrl?: string };
    } | null;
    if (state?.createFeedPost) {
      try {
        await createReviewFeedPost(review, {
          city: state.concertSnapshot?.city ?? concert!.city,
          imageUrl: state.concertSnapshot?.imageUrl ?? concert!.imageUrl,
        });
      } catch {
        /* feed post best-effort */
      }
    }
  }

  return (
    <ConcertReviewFlow
      concert={concert}
      userId={user.id}
      existingReview={existingReview}
      onSave={async (review) => {
        await persistReview(review);
        const state = location.state as { afterSaveRedirect?: string } | null;
        navigate(state?.afterSaveRedirect ?? `/concert/${id}`, { state: location.state });
      }}
      onCreateWrapUp={async (review) => {
        await persistReview(review);
        navigate(`/concert/${id}/wrap-up`, { state: location.state });
      }}
      onCancel={() => navigate(`/concert/${id}`, { state: location.state })}
    />
  );
}
