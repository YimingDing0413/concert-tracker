import { env } from '../env.js';
import { fetchJson } from '../lib/http.js';

const BASE = 'https://rest.bandsintown.com';

function appId() {
  return env.bandsintownAppId;
}

export async function bitGetArtistEvents(artistName: string) {
  const encoded = encodeURIComponent(artistName);
  const url = `${BASE}/artists/${encoded}/events?app_id=${appId()}&date=all`;
  return fetchJson<BitEvent[]>(url);
}

export async function bitGetArtistProfile(artistName: string) {
  const encoded = encodeURIComponent(artistName);
  const url = `${BASE}/artists/${encoded}?app_id=${appId()}`;
  return fetchJson<BitArtist>(url);
}

export interface BitArtist {
  id: string;
  name: string;
  image_url?: string;
  thumb_url?: string;
  tracker_count?: number;
  upcoming_event_count?: number;
  url?: string;
}

export interface BitEvent {
  id: string;
  artist_id?: string;
  url?: string;
  datetime: string;
  on_sale_datetime?: string;
  description?: string;
  title?: string;
  lineup?: string[];
  offers?: { type: string; url: string; status: string }[];
  venue: {
    name: string;
    city: string;
    region?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
  };
}
