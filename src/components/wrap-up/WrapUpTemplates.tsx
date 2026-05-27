import type { ConcertReview, WrapUpTemplateId } from '@/types/concertReview';
import { BREAKDOWN_LABELS, OVERALL_VIBE_LABELS } from '@/types/concertReview';
import { formatDate } from '@/utils/format';

export const WRAP_UP_WIDTH = 1080;
export const WRAP_UP_HEIGHT = 1920;

interface TemplateProps {
  review: ConcertReview;
  featuredPhoto?: string;
}

function EncoreLogo() {
  return (
    <p className="text-[28px] font-black uppercase tracking-[0.35em] text-white/90">Encore</p>
  );
}

function TagPills({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[22px] font-semibold capitalize text-white backdrop-blur-sm"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function PosterTemplate({ review, featuredPhoto }: TemplateProps) {
  const bg = featuredPhoto ?? review.photoDataUrls?.[0];
  const fallbackGradient = 'linear-gradient(145deg, #1a0a2e 0%, #3d1a78 45%, #0f0f14 100%)';

  return (
    <div
      className="relative flex flex-col justify-end overflow-hidden text-white"
      style={{ width: WRAP_UP_WIDTH, height: WRAP_UP_HEIGHT, background: fallbackGradient }}
    >
      {bg ? (
        <>
          <img src={bg} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900/80 to-black" />
      )}
      <div className="relative z-10 flex flex-1 flex-col justify-between p-14">
        <EncoreLogo />
        <div>
          <div className="mb-6 inline-flex items-baseline gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-md">
            <span className="text-[72px] font-black leading-none tabular-nums">
              {review.overallRating}
            </span>
            <span className="text-[28px] font-medium text-white/70">/10</span>
          </div>
          <h1 className="text-[88px] font-black leading-[0.95] tracking-tight">
            {review.artistName}
          </h1>
          <p className="mt-6 text-[32px] font-medium text-white/80">
            {[review.venueName, review.eventDate ? formatDate(review.eventDate) : '']
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-4 text-[26px] text-violet-200">
            {OVERALL_VIBE_LABELS[review.overallRating]}
          </p>
          <p className="mt-8 text-[24px] uppercase tracking-widest text-white/50">
            My concert recap
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatsTemplate({ review }: TemplateProps) {
  const breakdown = BREAKDOWN_LABELS.filter(({ key }) => review[key]);

  return (
    <div
      className="flex flex-col bg-[#0a0a0f] p-14 text-white"
      style={{ width: WRAP_UP_WIDTH, height: WRAP_UP_HEIGHT }}
    >
      <EncoreLogo />
      <p className="mt-8 text-[26px] uppercase tracking-widest text-white/40">Concert Wrap-Up</p>
      <h1 className="mt-4 text-[64px] font-black leading-tight">{review.artistName}</h1>
      <p className="mt-2 text-[28px] text-white/60">
        {[review.venueName, review.eventDate ? formatDate(review.eventDate) : '']
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="my-10 flex items-end gap-4">
        <span className="text-[140px] font-black leading-none tabular-nums text-violet-400">
          {review.overallRating}
        </span>
        <span className="pb-4 text-[32px] text-white/50">/ 10 overall</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {breakdown.map(({ key, label, emoji }) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[22px] text-white/50">
              {emoji} {label}
            </p>
            <p className="mt-2 text-[40px] font-bold tabular-nums">{review[key]}/5</p>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-4 pt-10">
        {review.favoriteSong && (
          <p className="text-[26px]">
            <span className="text-white/50">Favorite song · </span>
            {review.favoriteSong}
          </p>
        )}
        {review.bestMoment && (
          <p className="text-[26px]">
            <span className="text-white/50">Best moment · </span>
            {review.bestMoment}
          </p>
        )}
        {review.wouldSeeAgain != null && (
          <p className="rounded-2xl bg-violet-600/30 px-5 py-3 text-[24px] font-semibold text-violet-200">
            {review.wouldSeeAgain ? 'Would see again ✓' : 'Probably skip next time'}
          </p>
        )}
        <TagPills tags={review.tags} />
      </div>
    </div>
  );
}

export function CollageTemplate({ review, featuredPhoto }: TemplateProps) {
  const photos = review.photoDataUrls?.length
    ? review.photoDataUrls
    : featuredPhoto
      ? [featuredPhoto]
      : [];

  const cells = photos.slice(0, 4);
  while (cells.length < 4 && photos[0]) {
    cells.push(photos[0]);
  }

  return (
    <div
      className="flex flex-col bg-[#0f0a18] p-12 text-white"
      style={{ width: WRAP_UP_WIDTH, height: WRAP_UP_HEIGHT }}
    >
      <div className="flex items-center justify-between">
        <EncoreLogo />
        <p className="text-[22px] font-semibold uppercase tracking-widest text-white/40">
          Concert Wrap-Up
        </p>
      </div>

      <div className="mt-10 grid flex-1 grid-cols-2 grid-rows-2 gap-3">
        {cells.length > 0 ? (
          cells.map((url, i) => (
            <img
              key={`${i}-${url.slice(0, 16)}`}
              src={url}
              alt=""
              className="size-full rounded-3xl object-cover"
            />
          ))
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-3xl bg-gradient-to-br from-violet-800/40 to-purple-950/60"
              />
            ))}
          </>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[56px] font-black leading-tight">{review.artistName}</h1>
            <p className="mt-2 text-[26px] text-white/60">
              {[review.venueName, review.eventDate ? formatDate(review.eventDate) : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="rounded-2xl bg-violet-600 px-6 py-4 text-center">
            <p className="text-[48px] font-black tabular-nums">{review.overallRating}</p>
            <p className="text-[18px] text-violet-200">/10</p>
          </div>
        </div>
        <div className="mt-6">
          <TagPills tags={review.tags} />
        </div>
      </div>
    </div>
  );
}

export function WrapUpTemplateContent({
  template,
  review,
  featuredPhoto,
}: {
  template: WrapUpTemplateId;
  review: ConcertReview;
  featuredPhoto?: string;
}) {
  switch (template) {
    case 'poster':
      return <PosterTemplate review={review} featuredPhoto={featuredPhoto} />;
    case 'stats':
      return <StatsTemplate review={review} featuredPhoto={featuredPhoto} />;
    case 'collage':
      return <CollageTemplate review={review} featuredPhoto={featuredPhoto} />;
  }
}
