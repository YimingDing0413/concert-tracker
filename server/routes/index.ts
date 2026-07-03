import { Router } from 'express';
import { checkDynamoHealth } from '../lib/dynamoHealth.js';
import { checkTicketmasterHealth } from '../lib/ticketmasterHealth.js';
import { storageLabel, storageWarning } from '../storage/persist.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { searchRouter } from './search.js';
import { eventsRouter } from './events.js';
import { venuesRouter } from './venues.js';
import { artistsRouter } from './artists.js';
import { authRouter } from './auth.js';
import { userRouter } from './user.js';
import { usersRouter } from './users.js';
import { membersRouter } from './members.js';
import { friendsRouter } from './friends.js';
import { mapRouter } from './map.js';
import { concertsRouter } from './concerts.js';
import { feedRouter } from './feed.js';
import { messagesRouter } from './messages.js';
import { spotifyRouter } from './spotify.js';
import { recommendationsRouter } from './recommendations.js';
import { hasSpotify, hasTicketmaster, env } from '../env.js';

export const apiRouter = Router();

apiRouter.use('/search', searchRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/venues', venuesRouter);
apiRouter.use('/artists', artistsRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/members', membersRouter);
apiRouter.use('/friends', friendsRouter);
apiRouter.use('/concerts', concertsRouter);
apiRouter.use('/feed', feedRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/spotify', spotifyRouter);
apiRouter.use('/recommendations', recommendationsRouter);
apiRouter.use('/map', mapRouter);

apiRouter.get('/health', async (_req, res) => {
  const dynamoConfigured = isDynamoConfigured();
  const dynamo = dynamoConfigured
    ? await checkDynamoHealth()
    : { ok: false as const, error: 'DynamoDB env vars not set' };
  const ticketmaster = hasTicketmaster()
    ? await checkTicketmasterHealth()
    : { ok: false as const, error: 'TICKETMASTER_API_KEY not configured' };

  res.json({
    ok: true,
    apis: {
      ticketmaster: ticketmaster.ok,
      bandsintown: Boolean(process.env.BANDSINTOWN_APP_ID?.trim()),
      setlistfm: Boolean(process.env.SETLISTFM_API_KEY?.trim()),
      dynamodb: dynamo.ok,
      spotify: hasSpotify(),
    },
    ticketmasterConfigured: hasTicketmaster(),
    ticketmasterError: ticketmaster.ok ? undefined : ticketmaster.error,
    spotifyConfigured: hasSpotify(),
    spotifyRedirectUri: hasSpotify() ? env.spotifyRedirectUri : undefined,
    storage: storageLabel(),
    storageWarning: storageWarning(),
    dynamodbConfigured: dynamoConfigured,
    dynamodbRegion: dynamo.region,
    dynamodbTable: dynamo.tableName,
    dynamodbError: dynamo.ok ? undefined : dynamo.error,
  });
});
