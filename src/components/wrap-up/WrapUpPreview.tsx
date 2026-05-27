import type { ConcertReview, WrapUpTemplateId } from '@/types/concertReview';
import {
  WRAP_UP_HEIGHT,
  WRAP_UP_WIDTH,
  WrapUpTemplateContent,
} from '@/components/wrap-up/WrapUpTemplates';
import { forwardRef } from 'react';

interface WrapUpPreviewProps {
  review: ConcertReview;
  template: WrapUpTemplateId;
  featuredPhoto?: string;
  /** Scale for on-screen preview (export uses full size via ref) */
  previewScale?: number;
}

export const WrapUpPreview = forwardRef<HTMLDivElement, WrapUpPreviewProps>(
  function WrapUpPreview({ review, template, featuredPhoto, previewScale = 0.32 }, ref) {
    const scaledW = WRAP_UP_WIDTH * previewScale;
    const scaledH = WRAP_UP_HEIGHT * previewScale;

    return (
      <div
        className="mx-auto overflow-hidden rounded-3xl border border-border/50 shadow-2xl ring-1 ring-white/5"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          style={{
            width: WRAP_UP_WIDTH,
            height: WRAP_UP_HEIGHT,
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left',
          }}
        >
          <div ref={ref}>
            <WrapUpTemplateContent
              template={template}
              review={review}
              featuredPhoto={featuredPhoto}
            />
          </div>
        </div>
      </div>
    );
  }
);

/** Full-size off-screen element for PNG export */
export function WrapUpExportCanvas({
  review,
  template,
  featuredPhoto,
  exportRef,
}: {
  review: ConcertReview;
  template: WrapUpTemplateId;
  featuredPhoto?: string;
  exportRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="pointer-events-none fixed left-[-9999px] top-0"
      aria-hidden
    >
      <div ref={exportRef} style={{ width: WRAP_UP_WIDTH, height: WRAP_UP_HEIGHT }}>
        <WrapUpTemplateContent
          template={template}
          review={review}
          featuredPhoto={featuredPhoto}
        />
      </div>
    </div>
  );
}
