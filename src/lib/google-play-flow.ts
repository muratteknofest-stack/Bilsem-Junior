import { z } from 'zod';
import { PLAY_PLANS, type PlayOffer, type PlayPlanId } from './google-play-contract';
import { safePlayStoreUrl } from './play-listing';
import { withRequestDeadline } from './request-deadline';

export const playAccessSchema = z.object({ active: z.boolean(), expiresAt: z.iso.datetime({ offset: true }).nullable(), state: z.string().optional(), autoRenewing: z.boolean().optional() })
  .refine(v => !v.active || v.expiresAt !== null);
const bindingSchema = z.object({ accountId: z.string().regex(/^[a-f0-9]{64}$/), profileId: z.string().regex(/^[a-f0-9]{64}$/) });
const productId = z.string().regex(/^[a-z0-9][a-z0-9_.]{0,39}$/);
export const playConfigSchema = z.object({ ready: z.boolean(), enforced: z.boolean(), productId,
  binding: bindingSchema.nullable(), storeUrl: z.string().refine(safePlayStoreUrl).nullable().optional(), access: playAccessSchema }).refine(v => !v.ready || v.binding !== null);
const preparedSchema = bindingSchema.extend({ productId });
const purchaseSchema = z.object({ purchases: z.array(z.object({ token: z.string().min(8).max(4096), state: z.enum(['purchased','pending']),
  accountId: z.string().nullable(), profileId: z.string().nullable(), productIds: z.array(productId).min(1).max(20) })).max(50), cancelled: z.boolean().optional() });
