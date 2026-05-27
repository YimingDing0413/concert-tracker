import { env } from '../env.js';
import { fetchJson } from '../lib/http.js';

const BASE = 'https://api.setlist.fm/rest/1.0';

function headers() {
  return {
    Accept: 'application/json',
    'x-api-key': env.setlistFmApiKey,
  };
}

export async function slGetArtist(mbid: string) {
  const url = `${BASE}/artist/${mbid}`;
  return fetchJson<SlArtist>(url, { headers: headers() });
}

export async function slSearchArtists(artistName: string, limit = 10): Promise<SlArtist[]> {
  const url = `${BASE}/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`;
  const res = await fetchJson<SlSearchArtists>(url, { headers: headers() });
  return (res.artist ?? []).slice(0, limit);
}

export async function slSearchArtist(artistName: string) {
  const artists = await slSearchArtists(artistName, 10);
  if (!artists.length) return undefined;
  const q = artistName.toLowerCase().trim();
  const exact = artists.find((a) => a.name.toLowerCase() === q);
  if (exact) return exact;
  const startsWith = artists.find((a) => a.name.toLowerCase().startsWith(q));
  if (startsWith) return startsWith;
  const containsAll = artists.find((a) => {
    const words = q.split(/\s+/).filter(Boolean);
    const name = a.name.toLowerCase();
    return words.every((w) => name.includes(w));
  });
  return containsAll ?? artists[0];
}

export async function slGetArtistSetlists(mbid: string, page = 1) {
  const url = `${BASE}/artist/${mbid}/setlists?p=${page}`;
  return fetchJson<SlSetlistsPage>(url, { headers: headers() });
}

export async function slGetSetlist(setlistId: string) {
  const rawId = setlistId.replace(/^sl:/, '');
  const url = `${BASE}/setlist/${rawId}`;
  return fetchJson<SlSetlist>(url, { headers: headers() });
}

export interface SlArtist {
  mbid: string;
  name: string;
  url?: string;
}

export interface SlSearchArtists {
  artist: SlArtist[];
  total: number;
}

export interface SlSetlistsPage {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist: SlSetlist[];
}

export interface SlSetlist {
  id: string;
  eventDate: string;
  tour?: { name?: string };
  artist: { mbid: string; name: string };
  venue: {
    name: string;
    city: {
      name: string;
      state?: string;
      stateCode?: string;
      country?: { name?: string; code?: string };
    };
    country?: { name?: string; code?: string };
  };
  url?: string;
  sets?:
    | {
        set?: {
          name?: string;
          encore?: number;
          song?: { name: string; info?: string; tape?: boolean }[];
        }[];
      }
    | {
        encore?: number;
        song: { name: string; info?: string }[];
      }[];
  song?: { name: string; encore?: { encore: number }; info?: string }[];
}
