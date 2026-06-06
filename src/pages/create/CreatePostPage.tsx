import {
  ConcertEventPicker,
  type SelectedConcertEvent,
} from '@/components/feed/ConcertEventPicker';
import { PhotoUploadGrid } from '@/components/review/PhotoUploadGrid';
import { Button } from '@/components/ui/app-button';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import { createFeedPost } from '@/lib/social/feedApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreatePostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedConcertEvent | null>(null);
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!caption.trim() && photos.length === 0) {
      setError('Add a caption or at least one photo.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // TODO: move photo storage to S3/Cloudinary/Vercel Blob for production.
      await createFeedPost({
        type: 'concert_post',
        caption: caption.trim() || undefined,
        photoDataUrls: photos.length > 0 ? photos : undefined,
        eventId: selected?.eventId,
        artistName: selected?.artistName,
        venueName: selected?.venueName,
        city: selected?.city,
        eventDate: selected?.eventDate,
        imageUrl: selected?.imageUrl,
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
        <h1 className="text-2xl font-bold">Concert post</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share a memory, photo, or thought from the night.
        </p>
      </header>

      <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            placeholder="What made this night special?"
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Photos</p>
          <PhotoUploadGrid photos={photos} onChange={setPhotos} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Link a concert (optional)</p>
          <ConcertEventPicker
            selected={selected}
            onSelect={setSelected}
            onClear={() => setSelected(null)}
            placeholder="Search to link a concert…"
            emptyHint="Optional — link a concert to your post."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="primary" fullWidth disabled={submitting}>
          {submitting ? 'Posting…' : 'Post'}
        </Button>
      </form>
    </div>
  );
}
