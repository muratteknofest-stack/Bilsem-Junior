import React from 'react';
import { CheckCircle2, Crown, ExternalLink, RefreshCw, Rocket, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
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
  return <section className="zp-play-billing zp-play-web" aria-label="Google Play aboneliği" aria-busy={busy}>
    <div className="zp-play-hero"><div className="zp-play-hero-sparks" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div><span className="zp-play-hero-sticker" aria-hidden="true"><Rocket size={38}/><Sparkles size={20}/></span>
      <div className="zp-play-hero-copy"><span className="zp-play-provider"><ShieldCheck size={15} aria-hidden="true"/>Google Play üyeliği</span><h2>Bir üyelik, iki keşif alanı!</h2><p>Android’de başlayın, aynı öğrencinin hesabıyla webde de devam edin.</p></div>
      <div className="zp-play-perks"><span><Smartphone size={14} aria-hidden="true"/>Android</span><span><Sparkles size={14} aria-hidden="true"/>Web</span><span><Crown size={14} aria-hidden="true"/>Veli takibi</span></div>
    </div>
    <div className="zp-play-body">
      {studentName && <p className="zp-play-student"><span aria-hidden="true"><Crown size={19}/></span><span>Seçili öğrenci<strong>{studentName}</strong></span></p>}
      {active ? <div className="zp-play-active"><span className="zp-play-active-medal" aria-hidden="true"><Crown size={28}/></span><div><p><CheckCircle2 size={18} aria-hidden="true"/>Aboneliğiniz aktif</p><p>{new Date(config.access.expiresAt!).toLocaleDateString('tr-TR')} tarihine kadar bu öğrenci hesabıyla webden de çalışabilirsiniz.</p></div></div>
        : <><p className="zp-play-web-copy">Satın alma Android uygulamasındaki veli panelinde Google Play ile tamamlanır. Aynı Bilsem Junior veli hesabına girip aynı öğrenciyi seçin. Doğrulanan abonelik bu öğrenci için webde de geçerlidir.</p>
          <div className="zp-play-web-periods" aria-label="Abonelik dönemleri">{PLAY_PLANS.map(plan => <span key={plan.id}>{plan.title}</span>)}</div>
          <p className="zp-play-terms">Fiyat ve yenileme koşulları ödeme öncesinde Google Play’de gösterilir. Üyelik iptal edilmedikçe seçilen dönemde otomatik yenilenir.</p>
          {storeUrl ? <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="zp-play-web-link">Android uygulamasını Google Play’de aç<ExternalLink size={16} aria-hidden="true"/></a>
            : <p className="zp-play-state-note">Android uygulaması henüz Google Play’de yayımlanmadı. Yeni abonelik satışı şu anda açık değil.</p>}</>}
      <div className="zp-play-notice" data-tone={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</div>
      <div className="zp-play-recovery"><button type="button" onClick={onRefresh} disabled={busy} className="zp-play-refresh"><RefreshCw size={17} aria-hidden="true"/>{busy ? 'Kontrol ediliyor…' : 'Üyelik durumunu yenile'}</button>
        <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer">Aboneliği yönet / iptal et<ExternalLink size={14} aria-hidden="true"/></a></div>
    </div>
  </section>;
}
