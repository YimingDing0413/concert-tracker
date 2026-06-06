import { Router } from 'express';
import {
  getMessagesForThread,
  getOrCreateDmThread,
  getThreadById,
  getThreadsForUser,
  getUnreadCountForUser,
  markThreadRead,
  sendMessage,
} from '../../src/lib/db/messageRepository.js';
import { requireAuth } from '../lib/requireAuth.js';
import { requireDynamo } from '../lib/requireDynamo.js';

export const messagesRouter = Router();

messagesRouter.use(requireDynamo);
messagesRouter.use(requireAuth);

messagesRouter.post('/thread', async (req, res) => {
  try {
    const userId = req.authUser!.userId;
    const { targetUserId, context } = req.body ?? {};
    if (!targetUserId) {
      res.status(400).json({ error: 'targetUserId required' });
      return;
    }
    const thread = await getOrCreateDmThread(userId, String(targetUserId), context);
    res.json({ data: { thread } });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not open thread.' });
  }
});

messagesRouter.get('/threads', async (req, res, next) => {
  try {
    const userId = req.authUser!.userId;
    const threads = await getThreadsForUser(userId);
    res.json({ data: threads });
  } catch (err) {
    next(err);
  }
});

messagesRouter.get('/unread-count', async (req, res, next) => {
  try {
    const count = await getUnreadCountForUser(req.authUser!.userId);
    res.json({ data: { count } });
  } catch (err) {
    next(err);
  }
});

messagesRouter.get('/:threadId', async (req, res) => {
  try {
    const userId = req.authUser!.userId;
    const thread = await getThreadById(req.params.threadId, userId);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found.' });
      return;
    }
    const messages = await getMessagesForThread(req.params.threadId);
    await markThreadRead(req.params.threadId, userId);
    res.json({ data: { thread, messages } });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not load thread.' });
  }
});

messagesRouter.post('/:threadId', async (req, res) => {
  try {
    const userId = req.authUser!.userId;
    const thread = await getThreadById(req.params.threadId, userId);
    if (!thread) {
      res.status(403).json({ error: 'Not allowed to access this thread.' });
      return;
    }
    const text = String(req.body?.text ?? '');
    const message = await sendMessage(req.params.threadId, userId, text);
    res.json({ data: { message } });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not send message.' });
  }
});

messagesRouter.post('/:threadId/read', async (req, res, next) => {
  try {
    const userId = req.authUser!.userId;
    const thread = await getThreadById(req.params.threadId, userId);
    if (!thread) {
      res.status(403).json({ error: 'Not allowed to access this thread.' });
      return;
    }
    await markThreadRead(req.params.threadId, userId);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
