import type { Concert } from '@/types';

export type ConcertNavState = {
  backTo?: string;
  concertSnapshot?: Partial<Concert>;
};

export function getConcertNavState(state: unknown): ConcertNavState {
  if (!state || typeof state !== 'object') return {};
  const s = state as ConcertNavState;
  return {
    backTo: typeof s.backTo === 'string' ? s.backTo : undefined,
    concertSnapshot: s.concertSnapshot,
  };
}
