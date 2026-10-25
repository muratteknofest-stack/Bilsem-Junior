import React, { lazy, Suspense, useState } from 'react';
import { ArrowRight, GraduationCap, Heart, Sparkles } from 'lucide-react';
import type { UserRole } from '../../types';
import { Logo } from '../Logo';
import { LegalLinks } from '../LegalLinks';
import { useAndroidBack } from '../../hooks/useAndroidBack';
import { useEntryViewport } from '../../hooks/useEntryViewport';
import './android-entry.css';

const Discovery = lazy(() => import('../LandingPage').then(module => ({ default: module.LandingPage })));
interface Props {
  onNavigateToLogin: (role: UserRole) => void;
  onNavigate: (route: string) => void;
}

/** App entry deliberately loads the question engine only when an example is opened. */
export function AndroidWelcome({ onNavigateToLogin, onNavigate }: Props) {
  const [discovery, setDiscovery] = useState(false);
  const viewport = useEntryViewport(!discovery);
  useAndroidBack(() => setDiscovery(false), discovery);
  if (discovery) return <Suspense fallback={<p role="status">Örnek soru hazırlanıyor…</p>}>
    <Discovery demoOnly onCloseDemo={() => setDiscovery(false)} onNavigateToLogin={onNavigateToLogin} onNavigate={onNavigate} />
  </Suspense>;
  return <div ref={viewport} className="bj-welcome">
    <header><Logo size="sm" showTagline={false} /><span>1–4. sınıf</span></header>
    <main>
      <div className="bj-welcome-art" aria-hidden="true"><span>✦</span><img src="/brand/junior-fox-mission.svg" alt="" width="190" height="190" /><i>✦</i></div>
      <div className="bj-welcome-copy"><p>BİLSEM HAZIRLIK</p><h1>Küçük adımlar,<br /><span>büyük keşifler.</span></h1><p>Düşün, oyna, her gün bir adım ilerle.</p></div>
      <div className="bj-welcome-actions">
        <button type="button" className="bj-welcome-student" onClick={() => onNavigateToLogin('student')}><GraduationCap size={24} aria-hidden="true" /><span>Öğrenci girişi<small>Macerana devam et</small></span><ArrowRight size={20} aria-hidden="true" /></button>
        <button type="button" className="bj-welcome-parent" onClick={() => onNavigateToLogin('parent')}><Heart size={23} aria-hidden="true" /><span>Veli girişi<small>Gelişimini birlikte takip edin</small></span><ArrowRight size={20} aria-hidden="true" /></button>
        <button type="button" className="bj-welcome-register" onClick={() => onNavigate('register')}>Yeni aile hesabı oluştur <ArrowRight size={18} aria-hidden="true" /></button>
        <button type="button" className="bj-welcome-try" onClick={() => setDiscovery(true)}><Sparkles size={18} aria-hidden="true" /> Hesap açmadan bir soru dene</button>
      </div>
    </main>
    <footer><LegalLinks mode="entry"/></footer>
  </div>;
}
