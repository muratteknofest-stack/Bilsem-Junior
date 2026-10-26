import { Router } from 'express';
import { z } from 'zod';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole, type AuthenticatedRequest } from '../security';
import { sharedRateLimit } from '../shared-rate-limit';
import { getServiceClient } from '../supabase-admin';
import { readPlatformSettings } from '../platform-settings';
import { studentRequiresPaidAccess } from '../paid-access-policy';
import { paidSalesReady } from '../google-play-sales';
import { PLAY_PLANS } from '../../src/lib/google-play-contract';
import { GooglePlayError, playBindings, playTokenSchema, encryptPlayToken } from '../google-play-model';
import { playConfig, playSetupReady, verifyPlayPush, verifyPlayCatalog } from '../google-play-client';
import { googlePlayAccess, handlePlayNotification, verifyAndSavePlay } from '../google-play-access';
import { playStoreListing } from '../play-listing';
import { isLicenseTestFamily, licenseTestLegalReady } from '../google-play-license-test';
const routes = Router();
const student = z.uuid();
function failure(error: unknown, res: import('express').Response) {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Satın alım veya öğrenci bilgisi geçersiz.' });
  if (error instanceof GooglePlayError) return res.status(error.status).json({ error: error.message });
  throw error;
}
routes.use('/parent/google-play', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('parent'), (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
routes.get('/parent/google-play/access', sharedRateLimit('play-access', 60, 600), async (req: AuthenticatedRequest, res) => {
  try {
    const id = student.parse(req.query.studentId), config = playConfig();
    const { settings } = await readPlatformSettings();
    const licenseTest = isLicenseTestFamily(req.authUser!.uid, id);
    const ready = licenseTest ? playSetupReady() && licenseTestLegalReady(settings) : paidSalesReady(settings);
    const access = await googlePlayAccess(req.authUser!.uid, id);
    const enforced = await studentRequiresPaidAccess(id) || licenseTest;
    res.json({ ready, storeUrl: playStoreListing(), enforced, productId: config.productId, plans: PLAY_PLANS, binding: process.env.GOOGLE_PLAY_BINDING_SECRET ? playBindings(req.authUser!.uid, id) : null, access });
  } catch (error) { failure(error, res); }
});
routes.post('/parent/google-play/prepare', sharedRateLimit('play-prepare', 12, 3600), async (req: AuthenticatedRequest, res) => {
  try {
    const { studentId } = z.object({ studentId: student }).strict().parse(req.body), config = playConfig();
    const { settings } = await readPlatformSettings();
    const licenseTest = isLicenseTestFamily(req.authUser!.uid, studentId);
    if (licenseTest ? !playSetupReady() || !licenseTestLegalReady(settings) : !paidSalesReady(settings))
      throw new GooglePlayError('Google Play abonelikleri henüz satışa açılmadı.');
    // Fail before a charge if durable encryption/account binding or service credentials are absent.
    const binding = playBindings(req.authUser!.uid, studentId);
    encryptPlayToken('configuration-check');
    await verifyPlayCatalog(); // Prove real Google credentials and all active plans before any payment sheet.
    const access = await googlePlayAccess(req.authUser!.uid, studentId);
    if (access.active) throw new GooglePlayError('Aktif aboneliğinizi Google Play üzerinden yönetebilirsiniz.', 409);
    if (['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'].includes(access.state || '')) throw new GooglePlayError('Mevcut aboneliğinizi Google Play üzerinden yönetin. Ödeme veya duraklatma sorununu çözdükten sonra Yenile’ye dokunun.', 409);
    const prepared = await getServiceClient().rpc('prepare_google_play_binding', { p_parent: req.authUser!.uid, p_student: studentId, p_account: binding.accountId, p_profile: binding.profileId });
    if (prepared.error || prepared.data !== true) throw new GooglePlayError('Satın alma hesap bağlantısı kaydedilemedi.');
    res.json({ ...binding, productId: config.productId, plans: PLAY_PLANS });
  } catch (error) { failure(error, res); }
});
routes.post('/parent/google-play/verify', sharedRateLimit('play-verify', 60, 3600), async (req: AuthenticatedRequest, res) => {
  try {
    const { studentId, purchaseToken } = z.object({ studentId: student, purchaseToken: playTokenSchema }).strict().parse(req.body);
    // Restore must work even after new sales are disabled.
    res.json({ access: await verifyAndSavePlay(req.authUser!.uid, studentId, purchaseToken) });
  } catch (error) { failure(error, res); }
});
const notification = z.object({ message: z.object({ data: z.string().max(20000), messageId: z.string().max(200) }) });
routes.post('/google-play/notifications', async (req, res) => {
  try {
    await verifyPlayPush(req.get('authorization'));
    const { message } = notification.parse(req.body);
    const decoded = z.object({ packageName: z.string(), subscriptionNotification: z.object({ purchaseToken: playTokenSchema }).optional(), testNotification: z.object({}).optional(), voidedPurchaseNotification: z.object({ purchaseToken: playTokenSchema }).optional() })
      .parse(JSON.parse(Buffer.from(message.data, 'base64').toString('utf8')));
    if (decoded.packageName !== playConfig().packageName) throw new GooglePlayError('Bildirim uygulaması eşleşmedi.', 400);
    if (decoded.subscriptionNotification || decoded.voidedPurchaseNotification) await handlePlayNotification((decoded.subscriptionNotification || decoded.voidedPurchaseNotification)!.purchaseToken);
    else if (!decoded.testNotification) throw new GooglePlayError('Bildirim türü desteklenmiyor.', 400);
    res.sendStatus(204);
  } catch (error) { failure(error instanceof SyntaxError ? new GooglePlayError('Bildirim biçimi geçersiz.', 400) : error, res); }
});
export default routes;

