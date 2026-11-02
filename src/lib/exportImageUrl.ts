/** Hosts we will fetch via same-origin `/api/image-proxy` for html-to-image export. */
const ALLOWED_HOST_SUFFIXES = [
  'ticketm.net',
  'ticketmaster.com',
  'ticketmaster.ca',
  'ticketmaster.co.uk',
  'scdn.co',
  'spotifycdn.com',
  'spotify.com',
] as const;

export function isDataImageUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

export function isAllowlistedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/**
 * Returns a same-origin (or already-safe) URL for html-to-image capture.
 * - data: URLs pass through
 * - allowlisted remote hosts → `/api/image-proxy?url=`
 * - everything else → null (caller should use a poster tile)
 */
export function toExportImageUrl(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (isDataImageUrl(trimmed)) return trimmed;
  if (trimmed.startsWith('/api/image-proxy?')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!isAllowlistedImageHost(parsed.hostname)) return null;
    return `/api/image-proxy?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return null;
  }
}
