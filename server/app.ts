import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { ApiError } from './lib/http.js';
import { ensureStorageReady } from './storage/userStorage.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  // Vercel @vercel/node may deliver /search instead of /api/search
  app.use((req, _res, next) => {
    const raw = req.url ?? '/';
    const q = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
    const pathname = raw.split('?')[0] || '/';
    if (!pathname.startsWith('/api') && pathname !== '/') {
      req.url = `/api${pathname.startsWith('/') ? pathname : `/${pathname}`}${q}`;
    }
    next();
  });

  // Must run before route handlers (serverless cold start + Redis hydrate)
  app.use(async (_req, _res, next) => {
    try {
      await ensureStorageReady();
    } catch (err) {
      console.error('[api] Storage init failed:', err);
    }
    next();
  });

  app.use('/api', apiRouter);

  app.get('/api', (_req, res) => {
    res.redirect(302, '/api/health');
  });

  app.get('/', (_req, res) => {
    res.redirect(302, '/api/health');
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    // Prevent ESLint no-unused-vars for Express error middleware.
    void _next;
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  });

  return app;
}
