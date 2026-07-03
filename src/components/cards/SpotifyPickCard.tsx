import { api } from '@/api';
import { Button } from '@/components/ui/app-button';
import { useAuth } from '@/context/AuthContext';
import type { SpotifyConcertRecommendation } from '@/types/spotify';
import { formatDate, formatLocation } from '@/utils/format';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SpotifyPickCardProps {
  concert: SpotifyConcertRecommendation;
  backTo?: string;
  width?: 'full' | 'carousel';
}

export function SpotifyPickCard({ concert, backTo = '/', width = 'full' }: SpotifyPickCardProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(concert.alreadySaved || concert.alreadyGoing);
  const reason = concert.reasons[0] ?? 'Based on your Spotify taste';
  const location = formatLocation(concert.city, concert.state, concert.country);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || saved) return;
    setSaving(true);
    try {
      await api.setConcertStatus(user.id, concert.id, 'saved', {
        id: concert.id,
        artistName: concert.artistName,
        venueName: concert.venueName,
        city: concert.city,
        state: concert.state,
        country: concert.country,
        date: concert.date,
        imageUrl: concert.imageUrl,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl bg-surface-2',
        width === 'carousel' && 'w-[72vw] max-w-[280px] sm:w-[260px]'
      )}
    >
      <Link
        to={`/concert/${concert.id}`}
        state={{ backTo }}
        className="group block no-underline"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="poster-gradient size-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[0.65rem] font-semibold text-spotify backdrop-blur-sm">
            <Sparkles className="size-3" aria-hidden />
            Spotify
          </span>
        </div>
        <div className="space-y-1 p-3">
          <p className="font-display text-base font-bold text-foreground">{concert.artistName}</p>
          <p className="line-clamp-2 text-xs text-spotify">{reason}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {concert.venueName}
            {location ? ` · ${location}` : ''}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" aria-hidden />
            {formatDate(concert.date)}
          </p>
        </div>
      </Link>
      {user && (
        <div className="flex gap-2 border-t border-[var(--encore-border-subtle)] p-2">
          <Link
            to={`/concert/${concert.id}`}
            state={{ backTo }}
            className="flex-1 rounded-lg py-1.5 text-center text-xs font-semibold text-foreground no-underline hover:bg-surface-3"
          >
            View
          </Link>
          <Button
            variant={saved ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1 h-8 text-xs"
            disabled={saving || saved}
            onClick={(e) => void handleSave(e)}
          >
            {saved ? 'Saved' : saving ? '…' : 'Save'}
          </Button>
        </div>
      )}
    </article>
  );
}
