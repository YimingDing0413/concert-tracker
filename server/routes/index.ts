import { Router } from 'express';
import { storageLabel } from '../storage/persist.js';
import { searchRouter } from './search.js';
import { eventsRouter } from './events.js';
import { venuesRouter } from './venues.js';
import { artistsRouter } from './artists.js';
import { authRouter } from './auth.js';
import { userRouter } from './user.js';

export const apiRouter = Router();

apiRouter.use('/search', searchRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/venues', venuesRouter);
apiRouter.use('/artists', artistsRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    apis: {
      ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
      bandsintown: Boolean(process.env.BANDSINTOWN_APP_ID),
      setlistfm: Boolean(process.env.SETLISTFM_API_KEY),
    },
    storage: storageLabel(),
  });
});
