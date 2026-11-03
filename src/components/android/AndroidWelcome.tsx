import React, { lazy, Suspense, useState } from 'react';
import { ArrowRight, GraduationCap, Heart, Sparkles, UserPlus } from 'lucide-react';
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
      <div className="bj-welcome-hero"><img src="/brand/junior-fox-mission.svg" alt="" width="88" height="88" /><div><h1>Keşfe hazır mısın?</h1><p>Giriş yap, birlikte başlayalım.</p></div></div>
      <div className="bj-welcome-actions">
        <button type="button" className="bj-welcome-student" onClick={() => onNavigateToLogin('student')}><GraduationCap size={24} aria-hidden="true" /><span>Öğrenci girişi</span><ArrowRight size={20} aria-hidden="true" /></button>
        <button type="button" className="bj-welcome-parent" onClick={() => onNavigateToLogin('parent')}><Heart size={23} aria-hidden="true" /><span>Veli girişi</span><ArrowRight size={20} aria-hidden="true" /></button>
      </div>
      <nav className="bj-welcome-secondary" aria-label="Diğer seçenekler">
        <button type="button" aria-label="Yeni aile hesabı oluştur" onClick={() => onNavigate('register')}><UserPlus size={18} aria-hidden="true" /><span>Yeni hesap</span></button>
        <button type="button" aria-label="Hesap açmadan bir soru dene" onClick={() => setDiscovery(true)}><Sparkles size={18} aria-hidden="true" /><span>Bir soru dene</span></button>
      </nav>
    </main>
    <footer><LegalLinks mode="entry"/></footer>
  </div>;
}
