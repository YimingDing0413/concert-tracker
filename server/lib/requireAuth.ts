import type { NextFunction, Request, Response } from 'express';
import { getCurrentUserFromRequest, type AuthenticatedUser } from './getCurrentUser.js';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    req.authUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
