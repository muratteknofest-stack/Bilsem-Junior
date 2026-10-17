import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Brain, Check, ChevronDown, CircleHelp, GraduationCap, Menu, Pause, Play, ScanEye, Settings2, Shapes, Users, Volume2, VolumeX, X } from 'lucide-react';
import { isAndroidApp, publicPageUrl } from '../../lib/native-app';
import type { QuestionType, UserRole } from '../../types';
import { Logo } from '../Logo';
import { PremiumButton } from './PremiumUI';
import './navigation.css';

interface Props {
  onLogin: (role: UserRole) => void;
  onRegister: () => void;
  onHome: () => void;
  onDemo: (type?: QuestionType) => void;
  moving: boolean;
  reducedMotion: boolean;
  onToggleMotion: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
}
const areas = [
  { type: 'visual_sequence' as QuestionType, name: 'Örüntü ve şekiller', text: 'Gizli bağlantıları keşfet', icon: Shapes, color: 'purple' },
  { type: 'logic_grid' as QuestionType, name: 'Mantık ve sıralama', text: 'İpuçlarını bir araya getir', icon: Brain, color: 'mint' },
  { type: 'shape_counting' as QuestionType, name: 'Dikkat ve odak', text: 'Küçük ayrıntıları yakala', icon: ScanEye, color: 'peach' },
];

