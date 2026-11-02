import type {
  ConcertReview,
  YearEndEntry,
  YearEndStats,
  YearEndTemplateId,
} from '@/types/concertReview';
import { formatDate } from '@/utils/format';

export const YEAR_END_WIDTH = 1080;
export const YEAR_END_HEIGHT = 1920;

export interface YearEndTemplateProps {
  stats: YearEndStats;
  reviews: ConcertReview[];
  photos: string[];
  entries?: YearEndEntry[];
}

const DISPLAY_FONT = 'Bricolage Grotesque, Inter, sans-serif';
const MONO_FONT = 'JetBrains Mono, monospace';

function EncoreFooter({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-[28px] font-black uppercase tracking-[0.35em] ${className}`}
      style={{ fontFamily: DISPLAY_FONT }}
    >
      Encore
    </p>
  );
}

function entryList(entries: YearEndEntry[], reviews: ConcertReview[]): YearEndEntry[] {
  if (entries.length > 0) return entries;
  return reviews.map((review) => ({
    concertId: review.eventId,
    artistName: review.artistName,
    venueName: review.venueName,
    date: (review.eventDate ?? review.createdAt).slice(0, 10),
    imageUrl: review.photoDataUrls?.[0],
    review,
  }));
}

function stubDate(date: string): { monthDay: string; year: string } {
  const d = new Date(date.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) {
    return { monthDay: date.slice(0, 10) || '--', year: '' };
  }
  return {
    monthDay: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase(),
    year: String(d.getFullYear()),
  };
}

const STACK_ROTATIONS = ['-7deg', '4deg', '-2deg', '6deg', '-5deg', '3deg'];

export function YearEndTicketStackTemplate({ stats, reviews, entries = [] }: YearEndTemplateProps) {
  const cards = entryList(entries, reviews).slice(0, 6);

  return (
    <div
      className="relative flex flex-col overflow-hidden text-white"
      style={{
        width: YEAR_END_WIDTH,
        height: YEAR_END_HEIGHT,
        background: '#0C0B0A',
        fontFamily: DISPLAY_FONT,
      }}
    >
      <div className="px-14 pt-16">
        <p
          className="text-[26px] font-medium uppercase tracking-[0.12em] text-[#8E877A]"
          style={{ fontFamily: MONO_FONT }}
        >
          {stats.year} Wrapped
        </p>
        <div className="mt-6 flex items-end gap-4">
          <span className="text-[200px] font-extrabold leading-[0.85] tabular-nums text-[#F6F1E7]">
            {stats.totalShows}
          </span>
          <span className="pb-8 text-[44px] font-semibold text-[#CFC8BA]">
            {stats.totalShows === 1 ? 'show' : 'shows'}
          </span>
        </div>
      </div>

      <div className="relative mt-8 flex flex-1 items-center justify-center px-10">
        {cards.length === 0 ? (
          <p className="text-[36px] text-[#8E877A]">Your tickets will stack here.</p>
        ) : (
          cards.map((entry, i) => {
            const stub = stubDate(entry.date);
            const place = [entry.venueName, entry.city].filter(Boolean).join(' · ');
            const rot = STACK_ROTATIONS[i % STACK_ROTATIONS.length];
            const offsetY = i * 28;
            const offsetX = (i % 2 === 0 ? -1 : 1) * (12 + i * 4);
            return (
              <div
                key={entry.concertId}
                className="absolute w-[780px] overflow-hidden rounded-[22px]"
                style={{
                  background: '#F3EBDD',
                  color: '#1A1714',
                  transform: `translate(${offsetX}px, ${offsetY - 80}px) rotate(${rot})`,
                  zIndex: i + 1,
                  boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex min-h-[160px]">
                  <div className="min-w-0 flex-1 px-8 py-7 pr-6">
                    <p className="truncate text-[42px] font-extrabold leading-tight tracking-tight">
                      {entry.artistName}
                    </p>
                    {place ? (
                      <p className="mt-2 truncate text-[26px] text-black/55">{place}</p>
                    ) : null}
                  </div>
                  <div
                    className="flex w-[180px] shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-dashed border-black/20 px-3"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span className="text-[22px] font-medium tracking-[0.08em]">{stub.monthDay}</span>
                    {stub.year ? (
                      <span className="text-[18px] tracking-[0.08em] opacity-70">{stub.year}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-14 pb-16 text-center text-[#F6F1E7]">
        <EncoreFooter />
      </div>
    </div>
  );
}

export function YearEndPosterTemplate({ stats }: YearEndTemplateProps) {
  const topArtist = stats.mostSeenArtist?.name ?? stats.topArtists[0]?.name ?? 'Your year';
  const topVenue = stats.topVenues[0]?.name;
  const ink = '#160B05';
  const rule = { borderColor: 'rgba(22, 11, 5, 0.25)' } as const;

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: YEAR_END_WIDTH,
        height: YEAR_END_HEIGHT,
        background: '#FF5A1F',
        color: ink,
        fontFamily: DISPLAY_FONT,
      }}
    >
      <div className="flex items-center justify-between px-14 pt-14">
        <EncoreFooter />
        <p className="text-[24px] font-medium uppercase tracking-[0.12em]" style={{ fontFamily: MONO_FONT }}>
          {stats.year}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-12">
        <p
          className="text-[28px] font-medium uppercase tracking-[0.14em]"
          style={{ fontFamily: MONO_FONT, opacity: 0.6 }}
        >
          Top artist
        </p>
        <h1 className="mt-4 break-words text-[120px] font-extrabold leading-[0.9] tracking-tight">
          {topArtist}
        </h1>
      </div>

      <div className="space-y-5 px-14 pb-10" style={{ fontFamily: MONO_FONT }}>
        <div className="flex items-baseline justify-between border-t pt-5" style={rule}>
          <span className="text-[28px] uppercase tracking-[0.08em]">Shows</span>
          <span className="text-[48px] font-medium tabular-nums">{stats.totalShows}</span>
        </div>
        {stats.uniqueArtists > 0 && (
          <div className="flex items-baseline justify-between border-t pt-5" style={rule}>
            <span className="text-[28px] uppercase tracking-[0.08em]">Artists</span>
            <span className="text-[48px] font-medium tabular-nums">{stats.uniqueArtists}</span>
          </div>
        )}
        {stats.uniqueCities > 0 && (
          <div className="flex items-baseline justify-between border-t pt-5" style={rule}>
            <span className="text-[28px] uppercase tracking-[0.08em]">Cities</span>
            <span className="text-[48px] font-medium tabular-nums">{stats.uniqueCities}</span>
          </div>
        )}
        {topVenue && (
          <div className="flex items-baseline justify-between border-t pt-5" style={rule}>
            <span className="text-[28px] uppercase tracking-[0.08em]">Top venue</span>
            <span className="max-w-[55%] truncate text-right text-[32px] font-medium">{topVenue}</span>
          </div>
        )}
        {stats.averageRating != null && (
          <div className="flex items-baseline justify-between border-t pt-5" style={rule}>
            <span className="text-[28px] uppercase tracking-[0.08em]">Avg rating</span>
            <span className="text-[48px] font-medium tabular-nums">{stats.averageRating}</span>
          </div>
        )}
      </div>

      <div className="px-14 pb-16 text-center" style={{ opacity: 0.7 }}>
        <EncoreFooter />
      </div>
    </div>
  );
}

export function YearEndMinimalTemplate({ stats, reviews, entries = [] }: YearEndTemplateProps) {
  const cards = entryList(entries, reviews).slice(0, 10);

  return (
    <div
      className="flex flex-col overflow-hidden text-[#F6F1E7]"
      style={{
        width: YEAR_END_WIDTH,
        height: YEAR_END_HEIGHT,
        background: '#0C0B0A',
        fontFamily: DISPLAY_FONT,
      }}
    >
      <div className="px-14 pt-16">
        <p
          className="text-[26px] font-medium uppercase tracking-[0.12em] text-[#8E877A]"
          style={{ fontFamily: MONO_FONT }}
        >
          {stats.year} Wrapped
        </p>
        <p
          className="mt-8 text-[220px] font-extrabold leading-none tabular-nums text-[#F2C14E]"
          style={{ fontFamily: MONO_FONT }}
        >
          {stats.totalShows}
        </p>
        <p className="mt-2 text-[44px] font-semibold text-[#CFC8BA]">
          {stats.totalShows === 1 ? 'concert' : 'concerts'}
        </p>
      </div>

      <div className="mt-16 flex-1 space-y-0 px-14">
        {cards.map((entry) => (
          <div
            key={entry.concertId}
            className="flex items-baseline justify-between gap-6 border-t border-white/10 py-5"
          >
            <div className="min-w-0">
              <p className="truncate text-[36px] font-bold tracking-tight">{entry.artistName}</p>
              {entry.venueName ? (
                <p className="mt-1 truncate text-[24px] text-[#8E877A]">{entry.venueName}</p>
              ) : null}
            </div>
            <span
              className="shrink-0 text-[24px] text-[#F2C14E]"
              style={{ fontFamily: MONO_FONT }}
            >
              {formatDate(entry.date)}
            </span>
          </div>
        ))}
        {cards.length === 0 && (
          <p className="text-[32px] text-[#8E877A]">No shows logged this year yet.</p>
        )}
      </div>

      <div className="px-14 pb-16 pt-10 text-center text-[#F6F1E7]">
        <EncoreFooter />
      </div>
    </div>
  );
}

/** @deprecated Prefer YearEndTicketStackTemplate */
export const YearEndPhotoCollageTemplate = YearEndTicketStackTemplate;
/** @deprecated Prefer YearEndPosterTemplate */
export const YearEndStatsTemplate = YearEndPosterTemplate;
/** @deprecated Prefer YearEndMinimalTemplate */
export const YearEndScrapbookTemplate = YearEndMinimalTemplate;

export function YearEndTemplateContent({
  template,
  stats,
  reviews,
  photos,
  entries,
}: { template: YearEndTemplateId } & YearEndTemplateProps) {
  switch (template) {
    case 'tickets':
      return (
        <YearEndTicketStackTemplate
          stats={stats}
          reviews={reviews}
          photos={photos}
          entries={entries}
        />
      );
    case 'poster':
      return (
        <YearEndPosterTemplate stats={stats} reviews={reviews} photos={photos} entries={entries} />
      );
    case 'minimal':
      return (
        <YearEndMinimalTemplate
          stats={stats}
          reviews={reviews}
          photos={photos}
          entries={entries}
        />
      );
  }
}
