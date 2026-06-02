import { api } from '@/api';
import type { Concert, UserConcert } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export function useProfileConcerts(userId: string | undefined) {
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concertMap, setConcertMap] = useState<Record<string, Partial<Concert>>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const ucs = await api.getUserConcerts(userId);
      setUserConcerts(ucs);
      const map: Record<string, Partial<Concert>> = {};
      await Promise.all(
        ucs.map(async (uc) => {
          if (uc.concertSnapshot) {
            map[uc.concertId] = uc.concertSnapshot;
            return;
          }
          if (uc.isManual && uc.manualConcert) {
            map[uc.concertId] = uc.manualConcert;
            return;
          }
          try {
            const detail = await api.getConcert(uc.concertId);
            if (detail) map[uc.concertId] = detail;
          } catch {
            /* placeholder */
          }
        })
      );
      setConcertMap(map);
    } catch {
      setUserConcerts([]);
      setConcertMap({});
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { userConcerts, concertMap, loading, reload: load };
}
