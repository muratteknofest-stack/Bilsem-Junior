import type { AuthenticatedRequest } from './security';
import type { Response } from 'express';
import { strongPasswordSchema } from '../src/lib/validations';
import { z } from 'zod';
import { assertPasswordNotCompromised, PasswordPolicyError } from './password-policy';
import { getServiceClient } from './supabase-admin';
import { logServerFailure } from './safe-log';
const schema = z.object({ password: strongPasswordSchema }).strict();
interface ChangeDependencies {
  check: (password: string) => Promise<void>;
  update: (token: string, password: string) => Promise<void>;
  revoke: (userId: string) => Promise<void>;
}
export function createPasswordChangeHandler(deps: ChangeDependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    const parsed = schema.safeParse(req.body);
    const bearer = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!req.authUser || !bearer) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
    if (!parsed.success) return res.status(400).json({ error: 'Şifre en az 8 karakter, bir harf ve bir rakam içermelidir.' });
    let updated = false;
    try {
      await deps.check(parsed.data.password);
      // Forward the user JWT to Auth's user endpoint: preserve provider recovery/reauth policies.
      await deps.update(bearer, parsed.data.password); updated = true;
      await deps.revoke(req.authUser.uid);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof PasswordPolicyError) return res.status(error.status).json({ error: error.message, code: error.code });
      logServerFailure('Password change failed', error);
      return res.status(503).json({ error: updated ? 'Şifre yenilendi ancak eski oturumların kapatılması doğrulanamadı. Yeni şifrenizle giriş yaparak tekrar deneyin.' : 'Şifre yenilenemedi. Yeni bağlantı isteyin veya biraz sonra tekrar deneyin.' });
    }
  };
}
export const changeOwnPassword = createPasswordChangeHandler({
  check: assertPasswordNotCompromised,
  async update(token, password) {
    const origin = new URL(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
    if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co')) throw new Error('Auth origin invalid');
    const response = await fetch(new URL('/auth/v1/user', origin), {
      method: 'PUT', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error('Auth password update rejected'); }
    await response.body?.cancel();
  },
  async revoke(userId) {
    const { error } = await getServiceClient().rpc('revoke_user_sessions', { target_id: userId });
    if (error) throw error;
  },
});
