import type { Concert, UserConcert } from '@/types';

/** Build display data for a tracked show — never drop from the list due to missing API data. */
export function resolveConcertForUserConcert(
  uc: UserConcert,
  fetched?: Partial<Concert>
): Partial<Concert> {
  const base = fetched ?? uc.concertSnapshot ?? uc.manualConcert;
  if (base?.artistName || base?.venueName) {
    return { ...base, id: uc.concertId };
  }
  return {
    id: uc.concertId,
    artistName: 'Saved show',
    venueName: 'Details unavailable',
    city: '',
    country: '',
    date: base?.date ?? '',
    status: base?.status ?? 'upcoming',
  };
}

export function sortUserConcertsByDate(
  list: UserConcert[],
  concertMap: Record<string, Partial<Concert>>
): UserConcert[] {
  return [...list].sort((a, b) => {
    const dateA = concertMap[a.concertId]?.date ?? a.concertSnapshot?.date ?? '';
    const dateB = concertMap[b.concertId]?.date ?? b.concertSnapshot?.date ?? '';
    return dateB.localeCompare(dateA);
  });
}
