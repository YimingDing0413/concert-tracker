import { describe, expect, it } from 'vitest';
import {
  isAllowedImageProxyContentType,
  isAllowedImageProxyHost,
} from './imageProxyPolicy';

describe('isAllowedImageProxyHost', () => {
  it('allows Ticketmaster and Spotify CDN hosts', () => {
    expect(isAllowedImageProxyHost('s1.ticketm.net')).toBe(true);
    expect(isAllowedImageProxyHost('media.ticketmaster.com')).toBe(true);
    expect(isAllowedImageProxyHost('i.scdn.co')).toBe(true);
    expect(isAllowedImageProxyHost('image-cdn-ak.spotifycdn.com')).toBe(true);
  });

  it('rejects non-allowlisted hosts', () => {
    expect(isAllowedImageProxyHost('evil.example')).toBe(false);
    expect(isAllowedImageProxyHost('ticketmaster.com.evil.com')).toBe(false);
  });
});

describe('isAllowedImageProxyContentType', () => {
  it('accepts png jpeg webp gif avif', () => {
    expect(isAllowedImageProxyContentType('image/png')).toBe(true);
    expect(isAllowedImageProxyContentType('image/jpeg; charset=binary')).toBe(true);
    expect(isAllowedImageProxyContentType('image/webp')).toBe(true);
    expect(isAllowedImageProxyContentType('image/gif')).toBe(true);
    expect(isAllowedImageProxyContentType('image/avif')).toBe(true);
  });

  it('rejects other types', () => {
    expect(isAllowedImageProxyContentType('image/svg+xml')).toBe(false);
    expect(isAllowedImageProxyContentType('text/html')).toBe(false);
    expect(isAllowedImageProxyContentType('application/octet-stream')).toBe(false);
  });
});
