import { Router } from 'express';
import * as store from '../storage/userStorage.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: 'Email required' });
      return;
    }
    const user = await store.login(email);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/signup', async (req, res) => {
  try {
    const user = await store.signUp(req.body);
    res.json({ data: user });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Sign up failed' });
  }
});

authRouter.get('/me', async (_req, res, next) => {
  try {
    const user = await store.getCurrentUser();
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (_req, res, next) => {
  try {
    await store.logout();
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
});
