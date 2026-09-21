import { Router } from 'express';
import { z } from 'zod';
import { billingEnabled, stripePost } from '../billing/stripe-client';
import { billingLimiter } from '../rate-limiters';
import {
  getAdminDb,
  requireAppCheck,
  requireFirebaseAuth,
  requireProfileRole,
  requireVerifiedEmail,
  type AuthenticatedRequest,
} from '../security';

const billingRoutes = Router();
const guards = [requireFirebaseAuth, requireAppCheck, billingLimiter, requireVerifiedEmail, requireProfileRole('parent')] as const;
const checkoutSchema = z.object({
  plan: z.literal('family-premium'),
  requestId: z.string().uuid(),
}).strict();

billingRoutes.get('/billing/status', ...guards, async (req: AuthenticatedRequest, res) => {
  if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  const snapshot = await getAdminDb().doc(`entitlements/${req.authUser.uid}`).get();
  const entitlement = snapshot.data();
  return res.json({
    enabled: billingEnabled(),
    plan: entitlement?.plan || 'free',
    status: entitlement?.status || 'inactive',
    currentPeriodEnd: entitlement?.currentPeriodEnd || null,
  });
});

billingRoutes.post('/billing/checkout', ...guards, async (req: AuthenticatedRequest, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) return res.status(400).json({ error: 'Ödeme planı geçersiz.' });
  if (!billingEnabled()) return res.status(503).json({ error: 'Ödeme sistemi henüz etkinleştirilmedi.' });
  try {
    const entitlement = (await getAdminDb().doc(`entitlements/${req.authUser.uid}`).get()).data();
    if (entitlement?.status === 'active' || entitlement?.status === 'trialing') {
      return res.status(409).json({ error: 'Bu hesapta zaten etkin bir abonelik var.' });
    }
    const appBaseUrl = process.env.APP_BASE_URL!.replace(/\/$/, '');
    const session = await stripePost('checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': process.env.STRIPE_PRICE_ID!,
      'line_items[0][quantity]': '1',
      success_url: `${appBaseUrl}/veli?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/veli?payment=cancelled`,
      client_reference_id: req.authUser.uid,
      ...(entitlement?.customerId
        ? { customer: String(entitlement.customerId) }
        : { customer_email: req.authUser.email || '' }),
      'metadata[firebaseUid]': req.authUser.uid,
      'metadata[plan]': parsed.data.plan,
      'subscription_data[metadata][firebaseUid]': req.authUser.uid,
      'subscription_data[metadata][plan]': parsed.data.plan,
      allow_promotion_codes: 'true',
    }, { idempotencyKey: `zekapark-${req.authUser.uid}-${parsed.data.requestId}` });
    if (!session?.id || !session?.url) throw new Error('Stripe checkout yanıtı eksik.');
    await getAdminDb().doc(`billingCheckouts/${session.id}`).set({
      userId: req.authUser.uid,
      plan: parsed.data.plan,
      status: 'created',
      createdAt: Date.now(),
    });
    return res.status(201).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[Billing] checkout failed:', error);
    return res.status(502).json({ error: 'Güvenli ödeme oturumu oluşturulamadı.' });
  }
});

billingRoutes.post('/billing/portal', ...guards, async (req: AuthenticatedRequest, res) => {
  if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  if (!billingEnabled()) return res.status(503).json({ error: 'Ödeme sistemi henüz etkinleştirilmedi.' });
  try {
    const entitlement = (await getAdminDb().doc(`entitlements/${req.authUser.uid}`).get()).data();
    if (!entitlement?.customerId) return res.status(404).json({ error: 'Etkin faturalandırma profili bulunamadı.' });
    const portal = await stripePost('billing_portal/sessions', {
      customer: String(entitlement.customerId),
      return_url: `${process.env.APP_BASE_URL!.replace(/\/$/, '')}/veli`,
    });
    if (!portal?.url) throw new Error('Stripe portal yanıtı eksik.');
    return res.json({ portalUrl: portal.url });
  } catch (error) {
    console.error('[Billing] portal failed:', error);
    return res.status(502).json({ error: 'Abonelik yönetimi açılamadı.' });
  }
});

export default billingRoutes;
