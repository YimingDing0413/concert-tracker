import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';
import { normalizeTmAttraction } from '../normalize/ticketmaster.js';

export async function resolveArtistName(idOrName: string): Promise<string> {
  const decoded = decodeURIComponent(idOrName);
  if (decoded.startsWith('tm:attraction:') && hasTicketmaster()) {
    try {
      const raw = await tm.tmGetAttraction(decoded);
      const artist = normalizeTmAttraction(raw);
      if (artist?.name) return artist.name;
    } catch {
      /* fall through */
    }
  }
  if (decoded.includes(':')) {
    return decoded.split(':').pop() ?? decoded;
  }
  return decoded.replace(/-/g, ' ');
}
