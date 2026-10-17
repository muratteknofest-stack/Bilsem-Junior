import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './security';
import { MembershipRequiredError, requireLearningAccess } from './shopier-access';
import { ShopierError } from './shopier-model';

export function membershipError(error: unknown, res: Response): boolean {
  if (!(error instanceof ShopierError)) return false;
  res.status(error.status).json({ error: error.message, ...(error instanceof MembershipRequiredError ? { code: error.code, membershipUrl: '/paketler' } : {}) });
  return true;
}

export async function requireStudentMembership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  try { await requireLearningAccess(req.authUser.uid); return next(); }
  catch (error) { if (!membershipError(error, res)) return next(error); }
}
