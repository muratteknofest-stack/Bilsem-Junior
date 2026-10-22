import { Router } from 'express';
import { z } from 'zod';
import { SHOPIER_PLANS, shopierProduct } from '../../src/lib/shopier-config';
import { releaseBlockers } from '../../src/lib/platform-settings';
import { readPlatformSettings } from '../platform-settings';
import { shopierConfig } from '../shopier-config';
import { shopierReady, shopierGet, verifyShopierProducts } from '../shopier-client';
import { verifiedShopierOrder, ShopierError } from '../shopier-model';
import { shopierAccess, assertShopierFamily } from '../shopier-access';
import { getServiceClient } from '../supabase-admin';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole, type AuthenticatedRequest } from '../security';
import { sharedRateLimit } from '../shared-rate-limit';

const routes = Router();
export async function publicShopierView() {
  const config = shopierConfig();
  let ready = false;
  if (shopierReady(config)) {
    const { settings } = await readPlatformSettings();
    if (!releaseBlockers(settings).length) {
      try { await verifyShopierProducts(config); ready = true; }
      catch (error) { if (!(error instanceof ShopierError)) throw error; }
    }
  }
  return { enabled: config.enabled, ready, enforced: config.enforcePaidAccess, brand: 'Bilsem Junior',
    plans: SHOPIER_PLANS.map(plan => ({ ...plan, url: ready ? shopierProduct(config, plan.id).url : null })) };
}
routes.get('/public/shopier', sharedRateLimit('shopier-public', 60, 600), async (_req, res) => {
  res.set('Cache-Control', 'no-store').json(await publicShopierView());
});
routes.use('/parent/shopier', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('parent'),
  (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
function failure(error: unknown, res: import('express').Response) {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Sipariş veya öğrenci bilgileri geçersiz.' });
  if (error instanceof ShopierError) return res.status(error.status).json({ error: error.message });
  throw error;
}
routes.get('/parent/shopier/access', sharedRateLimit('shopier-access', 60, 600), async (req: AuthenticatedRequest, res) => {
  try {
    const studentId = z.uuid().parse(req.query.studentId);
    const access = await shopierAccess(req.authUser!.uid, studentId, shopierConfig());
    res.json({ ...await publicShopierView(), access });
  } catch (error) { failure(error, res); }
});
routes.post('/parent/shopier/claim', sharedRateLimit('shopier-claim', 12, 3600), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, studentId } = z.object({ orderId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), studentId: z.uuid() }).strict().parse(req.body);
    if (!(await publicShopierView()).ready) throw new ShopierError('Shopier üyelik satışı henüz açılmadı.', 503);
    await assertShopierFamily(req.authUser!.uid, studentId);
    if (!req.authUser!.email) throw new ShopierError('Veli e-postası doğrulanamadı.', 403);
    const proof = verifiedShopierOrder(await shopierGet('orders', orderId), orderId, { email: req.authUser!.email }, shopierConfig());
    const saved = await getServiceClient().rpc('claim_shopier_access_v2', {
      p_order: proof.orderId, p_parent: req.authUser!.uid, p_student: studentId,
      p_product: proof.productId, p_plan: proof.planId, p_buyer_hash: proof.buyerEmailSha256, p_amount: proof.amountKurus,
    });
    if (saved.error?.code === '40001') throw new ShopierError('Bu sipariş başka bir öğrenciye tanımlanmış.', 409);
    if (saved.error?.code === '42501') throw new ShopierError('Öğrenci bağlantısı doğrulanamadı.', 403);
    if (saved.error || saved.data?.order_id !== orderId) throw new ShopierError('Erişim kaydı doğrulanamadı.', 503);
    res.json({ access: await shopierAccess(req.authUser!.uid, studentId, shopierConfig()) });
  } catch (error) { failure(error, res); }
});
export default routes;
