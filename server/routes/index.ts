import { Router } from 'express';
import { checkDynamoHealth } from '../lib/dynamoHealth.js';
import { storageLabel, storageWarning } from '../storage/persist.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { searchRouter } from './search.js';
import { eventsRouter } from './events.js';
import { venuesRouter } from './venues.js';
import { artistsRouter } from './artists.js';
import { authRouter } from './auth.js';
import { userRouter } from './user.js';
import { mapRouter } from './map.js';
import { concertsRouter } from './concerts.js';

export const apiRouter = Router();

apiRouter.use('/search', searchRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/venues', venuesRouter);
apiRouter.use('/artists', artistsRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/concerts', concertsRouter);
apiRouter.use('/map', mapRouter);

apiRouter.get('/health', async (_req, res) => {
  const dynamoConfigured = isDynamoConfigured();
  const dynamo = dynamoConfigured
    ? await checkDynamoHealth()
    : { ok: false as const, error: 'DynamoDB env vars not set' };

  res.json({
    ok: true,
    apis: {
      ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
      bandsintown: Boolean(process.env.BANDSINTOWN_APP_ID),
      setlistfm: Boolean(process.env.SETLISTFM_API_KEY),
      dynamodb: dynamo.ok,
    },
    storage: storageLabel(),
    storageWarning: storageWarning(),
    dynamodbConfigured: dynamoConfigured,
    dynamodbRegion: dynamo.region,
    dynamodbTable: dynamo.tableName,
    dynamodbError: dynamo.ok ? undefined : dynamo.error,
  });
});
