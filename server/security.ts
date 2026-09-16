import type { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export type AppRole = 'student' | 'parent' | 'admin';

export interface AuthenticatedRequest extends Request {
  authUser?: DecodedIdToken;
}

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  adminApp = getApps()[0] || initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  const app = getAdminApp();
  const databaseId = process.env.FIREBASE_DATABASE_ID?.trim();
  return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export async function requireFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  }

  try {
    req.authUser = await getAdminAuth().verifyIdToken(match[1], true);
    return next();
  } catch {
    return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  }
}

export async function requireAppCheck(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.ENFORCE_APP_CHECK?.trim().toLowerCase();
  const shouldEnforce = configured === 'true' || (configured !== 'false' && process.env.NODE_ENV === 'production');
  if (!shouldEnforce) return next();

  const token = req.header('x-firebase-appcheck');
  if (!token) {
    return res.status(401).json({ error: 'Uygulama doğrulaması gerekli.' });
  }

  try {
    await getAppCheck(getAdminApp()).verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Uygulama doğrulaması geçersiz.' });
  }
}

export function requireVerifiedEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser?.email_verified) {
    return res.status(403).json({ error: 'Bu işlem için veli e-posta adresi doğrulanmalıdır.' });
  }
  return next();
}

export function requireProfileRole(...roles: AppRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
    try {
      const snapshot = await getAdminDb().doc(`users/${req.authUser.uid}`).get();
      const profile = snapshot.data();
      if (!profile || profile.id !== req.authUser.uid || !roles.includes(profile.role)) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
      }
      return next();
    } catch {
      return res.status(503).json({ error: 'Hesap yetkisi şu anda doğrulanamadı.' });
    }
  };
}

export function requireRole(...roles: AppRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.authUser?.role as AppRole | undefined;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
    }
    return next();
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function sanitizeHeaderValue(value: unknown): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 160);
}

export function normalizeStudentCode(name: string): string {
  return name
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'I')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12)
    .toUpperCase() || 'OGRENCI';
}
