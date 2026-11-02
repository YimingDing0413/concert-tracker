/** Shared allowlist + content-type rules for GET /api/image-proxy. */

export const IMAGE_PROXY_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_PROXY_MAX_REDIRECTS = 3;

export const ALLOWED_IMAGE_PROXY_HOST_SUFFIXES = [
  'ticketm.net',
  'ticketmaster.com',
  'ticketmaster.ca',
  'ticketmaster.co.uk',
  'scdn.co',
  'spotifycdn.com',
  'spotify.com',
] as const;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function isAllowedImageProxyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_IMAGE_PROXY_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

/** Accepts only png/jpeg/webp/gif/avif (ignores parameters after `;`). */
export function isAllowedImageProxyContentType(contentType: string): boolean {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return ALLOWED_IMAGE_TYPES.has(mime);
}
