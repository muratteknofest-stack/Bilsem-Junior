import React, { useId, useState } from 'react';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock3, Crown, ExternalLink, Gift, LoaderCircle, LockKeyhole, RefreshCw, Rocket, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { PLAY_PLANS, type PlayPlanId } from '../lib/google-play-contract';
import { canBuyPlay, type PlayBillingState } from '../lib/google-play-flow';
interface Props { studentName?: string; state: PlayBillingState; onPurchase(plan: PlayPlanId): void; onRestore(): void; onRefresh(): void; }
const PLAN_ART: Record<PlayPlanId, { image: string; caption: string; badge: string }> = {
  monthly: { image: '/images/membership/monthly-robot.webp', caption: 'Küçük adımlar, yeni keşifler', badge: 'İlk adım' },
  quarterly: { image: '/images/membership/quarterly-robot.webp', caption: 'Keşif yolculuğuna devam', badge: 'Yeni rotalar' },
  annual: { image: '/images/membership/annual-robot.webp', caption: 'Bir yıl boyunca keşif', badge: 'Büyük macera' },
};
export function PlayBillingPanel({ state, studentName, onPurchase, onRestore, onRefresh }: Props) {
  const [preferred, setPreferred] = useState<PlayPlanId>('monthly'), radioName = useId();
  const { config, phase, notice, fresh, pending, otherStudent } = state;
  const busy = phase !== 'idle', active = config?.access.active === true && fresh;
  // A region/account may only receive some plans. Never leave checkout pointing at an unavailable default.
  const available = PLAY_PLANS.filter(plan => state.offers.some(offer => offer.basePlanId === plan.id && offer.period === plan.period));
  const selected = available.some(plan => plan.id === preferred) ? preferred : available[0]?.id ?? preferred;
  const selectedPlan = PLAY_PLANS.find(plan => plan.id === selected)!;
  const selectedOffer = state.offers.find(offer => offer.basePlanId === selected && offer.period === selectedPlan.period);
  const canPurchase = canBuyPlay(state, selected);
  const date = config?.access.expiresAt ? new Date(config.access.expiresAt).toLocaleDateString('tr-TR') : null;
  const phaseText = { loading: 'Bilgiler yükleniyor', idle: '', refreshing: 'Bilgiler yenileniyor', restoring: 'Satın alımlar kontrol ediliyor', opening: 'Google Play açılıyor', verifying: 'Ödeme doğrulanıyor' }[phase];
  const displayNotice = /API uç noktası bulunamadı/i.test(notice.text)
    ? 'Üyelik bilgileri şu anda yüklenemiyor. Biraz sonra Yenile’ye dokunarak tekrar deneyebilirsiniz.' : notice.text;
  const NoticeIcon = notice.kind === 'error' ? AlertCircle : notice.kind === 'success' ? CheckCircle2 : notice.kind === 'warning' ? Clock3 : Sparkles;
  return <section className="zp-play-billing" data-phase={phase} data-active={active} aria-label="Google Play aboneliği" aria-busy={busy}>
    <div className="zp-play-hero">
      <div className="zp-play-hero-sparks" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>
      <span className="zp-play-hero-sticker" aria-hidden="true"><Rocket size={38}/><Sparkles size={20}/></span>
      <div className="zp-play-hero-copy"><span className="zp-play-provider"><ShieldCheck size={15} aria-hidden="true"/>Google Play üzerinden</span>
        <h2>Keşif yolculuğunuz büyüsün!</h2>
        <p>Renkli sorular, yeni düşünme yolları ve birlikte takip edebileceğiniz gelişim.</p></div>
      <div className="zp-play-perks"><span><Sparkles size={14} aria-hidden="true"/>Konu testleri</span><span><Rocket size={14} aria-hidden="true"/>Adaptif çalışma</span><span><Crown size={14} aria-hidden="true"/>Veli takibi</span></div>
    </div>
    <div className="zp-play-body">
      {studentName && <p className="zp-play-student"><span aria-hidden="true"><Gift size={20}/></span><span>Bu macera <strong>{studentName} için</strong></span><span className="zp-play-student-tag">Öğrenciye özel</span></p>}
      <ol className="zp-play-journey" aria-label="Abonelik adımları">
        <li data-done={!!config?.binding}><span>{config?.binding ? <Check size={14} aria-hidden="true"/> : '1'}</span>Öğrenci</li>
        <li data-current={!active && phase !== 'opening' && phase !== 'verifying'} data-done={active}><span>{active ? <Check size={14} aria-hidden="true"/> : '2'}</span>Dönem</li>
        <li data-current={phase === 'opening' || phase === 'verifying'} data-done={active}><span>{active ? <Check size={14} aria-hidden="true"/> : '3'}</span>Google Play</li>
      </ol>
      {busy && <p className="zp-play-busy" role="status"><LoaderCircle size={18} aria-hidden="true"/>{phaseText}…</p>}
      {active ? <div className="zp-play-active">
        <span className="zp-play-active-medal" aria-hidden="true"><Crown size={30}/></span><div><p><CheckCircle2 size={19} aria-hidden="true"/>Aboneliğiniz aktif</p>
        {date && <p>{date} tarihine kadar erişim.</p>}
        <small>{config.access.autoRenewing === false ? 'Otomatik yenileme kapalı. Kalan sürenizi kullanabilirsiniz.' : 'Aboneliğinizi ve yenileme ayarlarınızı Google Play’den yönetebilirsiniz.'}</small></div>
      </div> : config?.access.active && !fresh ? <p className="zp-play-state-note">Son doğrulanan erişim{date ? `: ${date}` : ''}. Güncel durumu görmek için Yenile’ye dokunun.</p> : null}
      {pending && !active && <p className="zp-play-state-note"><Clock3 size={20} aria-hidden="true"/>Bekleyen ödeme var. Google Play’deki işlem tamamlanınca erişiminiz güncellenecek.</p>}
      {!active && !pending && !otherStudent && <>
        <fieldset className="zp-play-plans" disabled={busy || !config?.ready || !fresh || !state.storeChecked}>
          <legend><Crown size={19} aria-hidden="true"/>Size uygun dönemi seçin</legend>
          <div className="zp-play-plan-list">{PLAY_PLANS.map(plan => {
            const offer = state.offers.find(item => item.basePlanId === plan.id && item.period === plan.period), checked = plan.id === selected;
            const { image, caption, badge } = PLAN_ART[plan.id];
            return <label key={plan.id} className="zp-play-plan" data-plan={plan.id} data-selected={checked && !!offer} data-unavailable={!offer}>
              <img className="zp-play-plan-art" src={image} alt="" width={1536} height={1024} decoding="async"/>
              <span className="zp-play-plan-details">
                <input type="radio" name={radioName} value={plan.id} checked={checked} disabled={!offer} onChange={() => setPreferred(plan.id)}/>
                <span className="zp-play-plan-copy"><span className="zp-play-plan-badge">{badge}</span><strong>{plan.title}</strong><span className="zp-play-plan-caption">{caption}</span><span className="zp-play-plan-renewal">{plan.renewal} otomatik yenilenir</span></span>
                <span className="zp-play-plan-price">{offer ? <>{offer.price}<span>{checked ? 'Seçili dönem' : 'Dönemi seç'}</span></> : <><LockKeyhole size={13} aria-hidden="true"/>{busy ? 'Yükleniyor…' : 'Şu anda sunulmuyor'}</>}</span>
              </span>
              {checked && offer && <CheckCircle2 className="zp-play-plan-check" size={20} aria-hidden="true"/>}
            </label>;
          })}</div>
        </fieldset>
        <div className="zp-play-checkout"><button type="button" disabled={!canPurchase} onClick={() => onPurchase(selected)} className="zp-play-buy">
          {busy ? <LoaderCircle size={20} aria-hidden="true"/> : canPurchase ? <ShieldCheck size={22} aria-hidden="true"/> : <LockKeyhole size={20} aria-hidden="true"/>}
          <span>{busy ? phaseText : 'Google Play ile devam et'}</span>{!busy && canPurchase && <ArrowRight size={19} aria-hidden="true"/>}
        </button>{canPurchase && selectedOffer ? <p>{selectedPlan.title} · {selectedOffer.price} · {selectedPlan.renewal} otomatik yenilenir</p> : !busy && <p>{config && !config.ready ? 'Abonelik satışı henüz açık değil.' : !fresh ? 'Bilgileri tekrar yüklemek için Yenile’ye dokunun.' : !state.storeChecked ? 'Önce mevcut satın alımları geri yükleyerek kontrol edin.' : 'Bu hesap için şu anda satın alınabilir dönem yok.'}</p>}</div>
      </>}
      <div className="zp-play-notice" data-tone={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}><NoticeIcon size={20} aria-hidden="true"/><span>{displayNotice}</span></div>
      {config && !config.enforced && !active && <p className="zp-play-free">Mevcut ücretsiz kullanım devam ediyor.</p>}
      <div className="zp-play-recovery">
        <button type="button" disabled={busy} onClick={onRefresh} className="zp-play-refresh"><RefreshCw size={18} aria-hidden="true"/>Yenile</button>
        <button type="button" disabled={busy || !config?.binding} onClick={onRestore} className="zp-play-restore"><RotateCcw size={18} aria-hidden="true"/>Satın alımları geri yükle</button>
        <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer">Aboneliği yönet / iptal et<ExternalLink size={14} aria-hidden="true"/></a>
      </div>
      <p className="zp-play-terms">Ödeme Google Play hesabınızdan alınır. Abonelik, iptal edilmedikçe seçtiğiniz dönem ve Google Play’de gösterilen fiyatla otomatik yenilenir. İptalden sonra ödediğiniz sürenin sonuna kadar kullanabilirsiniz. Her Google Play hesabı aynı anda bir öğrenci için abonelik kullanabilir; erişim seçtiğiniz öğrenciye bağlıdır.</p>
    </div>
  </section>;
}
