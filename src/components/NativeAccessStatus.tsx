import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { authenticatedFetch } from '../lib/api-client';
import { auth } from '../lib/supabase';
import { withRequestDeadline } from '../lib/request-deadline';
import { PLAY_PLANS, type PlayAccess, type PlayOffer, type PlayPlanId } from '../lib/google-play-contract';
import { PlayBilling, type PlayPurchases } from '../lib/play-billing';
import { z } from 'zod';
const accessSchema = z.object({ active: z.boolean(), expiresAt: z.iso.datetime({ offset: true }).nullable(), state: z.string().optional(), autoRenewing: z.boolean().optional() });
const configSchema = z.object({ ready: z.boolean(), enforced: z.boolean(), productId: z.string().regex(/^[a-z0-9][a-z0-9_.]{0,99}$/),
  binding: z.object({ accountId: z.string().regex(/^[a-f0-9]{64}$/), profileId: z.string().regex(/^[a-f0-9]{64}$/) }).nullable(), access: accessSchema });
type Config = z.infer<typeof configSchema>;
export function NativeAccessStatus({ studentId }: { studentId: string }) {
  const owner = auth.currentUser?.uid, identity = `${owner}:${studentId}`;
  const current = useRef(identity); current.current = identity;
  const mounted = useRef(false), generation = useRef(0);
  const inflight = useRef(false), processing = useRef(new Set<string>());
  const [config, setConfig] = useState<Config | null>(null), [offers, setOffers] = useState<PlayOffer[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('Abonelik bilgisi yükleniyor…');
  const valid = useCallback(() => mounted.current && current.current === identity && auth.currentUser?.uid === owner, [identity, owner]);
  const request = useCallback(async (path: string, body?: unknown) => withRequestDeadline(async signal => {
    if (!valid()) throw Error('Hesap değişti.');
    const started = generation.current;
    const response = await authenticatedFetch('/api/parent/google-play/' + path, { signal, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw Error(typeof data.error === 'string' ? data.error : 'İşlem tamamlanamadı.');
    if (!valid() || started !== generation.current) throw Error('Hesap değişti.'); return data;
  }), [valid]);
  const load = useCallback(async () => {
    const value = configSchema.parse(await request('access?studentId=' + encodeURIComponent(studentId)));
    if (valid()) setConfig(value); return value;
  }, [request, studentId, valid]);
  const process = useCallback(async (result: PlayPurchases, value: Config, quiet = false) => {
    if (!valid()) return;
    if (result.cancelled) { setMessage('Satın alma iptal edildi.'); return; }
    let restored = 0, pending = false;
    for (const purchase of result.purchases) {
      if (!valid()) return;
      if (purchase.accountId !== value.binding?.accountId || purchase.profileId !== value.binding?.profileId) continue;
      if (purchase.state === 'pending') { pending = true; continue; }
      if (purchase.state !== 'purchased' || processing.current.has(purchase.token)) continue;
      processing.current.add(purchase.token);
      try {
        const data = await request('verify', { studentId, purchaseToken: purchase.token });
        const access: PlayAccess = accessSchema.parse(data.access);
        if (valid()) { setConfig(c => c ? { ...c, access } : c); restored += Number(access.active); }
      } finally { processing.current.delete(purchase.token); }
    }
    if (valid() && (!quiet || restored || pending)) setMessage(restored ? 'Google Play aboneliğiniz doğrulandı. İyi çalışmalar!' : pending
      ? 'Google Play ödemeniz beklemede. Ödeme tamamlanınca aboneliğiniz açılacak.'
      : 'Bu öğrenci ve Google hesabı için geri yüklenecek aktif satın alım bulunamadı.');
  }, [request, studentId, valid]);
  useEffect(() => {
    let stopped = false; mounted.current = true; generation.current += 1;
    const handles: Array<{ remove(): Promise<void> }> = [];
    const remember = (h: { remove(): Promise<void> }) => { if (stopped) void h.remove(); else handles.push(h); };
    const error = (e: unknown) => { if (!stopped && valid()) setMessage(e instanceof Error ? e.message : 'Google Play bağlantısı kurulamadı.'); };
    setConfig(null); setOffers([]); setMessage('Abonelik bilgisi yükleniyor…'); setBusy(false); inflight.current = false;
    void (async () => {
      const value = await load(); if (stopped || !valid()) return;
      setMessage(value.access.active ? 'Aboneliğinizi Google Play üzerinden yönetebilirsiniz.' : value.ready ? 'Öğrenciniz için bir abonelik seçin.' : 'Google Play abonelikleri henüz satışa açılmadı.');
      if (!Capacitor.isNativePlatform()) return;
      if (value.ready) {
        const catalog = await PlayBilling.catalog({ productId: value.productId });
        if (!stopped && valid()) setOffers(z.array(z.object({ basePlanId: z.enum(['monthly','quarterly','annual']), price: z.string().min(1).max(100), period: z.string() })).parse(catalog.offers)
          .filter(o => PLAY_PLANS.some(p => p.id === o.basePlanId && p.period === o.period)));
      }
      if (value.binding) { const result = await PlayBilling.restore(); if (!stopped) await process(result, value, true); }
    })().catch(error);
    if (Capacitor.isNativePlatform()) {
      void PlayBilling.addListener('purchasesUpdated', result => { void (async () => { const value = await load(); if (!stopped) await process(result, value); })().catch(error); }).then(remember).catch(error);
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && !inflight.current) void (async () => { const value = await load(); if (value.binding) { const result = await PlayBilling.restore(); if (!stopped) await process(result, value, true); } })().catch(error);
      }).then(remember).catch(error);
    }
    return () => { stopped = true; mounted.current = false; generation.current += 1; for (const handle of handles) void handle.remove(); };
  }, [load, process, valid]);
  const action = async (plan?: PlayPlanId) => {
    if (inflight.current || !config || !valid()) return;
    const started = generation.current;
    inflight.current = true; setBusy(true); setMessage(plan ? 'Google Play açılıyor…' : 'Satın alımlar kontrol ediliyor…');
    try {
      if (!Capacitor.isNativePlatform()) throw Error('Satın alma için Google Play’den yüklenen Android uygulamasını kullanın.');
      if (plan) {
        const prepared = z.object({ productId: z.string(), accountId: z.string(), profileId: z.string() }).parse(await request('prepare', { studentId }));
        const result = await PlayBilling.purchase({ ...prepared, basePlanId: plan });
        if (valid() && started === generation.current) await process(result, { ...config, binding: prepared });
      } else { const value = await load(), result = await PlayBilling.restore(); if (valid() && started === generation.current) await process(result, value); }
    } catch (e) { if (valid() && started === generation.current) setMessage(e instanceof Error ? e.message : 'Satın alım doğrulanamadı. Geri yüklemeyi deneyin.'); }
    finally { if (valid() && started === generation.current) { inflight.current = false; setBusy(false); } }
  };
  const active = config?.access.active, expiry = config?.access.expiresAt;
  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label="Google Play aboneliği" aria-busy={busy}>
    <div className="bg-slate-900 p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">ZekaPark üyelik</p><h2 className="mt-2 text-2xl font-bold">Keşfetmeye devam et</h2>
      <p className="mt-2 text-sm text-slate-200">Tüm sınıf düzeylerinde konu testleri, adaptif çalışma ve veli takibi.</p></div>
    <div className="space-y-4 p-5">
      {active && <p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-900">Abonelik aktif{expiry ? ` · ${new Date(expiry).toLocaleDateString('tr-TR')} tarihine kadar` : ''}{config.access.autoRenewing === false ? ' · Otomatik yenileme kapalı' : ''}</p>}
      {!active && <div className="grid gap-3">{PLAY_PLANS.map(plan => {
        const offer = offers.find(o => o.basePlanId === plan.id);
        return <button key={plan.id} type="button" disabled={busy || !config?.ready || !offer} onClick={() => void action(plan.id)} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
          <span><strong className="block">{plan.title}</strong><span className="text-xs text-slate-500">Otomatik yenilenir · {plan.renewal}</span></span><span className="font-bold text-slate-900">{offer?.price || 'Şu anda sunulmuyor'}</span>
        </button>;
      })}</div>}
      <p role="status" className="text-sm text-slate-600">{message}</p>
      {config && !config.enforced && !active && <p className="text-sm text-slate-600">Mevcut ücretsiz kullanım devam ediyor.</p>}
      <p className="text-xs leading-relaxed text-slate-500">Her Google Play hesabı aynı anda bir öğrenci için abonelik kullanabilir. Abonelik seçilen öğrenciye bağlıdır. Ödeme Google Play hesabınızdan alınır. İptal etmediğiniz sürece seçtiğiniz dönem ve Google Play’de gösterilen fiyatla otomatik yenilenir. İptal sonrası ödediğiniz sürenin sonuna kadar kullanabilirsiniz.</p>
      <div className="flex flex-wrap gap-4 text-sm font-semibold"><button type="button" disabled={busy || !config?.binding} onClick={() => void action()} className="text-slate-800 underline disabled:opacity-50">Satın alımları geri yükle</button>
        <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" className="text-slate-800 underline">Aboneliği yönet / iptal et</a></div>
    </div>
  </section>;
}
