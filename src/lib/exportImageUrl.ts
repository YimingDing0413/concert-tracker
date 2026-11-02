import { apiUrl } from '@/lib/apiBase';
import { isAllowedImageProxyHost } from '@shared/imageProxyPolicy';

export function isDataImageUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

export function isAllowlistedImageHost(hostname: string): boolean {
  return isAllowedImageProxyHost(hostname);
}

/**
 * Returns a Capacitor-safe (or already-safe) URL for html-to-image capture.
 * - data: URLs pass through
 * - allowlisted remote hosts → apiUrl(`/api/image-proxy?url=…`)
 * - everything else → null (caller should use a poster tile)
 */
export function toExportImageUrl(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (isDataImageUrl(trimmed)) return trimmed;

  if (trimmed.startsWith('/api/image-proxy?') || trimmed.includes('/api/image-proxy?')) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return apiUrl(path);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!isAllowlistedImageHost(parsed.hostname)) return null;
    return apiUrl(`/api/image-proxy?url=${encodeURIComponent(parsed.toString())}`);
  } catch {
    return null;
  }
}
