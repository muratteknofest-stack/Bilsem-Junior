import React, { useId, useState } from 'react';
import { Check, Clock3, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { PLAY_PLANS, type PlayPlanId } from '../lib/google-play-contract';
import { canBuyPlay, type PlayBillingState } from '../lib/google-play-flow';
interface Props { studentName?: string; state: PlayBillingState; onPurchase(plan: PlayPlanId): void; onRestore(): void; onRefresh(): void; }
export function PlayBillingPanel({ state, studentName, onPurchase, onRestore, onRefresh }: Props) {
  const [selected, setSelected] = useState<PlayPlanId>('monthly'), radioName = useId();
  const { config, phase, notice, fresh, pending, otherStudent } = state;
  const busy = phase !== 'idle', active = config?.access.active === true && fresh;
  const selectedPlan = PLAY_PLANS.find(p => p.id === selected)!;
  const selectedOffer = state.offers.find(o => o.basePlanId === selected);
  const canPurchase = canBuyPlay(state, selected);
  const date = config?.access.expiresAt ? new Date(config.access.expiresAt).toLocaleDateString('tr-TR') : null;
  const phaseText = { loading: 'Bilgiler yükleniyor', idle: '', refreshing: 'Bilgiler yenileniyor', restoring: 'Satın alımlar kontrol ediliyor', opening: 'Google Play açılıyor', verifying: 'Ödeme doğrulanıyor' }[phase];
  const tone = notice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : notice.kind === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-950' : notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-slate-50 text-slate-700';
  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label="Google Play aboneliği" aria-busy={busy}>
    <div className="relative overflow-hidden bg-slate-900 px-5 py-6 text-white sm:px-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-400/10" aria-hidden="true" />
      <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-emerald-200"><ShieldCheck size={15} aria-hidden="true"/>Google Play üzerinden</span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Birlikte daha fazlasını keşfedin</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">Konu testleri, adaptif çalışma ve çocuğunuzun gelişimini izleyebileceğiniz veli paneli.</p></div>
    </div>
    <div className="space-y-5 p-5 sm:p-6">
      {studentName && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Seçili öğrenci <strong className="ml-1 break-words text-slate-900">{studentName}</strong></p>}
      {active ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <p className="flex items-center gap-2 font-bold"><Check size={19} aria-hidden="true"/>Aboneliğiniz aktif</p>
        {date && <p className="mt-1 text-sm">{date} tarihine kadar erişim.</p>}
        <p className="mt-2 text-xs">{config.access.autoRenewing === false ? 'Otomatik yenileme kapalı. Kalan sürenizi kullanabilirsiniz.' : 'Aboneliğinizi ve yenileme ayarlarınızı Google Play’den yönetebilirsiniz.'}</p>
      </div> : config?.access.active && !fresh ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Son doğrulanan erişim{date ? `: ${date}` : ''}. Güncel durumu görmek için Yenile’ye dokunun.</p> : null}
      {pending && !active && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><Clock3 size={18} className="mt-0.5 shrink-0" aria-hidden="true"/>Bekleyen ödeme var. Google Play’deki işlem tamamlanınca erişiminiz güncellenecek.</p>}
      {!active && !pending && !otherStudent && <>
        <fieldset disabled={busy || !config?.ready || !fresh || !state.storeChecked}>
          <legend className="mb-3 text-sm font-bold text-slate-800">Abonelik döneminizi seçin</legend>
          <div className="grid gap-3">{PLAY_PLANS.map(plan => {
            const offer = state.offers.find(o => o.basePlanId === plan.id), checked = plan.id === selected;
            return <label key={plan.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${checked && offer ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600' : 'border-slate-200 bg-white'} ${!offer ? 'cursor-not-allowed text-slate-500' : 'text-slate-900'}`}>
              <input type="radio" name={radioName} value={plan.id} checked={checked} disabled={!offer} onChange={() => setSelected(plan.id)} className="h-4 w-4 shrink-0 accent-emerald-700"/>
              <span className="min-w-0 flex-1"><strong className="block text-sm">{plan.title}</strong><span className="mt-1 block text-xs text-slate-600">{plan.renewal} yenilenir</span></span>
              <span className="max-w-[48%] break-words text-right text-sm font-bold">{offer?.price || (busy ? 'Yükleniyor…' : 'Şu anda sunulmuyor')}</span>
            </label>;
          })}</div>
        </fieldset>
        <div><button type="button" disabled={!canPurchase} onClick={() => onPurchase(selected)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
          {busy && <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true"/>}{busy ? phaseText : 'Google Play ile devam et'}
        </button>{canPurchase && selectedOffer && <p className="mt-2 text-center text-xs text-slate-600">{selectedPlan.title} · {selectedOffer.price} / {selectedPlan.title.toLocaleLowerCase('tr-TR')} dönem</p>}</div>
      </>}
      <div className={`rounded-xl border p-3 text-sm leading-relaxed ${tone}`} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}>{notice.text}</div>
      {config && !config.enforced && !active && <p className="text-sm text-slate-600">Mevcut ücretsiz kullanım devam ediyor.</p>}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button type="button" disabled={busy} onClick={onRefresh} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"><RefreshCw size={15} aria-hidden="true"/>Yenile</button>
        <button type="button" disabled={busy || !config?.binding} onClick={onRestore} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Satın alımları geri yükle</button>
        <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-700 underline underline-offset-4">Aboneliği yönet / iptal et<ExternalLink size={13} aria-hidden="true"/></a>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Ödeme Google Play hesabınızdan alınır. Abonelik, iptal edilmedikçe seçtiğiniz dönem ve Google Play’de gösterilen fiyatla otomatik yenilenir. İptalden sonra ödediğiniz sürenin sonuna kadar kullanabilirsiniz. Her Google Play hesabı aynı anda bir öğrenci için abonelik kullanabilir; erişim seçtiğiniz öğrenciye bağlıdır.</p>
    </div>
  </section>;
}
