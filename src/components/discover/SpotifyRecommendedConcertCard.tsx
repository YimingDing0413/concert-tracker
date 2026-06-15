import { api } from '@/api';
import { Button } from '@/components/ui/app-button';
import { useAuth } from '@/context/AuthContext';
import type { SpotifyConcertRecommendation } from '@/types/spotify';
import { formatDate, formatLocation } from '@/utils/format';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface SpotifyRecommendedConcertCardProps {
  concert: SpotifyConcertRecommendation;
  backTo?: string;
}

export function SpotifyRecommendedConcertCard({
  concert,
  backTo = '/',
}: SpotifyRecommendedConcertCardProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(concert.alreadySaved || concert.alreadyGoing);
  const reason = concert.reasons[0] ?? 'Based on your Spotify taste';
  const location = formatLocation(concert.city, concert.state, concert.country);

  async function handleSave() {
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
        genreName: concert.genreName,
        subGenreName: concert.subGenreName,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm">
      <Link
        to={`/concert/${concert.id}`}
        state={{ backTo }}
        className="group block no-underline"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#1DB954]/20 to-primary/10 text-4xl font-bold text-muted-foreground/40">
              {concert.artistName?.charAt(0) ?? '?'}
            </div>
          )}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[0.65rem] font-semibold text-white backdrop-blur-sm">
            <Sparkles className="size-3 text-[#1DB954]" aria-hidden />
            Spotify pick
          </span>
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-1 text-base font-semibold text-foreground">{concert.artistName}</p>
          <p className="line-clamp-2 text-xs text-[#1DB954]">{reason}</p>
          <p className="line-clamp-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {concert.venueName}
            {location ? ` · ${location}` : ''}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            {formatDate(concert.date)}
            {concert.startTime ? ` · ${concert.startTime}` : ''}
          </p>
        </div>
      </Link>
      <div className="flex gap-2 border-t border-border/40 p-3">
        <Link
          to={`/concert/${concert.id}`}
          state={{ backTo }}
          className="flex-1 rounded-xl border border-border/60 bg-card px-3 py-2 text-center text-sm font-semibold text-foreground no-underline transition-colors hover:border-primary/40"
        >
          View concert
        </Link>
        {user && (
          <Button
            variant={saved ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1"
            disabled={saving || saved}
            onClick={() => void handleSave()}
          >
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>
    </article>
  );
}
