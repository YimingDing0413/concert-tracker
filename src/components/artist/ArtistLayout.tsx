import { api } from '@/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import type { ArtistDetail } from '@/types';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ArtistContext = createContext<ArtistDetail | null>(null);

export function useArtistDetail(): ArtistDetail {
  const artist = useContext(ArtistContext);
  if (!artist) throw new Error('useArtistDetail must be used within ArtistLayout');
  return artist;
}

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground'
  );

export function ArtistLayout() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api
      .getArtist(id)
      .then(setArtist)
      .catch(() => setError('Could not load artist'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !artist) return <p className="text-muted-foreground">{error || 'Artist not found.'}</p>;

  const base = `/artist/${id}`;

  return (
    <ArtistContext.Provider value={artist}>
      <div className="space-y-6">
        <header className="space-y-4">
          <Button variant="ghost" size="sm" render={<Link to="/" />} className="-ml-2 gap-1 px-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            <Avatar className="size-16 shrink-0">
              <AvatarImage src={artist.imageUrl} alt="" />
              <AvatarFallback className="bg-primary/15 text-lg text-primary">
                {artist.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{artist.name}</h1>
              {artist.genres && artist.genres.length > 0 && (
                <p className="text-sm text-muted-foreground">{artist.genres.join(' · ')}</p>
              )}
            </div>
          </div>

          <nav
            className="inline-flex w-full rounded-lg bg-muted p-1"
            aria-label="Artist sections"
          >
            <NavLink to={`${base}/upcoming`} className={tabClass}>
              Upcoming
            </NavLink>
            <NavLink to={`${base}/past`} className={tabClass}>
              Past
            </NavLink>
            <NavLink to={`${base}/setlists`} className={tabClass}>
              Setlists
            </NavLink>
          </nav>
        </header>
        <Outlet />
      </div>
    </ArtistContext.Provider>
  );
}
