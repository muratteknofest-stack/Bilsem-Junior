import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  Zap, User, LogOut, Settings, Award, 
  Menu, X, Volume2, VolumeX, ShieldCheck, GraduationCap, LayoutDashboard, KeyRound
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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onNavigateHome,
  onNavigate,
  currentRoute,
  onLogout
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [soundOn, setSoundOn] = useState(sound.enabled === true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    sound.playClick();
    const isNowMuted = !soundOn;
    sound.enabled = !isNowMuted;
    setSoundOn(!isNowMuted);
  };

  const isLanding = currentRoute === 'landing' || !currentUser;
  const role = currentUser?.role || 'student';

  // Role based visual theme
  const getRoleTheme = () => {
    if (role === 'admin') return 'text-admin-600 dark:text-admin-400';
    if (role === 'parent') return 'text-parent-600 dark:text-parent-400';
    return 'text-primary-600 dark:text-primary-400';
  };

  const getRoleBg = () => {
    if (role === 'admin') return 'bg-admin-50 text-admin-700 dark:bg-admin-900/30 dark:text-admin-300 border-admin-200 dark:border-admin-800';
    if (role === 'parent') return 'bg-parent-50 text-parent-700 dark:bg-parent-900/30 dark:text-parent-300 border-parent-200 dark:border-parent-800';
    return 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-primary-200 dark:border-primary-800';
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-slate-800  py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo 
            size="sm" 
            showTagline={isLanding}
            onClick={() => {
              sound.playClick();
              onNavigateHome();
            }}
          />
          {!isLanding && (
            <span className={`hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBg()}`}>
              {role === 'student' && 'Öğrenci Portalı'}
              {role === 'parent' && 'Veli Portalı'}
              {role === 'admin' && 'Admin Paneli'}
            </span>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          
          {/* Audio Toggle */}
          <button 
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors "
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!isLanding && currentUser && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm ${getRoleBg()}`}>
              <User className="w-4 h-4" />
              <span>{currentUser?.name}</span>
              {role === 'student' && (currentUser.studentCode || currentUser.name) && (
                <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 flex items-center gap-1" title="Öğrenci Kodu">
                  <KeyRound className="w-3 h-3 text-indigo-500" />
                  {currentUser.studentCode || `${currentUser.name.replace(/\s+/g, '').toUpperCase()}2026`}
                </span>
              )}
            </div>
          )}

          {!isLanding && currentUser && (
            <button 
              onClick={() => {
                sound.playClick();
                if(onLogout) onLogout();
              }}
              className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-900/50 "
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {(isLanding || !currentUser) && (
            <div className="flex gap-2">
              <button onClick={() => onNavigate('login')} className="px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                Giriş Yap
              </button>
              <button onClick={() => onNavigate('login')} className="px-5 py-2.5 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl  transition-all">
                Ücretsiz Başla
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
           <button 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             className="p-2 text-slate-600 dark:text-slate-400"
           >
             {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-zinc-200 dark:border-slate-800  p-4 flex flex-col gap-3 md:hidden z-50"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-slate-800">
               <button onClick={toggleSound} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                 {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                 Ses {soundOn ? 'Açık' : 'Kapalı'}
               </button>
            </div>
            
            {isLanding ? (
               <>
                 <button onClick={() => { setIsMobileMenuOpen(false); onNavigate('login'); }} className="w-full py-3 text-center font-bold text-slate-700 bg-slate-50 rounded-xl">Giriş Yap</button>
                 <button onClick={() => { setIsMobileMenuOpen(false); onNavigate('login'); }} className="w-full py-3 text-center font-bold text-white bg-primary-600 rounded-xl">Ücretsiz Başla</button>
               </>
            ) : (
               <button 
                 onClick={() => {
                   setIsMobileMenuOpen(false);
                   sound.playClick();
                   if(onLogout) onLogout();
                 }} 
                 className="w-full py-3 flex items-center justify-center gap-2 font-bold text-rose-600 bg-rose-50 rounded-xl"
               >
                 <LogOut className="w-5 h-5" /> Çıkış Yap
               </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
