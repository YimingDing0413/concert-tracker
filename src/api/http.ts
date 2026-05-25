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
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HttpApiError(body.error ?? res.statusText, res.status);
  }
  return body as ApiResponse<T>;
}

export async function apiFetchData<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await apiFetch<T>(path, init);
  return data;
}
