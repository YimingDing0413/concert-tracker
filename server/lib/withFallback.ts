import type { ApiResponse } from '../../shared/types/index.js';

export async function withFallback<T>(
  live: () => Promise<T>,
  mock: () => T | Promise<T>,
  enabled: boolean,
  label: string
): Promise<ApiResponse<T>> {
  if (!enabled) {
    return {
      data: await mock(),
      meta: { source: 'mock', message: `${label}: API key not configured — using mock data` },
    };
  }
  try {
    const data = await live();
    return { data, meta: { source: 'live' } };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn(`[${label}] live fetch failed, using mock:`, err);
    return {
      data: await mock(),
      meta: {
        source: 'mock',
        message: `${label}: live API failed (${detail}) — using mock fallback`,
      },
    };
  }
}
