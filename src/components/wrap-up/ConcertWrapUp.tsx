import { WrapUpDownloadButton } from '@/components/wrap-up/WrapUpDownloadButton';
import { WrapUpExportCanvas, WrapUpPreview } from '@/components/wrap-up/WrapUpPreview';
import { WrapUpTemplateSelector } from '@/components/wrap-up/WrapUpTemplateSelector';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import type { ConcertReview, WrapUpTemplateId } from '@/types/concertReview';
import { useRef, useState } from 'react';

interface ConcertWrapUpProps {
  review: ConcertReview;
  backTo: string;
}

export function ConcertWrapUp({ review, backTo }: ConcertWrapUpProps) {
  const [template, setTemplate] = useState<WrapUpTemplateId>('poster');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const exportRef = useRef<HTMLDivElement>(null);

  const photos = review.photoDataUrls ?? [];
  const featuredPhoto = photos[featuredIndex] ?? photos[0];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-background to-primary/10 pb-10">
      <div className="mx-auto max-w-lg px-4 py-4 md:max-w-xl">
        <SolidBackButton to={backTo} className="mb-4" />
        <h1 className="text-2xl font-black tracking-tight">Concert Wrap-Up</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Instagram Story format · {review.artistName}
        </p>

        <div className="mt-6 space-y-6">
          <section>
            <p className="mb-3 text-sm font-semibold">Choose template</p>
            <WrapUpTemplateSelector value={template} onChange={setTemplate} />
          </section>

          {photos.length > 1 && (template === 'poster' || template === 'collage') && (
            <section>
              <p className="mb-3 text-sm font-semibold">Featured photo</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, i) => (
                  <button
                    key={url.slice(0, 24)}
                    type="button"
                    onClick={() => setFeaturedIndex(i)}
                    className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                      featuredIndex === i ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-3 text-sm font-semibold">Preview</p>
            <WrapUpPreview
              review={review}
              template={template}
              featuredPhoto={featuredPhoto}
            />
          </section>

          <WrapUpDownloadButton exportRef={exportRef} artistName={review.artistName} />
        </div>
      </div>

      <WrapUpExportCanvas
        review={review}
        template={template}
        featuredPhoto={featuredPhoto}
        exportRef={exportRef}
      />
    </div>
  );
}
