export class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, 504, 'timeout');
    }
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(`HTTP ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  return res.json() as Promise<T>;
}