export function LandingNav({ onLogin, onRegister, onHome, onDemo, moving, reducedMotion, onToggleMotion, soundActive, onToggleSound }: Props) {
  const [panel, setPanel] = useState<'explore' | 'login' | 'settings' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const restoreTrigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();

  useEffect(() => {
    if (!panel) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setPanel(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPanel(null); restoreTrigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [panel]);

  useEffect(() => {
    const el = dialog.current;
    if (!mobileOpen || !el) return;
    el.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 1001px)');
    const onResize = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener('change', onResize);
    return () => { media.removeEventListener('change', onResize); document.body.style.overflow = previousOverflow; el.close(); };
  }, [mobileOpen]);

  useEffect(() => {
    if (!isAndroidApp || (!mobileOpen && !panel)) return;
    const onBack = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); setMobileOpen(false); setPanel(null); };
    window.addEventListener('zekapark:native-back', onBack, true);
    return () => window.removeEventListener('zekapark:native-back', onBack, true);
  }, [mobileOpen, panel]);

  const toggle = (next: typeof panel, event: React.MouseEvent<HTMLButtonElement>) => {
    restoreTrigger.current = event.currentTarget;
    setPanel(panel === next ? null : next);
  };
  const closeMobile = () => { setMobileOpen(false); mobileTrigger.current?.focus(); };
  const act = (action: () => void) => { setPanel(null); setMobileOpen(false); action(); };
  const section = (target: string) => {
    setPanel(null); setMobileOpen(false);
    // Wait for the native dialog to restore scroll before moving to the section.
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
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
      <button type="button" className="zp-public-brand" aria-label="ZekaPark ana sayfa" onClick={() => act(onHome)}><Logo size="md" showTagline={false} /><span>Merakla öğren. Oynayarak geliş.</span></button>
      <nav className="zp-public-links" aria-label="Ana menü">
        <div className="zp-nav-disclosure"><button type="button" className="zp-nav-link" aria-expanded={panel === 'explore'} aria-controls={`${id}-explore`} onClick={e => toggle('explore', e)}>Keşfet <ChevronDown size={14} /></button>
          {panel === 'explore' && <div id={`${id}-explore`} className="zp-nav-popover zp-explore-popover"><div className="zp-popover-label">BİR ALAN SEÇ, HEMEN DENE</div>{areas.map(a => <button type="button" className="zp-nav-area" key={a.type} onClick={() => demo(a.type)}><span className={`zp-nav-area-icon zp-nav-area-${a.color}`}><a.icon size={20} /></span><span><strong>{a.name}</strong><small>{a.text}</small></span><ArrowUpRight size={16} /></button>)}<div className="zp-popover-bottom"><Check size={14} /> Örnek sorular için hesap gerekmez.</div></div>}
        </div>
        <a className="zp-nav-link" href="#siniflar" onClick={e => { e.preventDefault(); section('siniflar'); }}>Sınıflar</a>
        <a className="zp-nav-link" href="#aile" onClick={e => { e.preventDefault(); section('aile'); }}>Aileler için</a>
        <a className="zp-nav-link" href={publicPageUrl('/blog')}>Blog</a>
        <a className="zp-nav-link" href="#uyelik" onClick={e => { e.preventDefault(); section('uyelik'); }}>Üyelik</a>
        <a className="zp-nav-link" href="#yardim" onClick={e => { e.preventDefault(); section('yardim'); }}>Yardım</a>
      </nav>
      <div className="zp-public-actions">
        <div className="zp-nav-disclosure zp-desktop-setting"><button type="button" className="zp-public-icon" aria-label="Görünüm ve ses ayarları" aria-expanded={panel === 'settings'} aria-controls={`${id}-settings`} onClick={e => toggle('settings', e)}><Settings2 size={18} /></button>
          {panel === 'settings' && <div id={`${id}-settings`} className="zp-nav-popover zp-settings-popover"><div className="zp-popover-label">SANA UYGUN DENEYİM</div><button type="button" className="zp-setting-row" disabled={reducedMotion} aria-pressed={!moving} onClick={onToggleMotion}>{moving ? <Pause size={17} /> : <Play size={17} />}<span>{moving ? 'Animasyonları durdur' : 'Animasyonları başlat'}</span></button><button type="button" className="zp-setting-row" aria-pressed={soundActive} onClick={onToggleSound}>{soundActive ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>{soundActive ? 'Sesi kapat' : 'Sesi aç'}</span></button>{reducedMotion && <p className="zp-settings-note">Cihazının hareketi azalt tercihi etkin.</p>}</div>}
        </div>
        <div className="zp-nav-disclosure zp-desktop-login"><button type="button" className="zp-nav-login" aria-expanded={panel === 'login'} aria-controls={`${id}-login`} onClick={e => toggle('login', e)}>Giriş yap <ChevronDown size={13} /></button>
          {panel === 'login' && <div id={`${id}-login`} className="zp-nav-popover zp-login-popover"><div className="zp-popover-label">HESABINA DEVAM ET</div><button type="button" className="zp-nav-area" onClick={() => act(() => onLogin('student'))}><span className="zp-nav-area-icon zp-nav-area-purple"><GraduationCap size={21} /></span><span><strong>Öğrenci girişi</strong><small>Keşiflerine kaldığın yerden devam et</small></span><ArrowUpRight size={15} /></button><button type="button" className="zp-nav-area" onClick={() => act(() => onLogin('parent'))}><span className="zp-nav-area-icon zp-nav-area-mint"><Users size={21} /></span><span><strong>Veli girişi</strong><small>Çocuğunun gelişimine eşlik et</small></span><ArrowUpRight size={15} /></button></div>}
        </div>
        <PremiumButton className="zp-nav-signup" onClick={() => act(onRegister)}>Kayıt ol <ArrowRight size={16} /></PremiumButton>
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
      <div className="zp-mobile-sheet"><div className="zp-mobile-sheet-top"><div><strong id={`${id}-mobile-title`}>ZekaPark menüsü</strong><span>Yeni bir keşfe hazır mısın?</span></div><button type="button" autoFocus className="zp-public-icon" aria-label="Menüyü kapat" onClick={closeMobile}><X size={21} /></button></div>
        <nav aria-label="Mobil ana menü"><p className="zp-popover-label">KEŞİF ALANLARI</p>{areas.map(a => <button type="button" className="zp-nav-area" key={a.type} onClick={() => demo(a.type)}><span className={`zp-nav-area-icon zp-nav-area-${a.color}`}><a.icon size={21} /></span><span><strong>{a.name}</strong><small>{a.text}</small></span><ArrowUpRight size={16} /></button>)}<div className="zp-mobile-section-links"><a href={publicPageUrl('/blog')}>Blog ve öğrenme rehberleri <ArrowUpRight size={15} /></a><a href="#siniflar" onClick={e => { e.preventDefault(); section('siniflar'); }}>Sınıfına göre keşfet <ArrowUpRight size={15} /></a><a href="#nasil" onClick={e => { e.preventDefault(); section('nasil'); }}>Nasıl çalışır? <ArrowUpRight size={15} /></a><a href="#aile" onClick={e => { e.preventDefault(); section('aile'); }}>Aileler için <ArrowUpRight size={15} /></a><a href="#uyelik" onClick={e => { e.preventDefault(); section('uyelik'); }}>Google Play üyeliği <ArrowUpRight size={15} /></a><a href="#yardim" onClick={e => { e.preventDefault(); section('yardim'); }}><span><CircleHelp size={16} /> Yardım ve sık sorulanlar</span><ArrowUpRight size={15} /></a></div></nav>
        <div className="zp-mobile-account"><p className="zp-popover-label">HESABIN</p><div><button type="button" onClick={() => act(() => onLogin('student'))}><GraduationCap size={19} /> Öğrenci girişi</button><button type="button" onClick={() => act(() => onLogin('parent'))}><Users size={19} /> Veli girişi</button></div><PremiumButton className="zp-nav-signup" onClick={() => act(onRegister)}>Hesap oluştur <ArrowRight size={16} /></PremiumButton><button type="button" className="zp-mobile-demo-link" onClick={() => demo()}>Önce hesap açmadan dene</button></div>
        <div className="zp-mobile-preferences"><button type="button" disabled={reducedMotion} aria-pressed={!moving} onClick={onToggleMotion}>{moving ? <Pause size={16} /> : <Play size={16} />}{moving ? 'Hareketi durdur' : 'Hareketi başlat'}</button><button type="button" aria-pressed={soundActive} onClick={onToggleSound}>{soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}{soundActive ? 'Sesi kapat' : 'Sesi aç'}</button></div>{reducedMotion && <p className="zp-settings-note">Cihazının hareketi azalt tercihi etkin.</p>}
      </div>
    </dialog>
  </header>;
}
