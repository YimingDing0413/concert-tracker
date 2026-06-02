import { useAuth } from '@/context/AuthContext';
import { syncConcertReviewsFromServer } from '@/lib/concertReviewsLocal';
import { useEffect, useRef } from 'react';

/**
 * Keeps review cache in sync with DynamoDB whenever the user opens the app,
 * returns to a tab, or refocuses the window (common on mobile).
 */
export function useReviewSync(): void {
  const { user } = useAuth();
  const syncing = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    const runSync = () => {
      if (syncing.current) return;
      syncing.current = true;
      void syncConcertReviewsFromServer(user.id).finally(() => {
        syncing.current = false;
      });
    };

    runSync();

    const onVisible = () => {
      if (document.visibilityState === 'visible') runSync();
    };

    window.addEventListener('focus', runSync);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('focus', runSync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);
}
