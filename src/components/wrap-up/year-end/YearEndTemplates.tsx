import type { ConcertReview, YearEndStats, YearEndTemplateId } from '@/types/concertReview';
import { formatDate } from '@/utils/format';

export const YEAR_END_WIDTH = 1080;
export const YEAR_END_HEIGHT = 1920;

export interface YearEndTemplateProps {
  stats: YearEndStats;
  reviews: ConcertReview[];
  photos: string[];
}

function EncoreWordmark({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[30px] font-black uppercase tracking-[0.35em] text-white/90 ${className}`}>
      Encore
    </p>
  );
}

function firstPhoto(review: ConcertReview): string | undefined {
  return review.photoDataUrls?.[0];
}

/* ------------------------------------------------------------------ */
/* Template 1 — Photo Collage                                          */
/* ------------------------------------------------------------------ */

/**
 * Picks a grid that fills exactly `count` cells with no blanks. The first
 * photo absorbs any remainder by spanning extra columns, so e.g. 4 photos
 * render as a clean 2×2 and 3 photos as one wide + two below.
 */
function collageLayout(count: number): { cols: number; firstSpan: number } {
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const blanks = rows * cols - count;
  return { cols, firstSpan: blanks + 1 };
}

export function YearEndPhotoCollageTemplate({ stats, photos }: YearEndTemplateProps) {
  const cells = photos.slice(0, 12);
  const artistNames = stats.topArtists.map((a) => a.name).slice(0, 4);
  const { cols, firstSpan } = collageLayout(cells.length);

  return (
    <div
      className="relative flex flex-col overflow-hidden text-white"
      style={{
        width: YEAR_END_WIDTH,
        height: YEAR_END_HEIGHT,
        background: 'linear-gradient(160deg, #1a0a2e 0%, #2d1b4e 40%, #0b0b12 100%)',
      }}
    >
      <div className="absolute inset-0">
        {cells.length > 0 ? (
          <div
            className="h-full gap-2 p-2"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridAutoRows: '1fr',
            }}
          >
            {cells.map((url, i) => (
              <img
                key={`${i}-${url.slice(0, 16)}`}
                src={url}
                alt=""
                className="size-full rounded-2xl object-cover"
                style={i === 0 && firstSpan > 1 ? { gridColumn: `span ${firstSpan}` } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-800/40 via-purple-900/30 to-transparent" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/30" />

      <div className="relative z-10 flex h-full flex-col p-14">
        <EncoreWordmark />
        <div className="mt-auto">
          <p className="text-[34px] font-semibold uppercase tracking-[0.3em] text-violet-300">
            My {stats.year}
          </p>
          <h1 className="mt-1 text-[150px] font-black leading-[0.9] tracking-tight">Concerts</h1>
          <div className="mt-8 flex items-end gap-4">
            <span className="text-[120px] font-black leading-none tabular-nums text-white">
              {stats.totalConcerts}
            </span>
            <span className="pb-5 text-[40px] font-semibold text-white/70">
              {stats.totalConcerts === 1 ? 'show' : 'shows'}
            </span>
          </div>
          {artistNames.length > 0 && (
            <p className="mt-6 text-[30px] font-medium leading-snug text-white/80">
              {artistNames.join('  ·  ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Template 2 — Wrapped Stats                                          */
/* ------------------------------------------------------------------ */

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
      <span className="text-[30px] font-medium text-white/55">{label}</span>
      <span className="max-w-[60%] truncate text-right text-[38px] font-bold text-white">
        {value}
      </span>
    </div>
  );
}

export function YearEndStatsTemplate({ stats, photos }: YearEndTemplateProps) {
  const strip = photos.slice(0, 4);
  const topArtist = stats.topArtists[0]?.name ?? '—';
  const topVenue = stats.topVenues[0]?.name ?? '—';

  return (
    <div
      className="flex flex-col p-14 text-white"
      style={{
        width: YEAR_END_WIDTH,
        height: YEAR_END_HEIGHT,
        background: 'linear-gradient(155deg, #2b0f4a 0%, #120a24 55%, #05050a 100%)',
      }}
    >
      <div className="flex items-center justify-between">
        <EncoreWordmark />
        <p className="text-[24px] font-semibold uppercase tracking-widest text-white/40">
          {stats.year} Wrapped
        </p>
      </div>

      <div className="mt-16">
        <div className="flex items-end gap-5">
          <span className="text-[200px] font-black leading-[0.8] tabular-nums text-violet-400">
            {stats.totalConcerts}
          </span>
        </div>
        <p className="mt-2 text-[52px] font-black tracking-tight">
          {stats.totalConcerts === 1 ? 'concert' : 'concerts'} this year
        </p>
      </div>

      <div className="mt-14 space-y-6">
        {stats.averageRating != null && (
          <StatRow label="Average rating" value={`${stats.averageRating} / 10`} />
        )}
        <StatRow label="Top artist" value={topArtist} />
        <StatRow label="Top venue" value={topVenue} />
        <StatRow label="Photos captured" value={String(stats.totalPhotos)} />
      </div>

      {stats.topTags.length > 0 && (
        <div className="mt-12">
          <p className="mb-4 text-[26px] uppercase tracking-widest text-white/40">Your vibe</p>
          <div className="flex flex-wrap gap-3">
            {stats.topTags.slice(0, 5).map(({ tag }) => (
              <span
                key={tag}
                className="rounded-full border border-violet-400/40 bg-violet-500/15 px-6 py-2.5 text-[26px] font-semibold capitalize text-violet-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        {strip.length > 0 && (
          <div className="flex gap-3">
            {strip.map((url, i) => (
              <img
                key={`${i}-${url.slice(0, 16)}`}
                src={url}
                alt=""
                className="h-[220px] flex-1 rounded-2xl object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Template 3 — Scrapbook                                              */
/* ------------------------------------------------------------------ */

const POLAROID_ROTATIONS = ['-6deg', '4deg', '-3deg', '7deg', '-5deg', '3deg'];

export function YearEndScrapbookTemplate({ stats, reviews }: YearEndTemplateProps) {
  const cards = reviews.slice(0, 6);

  return (
    <div
      className="flex flex-col p-14 text-white"
      style={{
        width: YEAR_END_WIDTH,
        height: YEAR_END_HEIGHT,
        background: 'linear-gradient(160deg, #2a1c12 0%, #1a0f1f 45%, #0a0710 100%)',
      }}
    >
      <div className="text-center">
        <p className="font-serif text-[40px] italic text-amber-200/90">Encore Year-End</p>
        <h1 className="mt-1 text-[108px] font-black leading-none tracking-tight">{stats.year}</h1>
        <p className="mt-3 text-[30px] font-medium text-white/60">
          {stats.totalConcerts} {stats.totalConcerts === 1 ? 'memory' : 'memories'} this year
        </p>
      </div>

      <div className="mt-12 flex flex-1 flex-wrap content-start items-start justify-center gap-x-6 gap-y-10">
        {cards.length > 0 ? (
          cards.map((review, i) => {
            const photo = firstPhoto(review);
            return (
              <div
                key={review.id}
                className="w-[300px] bg-[#f7f3ea] p-4 pb-6 shadow-2xl"
                style={{ transform: `rotate(${POLAROID_ROTATIONS[i % POLAROID_ROTATIONS.length]})` }}
              >
                {photo ? (
                  <img src={photo} alt="" className="h-[300px] w-full object-cover" />
                ) : (
                  <div className="flex h-[300px] w-full items-center justify-center bg-gradient-to-br from-violet-300 to-purple-400">
                    <span className="px-3 text-center text-[40px] font-black text-white/90">
                      {review.artistName}
                    </span>
                  </div>
                )}
                <p className="mt-3 truncate text-center font-serif text-[34px] italic text-neutral-800">
                  {review.artistName}
                </p>
                {review.eventDate && (
                  <p className="text-center font-serif text-[22px] text-neutral-500">
                    {formatDate(review.eventDate)}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="mt-20 text-center font-serif text-[34px] italic text-white/60">
            Your concert memories will appear here.
          </p>
        )}
      </div>

      <p className="mt-10 text-center text-[26px] uppercase tracking-[0.3em] text-white/40">
        Made with Encore
      </p>
    </div>
  );
}

export function YearEndTemplateContent({
  template,
  stats,
  reviews,
  photos,
}: { template: YearEndTemplateId } & YearEndTemplateProps) {
  switch (template) {
    case 'collage':
      return <YearEndPhotoCollageTemplate stats={stats} reviews={reviews} photos={photos} />;
    case 'stats':
      return <YearEndStatsTemplate stats={stats} reviews={reviews} photos={photos} />;
    case 'scrapbook':
      return <YearEndScrapbookTemplate stats={stats} reviews={reviews} photos={photos} />;
  }
}
