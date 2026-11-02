import { Router } from 'express';
import {
  dynamoCredentialUserMessage,
  isAwsCredentialError,
} from '../lib/dynamoHealth.js';
import * as authService from '../services/authService.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: 'Email required' });
      return;
    }
    const session = await authService.login(String(email), String(password ?? ''));
    res.json({ data: session });
  } catch (err) {
    if (isAwsCredentialError(err)) {
      res.status(503).json({ error: dynamoCredentialUserMessage(), code: 'DYNAMODB_CREDENTIALS' });
      return;
    }
    if (err instanceof Error && err.message.includes('Invalid')) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post('/signup', async (req, res) => {
  try {
    const session = await authService.signUp(req.body);
    res.json({ data: session });
  } catch (err) {
    if (isAwsCredentialError(err)) {
      res.status(503).json({ error: dynamoCredentialUserMessage(), code: 'DYNAMODB_CREDENTIALS' });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Sign up failed' });
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (_req, res, next) => {
  try {
    await authService.logout();
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
});
