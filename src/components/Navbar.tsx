import { isAndroidApp, publicPageUrl } from '../lib/native-app';
import './android/android-parent.css';
import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  User,
  LogOut,
  Menu,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
  GraduationCap,
  Users,
  Bell,
} from 'lucide-react';
import { sound } from '../lib/sound';
import { Logo } from './Logo';
import { AnimatePresence, motion } from 'motion/react';

interface NavbarProps {
  currentUser?: UserProfile | null;
  onNavigateHome: () => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
  onOpenReminderSettings?: () => void;
  onLogout?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  isSwitchingStudent?: boolean;
}

/**
 * Navbar - Üst Bar Sözleşmesi (Top Bar Contract).
 * Zone 1: Marka Logosu
 * Zone 2: Tek satırlı gezinme/rol geçiş sekmeleri (whitespace-nowrap shrink-0)
 * Zone 3: Birincil aksiyon ve kompakt kullanıcı/ses kontrolleri (tipografik ayraçlar, rozet yığını yok)
 */
export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onNavigateHome,
  onNavigate,
  currentRoute,
  onOpenReminderSettings,
  onLogout,
  onSwitchRole,
  isSwitchingStudent = false,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const soundOn = useSyncExternalStore(sound.subscribe, sound.getSnapshot, sound.getServerSnapshot);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(min-width: 1024px)');
    const handleMediaChange = () => {
      if (media.matches) setIsMobileMenuOpen(false);
    };
    media.addEventListener('change', handleMediaChange);
    return () => media.removeEventListener('change', handleMediaChange);
  }, [isMobileMenuOpen]);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    if (sound.enabled) {
      sound.unlock();
      sound.playClick();
    }
  };

  const isLanding = currentRoute === 'landing' || !currentUser;
  const role = currentUser?.role || 'student';

  // Android Native Headers (Preserved for Capacitor / Android runtime)
  if (isAndroidApp && !isLanding && role === 'student') {
    return (
      <header className="bj-native-header">
        <button type="button" onClick={onNavigateHome} aria-label="Bilsem Junior macera alanı">
          <img src="/brand/junior-fox-3d.webp" alt="" width={32} height={37} />
          Bilsem Junior
        </button>
        <div className="bj-native-audio-actions">
          <button
            type="button"
            data-audio-control
            onClick={toggleSound}
            aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
          >
            {soundOn ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => onNavigate('student-profile')} aria-label="Profil ve ayarlar">
            <User size={20} aria-hidden="true" />
          </button>
        </div>
      </header>
    );
  }

  if (isAndroidApp && !isLanding && role === 'parent') {
    return (
      <header className="bj-native-parent-header">
        <button type="button" onClick={onNavigateHome} aria-label="Bilsem Junior veli alanı">
          <img src="/brand/junior-fox-3d.webp" alt="" width={28} height={33} />
          Bilsem Junior
        </button>
        <div>
          <button
            type="button"
            data-audio-control
            onClick={toggleSound}
            aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
          >
            {soundOn ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          </button>
          <button
            type="button"
            disabled={isSwitchingStudent}
            onClick={onLogout}
            aria-label="Çıkış yap"
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
          isScrolled
            ? 'bg-white/95 dark:bg-[#171627]/95 backdrop-blur-md border-b border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] shadow-xs'
            : 'bg-white/85 dark:bg-[#171627]/85 backdrop-blur-sm border-b border-[var(--border-subtle,#e2e8f0)]/60 dark:border-[var(--border-subtle,#49425a)]/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3 h-[52px] lg:h-14">
          {/* ========================================================= */}
          {/* ZONE 1: MARKA LOGOSU                                      */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <Logo
              size="sm"
              showTagline={false}
              className="[&_.bj-wordmark]:dark:text-white [&_.bj-wordmark>span]:dark:text-indigo-400"
              onClick={() => {
                sound.playClick();
                onNavigateHome();
              }}
            />
          </div>

          {/* ========================================================= */}
          {/* ZONE 2: TEK SATIRLI GEZİNME VE ROL GEÇİŞ SEKME GRUBU     */}
          {/* ========================================================= */}
          <nav
            className="hidden lg:flex items-center gap-2 whitespace-nowrap shrink-0"
            aria-label="Gezinme ve roller"
          >
            {/* Family Two-Way Role Switcher (Öğrenci <-> Veli) */}
            {!isLanding && role !== 'admin' && (
              <div className="flex items-center p-0.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  disabled={isSwitchingStudent}
                  aria-busy={isSwitchingStudent}
                  title={role === 'parent' ? 'Öğrenci Paneline Geç' : undefined}
                  onClick={() => {
                    sound.playClick();
                    if (onSwitchRole) onSwitchRole('student');
                    else onNavigate('dashboard');
                  }}
                  className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    role === 'student'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>Öğrenci Paneli</span>
                </button>
                <button
                  type="button"
                  disabled={isSwitchingStudent}
                  onClick={() => {
                    sound.playClick();
                    if (onSwitchRole) onSwitchRole('parent');
                    else onNavigate('parent');
                  }}
                  className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    role === 'parent'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Veli Portalı</span>
                </button>
              </div>
            )}

            {/* Admin Navigation Quick Switcher */}
            {!isLanding && role === 'admin' && (
              <div className="flex items-center gap-1 p-0.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onNavigate('admin');
                  }}
                  className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentRoute === 'admin'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Yönetici Paneli</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onNavigate('dashboard');
                  }}
                  className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentRoute === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>Öğrenci Görünümü</span>
                </button>
              </div>
            )}

            {/* English Version Link */}
            <a
              href={publicPageUrl('/en/')}
              lang="en"
              hrefLang="en"
              aria-label="English version"
              className="whitespace-nowrap shrink-0 inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              English
            </a>
          </nav>

          {/* ========================================================= */}
          {/* ZONE 3: BİRİNCİL AKSİYON VE KOMPAKT KULLANICI / SES KONTROL*/}
          {/* ========================================================= */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Study Reminder Action (Student Role) */}
            {!isLanding && role === 'student' && onOpenReminderSettings && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenReminderSettings();
                }}
                aria-label="Çalışma hatırlatıcısı"
                title="Çalışma Hatırlatıcısı"
                className="whitespace-nowrap shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            {/* Audio Toggle Control */}
            <button
              type="button"
              data-audio-control
              onClick={toggleSound}
              aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
              title={soundOn ? 'Sesi Kapat' : 'Sesi Aç'}
              className="whitespace-nowrap shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clean User Info - Kutusuz Tipografik Ayrım (No Pill Badge Sandwich) */}
            {!isLanding && currentUser && (
              <div className="whitespace-nowrap shrink-0 flex items-center gap-2 min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-200">
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name || 'Kullanıcı'}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  {role === 'student' && 'Öğrenci'}
                  {role === 'parent' && 'Veli'}
                  {role === 'admin' && 'Yönetici'}
                </span>
                {role === 'student' && currentUser.studentCode && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span
                      className="tabular-nums font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400"
                      title="Öğrenci Kodu"
                    >
                      {currentUser.studentCode}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Secure Logout Action */}
            {!isLanding && currentUser && (
              <button
                type="button"
                disabled={isSwitchingStudent}
                onClick={() => {
                  sound.playClick();
                  if (onLogout) onLogout();
                }}
                aria-label="Çıkış yap"
                title="Güvenli Çıkış"
                className="whitespace-nowrap shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Guest / Landing Auth Actions */}
            {(isLanding || !currentUser) && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="whitespace-nowrap shrink-0 min-h-[44px] px-3.5 py-1.5 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="whitespace-nowrap shrink-0 min-h-[44px] px-4 py-1.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Kayıt Ol
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger Button */}
          <div className="lg:hidden flex items-center gap-1.5 shrink-0">
            {!isLanding && role === 'student' && onOpenReminderSettings && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenReminderSettings();
                }}
                aria-label="Çalışma hatırlatıcısı"
                className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
              className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute top-full left-0 w-full bg-white dark:bg-[#171627] border-b border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] p-4 flex flex-col gap-3 lg:hidden z-50 shadow-xl"
            >
              <div className="flex flex-col gap-3">
                <a
                  href={publicPageUrl('/en/')}
                  lang="en"
                  hrefLang="en"
                  aria-label="English version"
                  className="whitespace-nowrap shrink-0 inline-flex min-h-[44px] items-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 px-3.5 text-xs font-bold text-indigo-800 dark:text-indigo-300"
                >
                  English · Thinking games
                </a>

                <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    data-audio-control
                    onClick={toggleSound}
                    aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
                    className="whitespace-nowrap shrink-0 inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium text-xs min-h-[44px] min-w-[44px] px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>Ses {soundOn ? 'Açık' : 'Kapalı'}</span>
                  </button>

                  {currentUser && (
                    <span className="whitespace-nowrap shrink-0 text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {currentUser.name}
                    </span>
                  )}
                </div>

                {!isLanding && role === 'student' && onOpenReminderSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      sound.playClick();
                      onOpenReminderSettings();
                    }}
                    aria-label="Çalışma hatırlatıcısı"
                    className="whitespace-nowrap shrink-0 w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Çalışma hatırlatıcısı</span>
                  </button>
                )}

                {isLanding ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('login');
                      }}
                      className="whitespace-nowrap shrink-0 w-full min-h-[44px] flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      Giriş Yap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('login');
                      }}
                      className="whitespace-nowrap shrink-0 w-full min-h-[44px] flex items-center justify-center font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                    >
                      Kayıt Ol
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Mobile Role Switcher for Family Accounts */}
                    {role !== 'admin' && (
                      <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                        <button
                          type="button"
                          disabled={isSwitchingStudent}
                          aria-busy={isSwitchingStudent}
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            sound.playClick();
                            if (onSwitchRole) onSwitchRole('student');
                            else onNavigate('dashboard');
                          }}
                          className={`whitespace-nowrap shrink-0 min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                            role === 'student'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <GraduationCap className="w-4 h-4 shrink-0" />
                          <span>Öğrenci Paneli</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSwitchingStudent}
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            sound.playClick();
                            if (onSwitchRole) onSwitchRole('parent');
                            else onNavigate('parent');
                          }}
                          className={`whitespace-nowrap shrink-0 min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                            role === 'parent'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          <span>Veli Portalı</span>
                        </button>
                      </div>
                    )}

                    {role === 'admin' && (
                      <div className="flex flex-col gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            sound.playClick();
                            onNavigate('admin');
                          }}
                          className={`whitespace-nowrap shrink-0 w-full min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                            currentRoute === 'admin'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>Yönetici Paneli</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            sound.playClick();
                            onNavigate('dashboard');
                          }}
                          className={`whitespace-nowrap shrink-0 w-full min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                            currentRoute === 'dashboard'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          <GraduationCap className="w-4 h-4 shrink-0" />
                          <span>Öğrenci Görünümü</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isSwitchingStudent}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        sound.playClick();
                        if (onLogout) onLogout();
                      }}
                      className="whitespace-nowrap shrink-0 w-full min-h-[44px] flex items-center justify-center gap-2 font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );
};

export default Navbar;
