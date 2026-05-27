import type { MapNearbyVenueGroup } from '@/types';
import L from 'leaflet';

/** Custom map pin — venue name + show count (Beli-style labeled markers). */
export function createVenuePinIcon(group: MapNearbyVenueGroup, selected: boolean): L.DivIcon {
  const count = group.upcomingShows.length;
  const shortName =
    group.venueName.length > 22 ? `${group.venueName.slice(0, 20)}…` : group.venueName;

  const html = `
    <div class="venue-pin ${selected ? 'venue-pin--selected' : ''} ${count > 0 ? 'venue-pin--active' : ''}" role="img" aria-label="${group.venueName}">
      <div class="venue-pin__label">${shortName}</div>
      <div class="venue-pin__stem" aria-hidden="true"></div>
      <div class="venue-pin__dot">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 21h18"/>
          <path d="M5 21V7l8-4v18"/>
          <path d="M19 21V11l-6-4"/>
        </svg>
        ${count > 0 ? `<span class="venue-pin__count">${count > 9 ? '9+' : count}</span>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'venue-pin-icon',
    html,
    iconSize: [1, 1],
    iconAnchor: [20, 52],
  });
}
