import type { ConcertApiClient } from './client';
import { serverApi } from './serverApi';

/**
 * All requests go through the internal backend (/api/*).
 * Third-party keys live only on the server.
 */
export const api: ConcertApiClient = serverApi;

export type { ConcertApiClient } from './client';
