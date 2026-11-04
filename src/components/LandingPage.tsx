import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Sparkles, Shapes, Brain, ScanEye, Trophy, Check, ChevronDown, Move, Keyboard, ShieldCheck, Heart, Volume2, VolumeX, Target, Zap, Medal, GraduationCap, Rotate3D, Hash, Puzzle, Compass, Timer, MousePointer2, Smartphone } from 'lucide-react';
import type { QuestionType, UserRole } from '../types';
import { generateQuestionByType } from '../features/questions/generators';
import { evaluateResponse, type QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../lib/sound';
import { landingQuestionAnswered, useLandingQuestion } from '../lib/demo-access';
import { Logo } from './Logo';
import { LearningIsland } from './landing/LearningIsland';
import { LandingNav } from './landing/LandingNav';
import { PremiumButton } from './landing/PremiumUI';
import { GradeExplorer } from './landing/GradeExplorer';
import { createGradePreview, type PreviewGrade } from './landing/grade-preview';
import { Footer } from './Footer';
import { AppDownloadLinks } from './AppDownloadLinks';
import { useAppDownloads } from '../hooks/useAppDownloads';
import { isAndroidApp } from '../lib/native-app';
import './landing/landing.css';
import './landing/design-system.css';
import './landing/colorful-home.css';
import './landing/bilsem-junior.css';
import './landing/discovery-playground.css';
import { useRegistrationAvailability } from '../hooks/useRegistrationAvailability';
import './landing/interface-refinements.css';
import { BilsemGuide } from './landing/BilsemGuide';

interface LandingPageProps { demoOnly?: boolean; onCloseDemo?: () => void; onStartDemo?: (role: UserRole) => void; onNavigateToLogin: (role: UserRole) => void; onNavigate: (route: string) => void }
const worlds = [
  { type: 'visual_sequence' as QuestionType, title: 'Örüntü evreni', short: 'Örüntü', text: 'Parçalar arasındaki gizli bağı bul. Sıradaki adımı sen keşfet.', tag: 'Bağlantı kur', icon: Shapes, theme: 'purple', number: '01' },
  { type: 'logic_grid' as QuestionType, title: 'Mantık laboratuvarı', short: 'Mantık', text: 'İpuçlarını birleştir, parçaları sırala. Her soruya yeni bir açıdan bak.', tag: 'Adım adım düşün', icon: Brain, theme: 'mint', number: '02' },
  { type: 'shape_counting' as QuestionType, title: 'Dikkat istasyonu', short: 'Dikkat', text: 'Ayrıntıları yakala. Kalabalığın içinde aradığın şekli fark et.', tag: 'Odaklan ve bul', icon: ScanEye, theme: 'peach', number: '03' },
  { type: 'figure_rotation' as QuestionType, title: 'Şekil gezegen…8572 tokens truncated…false); action(); };
  const section = (target: string) => {
    setPanel(null); setMobileOpen(false);
    // Wait for the native dialog to restore scroll before moving to the section.
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      const disclosure = el?.closest('details');
      if (disclosure) disclosure.open = true;
      const heading = el?.querySelector<HTMLElement>('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      el?.scrollIntoView({ behavior: moving ? 'smooth' : 'instant', block: 'start' });
    });
  };
  const demo = (type?: QuestionType) => { setPanel(null); setMobileOpen(false); requestAnimationFrame(() => onDemo(type)); };

  return <header ref={root} className="zp-public-header" onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setPanel(null);
  }}>
    <div className="zp-container zp-public-nav">
      <button type="button" className="zp-public-brand" aria-label="Bilsem Junior ana sayfa" onClick={() => act(onHome)}><Logo size="md" showTagline={false} /><span>BİLSEM hazırlığı · Düşün, keşfet, geliş.</span></button>
      <nav className="zp-public-links" aria-label="Ana menü">
        <div className="zp-nav-disclosure"><button type="button" className="zp-nav-link" aria-expanded={panel === 'explore'} aria-controls={`${id}-explore`} onClick={e => toggle('explore', e)}>Keşfet <ChevronDown size={14} /></button>
          {panel === 'explore' && <div id={`${id}-explore`} className="zp-nav-popover zp-explore-popover"><div className="zp-popover-label">BİR ALAN SEÇ, HEMEN DENE</div>{areas.map(a => <button type="button" className="zp-nav-area" key={a.type} onClick={() => demo(a.type)}><span className={`zp-nav-area-icon zp-nav-area-${a.color}`}><a.icon size={20} /></span><span><strong>{a.name}</strong><small>{a.text}</small></span><ArrowUpRight size={16} /></button>)}<div className="zp-popover-bottom"><Check size={14} /> Bu cihazda 1 örnek soru · Hesap gerekmez.</div></div>}
        </div>
        <a className="zp-nav-link" href="#bilsem-rehberi" onClick={e => { e.preventDefault(); section('bilsem-rehberi'); }}>BİLSEM rehberi</a>
        <a className="zp-nav-link" href="#siniflar" onClick={e => { e.preventDefault(); section('siniflar'); }}>Sınıflar</a>
        <a className="zp-nav-link" href="#aile" onClick={e => { e.preventDefault(); section('aile'); }}>Aileler için</a>
        {!isAndroidApp && <a className="zp-nav-link bj-download-nav" href="#uygulamayi-indir" onClick={e => { e.preventDefault(); section('uygulamayi-indir'); }}><Download size={15} aria-hidden="true"/> Uygulamayı indir</a>}
        <a className="zp-nav-link" href="/blog">Blog</a>
        <a className="zp-nav-link" href="#yardim" onClick={e => { e.preventDefault(); section('yardim'); }}>Yardım</a>
      </nav>
      <div className="zp-public-actions">
        <div className="zp-nav-disclosure zp-desktop-setting"><button type="button" className="zp-public-icon" aria-label="Görünüm ve ses ayarları" aria-expanded={panel === 'settings'} aria-controls={`${id}-settings`} onClick={e => toggle('settings', e)}><Settings2 size={18} /></button>
          {panel === 'settings' && <div id={`${id}-settings`} className="zp-nav-popover zp-settings-popover"><div className="zp-popover-label">SANA UYGUN DENEYİM</div><button type="button" className="zp-setting-row" disabled={reducedMotion} aria-pressed={!moving} onClick={onToggleMotion}>{moving ? <Pause size={17} /> : <Play size={17} />}<span>{moving ? 'Animasyonları durdur' : 'Animasyonları başlat'}</span></button><button type="button" className="zp-setting-row" aria-pressed={soundActive} onClick={onToggleSound}>{soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>{soundActive ? 'Sesi kapat' : 'Sesi aç'}</span></button>{reducedMotion && <p className="zp-settings-note">Cihazının hareketi azalt tercihi etkin.</p>}</div>}
        </div>
        <div className="zp-nav-disclosure zp-desktop-login"><button type="button" className="zp-nav-login" aria-expanded={panel === 'login'} aria-controls={`${id}-login`} onClick={e => toggle('login', e)}>Giriş yap <ChevronDown size={13} /></button>
          {panel === 'login' && <div id={`${id}-login`} className="zp-nav-popover zp-login-popover"><div className="zp-popover-label">HESABINA DEVAM ET</div><button type="button" className="zp-nav-area" onClick={() => act(() => onLogin('student'))}><span className="zp-nav-area-icon zp-nav-area-purple"><GraduationCap size={21} /></span><span><strong>Öğrenci girişi</strong><small>Keşiflerine kaldığın yerden devam et</small></span><ArrowUpRight size={15} /></button><button type="button" className="zp-nav-area" onClick={() => act(() => onLogin('parent'))}><span className="zp-nav-area-icon zp-nav-area-mint"><Users size={21} /></span><span><strong>Veli girişi</strong><small>Çocuğunun gelişimine eşlik et</small></span><ArrowUpRight size={15} /></button></div>}
        </div>
        <PremiumButton className="zp-nav-signup" onClick={() => act(onRegister)}>{registration === 'closed' ? 'Kayıt bilgisi' : registration === 'open' ? 'Kayıt ol' : 'Kayıt durumu'} <ArrowRight size={16} /></PremiumButton>
        <button ref={mobileTrigger} type="button" className="zp-mobile-trigger" aria-label="Menüyü aç" aria-expanded={mobileOpen} aria-controls={`${id}-mobile`} onClick={() => { setPanel(null); setMobileOpen(true); }}><Menu size={22} /></button>
      </div>
    </div>
    <dialog ref={dialog} id={`${id}-mobile`} className="zp-mobile-dialog" aria-labelledby={`${id}-mobile-title`} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={e => { e.preventDefault(); closeMobile(); }} onClose={() => setMobileOpen(false)} onClick={e => { if (e.target === e.currentTarget) closeMobile(); }}>
      <div className="zp-mobile-sheet"><div className="zp-mobile-sheet-top"><div><strong id={`${id}-mobile-title`}>Bilsem Junior menüsü</strong><span>Hazırlık yolculuğuna hoş geldin.</span></div><button type="button" autoFocus className="zp-public-icon" aria-label="Menüyü kapat" onClick={closeMobile}><X size={21} /></button></div>
        <nav aria-label="Mobil ana menü"><p className="zp-popover-label">KEŞİF ALANLARI</p>{areas.map(a => <button type="button" className="zp-nav-area" key={a.type} onClick={() => demo(a.type)}><span className={`zp-nav-area-icon zp-nav-area-${a.color}`}><a.icon size={21} /></span><span><strong>{a.name}</strong><small>{a.text}</small></span><ArrowUpRight size={16} /></button>)}<div className="zp-mobile-section-links">{!isAndroidApp && <a className="bj-download-nav" href="#uygulamayi-indir" onClick={e => { e.preventDefault(); section('uygulamayi-indir'); }}><span><Download size={17} aria-hidden="true"/> Uygulamayı indir</span><ArrowUpRight size={15} aria-hidden="true"/></a>}<a href="#bilsem-rehberi" onClick={e => { e.preventDefault(); section('bilsem-rehberi'); }}>BİLSEM hazırlık rehberi <ArrowUpRight size={15} /></a><a href="/blog">Blog ve öğrenme rehberleri <ArrowUpRight size={15} /></a><a href="#siniflar" onClick={e => { e.preventDefault(); section('siniflar'); }}>Sınıfına göre keşfet <ArrowUpRight size={15} /></a><a href="#nasil" onClick={e => { e.preventDefault(); section('nasil'); }}>Nasıl çalışır? <ArrowUpRight size={15} /></a><a href="#aile" onClick={e => { e.preventDefault(); section('aile'); }}>Aileler için <ArrowUpRight size={15} /></a><a href="#yardim" onClick={e => { e.preventDefault(); section('yardim'); }}><span><CircleHelp size={16} /> Yardım ve sık sorulanlar</span><ArrowUpRight size={15} /></a></div></nav>
        <div className="zp-mobile-account"><p className="zp-popover-label">HESABIN</p><div><button type="button" onClick={() => act(() => onLogin('student'))}><GraduationCap size={19} /> Öğrenci girişi</button><button type="button" onClick={() => act(() => onLogin('parent'))}><Users size={19} /> Veli girişi</button></div><PremiumButton className="zp-nav-signup" onClick={() => act(onRegister)}>{registration === 'open' ? 'Hesap oluştur' : 'Kayıt bilgilerini incele'} <ArrowRight size={16} /></PremiumButton><button type="button" className="zp-mobile-demo-link" onClick={() => demo()}>Önce hesap açmadan dene</button></div>
        <div className="zp-mobile-preferences"><button type="button" disabled={reducedMotion} aria-pressed={!moving} onClick={onToggleMotion}>{moving ? <Pause size={16} /> : <Play size={16} />}{moving ? 'Hareketi durdur' : 'Hareketi başlat'}</button><button type="button" aria-pressed={soundActive} onClick={onToggleSound}>{soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}{soundActive ? 'Sesi kapat' : 'Sesi aç'}</button></div>{reducedMotion && <p className="zp-settings-note">Cihazının hareketi azalt tercihi etkin.</p>}
      </div>
    </dialog>
  </header>;
}
