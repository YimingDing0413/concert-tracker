import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EntityIconBadge } from '@/components/ui/EntityIconBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MapPin } from 'lucide-react';
import type { VenueDetail } from '@/types';
import { formatLocation } from '@/utils/format';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api
      .getVenue(id)
      .then(setVenue)
      .catch(() => setError('Could not load venue'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !venue) return <p className="muted">{error || 'Venue not found.'}</p>;

  const location = formatLocation(venue.city, venue.state, venue.country);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 md:max-w-3xl">
      <PageHeader title={venue.name} subtitle={location} backTo="/map" />
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-4">
        <EntityIconBadge name={venue.name} icon={MapPin} size="md" />
        <p className="text-sm text-muted-foreground">{location}</p>
      </div>
      <div className="info-grid">
        {venue.address && (
          <div>
            <span className="info-label">Address</span>
            <span>{venue.address}</span>
          </div>
        )}
        {venue.capacity && (
          <div>
            <span className="info-label">Capacity</span>
            <span>{venue.capacity.toLocaleString()}</span>
          </div>
        )}
      </div>
      <section>
        <h2>Upcoming events</h2>
        {venue.upcomingEvents.length === 0 ? (
          <p className="muted">No upcoming events at this venue.</p>
        ) : (
          <div className="card-list">
            {venue.upcomingEvents.map((c) => (
              <ConcertCard key={c.id} concert={c} backTo={`/venue/${id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
