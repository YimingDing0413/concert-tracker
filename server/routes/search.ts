import { Router } from 'express';
import { searchAll } from '../services/searchService.js';

export const searchRouter = Router();

searchRouter.get('/', async (req, res, next) => {
  try {
    const query = String(req.query.query ?? '').trim();
    if (!query) {
      res.json({ data: [], meta: { source: 'live' } });
      return;
    }
    const result = await searchAll(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
