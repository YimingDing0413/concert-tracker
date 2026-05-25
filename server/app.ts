import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { ApiError } from './lib/http.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.use('/api', apiRouter);

  app.get('/api', (_req, res) => {
    res.redirect(302, '/api/health');
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
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
