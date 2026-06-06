import {
  ConcertEventPicker,
  type SelectedConcertEvent,
} from '@/components/feed/ConcertEventPicker';
import { Button } from '@/components/ui/app-button';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateReviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedConcertEvent | null>(null);

  if (!user) return null;

  function continueToReview() {
    if (!selected) return;
    navigate(`/concert/${selected.eventId}/review`, {
      state: {
        backTo: '/create/review',
        afterSaveRedirect: '/feed',
        createFeedPost: true,
        concertSnapshot: {
          city: selected.city,
          imageUrl: selected.imageUrl,
        },
      },
    });
  }

  return (
    <div className="space-y-6 pb-8">
      <SolidBackButton to="/create" label="Back" />

      <header>
        <h1 className="text-2xl font-bold">Review a concert</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the show you attended, then rate and recap it.
        </p>
      </header>

      <ConcertEventPicker
        selected={selected}
        onSelect={setSelected}
        onClear={() => setSelected(null)}
        placeholder="Search for a concert you attended…"
        emptyHint="Search for the concert you want to review."
      />

      <Button variant="primary" fullWidth disabled={!selected} onClick={continueToReview}>
        Continue to review
      </Button>
    </div>
  );
}
