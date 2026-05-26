import { env } from '../env.js';
import { fetchJson } from '../lib/http.js';

const BASE = 'https://api.setlist.fm/rest/1.0';

function headers() {
  return {
    Accept: 'application/json',
    'x-api-key': env.setlistFmApiKey,
  };
}

export async function slSearchArtist(artistName: string) {
  const url = `${BASE}/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`;
  const res = await fetchJson<SlSearchArtists>(url, { headers: headers() });
  const artists = res.artist ?? [];
  if (!artists.length) return undefined;
  const exact = artists.find(
    (a) => a.name.toLowerCase() === artistName.toLowerCase()
  );
  return exact ?? artists[0];
}

export async function slGetArtistSetlists(mbid: string, page = 1) {
  const url = `${BASE}/artist/${mbid}/setlists?p=${page}`;
  return fetchJson<SlSetlistsPage>(url, { headers: headers() });
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
  artist: { mbid: string; name: string };
  venue: { name: string; city: { name: string }; country?: { name: string } };
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
