import React, { lazy, Suspense, useState } from 'react';
import { FREE_MEMBERSHIP } from '../lib/membership-plan';
import { CheckCircle2, Crown, ExternalLink, RefreshCw, Rocket, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import type { PlayBillingState } from '../lib/google-play-flow';
import { PLAY_PLANS } from '../lib/google-play-contract';
import { safePlayStoreUrl } from '../lib/play-listing';

const AppHandoffBridgeModal = lazy(() => import('./auth/AppHandoffBridgeModal').then(m => ({ default: m.AppHandoffBridgeModal })));

export function WebPlayMembershipPanel({ state, studentName, onRefresh }: {
  state: PlayBillingState; studentName?: string; onRefresh(): void;
}) {
  const { config, fresh, phase, notice } = state;
  const busy = phase !== 'idle';
  const lifetime = fresh && config?.lifetime === true;
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const active = fresh && config?.access.active === true;
  const storeUrl = safePlayStoreUrl(config?.storeUrl) ? config.storeUrl : null;
  return <section className="zp-play-billing zp-play-web" aria-label="Google Play aboneliği" aria-busy={busy}>
    {showHandoffModal && (
      <Suspense fallback={null}>
        <AppHandoffBridgeModal
          isOpen={showHandoffModal}
          onClose={() => setShowHandoffModal(false)}
          studentName={studentName}
        />
      </Suspense>
    )}
    <div className="zp-play-hero"><div className="zp-play-hero-sparks" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div><span className="zp-play-hero-sticker" aria-hidden="true"><Rocket size={38}/><Sparkles size={20}/></span>
      <div className="zp-play-hero-copy"><span className="zp-play-provider"><ShieldCheck size={15} aria-hidden="true"/>{lifetime ? 'Bilsem Junior üyeliği' : 'Google Play üyeliği'}</span><h2>Bir üyelik, iki keşif alanı!</h2><p>Android’de başlayın, aynı öğrencinin hesabıyla webde de devam edin.</p></div>
      <div className="zp-play-perks"><span><Smartphone size={14} aria-hidden="true"/>Android</span><span><Sparkles size={14} aria-hidden="true"/>Web</span><span><Crown size={14} aria-hidden="true"/>Veli takibi</span></div>
    </div>
    <div className="zp-play-body">
      {config && !lifetime && !active && <div className="zp-play-state-note"><div><strong>Ücretsiz keşif üyeliği</strong><p>{FREE_MEMBERSHIP.summary}</p><p>{FREE_MEMBERSHIP.premium}</p></div></div>}
      {studentName && <p className="zp-play-student"><span aria-hidden="true"><Crown size={19}/></span><span>Seçili öğrenci<strong>{studentName}</strong></span></p>}
      {lifetime ? <div className="zp-play-active"><span className="zp-play-active-medal" aria-hidden="true"><Crown size={28}/></span><div><p><CheckCircle2 size={18} aria-hidden="true"/>Süresiz üyeliğiniz aktif</p><p>Mevcut hesabınıza tam erişim hediye edildi. Web ve Android’de tüm çalışmalar açık; bu hak için bitiş tarihi veya yenileme ödemesi yok.</p><small>Varsa önceki Google Play aboneliğinizi ayrıca yönetebilirsiniz.</small></div></div> : active ? <div className="zp-play-active"><span className="zp-play-active-medal" aria-hidden="true"><Crown size={28}/></span><div><p><CheckCircle2 size={18} aria-hidden="true"/>Aboneliğiniz aktif</p><p>{new Date(config.access.expiresAt!).toLocaleDateString('tr-TR')} tarihine kadar bu öğrenci hesabıyla webden de çalışabilirsiniz.</p></div></div>
        : <><p className="zp-play-web-copy">Satın alma yalnızca Android uygulamasındaki veli panelinde Google Play ile tamamlanır. Aynı Bilsem Junior veli hesabına girip aynı öğrenciyi seçin. Doğrulanan abonelik bu öğrenci için webde de geçerlidir.</p>
          <div className="zp-play-web-periods" aria-label="Abonelik dönemleri">{PLAY_PLANS.map(plan => <span key={plan.id}>{plan.title}</span>)}</div>
          <p className="zp-play-terms">Fiyat ve yenileme koşulları ödeme öncesinde Google Play’de gösterilir. Üyelik iptal edilmedikçe seçilen dönemde otomatik yenilenir.</p>
          {storeUrl ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowHandoffModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
              >
                <Smartphone size={18} aria-hidden="true"/>
                Android Uygulamasını Aç / İndir (Otomatik Giriş)
              </button>
              <a
                href={storeUrl}
                onClick={(e) => { e.preventDefault(); setShowHandoffModal(true); }}
                target="_blank"
                rel="noopener noreferrer"
                className="zp-play-web-link text-xs text-center justify-center opacity-85 hover:opacity-100"
              >
                Android uygulamasını Google Play’de aç<ExternalLink size={14} aria-hidden="true"/>
              </a>
            </div>
          ) : <p className="zp-play-state-note">Android uygulaması henüz Google Play’de yayımlanmadı. Yeni abonelik satışı şu anda açık değil.</p>}</>}
      <div className="zp-play-notice" data-tone={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</div>
      <div className="zp-play-recovery"><button type="button" onClick={onRefresh} disabled={busy} className="zp-play-refresh"><RefreshCw size={17} aria-hidden="true"/>{busy ? 'Kontrol ediliyor…' : 'Üyelik durumunu yenile'}</button>
        <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer">Aboneliği yönet / iptal et<ExternalLink size={14} aria-hidden="true"/></a></div>
    </div>
  </section>;
}
