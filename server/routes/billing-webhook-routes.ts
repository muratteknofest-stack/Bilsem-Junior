import express, { Router } from 'express';
import { billingEnabled, verifyStripeWebhook } from '../billing/stripe-client';
import { getAdminDb } from '../security';

const billingWebhookRoutes = Router();

billingWebhookRoutes.post('/billing/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  if (!billingEnabled()) return res.status(404).end();
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  try {
    verifyStripeWebhook(rawBody, req.header('stripe-signature'));
    const event = JSON.parse(rawBody.toString('utf8')) as any;
    if (!event?.id || !event?.type || !event?.data?.object) return res.status(400).json({ error: 'Webhook gövdesi geçersiz.' });
    if (process.env.STRIPE_LIVE_MODE_REQUIRED?.trim().toLowerCase() === 'true' && event.livemode !== true) {
      return res.status(400).json({ error: 'Üretim uç noktası test modu ödeme olayı kabul etmiyor.' });
    }

    const object = event.data.object;
    let uid = object.client_reference_id || object.metadata?.firebaseUid || null;
    const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id : object.subscription;
    const db = getAdminDb();
    if (!uid && subscriptionId) {
      const match = await db.collection('entitlements').where('subscriptionId', '==', subscriptionId).limit(1).get();
      uid = match.docs[0]?.id || null;
    }
    if (!uid && object.customer) {
      const match = await db.collection('entitlements').where('customerId', '==', object.customer).limit(1).get();
      uid = match.docs[0]?.id || null;
    }

    await db.runTransaction(async (transaction) => {
      const eventRef = db.doc(`billingEvents/${event.id}`);
      if ((await transaction.get(eventRef)).exists) return;
      const now = Date.now();
      const eventCreatedAt = Number(event.created || 0) * 1000 || now;
      const validUid = uid && /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : null;
      const entitlementRef = validUid ? db.doc(`entitlements/${validUid}`) : null;
      const entitlementSnapshot = entitlementRef ? await transaction.get(entitlementRef) : null;
      const currentEntitlement = entitlementSnapshot?.data() || {};
      transaction.create(eventRef, {
        provider: 'stripe', type: event.type, objectId: object.id || null,
        userId: validUid,
        livemode: Boolean(event.livemode),
        eventCreatedAt,
        receivedAt: now,
      });

      if (event.type.startsWith('checkout.session.') && object.id) {
        transaction.set(db.doc(`billingCheckouts/${object.id}`), {
          status: event.type.replace('checkout.session.', ''),
          paymentStatus: object.payment_status || null,
          eventId: event.id,
          updatedAt: now,
        }, { merge: true });
      }
      if (!entitlementRef) return;

      // Stripe does not guarantee webhook delivery order. Record every event,
      // but never let an older lifecycle event roll an entitlement backwards.
      if (eventCreatedAt < Number(currentEntitlement.lastEventCreatedAt || 0)) return;
      const activeStatuses = new Set(['active', 'trialing']);
      const eventMetadata = object.metadata || {};
      const common = {
        userId: validUid,
        provider: 'stripe',
        lastEventId: event.id,
        lastEventCreatedAt: eventCreatedAt,
        updatedAt: now,
      };
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        transaction.set(entitlementRef, {
          ...common,
          plan: eventMetadata.plan || 'family-premium',
          status: object.payment_status === 'paid' ? 'active' : 'pending',
          customerId: object.customer || null,
          subscriptionId: object.subscription || null,
        }, { merge: true });
      } else if (event.type === 'checkout.session.async_payment_failed') {
        transaction.set(entitlementRef, {
          ...common,
          status: 'payment_failed',
          customerId: object.customer || currentEntitlement.customerId || null,
          subscriptionId: object.subscription || currentEntitlement.subscriptionId || null,
        }, { merge: true });
      } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
        transaction.set(entitlementRef, {
          ...common,
          plan: eventMetadata.plan || currentEntitlement.plan || 'family-premium',
          status: activeStatuses.has(object.status) ? 'active' : object.status,
          customerId: object.customer || null,
          subscriptionId: object.id,
          currentPeriodEnd: object.current_period_end ? Number(object.current_period_end) * 1000 : null,
          cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        }, { merge: true });
      } else if (event.type === 'customer.subscription.deleted') {
        transaction.set(entitlementRef, {
          ...common,
          status: 'cancelled', subscriptionId: object.id, currentPeriodEnd: null,
        }, { merge: true });
      } else if (event.type === 'invoice.payment_failed' || event.type === 'invoice.payment_action_required') {
        if (currentEntitlement.status !== 'cancelled') {
          transaction.set(entitlementRef, {
            ...common,
            status: event.type === 'invoice.payment_failed' ? 'past_due' : 'payment_action_required',
            lastInvoiceId: object.id || null,
          }, { merge: true });
        }
      } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
        transaction.set(entitlementRef, {
          ...common,
          ...(currentEntitlement.status === 'past_due' || currentEntitlement.status === 'payment_action_required'
            ? { status: 'active' }
            : {}),
          lastInvoiceId: object.id || null,
          lastPaymentAt: eventCreatedAt,
        }, { merge: true });
      }
    });
    return res.json({ received: true });
  } catch (error) {
    console.error('[Billing] webhook rejected:', error);
    return res.status(400).json({ error: 'Webhook doğrulanamadı.' });
  }
});

export default billingWebhookRoutes;
