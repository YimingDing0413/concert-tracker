import { Router } from 'express';

export const imageProxyRouter = Router();

/** Ticketmaster + Spotify CDN hosts only (open proxy guard). */
const ALLOWED_HOST_SUFFIXES = [
  'ticketm.net',
  'ticketmaster.com',
  'ticketmaster.ca',
  'ticketmaster.co.uk',
  'scdn.co',
  'spotifycdn.com',
  'spotify.com',
] as const;

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

imageProxyRouter.get('/', async (req, res, next) => {
  try {
    const raw = typeof req.query.url === 'string' ? req.query.url : '';
    if (!raw) {
      res.status(400).json({ error: 'Missing url' });
      return;
    }

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      res.status(400).json({ error: 'Invalid url' });
      return;
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      res.status(400).json({ error: 'Unsupported protocol' });
      return;
    }
    if (!isAllowedHost(target.hostname)) {
      res.status(403).json({ error: 'Host not allowlisted' });
      return;
    }

    const upstream = await fetch(target.toString(), {
      headers: { Accept: 'image/*,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    });

    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).json({ error: 'Upstream image fetch failed' });
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    if (!contentType.toLowerCase().startsWith('image/')) {
      res.status(502).json({ error: 'Upstream response was not an image' });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
