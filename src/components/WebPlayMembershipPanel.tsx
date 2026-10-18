import React from 'react';
import { Check, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import type { PlayBillingState } from '../lib/google-play-flow';
import { PLAY_PLANS } from '../lib/google-play-contract';
import { safePlayStoreUrl } from '../lib/play-listing';

export function WebPlayMembershipPanel({ state, studentName, onRefresh }: {
  state: PlayBillingState; studentName?: string; onRefresh(): void;
}) {
  const { config, fresh, phase, notice } = state;
  const busy = phase !== 'idle';
  const active = fresh && config?.access.active === true;
  const storeUrl = safePlayStoreUrl(config?.storeUrl) ? config.storeUrl : null;
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Google Play aboneliği" aria-busy={busy}>
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><Smartphone size={18} aria-hidden="true"/>Google Play üyeliği</span>
    <h2 className="mt-3 text-xl font-bold text-slate-900">Bir üyelik, web ve Android’de keşif</h2>
    {studentName && <p className="mt-3 break-words text-sm text-slate-600">Seçili öğrenci: <strong>{studentName}</strong></p>}
    {active ? <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-950"><p className="flex items-center gap-2 font-bold"><Check size={18} aria-hidden="true"/>Aboneliğiniz aktif</p><p className="mt-1 text-sm">{new Date(config.access.expiresAt!).toLocaleDateString('tr-TR')} tarihine kadar bu öğrenci hesabıyla webden de çalışabilirsiniz.</p></div>
      : <><p className="mt-4 text-sm leading-relaxed text-slate-600">Satın alma Android uygulamasındaki veli panelinde Google Play ile tamamlanır. Aynı ZekaPark veli hesabına girip aynı öğrenciyi seçin. Doğrulanan abonelik bu öğrenci için webde de geçerlidir.</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Abonelik dönemleri">{PLAY_PLANS.map(plan => <span key={plan.id} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900">{plan.title}</span>)}</div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Fiyat ve yenileme koşulları ödeme öncesinde Google Play’de gösterilir. Üyelik iptal edilmedikçe seçilen dönemde otomatik yenilenir.</p>
        {storeUrl ? <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">Android uygulamasını Google Play’de aç<ExternalLink size={15} aria-hidden="true"/></a>
          : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Android uygulaması henüz Google Play’de yayımlanmadı. Yeni abonelik satışı şu anda açık değil.</p>}</>}
    <p className="mt-4 text-sm text-slate-600" role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>
    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4"><button type="button" onClick={onRefresh} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} aria-hidden="true"/>{busy ? 'Kontrol ediliyor…' : 'Üyelik durumunu yenile'}</button>
      <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm underline">Aboneliği yönet / iptal et<ExternalLink size={13} aria-hidden="true"/></a></div>
  </section>;
}
