import { assertPasswordNotCompromised } from '../password-policy';
import { changeOwnPassword } from '../password-change';
import { logServerFailure } from '../safe-log';
import { sharedRateLimit } from '../shared-rate-limit';
import { Router } from 'express';
import { z } from 'zod';
import {
  getAdminAuth,
  requireSupabaseAuth, requireVerifiedEmail, requireProfileRole,
} from '../security';
import { accountSecurityLimiter } from '../rate-limiters';
import { getServiceClient } from '../supabase-admin';
import { strongPasswordSchema } from '../../src/lib/validations';
import { readPlatformSettings } from '../platform-settings';
import { toSupabaseRow } from '../../src/lib/supabase-shape';
import { isManagedStudentEmail } from '../../src/lib/account-identifiers';
import { createFamilyRegistrationHandler } from '../family-registration';
export { registerFamilySchema } from '../family-registration';

const authRoutes = Router();

export const registerStudentSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: strongPasswordSchema,
  studentName: z.string().trim().min(2).max(50),
  grade: z.number().int().min(1).max(4),
  examFocus: z.string().trim().min(1).max(100),
  consentAccepted: z.literal(true),
}).strict();

authRoutes.post('/register-student', accountSecurityLimiter, (_req, res) => {
  return res.status(410).json({ error: 'Yeni öğrenci hesabı veli kaydı üzerinden açılır.', code: 'FAMILY_REGISTRATION_REQUIRED' });
});

const sendVerification = async (email: string) => {
  const { error } = await getServiceClient().auth.resend({ type: 'signup', email,
    options: { emailRedirectTo: 'https://zekapark.vercel.app' } });
  if (error) throw error;
};
authRoutes.post('/register-family', accountSecurityLimiter, sharedRateLimit('family-registration', 6, 3600), createFamilyRegistrationHandler({
  configuration: readPlatformSettings,
  checkPassword: assertPasswordNotCompromised,
  createUser: input => getAdminAuth().createUser(input),
  async saveProfiles(profiles) {
    const { error } = await getServiceClient().from('profiles').insert(profiles.map(profile => toSupabaseRow('profiles', profile.id, profile)), { defaultToNull: false });
    if (error) throw error;
  },
  async deleteUser(id) {
    // profiles.id cascades from auth.users; avoid leaving an Auth account if a separate profile delete fails.
    await getAdminAuth().deleteUser(id);
  },
  sendVerification,
  logFailure: logServerFailure,
}));
const resendSchema = z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict();
authRoutes.post('/auth/resend-confirmation', accountSecurityLimiter, sharedRateLimit('confirmation-email', 6, 3600), async (req, res) => {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success || isManagedStudentEmail(parsed.data?.email)) return res.status(400).json({ error: 'Geçerli bir veli e-posta adresi girin.', code: 'INVALID_EMAIL' });
  try {
    await sendVerification(parsed.data.email);
    return res.status(202).json({ success: true, message: 'Bu adrese ait doğrulanmamış bir hesap varsa doğrulama bağlantısı gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.' });
  } catch (error) {
    const failure = error as { code?: string; status?: number };
    logServerFailure('Confirmation resend failed', error);
    if (failure.status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(failure.code || '')) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'E-posta için istek sınırına ulaşıldı. Bir süre bekleyip tekrar deneyin.', code: 'EMAIL_RATE_LIMIT' });
    }
    return res.status(503).json({ error: 'Doğrulama e-postası şu anda gönderilemiyor. Bir süre sonra tekrar deneyin veya destek ile iletişime geçin.', code: 'EMAIL_UNAVAILABLE' });
  }
});

authRoutes.post('/auth/change-password', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('parent', 'admin'), accountSecurityLimiter, sharedRateLimit('own-password-change', 6, 3600), changeOwnPassword);

export default authRoutes;


