import {
  ConcertEventPicker,
  type SelectedConcertEvent,
} from '@/components/feed/ConcertEventPicker';
import { Button } from '@/components/ui/app-button';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import { createFeedPost } from '@/lib/social/feedApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateWantPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedConcertEvent | null>(null);
  const [quantity, setQuantity] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!selected) {
      setError('Select a concert first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createFeedPost({
        type: 'looking_for_tickets',
        ticketStatus: 'looking',
        ticketQuantity: quantity ? Number(quantity) : undefined,
        maxBudget: maxBudget.trim() || undefined,
        ticketNote: note.trim() || undefined,
        eventId: selected.eventId,
        artistName: selected.artistName,
        venueName: selected.venueName,
        city: selected.city,
        eventDate: selected.eventDate,
        imageUrl: selected.imageUrl,
      });
      setSuccess(true);
      setTimeout(() => navigate('/feed'), 1200);
    } catch {
      setError('Could not post. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-2xl">Posted!</p>
        <p className="text-sm text-muted-foreground">Taking you to the feed…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <SolidBackButton to="/create" label="Back" />

      <header>
        <h1 className="text-2xl font-bold">Looking for tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Encore does not verify ticket sellers or process payments.
        </p>
      </header>

      <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
        <ConcertEventPicker
          selected={selected}
          onSelect={setSelected}
          onClear={() => setSelected(null)}
          emptyHint="Search for the concert you want tickets to."
        />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Ticket quantity</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            placeholder="e.g. 2"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Max budget (optional)</span>
          <input
            type="text"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            placeholder="e.g. $150 each"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            placeholder="Section preferences, GA vs seated, etc."
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="primary" fullWidth disabled={submitting || !selected}>
          {submitting ? 'Posting…' : 'Post looking for tickets'}
        </Button>
      </form>
    </div>
  );
}
