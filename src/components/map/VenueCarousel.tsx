import type { MapNearbyVenueGroup } from '@/types';
import { cn } from '@/lib/utils';
import { MapPin, Music2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface VenueCarouselProps {
  venues: MapNearbyVenueGroup[];
  selectedVenueId: string | null;
  onSelect: (group: MapNearbyVenueGroup) => void;
  /** When non-empty venues list renders empty (e.g. search). */
  emptyTitle?: string;
  emptySubtitle?: string;
  /** First load: empty list + loading (no “no venues” flash). */
  isInitialLoading?: boolean;
}

export function VenueCarousel({
  venues,
  selectedVenueId,
  onSelect,
  emptyTitle,
  emptySubtitle,
  isInitialLoading,
}: VenueCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedVenueId) return;
    const el = cardRefs.current.get(selectedVenueId);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedVenueId]);

  if (isInitialLoading && venues.length === 0) {
    return (
      <div className="discover-carousel pointer-events-auto">
        <div className="discover-carousel__empty">
          <p>Loading venues…</p>
        </div>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="discover-carousel pointer-events-auto">
        <div className="discover-carousel__empty">
          <p>{emptyTitle ?? 'No venues in this area yet.'}</p>
          <p className="text-muted-foreground">
            {emptySubtitle ??
              'Try a larger radius, locating yourself, or moving the map.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="discover-carousel pointer-events-auto">
      <p className="discover-carousel__heading">Venues near you</p>
      <div ref={scrollRef} className="discover-carousel__track" role="list">
        {venues.map((venue) => {
          const selected = selectedVenueId === venue.venueId;
          const showCount = venue.upcomingShows.length;
          const nextShow = venue.upcomingShows[0];

          return (
            <button
              key={venue.venueId}
              type="button"
              role="listitem"
              ref={(node) => {
                if (node) cardRefs.current.set(venue.venueId, node);
                else cardRefs.current.delete(venue.venueId);
              }}
              className={cn('discover-venue-card', selected && 'discover-venue-card--selected')}
              onClick={() => onSelect(venue)}
            >
              <div className="discover-venue-card__visual" aria-hidden>
                <span className="discover-venue-card__initial">
                  {venue.venueName.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="discover-venue-card__body">
                <h3 className="discover-venue-card__name">{venue.venueName}</h3>
                <p className="discover-venue-card__meta">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">
                    {[
                      venue.address,
                      [venue.city, venue.state].filter(Boolean).join(', '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </p>
                {showCount > 0 ? (
                  <p className="discover-venue-card__shows">
                    <Music2 className="size-3 shrink-0" aria-hidden />
                    {showCount} upcoming · next: {nextShow?.artistName}
                  </p>
                ) : (
                  <p className="discover-venue-card__shows discover-venue-card__shows--muted">
                    No listed shows — tap for venue
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
