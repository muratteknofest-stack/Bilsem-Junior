import { isAndroidApp } from '../lib/native-app';
import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  Zap, User, LogOut, Settings, Award, 
  Menu, X, Volume2, VolumeX, ShieldCheck, GraduationCap, LayoutDashboard, KeyRound, Users
} from 'lucide-react';
import { sound } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

interface NavbarProps {
  currentUser?: UserProfile | null;
  onNavigateHome: () => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
  onOpenReminderSettings: () => void;
  onLogout?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  isSwitchingStudent?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onNavigateHome,
  onNavigate,
  currentRoute,
  onLogout,
  onSwitchRole,
  isSwitchingStudent = false
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const soundOn = useSyncExternalStore(sound.subscribe, sound.getSnapshot, sound.getServerSnapshot);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    if (sound.enabled) { sound.unlock(); sound.playClick(); }
  };

  const isLanding = currentRoute === 'landing' || !currentUser;
  const role = currentUser?.role || 'student';

  // Role based visual theme
  const getRoleBg = () => {
    if (role === 'admin') return 'bg-admin-50 text-admin-700 dark:bg-admin-900/30 dark:text-admin-300 border-admin-200 dark:border-admin-800';
    if (role === 'parent') return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border-b border-zinc-200 dark:border-slate-800 py-2.5 shadow-xs' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Logo 
            size="sm" 
            showTagline={isLanding}
            onClick={() => {
              sound.playClick();
              onNavigateHome();
            }}
          />
          {!isLanding && (
            <span className={`hidden sm:inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${getRoleBg()}`}>
              {role === 'student' && 'Öğrenci Paneli'}
              {role === 'parent' && 'Veli Portalı'}
              {role === 'admin' && 'Yönetici Paneli'}
            </span>
          )}
        </div>

        {!isAndroidApp && <a href="/en/" lang="en" hrefLang="en" aria-label="English version" className="hidden xl:inline-flex min-h-11 items-center px-2 text-sm font-bold">English</a>}

        {/* Family Two-Way Role Switcher (Öğrenci <-> Veli) */}
        {!isLanding && role !== 'admin' && (
          <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              type="button"
              disabled={isSwitchingStudent}
              aria-busy={isSwitchingStudent}
              onClick={() => {
                sound.playClick();
                if (onSwitchRole) onSwitchRole('student');
                else onNavigate('dashboard');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                role === 'student'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                role === 'parent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Veli Portalı</span>
            </button>
          </div>
        )}

        {/* Admin Navigation Quick Switcher */}
        {!isLanding && role === 'admin' && (
          <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => {
                sound.playClick();
                onNavigate('admin');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRoute === 'admin'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Yönetici Paneli</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onNavigate('dashboard');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                currentRoute === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Öğrenci Görünümü</span>
            </button>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-3">
          
          {/* Audio Toggle */}
          <button 
            onClick={toggleSound}
            aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!isLanding && currentUser && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs ${getRoleBg()}`}>
              <User className="w-3.5 h-3.5" />
              <span>{currentUser?.name || 'Kullanıcı'}</span>
              {role === 'student' && currentUser.studentCode && (
                <span className="ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 flex items-center gap-1" title="Öğrenci Kodu">
                  <KeyRound className="w-3 h-3 text-indigo-500" />
                  {currentUser.studentCode}
                </span>
              )}
            </div>
          )}

          {!isLanding && currentUser && (
            <button 
              disabled={isSwitchingStudent}
              onClick={() => {
                sound.playClick();
                if(onLogout) onLogout();
              }}
              aria-label="Çıkış yap"
              className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-xs"
              title="Güvenli Çıkış"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {(isLanding || !currentUser) && (
            <div className="flex gap-2">
              <button onClick={() => onNavigate('login')} className="px-4 py-2 font-bold text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                Giriş Yap
              </button>
              <button onClick={() => onNavigate('login')} className="px-4 py-2 font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-xs">
                Kayıt Ol
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={isMobileMenuOpen}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 bg-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-zinc-200 dark:border-slate-800 p-4 flex flex-col gap-3 lg:hidden z-50 shadow-lg"
          >
            {!isAndroidApp && <a href="/en/" lang="en" hrefLang="en" className="inline-flex min-h-11 items-center rounded-xl bg-indigo-50 px-3 text-sm font-bold text-indigo-800">English · Thinking games</a>}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-slate-800">
               <button onClick={toggleSound} aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium text-xs">
                 {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                 Ses {soundOn ? 'Açık' : 'Kapalı'}
               </button>
               {currentUser && (
                 <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                   {currentUser.name}
                 </span>
               )}
            </div>
            
            {isLanding ? (
               <>
                 <button onClick={() => { setIsMobileMenuOpen(false); onNavigate('login'); }} className="w-full py-2.5 text-center font-bold text-xs text-slate-700 bg-slate-50 rounded-xl">Giriş Yap</button>
                 <button onClick={() => { setIsMobileMenuOpen(false); onNavigate('login'); }} className="w-full py-2.5 text-center font-bold text-xs text-white bg-slate-900 rounded-xl">Kayıt Ol</button>
               </>
             ) : (
                <>
                  {/* Mobile Role Switcher for Family Accounts */}
                  {role !== 'admin' && (
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-zinc-200 dark:border-slate-800">
                      <button
                        disabled={isSwitchingStudent}
                        aria-busy={isSwitchingStudent}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          sound.playClick();
                          if (onSwitchRole) onSwitchRole('student');
                          else onNavigate('dashboard');
                        }}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                          role === 'student' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4" /> Öğrenci Paneli
                      </button>
                      <button
                        disabled={isSwitchingStudent}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          sound.playClick();
                          if (onSwitchRole) onSwitchRole('parent');
                          else onNavigate('parent');
                        }}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                          role === 'parent' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Users className="w-4 h-4" /> Veli Portalı
                      </button>
                    </div>
                  )}

                  {role === 'admin' && (
                    <div className="flex flex-col gap-2 pb-2 border-b border-zinc-200 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          sound.playClick();
                          onNavigate('admin');
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 ${
                          currentRoute === 'admin' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" /> Yönetici Paneli
                      </button>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          sound.playClick();
                          onNavigate('dashboard');
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 ${
                          currentRoute === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4" /> Öğrenci Görünümü
                      </button>
                    </div>
                  )}
                  <button 
                    disabled={isSwitchingStudent}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      sound.playClick();
                      if(onLogout) onLogout();
                    }} 
                    className="w-full py-2.5 flex items-center justify-center gap-2 font-bold text-xs text-rose-600 bg-rose-50 rounded-xl cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </button>
                </>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

