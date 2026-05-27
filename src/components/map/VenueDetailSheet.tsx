import { Button } from '@/components/ui/button';
import type { MapNearbyVenueGroup } from '@/types';
import { formatDate } from '@/utils/format';
import { ChevronRight, MapPin, Music2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VenueDetailSheetProps {
  venue: MapNearbyVenueGroup;
  onClose: () => void;
}

export function VenueDetailSheet({ venue, onClose }: VenueDetailSheetProps) {
  const cityLine = [venue.city, venue.state].filter(Boolean).join(', ');
  const locationPrimary = venue.address ?? cityLine;
  const locationSecondary = venue.address && cityLine ? cityLine : null;

  return (
    <div className="discover-sheet pointer-events-auto" role="dialog" aria-label={venue.venueName}>
      <div className="discover-sheet__handle" aria-hidden />
      <div className="discover-sheet__header">
        <div className="discover-sheet__hero">
          <div className="discover-sheet__avatar" aria-hidden>
            {venue.venueName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="discover-sheet__title">{venue.venueName}</h2>
            {locationPrimary && (
              <p className="discover-sheet__location">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate">{locationPrimary}</span>
                  {locationSecondary ? (
                    <span className="truncate text-xs text-muted-foreground">{locationSecondary}</span>
                  ) : null}
                </span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        {venue.upcomingShows.length > 0 && (
          <p className="discover-sheet__badge">
            <Music2 className="size-3.5" aria-hidden />
            {venue.upcomingShows.length} upcoming{' '}
            {venue.upcomingShows.length === 1 ? 'show' : 'shows'}
          </p>
        )}
      </div>

      <div className="discover-sheet__body">
        {venue.upcomingShows.length === 0 ? (
          <div className="discover-sheet__empty">
            <p>No upcoming concerts listed at this venue right now.</p>
            <Button render={<Link to={`/venue/${encodeURIComponent(venue.venueId)}`} />}>
              View venue page
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <p className="discover-sheet__section-label">Playing here</p>
            <ul className="discover-sheet__shows">
              {venue.upcomingShows.map((show) => (
                <li key={show.id}>
                  <Link
                    to={`/concert/${encodeURIComponent(show.id)}`}
                    state={{ concertSnapshot: show, backTo: '/' }}
                    className="discover-show-row"
                  >
                    {show.imageUrl ? (
                      <img src={show.imageUrl} alt="" className="discover-show-row__img" />
                    ) : (
                      <div className="discover-show-row__img discover-show-row__img--placeholder">
                        <Music2 className="size-4 text-primary" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="discover-show-row__artist">{show.artistName}</p>
                      <p className="discover-show-row__date">
                        {formatDate(show.date)}
                        {show.startTime ? ` · ${show.startTime}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="mt-3 w-full"
              render={<Link to={`/venue/${encodeURIComponent(venue.venueId)}`} />}
            >
              All shows at this venue
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
