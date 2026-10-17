import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, CircleHelp, Crown, GraduationCap, Home, Puzzle, ShieldCheck, Sparkles, UserPlus, Users, Volume2, VolumeX } from 'lucide-react';
import type { UserRole } from '../types';
import { Logo } from './Logo';
import { publicPageUrl } from '../lib/native-app';
import './native-home.css';
export type NativeHomeScreen = 'home' | 'demo' | 'help';
interface Props {
  screen: NativeHomeScreen;
  onScreen: (screen: NativeHomeScreen) => void;
  onLogin: (role: UserRole) => void;
  onRegister: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
  children?: React.ReactNode;
}
export function NativeHome({ screen, onScreen, onLogin, onRegister, soundActive, onToggleSound, children }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (screen !== 'home') title.current?.focus({ preventScroll: true });
  }, [screen]);
  useEffect(() => {
    if (screen === 'home') return;
    const back = (event: Event) => { if (document.querySelector('.zp-free-test')) return; event.preventDefault(); event.stopImmediatePropagation(); onScreen('home'); };
    window.addEventListener('zekapark:native-back', back, true);
    return () => window.removeEventListener('zekapark:native-back', back, true);
  }, [screen, onScreen]);
  return <div className="zp-native-home">
    <header className="zp-native-home-header">
      {screen === 'home' ? <Logo size="sm" showTagline={false} /> : <button type="button" className="zp-native-icon" aria-label="Ana sayfaya dön" onClick={() => onScreen('home')}><ArrowLeft size={22}/></button>}
      {screen !== 'home' && <h1 ref={title} tabIndex={-1}>{screen === 'demo' ? 'Bir soru dene' : 'Yardım'}</h1>}
      <button type="button" className="zp-native-icon" aria-label={soundActive ? 'Sesi kapat' : 'Sesi aç'} aria-pressed={soundActive} onClick={onToggleSound}>{soundActive ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button>
    </header>
    <main className="zp-native-home-content">
      {screen === 'home' && <>
        <section className="zp-native-welcome" aria-labelledby="native-home-title">
          <img src="/images/membership/monthly-robot.webp" alt="Tabletindeki şekillerle keşfe hazır Zeki robot" width={1536} height={1024}/>
          <div><p><Sparkles size={14} aria-hidden="true"/>BİLSEM hazırlık · 1–4. sınıf</p><h1 id="native-home-title">BİLSEM’e<br/>ilk adım!</h1><span>Dikkat, mantık ve bolca keşif.</span></div>
        </section>
        <button type="button" className="zp-native-demo-shortcut" onClick={() => onScreen('demo')}><Puzzle size={20} aria-hidden="true"/><span>Önce bir soru dene<small>Ücretsiz hazırlık sorusu</small></span><ArrowRight size={18} aria-hidden="true"/></button>
        <div className="zp-native-home-actions">
          <button type="button" className="zp-native-primary" onClick={() => onLogin('student')}><GraduationCap size={23}/><span>Öğrenci girişi<small>Kaldığın yerden devam et</small></span><ArrowRight size={20}/></button>
          <button type="button" className="zp-native-register" onClick={onRegister}><UserPlus size={23}/><span>Üye ol<small>Ücretsiz keşfe başla</small></span><ArrowRight size={20}/></button>
          <div className="zp-native-home-shortcuts">
            <button type="button" onClick={() => onLogin('parent')}><Users size={22}/><span>Veli girişi</span></button>
            <button type="button" onClick={() => onLogin('parent')}><Crown size={22}/><span>Abone ol</span></button>
          </div>
        </div>
        <p className="zp-native-home-note"><ShieldCheck size={15}/>Satın alma işlemleri veli hesabından yapılır.</p>
      </>}
      {screen === 'demo' && children}
      {screen === 'help' && <section className="zp-native-help" aria-label="Sık sorulan sorular">
        <p>Başlamak için bilmen gerekenler.</p>
        <details><summary>Hesap açmadan deneyebilir miyim?</summary><p>Bir örnek soruyu ücretsiz çözebilirsin. Daha önce bu cihazda tamamladıysan devam etmek için bir velinle hesap oluştur.</p><button type="button" onClick={() => onScreen('demo')}>Örnek soruyu aç <ArrowRight size={17}/></button></details>
        <details><summary>Öğrenci ve veli girişi</summary><p>Öğrenci kendi hesabıyla soruları çözer. Veli, bağlı öğrencisinin gelişimini izler ve aboneliğini yönetir.</p><button type="button" onClick={() => onLogin('parent')}>Veli girişi <ArrowRight size={17}/></button></details>
        <details><summary>Abonelik ve iptal</summary><p>Aylık, 3 aylık ve yıllık seçenekler veli panelindedir. Fiyat ve otomatik yenileme koşulları satın almadan önce gösterilir. İptal ve satın alımları geri yükleme seçeneklerine veli panelinden ulaşabilirsin.</p></details>
        <details><summary>Nasıl cevap veririm?</summary><p>Kartı seçip hedefe dokunabilir, sürükleyebilir veya şıklardan birini seçebilirsin. Cevabından sonra çözüm açıklamasını incele.</p></details>
        <a href={publicPageUrl('/bilgi/hesap-ve-veli-rehberi')}>Hesap ve veli rehberi <ArrowRight size={17}/></a>
        <a href={publicPageUrl('/bilgi/gizlilik-ve-veriler')}>Gizlilik bilgileri <ArrowRight size={17}/></a>
        <p>BİLSEM Junior bağımsız bir alıştırma platformudur. MEB veya BİLSEM ile kurumsal bağlantısı yoktur.</p>
      </section>}
    </main>
    <nav className="zp-native-home-nav" aria-label="Başlangıç menüsü">
      {([{ id: 'home', label: 'Ana sayfa', icon: Home }, { id: 'demo', label: 'Bir soru dene', icon: Puzzle }, { id: 'help', label: 'Yardım', icon: CircleHelp }] as const).map(({id, label, icon: Icon}) => <button type="button" key={id} aria-current={screen === id ? 'page' : undefined} onClick={() => onScreen(id)}><Icon size={22}/><span>{label}</span></button>)}
    </nav>
  </div>;
}
