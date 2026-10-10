import type { NextFunction, Request, Response } from 'express';
import { getServiceClient, getAdminDb } from './supabase-admin';
export { getAdminDb } from './supabase-admin';

export type AppRole = 'student' | 'parent' | 'admin';
export interface AuthenticatedRequest extends Request {
  authUser?: { uid: string; email?: string; email_verified: boolean; role?: string };
}

export function getAdminAuth() {
  const admin = getServiceClient().auth.admin;
  return {
    async createUser(options: { email: string; password: string; phoneNumber?: string; emailVerified?: boolean; displayName?: string }) {
      const { data, error } = await admin.createUser({
        email: options.email, password: options.password,
        email_confirm: options.emailVerified ?? false,
        user_metadata: { display_name: options.displayName },
      });
      if (error || !data.user) throw error ?? new Error('Hesap oluşturulamadı.');
      return { uid: data.user.id };
    },
    async deleteUser(uid: string) {
      const { error } = await admin.deleteUser(uid);
      if (error) throw error;
    },
    async updateUser(uid: string, updates: { password: string }) {
      const { error } = await admin.updateUserById(uid, updates);
      if (error) throw error;
    },
    async revokeRefreshTokens(uid: string) {
      // The password update invalidates previous credentials; session revocation
      // is handled by the database procedure below for the linked student.
      const { error } = await getServiceClient().rpc('revoke_user_sessions', { target_id: uid });
      if (error) throw error;
    },
  };
}

export async function requireSupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const match = (req.header('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  const { data, error } = await getServiceClient().auth.getUser(match[1]);
  if (error || !data.user) return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  // getUser verifies the JWT but access tokens may outlive a revoked session.
  let sessionId: unknown;
  try { sessionId = JSON.parse(Buffer.from(match[1].split('.')[1], 'base64url').toString('utf8')).session_id; } catch { /* Invalid claim. */ }
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) return res.status(401).json({ error: 'Oturum geçersiz.' });
  const active = await getServiceClient().rpc('is_user_session_active', { p_user: data.user.id, p_session: sessionId });
  if (active.error) return res.status(503).json({ error: 'Oturum doğrulanamadı. Yeniden deneyin.' });
  if (!active.data) return res.status(401).json({ error: 'Oturum kapatılmış. Yeniden giriş yapın.' });
  req.authUser = { uid: data.user.id, email: data.user.email,
    email_verified: Boolean(data.user.email_confirmed_at),
    role: data.user.app_metadata?.role };
  return next();
}

export function requireVerifiedEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser?.email_verified) return res.status(403).json({ error: 'Veli e-posta adresi doğrulanmalıdır.' });
  return next();
}
export function requireProfileRole(...roles: AppRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
    try {
      const profile = (await getAdminDb().doc(`users/${req.authUser.uid}`).get()).data();
      if (!profile || profile.id !== req.authUser.uid || !roles.includes(profile.role))
        return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
      if (profile.role === 'admin' && (req.authUser.role !== 'admin' || !req.authUser.email_verified))
        return res.status(403).json({ error: 'Yönetici yetkisi doğrulanamadı.' });
      return next();
    } catch {
      return res.status(503).json({ error: 'Hesap yetkisi doğrulanamadı.' });
    }
  };
}
export function requireRole(...roles: AppRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser?.role || !roles.includes(req.authUser.role as AppRole))
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
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

export function sanitizeForPrompt(input: string): string {
  // Remove potential prompt injection patterns
  return input
    .replace(/"""/g, '\\"\\"\\"')  // Escape triple quotes
    .replace(/```/g, '\\`\\`\\`')   // Escape markdown code blocks
    .replace(/<\|end\|>/g, '')      // Remove special tokens
    .replace(/<\|.*?\|>/g, '')      // Remove other special tokens
    .slice(0, 4000);                // Enforce length limit
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


