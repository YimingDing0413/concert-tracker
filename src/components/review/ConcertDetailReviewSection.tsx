import { Button } from '@/components/ui/app-button';
import { ConcertReviewCard } from '@/components/review/ConcertReviewCard';
import { deleteConcertReview } from '@/lib/concertReviewsLocal';
import type { ConcertReview } from '@/types/concertReview';
import { Sparkles, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConcertDetailReviewSectionProps {
  eventId: string;
  review: ConcertReview | null;
  onReviewChange: () => void;
  navState?: unknown;
}

export function ConcertDetailReviewSection({
  eventId,
  review,
  onReviewChange,
  navState,
}: ConcertDetailReviewSectionProps) {
  const navigate = useNavigate();

  function goReview() {
    navigate(`/concert/${eventId}/review`, { state: navState });
  }

  function goWrapUp() {
    navigate(`/concert/${eventId}/wrap-up`, { state: navState });
  }

  function handleDelete() {
    if (!review) return;
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    deleteConcertReview(eventId);
    onReviewChange();
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-violet-950/20 via-card to-card shadow-xl">
      <div className="border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your review
          </h2>
        </div>
      </div>

      <div className="p-5">
        {review ? (
          <div className="space-y-4">
            <ConcertReviewCard review={review} compact />
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="secondary" fullWidth onClick={goReview}>
                Edit rating
              </Button>
              <Button fullWidth onClick={goWrapUp}>
                Create wrap-up
              </Button>
              <Button variant="ghost" fullWidth onClick={handleDelete}>
                <Trash2 className="mr-1 size-4" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Rate this concert and create a shareable recap.
            </p>
            <Button fullWidth className="mt-4" onClick={goReview}>
              Rate this concert
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
