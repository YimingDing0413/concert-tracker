import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  IMAGE_PROXY_MAX_BYTES,
  IMAGE_PROXY_MAX_REDIRECTS,
  isAllowedImageProxyContentType,
  isAllowedImageProxyHost,
} from '../../shared/imageProxyPolicy.js';

export const imageProxyRouter = Router();

/** Simple per-IP sliding window: 60 requests / 60s. */
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function setProxyHeaders(res: Response, contentType: string): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

async function readBodyLimited(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<Buffer> {
  if (!body) throw new Error('Empty body');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      const err = new Error('Image too large');
      (err as Error & { code?: string }).code = 'IMAGE_TOO_LARGE';
      throw err;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/**
 * Follow redirects manually (max IMAGE_PROXY_MAX_REDIRECTS) and re-check every hop.
 */
async function fetchAllowlistedImage(startUrl: URL): Promise<Response> {
  let current = startUrl;
  for (let hop = 0; hop <= IMAGE_PROXY_MAX_REDIRECTS; hop++) {
    if (current.protocol !== 'http:' && current.protocol !== 'https:') {
      const err = new Error('Unsupported protocol');
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    if (!isAllowedImageProxyHost(current.hostname)) {
      const err = new Error('Host not allowlisted');
      (err as Error & { status?: number }).status = 403;
      throw err;
    }

    const upstream = await fetch(current.toString(), {
      headers: { Accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif,*/*;q=0.1' },
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (!location) {
        const err = new Error('Redirect missing Location');
        (err as Error & { status?: number }).status = 502;
        throw err;
      }
      if (hop === IMAGE_PROXY_MAX_REDIRECTS) {
        const err = new Error('Too many redirects');
        (err as Error & { status?: number }).status = 502;
        throw err;
      }
      current = new URL(location, current);
      continue;
    }

    return upstream;
  }

  const err = new Error('Too many redirects');
  (err as Error & { status?: number }).status = 502;
  throw err;
}

imageProxyRouter.options('/', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(204).end();
});

imageProxyRouter.get('/', async (req, res, next: NextFunction) => {
  try {
    const ip = clientIp(req);
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

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

    const upstream = await fetchAllowlistedImage(target);

    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).json({ error: 'Upstream image fetch failed' });
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!isAllowedImageProxyContentType(contentType)) {
      res.status(502).json({ error: 'Upstream response was not an allowed image type' });
      return;
    }

    const contentLength = upstream.headers.get('content-length');
    if (contentLength && Number(contentLength) > IMAGE_PROXY_MAX_BYTES) {
      res.status(502).json({ error: 'Image too large' });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = await readBodyLimited(upstream.body, IMAGE_PROXY_MAX_BYTES);
    } catch (err) {
      if ((err as Error & { code?: string }).code === 'IMAGE_TOO_LARGE') {
        res.status(502).json({ error: 'Image too large' });
        return;
      }
      throw err;
    }

    const mime = contentType.split(';')[0]!.trim().toLowerCase();
    setProxyHeaders(res, mime);
    res.send(buffer);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 400 || status === 403) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    next(err);
  }
});
