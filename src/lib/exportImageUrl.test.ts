import { describe, expect, it } from 'vitest';
import { isAllowlistedImageHost, toExportImageUrl } from './exportImageUrl';

describe('toExportImageUrl', () => {
  it('passes through data URLs', () => {
    const data = 'data:image/png;base64,abc';
    expect(toExportImageUrl(data)).toBe(data);
  });

  it('proxies Ticketmaster and Spotify hosts', () => {
    expect(toExportImageUrl('https://s1.ticketm.net/dam/a.jpg')).toBe(
      `/api/image-proxy?url=${encodeURIComponent('https://s1.ticketm.net/dam/a.jpg')}`
    );
    expect(toExportImageUrl('https://i.scdn.co/image/ab123')).toBe(
      `/api/image-proxy?url=${encodeURIComponent('https://i.scdn.co/image/ab123')}`
    );
  });

  it('returns null for non-allowlisted remotes so callers use poster tiles', () => {
    expect(toExportImageUrl('https://evil.example/x.jpg')).toBeNull();
    expect(toExportImageUrl('')).toBeNull();
    expect(toExportImageUrl(undefined)).toBeNull();
  });

  it('allowlists known suffixes', () => {
    expect(isAllowlistedImageHost('s1.ticketm.net')).toBe(true);
    expect(isAllowlistedImageHost('image-cdn-ak.spotifycdn.com')).toBe(true);
    expect(isAllowlistedImageHost('evil.com')).toBe(false);
  });
});
