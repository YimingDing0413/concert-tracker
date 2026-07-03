import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';

export async function checkTicketmasterHealth(): Promise<{ ok: boolean; error?: string }> {
  if (!hasTicketmaster()) {
    return { ok: false, error: 'TICKETMASTER_API_KEY not configured' };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    await tm.tmSearchEvents({
      latlong: '40.7128,-74.0060',
      radius: '10',
      unit: 'km',
      size: 1,
      sort: 'date,asc',
      startDateTime: `${today}T00:00:00Z`,
      classificationName: 'music',
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ticketmaster request failed';
    return { ok: false, error: message.slice(0, 200) };
  }
}
