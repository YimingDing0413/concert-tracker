import { Button } from '@/components/ui/app-button';
import { ConcertReviewCard } from '@/components/review/ConcertReviewCard';
import { PhotoUploadGrid } from '@/components/review/PhotoUploadGrid';
import { RatingBreakdown } from '@/components/review/RatingBreakdown';
import { RatingSelector } from '@/components/review/RatingSelector';
import { TagSelector } from '@/components/review/TagSelector';
import { generateReviewId } from '@/lib/concertReviewsLocal';
import type { ConcertReview, ConcertReviewDraft } from '@/types/concertReview';
import type { ConcertDetail } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

const STEPS = ['Vibe', 'Breakdown', 'Highlights', 'Photos', 'Preview'] as const;

function emptyDraft(): ConcertReviewDraft {
  return {
    overallRating: 0,
    tags: [],
    photoDataUrls: [],
  };
}

interface ConcertReviewFlowProps {
  concert: ConcertDetail;
  userId: string;
  existingReview?: ConcertReview | null;
  onSave: (review: ConcertReview) => void | Promise<void>;
  onCreateWrapUp: (review: ConcertReview) => void | Promise<void>;
  onCancel: () => void;
}

export function ConcertReviewFlow({
  concert,
  userId,
  existingReview,
  onSave,
  onCreateWrapUp,
  onCancel,
}: ConcertReviewFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [draft, setDraft] = useState<ConcertReviewDraft>(() =>
    existingReview
      ? { ...existingReview }
      : {
          ...emptyDraft(),
          venueName: concert.venueName,
          eventDate: concert.date,
        }
  );

  const step = STEPS[stepIndex];

  const previewReview = useMemo((): ConcertReview => {
    const now = new Date().toISOString();
    return {
      id: existingReview?.id ?? generateReviewId(),
      userId,
      eventId: concert.id,
      artistName: concert.artistName,
      venueName: draft.venueName ?? concert.venueName,
      eventDate: draft.eventDate ?? concert.date,
      overallRating: draft.overallRating || 0,
      performanceRating: draft.performanceRating,
      setlistRating: draft.setlistRating,
      venueRating: draft.venueRating,
      crowdRating: draft.crowdRating,
      soundRating: draft.soundRating,
      valueRating: draft.valueRating,
      favoriteSong: draft.favoriteSong?.trim() || undefined,
      bestMoment: draft.bestMoment?.trim() || undefined,
      wouldSeeAgain: draft.wouldSeeAgain,
      reviewText: draft.reviewText?.trim() || undefined,
      tags: draft.tags?.length ? draft.tags : undefined,
      photoDataUrls: draft.photoDataUrls?.length ? draft.photoDataUrls : undefined,
      createdAt: existingReview?.createdAt ?? now,
      updatedAt: now,
    };
  }, [concert, draft, existingReview, userId]);

  function patch(partial: Partial<ConcertReviewDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function canAdvance(): boolean {
    if (step === 'Vibe') return draft.overallRating > 0;
    return true;
  }

  async function handleSave() {
    if (previewReview.overallRating <= 0 || saving) return;
    setSaveError('');
    setSaving(true);
    try {
      await onSave(previewReview);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save review. Try again.');
      setSaving(false);
    }
  }

  async function handleSaveAndWrapUp() {
    if (previewReview.overallRating <= 0 || saving) return;
    setSaveError('');
    setSaving(true);
    try {
      await onSave(previewReview);
      await onCreateWrapUp(previewReview);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save review. Try again.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between md:max-w-xl">
          <button
            type="button"
            onClick={stepIndex === 0 ? onCancel : () => setStepIndex((i) => i - 1)}
            className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-card/80"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <p className="text-sm font-bold">{step}</p>
          </div>
          <div className="size-10" />
        </div>
        <div className="mx-auto mt-3 flex max-w-lg gap-1 md:max-w-xl">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= stepIndex ? 'bg-primary' : 'bg-border/60'
              )}
            />
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 md:max-w-xl">
        {step === 'Vibe' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight">How was the show?</h1>
              <p className="mt-2 text-muted-foreground">
                {concert.artistName} · {concert.venueName}
              </p>
            </div>
            <RatingSelector
              value={draft.overallRating}
              onChange={(v) => patch({ overallRating: v })}
            />
            <div>
              <p className="mb-3 text-sm font-semibold">Mood tags</p>
              <TagSelector selected={draft.tags ?? []} onChange={(tags) => patch({ tags })} />
            </div>
          </div>
        )}

        {step === 'Breakdown' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Rate the details</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap scores — skip anything you don&apos;t care about.
              </p>
            </div>
            <RatingBreakdown
              values={draft}
              onChange={(key, value) => patch({ [key]: value })}
            />
          </div>
        )}

        {step === 'Highlights' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Best bits</h1>
              <p className="mt-1 text-sm text-muted-foreground">What made the night memorable?</p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Favorite song performed</span>
              <input
                value={draft.favoriteSong ?? ''}
                onChange={(e) => patch({ favoriteSong: e.target.value })}
                placeholder="e.g. Anti-Hero"
                className="w-full rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Best moment</span>
              <input
                value={draft.bestMoment ?? ''}
                onChange={(e) => patch({ bestMoment: e.target.value })}
                placeholder="e.g. Surprise encore"
                className="w-full rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <div className="space-y-2">
              <span className="text-sm font-semibold">Would see this artist again?</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => patch({ wouldSeeAgain: true })}
                  className={cn(
                    'rounded-2xl border py-4 text-sm font-bold transition-all',
                    draft.wouldSeeAgain === true
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border/60 bg-card/60'
                  )}
                >
                  Yes 🔁
                </button>
                <button
                  type="button"
                  onClick={() => patch({ wouldSeeAgain: false })}
                  className={cn(
                    'rounded-2xl border py-4 text-sm font-bold transition-all',
                    draft.wouldSeeAgain === false
                      ? 'border-destructive/50 bg-destructive/10 text-destructive'
                      : 'border-border/60 bg-card/60'
                  )}
                >
                  Probably not
                </button>
              </div>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Short review</span>
              <textarea
                value={draft.reviewText ?? ''}
                onChange={(e) => patch({ reviewText: e.target.value })}
                rows={4}
                placeholder="Tell your friends how it felt…"
                className="w-full resize-none rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
          </div>
        )}

        {step === 'Photos' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Concert photos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional — they&apos;ll appear on your wrap-up.
              </p>
            </div>
            <PhotoUploadGrid
              photos={draft.photoDataUrls ?? []}
              onChange={(photoDataUrls) => patch({ photoDataUrls })}
            />
          </div>
        )}

        {step === 'Preview' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Looking good</h1>
              <p className="mt-1 text-sm text-muted-foreground">Save or create your story wrap-up.</p>
            </div>
            <ConcertReviewCard review={previewReview} />
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-2 md:max-w-xl">
          {step === 'Preview' ? (
            <>
              {saveError && (
                <p className="text-center text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              )}
              <Button fullWidth onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save review'}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                disabled={saving}
                onClick={() => void handleSaveAndWrapUp()}
              >
                Save & create wrap-up
              </Button>
            </>
          ) : (
            <Button
              fullWidth
              disabled={!canAdvance()}
              onClick={() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))}
            >
              Continue
              <ChevronRight className="ml-1 inline size-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
