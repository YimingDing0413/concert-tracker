import { api } from '@/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ArtistDetail } from '@/types';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';

const ArtistContext = createContext<ArtistDetail | null>(null);

export function useArtistDetail(): ArtistDetail {
  const artist = useContext(ArtistContext);
  if (!artist) throw new Error('useArtistDetail must be used within ArtistLayout');
  return artist;
}

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
  if (error || !artist) return <p className="muted">{error || 'Artist not found.'}</p>;

  const base = `/artist/${id}`;

  return (
    <ArtistContext.Provider value={artist}>
      <div className="page artist-page">
        <header className="artist-header">
          <Link to="/" className="back-link">
            ← Back
          </Link>
          <div className="artist-header-main">
            {artist.imageUrl ? (
              <img src={artist.imageUrl} alt="" className="artist-avatar" />
            ) : (
              <div className="artist-avatar artist-avatar-placeholder" aria-hidden>
                ♪
              </div>
            )}
            <div className="artist-header-text">
              <h1>{artist.name}</h1>
              {artist.genres && artist.genres.length > 0 && (
                <p className="page-subtitle">{artist.genres.join(' · ')}</p>
              )}
            </div>
          </div>
          <nav className="artist-tabs" aria-label="Artist sections">
            <NavLink to={`${base}/upcoming`} className={({ isActive }) => (isActive ? 'active' : '')}>
              Upcoming
            </NavLink>
            <NavLink to={`${base}/past`} className={({ isActive }) => (isActive ? 'active' : '')}>
              Past
            </NavLink>
            <NavLink to={`${base}/setlists`} className={({ isActive }) => (isActive ? 'active' : '')}>
              Setlists
            </NavLink>
          </nav>
        </header>
        <Outlet />
      </div>
    </ArtistContext.Provider>
  );
}
