import { Router } from 'express';
import { requireAuth } from '../lib/requireAuth.js';
import { requireDynamo } from '../lib/requireDynamo.js';
import {
  disconnectSpotifyAccount,
  getAppPublicUrl,
  getSpotifyConnectUrl,
  getSpotifyStatus,
  handleSpotifyCallback,
  spotifyConfigured,
  syncSpotifyTaste,
} from '../services/spotifyService.js';

export const spotifyRouter = Router();

spotifyRouter.get('/connect', requireAuth, requireDynamo, (req, res) => {
  if (!spotifyConfigured()) {
    res.status(503).json({ error: 'Spotify is not configured on this server.' });
    return;
  }
  const url = getSpotifyConnectUrl(req.authUser!.userId);
  const wantsJson =
    req.headers.accept?.includes('application/json') || req.query.format === 'json';
  if (wantsJson) {
    res.json({ data: { url } });
    return;
  }
  res.redirect(302, url);
});

spotifyRouter.get('/callback', requireDynamo, async (req, res) => {
  try {
    if (!spotifyConfigured()) {
      res.redirect(302, `${getAppPublicUrl()}/profile?spotify=error&reason=not_configured`);
      return;
    }
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    const error = String(req.query.error ?? '');
    if (error) {
      res.redirect(302, `${getAppPublicUrl()}/profile?spotify=error&reason=${encodeURIComponent(error)}`);
      return;
    }
    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state.' });
      return;
    }
    const { redirectUrl } = await handleSpotifyCallback(code, state);
    res.redirect(302, redirectUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Spotify connection failed.';
    res.redirect(
      302,
      `${getAppPublicUrl()}/profile?spotify=error&reason=${encodeURIComponent(msg)}`
    );
  }
});

spotifyRouter.get('/status', requireAuth, requireDynamo, async (req, res, next) => {
  try {
    const status = await getSpotifyStatus(req.authUser!.userId);
    res.json({ data: status });
  } catch (err) {
    next(err);
  }
});

spotifyRouter.post('/sync', requireAuth, requireDynamo, async (req, res) => {
  try {
    if (!spotifyConfigured()) {
      res.status(503).json({ error: 'Spotify is not configured on this server.' });
      return;
    }
    const profile = await syncSpotifyTaste(req.authUser!.userId);
    res.json({ data: { profile, syncedAt: profile.lastSyncedAt } });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Spotify sync failed.' });
  }
});

spotifyRouter.post('/disconnect', requireAuth, requireDynamo, async (req, res, next) => {
  try {
    await disconnectSpotifyAccount(req.authUser!.userId);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
