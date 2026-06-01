import type { ConcertReview, YearEndStats, YearEndTemplateId } from '@/types/concertReview';
import {
  YEAR_END_HEIGHT,
  YEAR_END_WIDTH,
  YearEndTemplateContent,
} from '@/components/wrap-up/year-end/YearEndTemplates';

interface YearEndWrapUpPreviewProps {
  template: YearEndTemplateId;
  stats: YearEndStats;
  reviews: ConcertReview[];
  photos: string[];
  /** On-screen scale; export uses full size via the off-screen canvas. */
  previewScale?: number;
}

export function YearEndWrapUpPreview({
  template,
  stats,
  reviews,
  photos,
  previewScale = 0.32,
}: YearEndWrapUpPreviewProps) {
  const scaledW = YEAR_END_WIDTH * previewScale;
  const scaledH = YEAR_END_HEIGHT * previewScale;

  return (
    <div
      className="mx-auto overflow-hidden rounded-3xl border border-border/50 shadow-2xl ring-1 ring-white/5"
      style={{ width: scaledW, height: scaledH }}
    >
      <div
        style={{
          width: YEAR_END_WIDTH,
          height: YEAR_END_HEIGHT,
          transform: `scale(${previewScale})`,
          transformOrigin: 'top left',
        }}
      >
        <YearEndTemplateContent
          template={template}
          stats={stats}
          reviews={reviews}
          photos={photos}
        />
      </div>
    </div>
  );
}

/** Full-size, off-screen element used for the PNG export. */
export function YearEndExportCanvas({
  template,
  stats,
  reviews,
  photos,
  exportRef,
}: {
  template: YearEndTemplateId;
  stats: YearEndStats;
  reviews: ConcertReview[];
  photos: string[];
  exportRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden>
      <div ref={exportRef} style={{ width: YEAR_END_WIDTH, height: YEAR_END_HEIGHT }}>
        <YearEndTemplateContent
          template={template}
          stats={stats}
          reviews={reviews}
          photos={photos}
        />
      </div>
    </div>
  );
}
