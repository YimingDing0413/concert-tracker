import { apiUrl } from '@/lib/apiBase';
import type { ApiResponse } from '@/types';

export class HttpApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'HttpApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new HttpApiError(
      'Cannot reach the API. If deployed, open /api/health in your browser to verify the backend.'
    );
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const text = await res.text().catch(() => '');
    throw new HttpApiError(
      res.ok
        ? 'API returned an invalid response (expected JSON).'
        : `API error ${res.status}: ${text.slice(0, 120) || res.statusText}`,
      res.status
    );
  }

  const body = (await res.json()) as ApiResponse<T> & { error?: string };

  if (!res.ok) {
    throw new HttpApiError(body.error ?? res.statusText, res.status);
  }

  return body;
}

export async function apiFetchData<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await apiFetch<T>(path, init);
  return data;
}