const catalogSchema = z.object({ offers: z.array(z.object({ basePlanId: z.enum(['monthly','quarterly','annual']), price: z.string().trim().min(1).max(100), period: z.string() })).max(20) });
export type PlayConfig = z.infer<typeof playConfigSchema>;
/** Resolve a paused/unpaid subscription in Play, rather than starting a duplicate charge. */
export function playNeedsManagement(access: PlayConfig['access'] | undefined) {
  return !!access && ['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'].includes(access.state || '');
}
export function playStateGuidance(access: PlayConfig['access'] | undefined): string | null {
  switch (access?.state) {
    case 'SUBSCRIPTION_STATE_PENDING': return 'Ödeme Google Play’de bekliyor. Tamamlandığında satın alımları geri yükleyin.';
    case 'SUBSCRIPTION_STATE_ON_HOLD': return 'Ödeme sorunu nedeniyle aboneliğiniz askıda. Google Play’den ödeme yönteminizi güncelleyin, ardından Yenile’ye dokunun.';
    case 'SUBSCRIPTION_STATE_PAUSED': return 'Aboneliğiniz duraklatılmış. Devam etmek için Google Play’de aboneliğinizi yönetin.';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD': return 'Erişiminiz devam ediyor. Kesinti yaşamamak için Google Play’de ödeme yönteminizi kontrol edin.';
    default: return null;
  }
}
export type PlayNotice = { kind: 'info' | 'success' | 'warning' | 'error'; text: string };
export interface PlayBillingState {
  config: PlayConfig | null; offers: PlayOffer[]; phase: 'loading' | 'idle' | 'refreshing' | 'restoring' | 'opening' | 'verifying';
  notice: PlayNotice; fresh: boolean; storeChecked: boolean; pending: boolean; otherStudent: boolean;
}
export const initialPlayBillingState = (): PlayBillingState => ({ config: null, offers: [], phase: 'loading', notice: { kind: 'info', text: 'Abonelik bilgisi yükleniyor…' }, fresh: false, storeChecked: false, pending: false, otherStudent: false });
export interface PlayStore {
  catalog(options: { productId: string }): Promise<unknown>;
  restore(): Promise<unknown>;
  purchase(options: { productId: string; basePlanId: PlayPlanId; accountId: string; profileId: string }): Promise<unknown>;
}
interface Dependencies {
  studentId: string; native: boolean; isCurrent(): boolean; store: PlayStore;
  isOnline?(): boolean;
  request(path: string, body: unknown, signal: AbortSignal): Promise<unknown>;
  changed(state: PlayBillingState): void;
  deadlineMs?: number;
}
export function canBuyPlay(state: PlayBillingState, plan: PlayPlanId) {
  return state.phase === 'idle' && state.fresh && state.storeChecked && state.config?.ready === true && !state.config.access.active
    && !playNeedsManagement(state.config.access)
    && !state.pending && !state.otherStudent && state.offers.some(o => o.basePlanId === plan && PLAY_PLANS.some(p => p.id === plan && p.period === o.period));
}
/** One owner, one operation. Disposal aborts HTTP and ignores late native callbacks. */
export class PlayBillingFlow {
  private state = initialPlayBillingState();
  private alive = true;
  private lifetime = new AbortController();
  private running: Promise<void> | null = null;
  private queuedRefresh = false;
  constructor(private deps: Dependencies) {}
  snapshot = () => this.state;
  private current = () => this.alive && this.deps.isCurrent();
  private patch(patch: Partial<PlayBillingState>) { if (this.current()) { this.state = { ...this.state, ...patch }; this.deps.changed(this.state); } }
  private notice(kind: PlayNotice['kind'], text: string) { this.patch({ notice: { kind, text } }); }
  private async request(path: string, body?: unknown) {
    if (!this.current()) throw Error('Hesap değişti.');
    const result = await withRequestDeadline(async timeout => {
      const relay = new AbortController(), abort = () => relay.abort();
      timeout.addEventListener('abort', abort, { once: true }); this.lifetime.signal.addEventListener('abort', abort, { once: true });
      if (timeout.aborted || this.lifetime.signal.aborted) abort();
      try { return await this.deps.request(path, body, relay.signal); }
      finally { timeout.removeEventListener('abort', abort); this.lifetime.signal.removeEventListener('abort', abort); }
    }, this.deps.deadlineMs ?? 20000);
    if (!this.current()) throw Error('Hesap değişti.'); return result;
  }
  private run(phase: PlayBillingState['phase'], action: () => Promise<void>) {
    if (!this.current()) return Promise.resolve();
    if (this.running) return this.running;
    this.patch({ phase });
    this.running = action().catch(error => {
      if (!this.current()) return;
      this.notice('error', error instanceof z.ZodError ? 'Abonelik bilgisi doğrulanamadı. Yeniden deneyin.' : error instanceof Error ? error.message : 'İşlem tamamlanamadı. Yeniden deneyin.');
    }).finally(() => {
      this.running = null;
      if (!this.current()) return;
      this.patch({ phase: 'idle' });
      if (this.queuedRefresh) { this.queuedRefresh = false; void this.refresh(); }
    });
    return this.running;
  }
  private async load() {
    try {
      const value = playConfigSchema.parse(await this.request('access?studentId=' + encodeURIComponent(this.deps.studentId)));
      this.patch({ config: value, fresh: true }); return value;
    } catch (error) { this.patch({ fresh: false, offers: [], storeChecked: false }); throw error; }
  }
  private async loadCatalog(config: PlayConfig) {
    const catalog = catalogSchema.parse(await withRequestDeadline(() => this.deps.store.catalog({ productId: config.productId }), this.deps.deadlineMs ?? 20000));
    const seen = new Set<string>();
    this.patch({ offers: catalog.offers.filter(offer => {
      if (seen.has(offer.basePlanId) || !PLAY_PLANS.some(plan => plan.id === offer.basePlanId && plan.period === offer.period)) return false;
      seen.add(offer.basePlanId); return true;
    }) });
  }
  refresh = () => {
    if (this.running) { this.queuedRefresh = true; return this.running; }
    return this.run(this.state.config ? 'refreshing' : 'loading', async () => {
      this.patch({ offers: [], storeChecked: false });
      const config = await this.load(); if (!this.current()) return;
      const guidance = playStateGuidance(config.access);
      this.notice(guidance ? 'warning' : config.access.active ? 'success' : 'info', guidance || (config.access.active ? 'Aboneliğiniz doğrulandı.' : config.ready ? 'Döneminizi seçip Google Play ile devam edin.' : 'Google Play abonelikleri henüz satışa açılmadı.'));
      if (!this.deps.native) { if (!config.access.active) this.notice('info', 'Satın alma Android uygulamasındaki veli panelinde Google Play ile tamamlanır.'); return; }
      // Product availability and owned purchases are independent. A catalog outage
      // must never prevent an already-paid purchase from being restored.
      const results = await Promise.allSettled([
        (async () => {
          if (!config.ready || config.access.active) return;
          await this.loadCatalog(config);
        })(),
        (async () => {
          if (!config.binding) return;
          await this.process(await withRequestDeadline(() => this.deps.store.restore(), this.deps.deadlineMs ?? 20000), config, 'background');
        })(),
      ]);
      if (!this.current()) return;
      // A refund/expiry discovered during restore may make plans available again.
      if (config.ready && config.access.active && !this.state.config?.access.active) {
        try { await this.loadCatalog(config); }
        catch { this.notice('warning', 'Google Play fiyatları yüklenemedi. Paketler için Yenile’ye dokunun.'); return; }
      }
      if (results[1].status === 'rejected') this.notice('warning', 'Satın alımlar kontrol edilemedi. Yeni ödeme başlatmadan önce geri yüklemeyi deneyin.');
      else if (results[0].status === 'rejected' && !this.state.config?.access.active && !this.state.pending && !this.state.otherStudent)
        this.notice('warning', 'Google Play fiyatları yüklenemedi. Mevcut satın alımlar kontrol edildi; paketler için Yenile’ye dokunun.');
      else if (config.ready && !this.state.offers.length && !this.state.config?.access.active && !this.state.pending && !this.state.otherStudent && !playNeedsManagement(this.state.config?.access))
        this.notice('info', 'Bu Google Play hesabına sunulan paket bulunamadı. Yenile’yi deneyin.');
    });
  };
  private async process(raw: unknown, config: PlayConfig, context: 'purchase' | 'restore' | 'background') {
    if (!this.current()) return;
    const result = purchaseSchema.parse(raw);
    if (result.cancelled) { this.patch({ storeChecked: true }); this.notice('info', 'Satın alma iptal edildi.'); return; }
    const purchases = [...new Map(result.purchases.filter(p => p.productIds.includes(config.productId)).map(p => [p.token, p])).values()];
    const mine = purchases.filter(p => p.accountId === config.binding?.accountId && p.profileId === config.binding?.profileId);
    const pending = mine.some(p => p.state === 'pending'), otherStudent = purchases.some(p => !mine.includes(p));
    this.patch({ pending, otherStudent, storeChecked: true });
    let verifiedCount = 0, restored = 0;
    for (const purchase of mine) {
      if (!this.current()) return;
      if (purchase.state !== 'purchased') continue;
      this.patch({ phase: 'verifying' });
      try {
        const verified = z.object({ access: playAccessSchema }).parse(await this.request('verify', { studentId: this.deps.studentId, purchaseToken: purchase.token })).access;
        verifiedCount += 1; restored += Number(verified.active);
      } catch (error) { this.patch({ fresh: false, storeChecked: false }); throw error; }
    }
    if (!this.current()) return;
    // Re-read the server's aggregate: an old/expired restored token must neither
    // overwrite a valid token nor keep access that was just revoked.
    const latest = verifiedCount ? await this.load() : config;
    const access = latest.access;
    this.patch({ config: latest, fresh: true });
    const guidance = playStateGuidance(access);
    if (guidance) this.notice('warning', guidance);
    else if (restored && access.active) this.notice('success', 'Aboneliğiniz doğrulandı. İyi çalışmalar!');
    else if (pending) this.notice('warning', 'Ödemeniz Google Play’de beklemede. Tamamlandığında aboneliğiniz güncellenecek.');
    else if (otherStudent && !access.active) this.notice('warning', 'Bu Google hesabındaki abonelik başka bir öğrenci hesabına bağlı. İlgili öğrenci hesabından devam edin.');
    else if (context !== 'background') this.notice('info', context === 'purchase' ? 'Satın alım henüz doğrulanmadı. Satın alımları geri yükle ile kontrol edin.' : access.active ? 'Aboneliğiniz zaten aktif.' : 'Bu öğrenci için geri yüklenecek aktif satın alım bulunamadı.');
  }
  restore = () => this.run('restoring', async () => {
    this.notice('info', 'Satın alımlar kontrol ediliyor…');
    if (!this.deps.native) throw Error('Geri yükleme için Android uygulamasını kullanın.');
    const config = await this.load();
    if (!config.binding) throw Error('Google Play hesap bağlantısı henüz hazır değil.');
    await this.process(await withRequestDeadline(() => this.deps.store.restore(), this.deps.deadlineMs ?? 20000), config, 'restore');
    // Recovery after a catalog outage should expose real plans again without a second tap on Refresh.
    if (this.current() && config.ready && !this.state.config?.access.active && !this.state.pending && !this.state.otherStudent && !this.state.offers.length) {
      try { await this.loadCatalog(config); }
      catch { this.notice('warning', 'Satın alımlar kontrol edildi; fiyatlar yüklenemedi. Yenile’ye dokunarak tekrar deneyin.'); }
    }
  });
  purchase = (plan: PlayPlanId) => {
    if (!this.deps.native || !canBuyPlay(this.state, plan)) return Promise.resolve();
    if (this.deps.isOnline?.() === false) {
      this.notice('warning', 'Satın alma için internet bağlantınızı kontrol edin. Bağlandıktan sonra Yenile’ye dokunun.');
      return Promise.resolve();
    }
    return this.run('opening', async () => {
      this.notice('info', 'Google Play ödeme ekranı açılıyor…');
      const config = this.state.config!;
      const prepared = preparedSchema.parse(await this.request('prepare', { studentId: this.deps.studentId }));
      if (prepared.productId !== config.productId || prepared.accountId !== config.binding?.accountId || prepared.profileId !== config.binding?.profileId) throw Error('Satın alma hesap bağlantısı değişti. Yenile’yi deneyin.');
      if (!this.current()) return;
      if (this.deps.isOnline?.() === false) throw Error('Bağlantı kesildi. Google Play açılmadı. Bağlandıktan sonra Yenile’ye dokunun.');
      this.patch({ storeChecked: false });
      // Do not time out the user's interaction with Google's payment sheet.
      const result = await this.deps.store.purchase({ ...prepared, basePlanId: plan });
      if (this.current()) await this.process(result, config, 'purchase');
    });
  };
  purchasesUpdated = (_event: unknown) => { void this.refresh(); };
  dispose = () => { this.alive = false; this.queuedRefresh = false; this.lifetime.abort(); };
}

