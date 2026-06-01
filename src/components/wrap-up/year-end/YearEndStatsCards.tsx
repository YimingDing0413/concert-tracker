import { StatCard } from '@/components/ui/StatCard';
import type { YearEndStats } from '@/types/concertReview';
import { Image, Music2, Star, Ticket } from 'lucide-react';

interface YearEndStatsCardsProps {
  stats: YearEndStats;
}

export function YearEndStatsCards({ stats }: YearEndStatsCardsProps) {
  const topArtist = stats.topArtists[0]?.name ?? '—';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Concerts" value={stats.totalConcerts} icon={Ticket} />
        <StatCard
          label="Avg rating"
          value={stats.averageRating != null ? `${stats.averageRating}` : '—'}
          icon={Star}
        />
        <StatCard label="Photos" value={stats.totalPhotos} icon={Image} />
        <StatCard
          label="Top artist"
          value={topArtist.length > 12 ? `${topArtist.slice(0, 11)}…` : topArtist}
          icon={Music2}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {(stats.topTags.length > 0 || stats.favoriteSongs.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {stats.topTags.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Most common tags
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium capitalize text-foreground"
                  >
                    {tag} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {stats.favoriteSongs.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Favorite songs
              </p>
              <ul className="space-y-1.5 text-sm">
                {stats.favoriteSongs.map((song) => (
                  <li key={song} className="flex items-center gap-2">
                    <Music2 className="size-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">{song}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
