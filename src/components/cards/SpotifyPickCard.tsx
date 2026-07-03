import { api } from '@/api';
import { ConcertPosterCard } from '@/components/cards/ConcertPosterCard';
import { Button } from '@/components/ui/app-button';
import { useAuth } from '@/context/AuthContext';
import type { SpotifyConcertRecommendation } from '@/types/spotify';
import { useState } from 'react';

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
    <ConcertPosterCard
      concert={concert}
      backTo={backTo}
      width={width}
      badge="spotify-pick"
      subtitle={reason}
      showCta={!user}
      footer={
        user ? (
          <Button
            variant={saved ? 'secondary' : 'primary'}
            size="sm"
            className="h-8 min-w-[5.5rem] px-3 text-xs"
            disabled={saving || saved}
            onClick={(e) => void handleSave(e)}
          >
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save show'}
          </Button>
        ) : undefined
      }
    />
  );
}
