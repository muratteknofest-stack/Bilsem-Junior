import React, { useId, useState } from 'react';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock3, Crown, ExternalLink, Gift, LoaderCircle, LockKeyhole, RefreshCw, Rocket, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { PLAY_PLANS, type PlayPlanId } from '../lib/google-play-contract';
import { canBuyPlay, type PlayBillingState } from '../lib/google-play-flow';
interface Props { studentName?: string; state: PlayBillingState; onPurchase(plan: PlayPlanId): void; onRestore(): void; onRefresh(): void; }
const PLAN_ART: Record<PlayPlanId, { image: string; caption: string }> = {
  monthly: { image: '/images/membership/monthly-robot.webp', caption: 'Küçük adımlar, yeni keşifler' },
  quarterly: { image: '/images/membership/quarterly-robot.webp', caption: 'Keşif yolculuğuna devam' },
  annual: { image: '/images/membership/annual-robot.webp', caption: 'Bir yıl boyunca keşif' },
};
export function PlayBillingPanel({ state, studentName, onPurchase, onRestore, onRefresh }: Props) {
  const [selected, setSelected] = useState<PlayPlanId>('monthly'), radioName = useId();
  const { config, phase, notice, fresh, pending, otherStudent } = state;
  const busy = phase !== 'idle', active = config?.access.active === true && fresh;
  const selectedPlan = PLAY_PLANS.find(p => p.id === selected)!;
  const selectedOffer = state.offers.find(o => o.basePlanId === selected);
  const canPurchase = canBuyPlay(state, selected);
  const date = config?.access.expiresAt ? new Date(config.access.expiresAt).toLocaleDateString('tr-TR') : null;
  const phaseText = { loading: 'Bilgiler yükleniyor', idle: '', refreshing: 'Bilgiler yenileniyor', restoring: 'Satın alımlar kontrol ediliyor', opening: 'Google Play açılıyor', verifying: 'Ödeme doğrulanıyor' }[phase];
  const displayNotice = /API uç noktası bulunamadı/i.test(notice.text)
    ? 'Üyelik bilgileri şu anda yüklenemiyor. Biraz sonra Yenile’ye dokunarak tekrar deneyebilirsiniz.' : notice.text;
  const NoticeIcon = notice.kind === 'error' ? AlertCircle : notice.kind === 'success' ? CheckCircle2 : notice.kind === 'warning' ? Clock3 : Sparkles;
  return <section className="zp-play-billing" aria-label="Google Play aboneliği" aria-busy={busy}>
    <div className="zp-play-hero">
      <span className="zp-play-hero-sticker" aria-hidden="true"><Rocket size={38}/><Sparkles size={20}/></span>
      <div className="zp-play-hero-copy"><span className="zp-play-provider"><ShieldCheck size={15} aria-hidden="true"/>Google Play üzerinden</span>
        <h2>Birlikte daha fazlasını keşfedin</h2>
        <p>Konu testleri, adaptif çalışma ve çocuğunuzun gelişimini izleyebileceğiniz veli paneli.</p></div>
    </div>
    <div className="zp-play-body">
      {studentName && <p className="zp-play-student"><span aria-hidden="true"><Gift size={17}/></span><span>Seçili öğrenci <strong>{studentName}</strong></span></p>}
      {active ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <p className="flex items-center gap-2 font-bold"><Check size={19} aria-hidden="true"/>Aboneliğiniz aktif</p>
        {date && <p className="mt-1 text-sm">{date} tarihine kadar erişim.</p>}
        <p className="mt-2 text-xs">{config.access.autoRenewing === false ? 'Otomatik yenileme kapalı. Kalan sürenizi kullanabilirsiniz.' : 'Aboneliğinizi ve yenileme ayarlarınızı Google Play’den yönetebilirsiniz.'}</p>
      </div> : config?.access.active && !fresh ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Son doğrulanan erişim{date ? `: ${date}` : ''}. Güncel durumu görmek için Yenile’ye dokunun.</p> : null}
      {pending && !active && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><Clock3 size={18} className="mt-0.5 shrink-0" aria-hidden="true"/>Bekleyen ödeme var. Google Play’deki işlem tamamlanınca erişiminiz güncellenecek.</p>}
      {!active && !pending && !otherStudent && <>
        <fieldset className="zp-play-plans" disabled={busy || !config?.ready || !fresh || !state.storeChecked}>
          <legend><Crown size={19} aria-hidden="true"/>Abonelik döneminizi seçin</legend>
          <div className="zp-play-plan-list">{PLAY_PLANS.map(plan => {
            const offer = state.offers.find(o => o.basePlanId === plan.id), checked = plan.id === selected;
            const { image, caption } = PLAN_ART[plan.id];
            return <label key={plan.id} className="zp-play-plan" data-plan={plan.id} data-selected={checked && !!offer} data-unavailable={!offer}>
              <img className="zp-play-plan-art" src={image} alt="" width={1536} height={1024} decoding="async"/>
              <span className="zp-play-plan-details">
              <input type="radio" name={radioName} value={plan.id} checked={checked} disabled={!offer} onChange={() => setSelected(plan.id)}/>
              <span className="zp-play-plan-copy"><strong>{plan.title}</strong><span className="zp-play-plan-caption">{caption}</span><span className="zp-play-plan-renewal">{plan.renewal} yenilenir</span></span>
              <span className="zp-play-plan-price">{offer ? <>{offer.price}<span>{checked ? 'Seçili dönem' : 'Dönemi seç'}</span></> : <><LockKeyhole size={13} aria-hidden="true"/>{busy ? 'Yükleniyor…' : 'Şu anda sunulmuyor'}</>}</span>
              </span>
              {checked && offer && <CheckCircle2 className="zp-play-plan-check" size={20} aria-hidden="true"/>}
            </label>;
          })}</div>
        </fieldset>
        <div className="zp-play-checkout"><button type="button" disabled={!canPurchase} onClick={() => onPurchase(selected)} className="zp-play-buy">
          {busy ? <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true"/> : canPurchase ? <ShieldCheck size={22} aria-hidden="true"/> : <LockKeyhole size={20} aria-hidden="true"/>}
          <span>{busy ? phaseText : 'Google Play ile devam et'}</span>{!busy && canPurchase && <ArrowRight size={19} aria-hidden="true"/>}
        </button>{canPurchase && selectedOffer ? <p>{selectedPlan.title} · {selectedOffer.price} / {selectedPlan.title.toLocaleLowerCase('tr-TR')} dönem</p> : !busy && <p>Üyelik bilgileri yüklendiğinde devam edebilirsiniz.</p>}</div>
      </>}
      <div className="zp-play-notice" data-tone={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}><NoticeIcon size={20} aria-hidden="true"/><span>{displayNotice}</span></div>
      {config && !config.enforced && !active && <p className="text-sm text-slate-600">Mevcut ücretsiz kullanım devam ediyor.</p>}
      <div className="zp-play-recovery">
        <button type="button" disabled={busy} onClick={onRefresh} className="zp-play-refresh"><RefreshCw size={18} aria-hidden="true"/>Yenile</button>
        <button type="button" disabled={busy || !config?.binding} onClick={onRestore} className="zp-play-restore"><RotateCcw size={18} aria-hidden="true"/>Satın alımları geri yükle</button>
        <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer">Aboneliği yönet / iptal et<ExternalLink size={14} aria-hidden="true"/></a>
      </div>
      <p className="zp-play-terms">Ödeme Google Play hesabınızdan alınır. Abonelik, iptal edilmedikçe seçtiğiniz dönem ve Google Play’de gösterilen fiyatla otomatik yenilenir. İptalden sonra ödediğiniz sürenin sonuna kadar kullanabilirsiniz. Her Google Play hesabı aynı anda bir öğrenci için abonelik kullanabilir; erişim seçtiğiniz öğrenciye bağlıdır.</p>
    </div>
  </section>;
}
