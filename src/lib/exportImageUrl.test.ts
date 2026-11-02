import { describe, expect, it } from 'vitest';
import { apiUrl } from '@/lib/apiBase';
import { isAllowlistedImageHost, toExportImageUrl } from './exportImageUrl';

describe('toExportImageUrl', () => {
  it('passes through data URLs', () => {
    const data = 'data:image/png;base64,abc';
    expect(toExportImageUrl(data)).toBe(data);
  });

  it('proxies Ticketmaster and Spotify hosts via apiUrl', () => {
    const tm = 'https://s1.ticketm.net/dam/a.jpg';
    expect(toExportImageUrl(tm)).toBe(
      apiUrl(`/api/image-proxy?url=${encodeURIComponent(tm)}`)
    );
    const sp = 'https://i.scdn.co/image/ab123';
    expect(toExportImageUrl(sp)).toBe(
      apiUrl(`/api/image-proxy?url=${encodeURIComponent(sp)}`)
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
