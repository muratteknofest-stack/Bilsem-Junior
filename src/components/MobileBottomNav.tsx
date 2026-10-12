import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Home, Target, Award, RotateCcw, Book, ShieldCheck, BookOpen, CircleHelp, Brain, Zap, Trophy, Sparkles, Flame, Compass, Star, type LucideIcon } from 'lucide-react';
import { sound } from '../lib/sound';
import type { UserRole, CognitiveCategory } from '../types';

interface MobileBottomNavProps { 
  currentRoute: string; 
  onNavigate: (route: string) => void; 
  mistakesCount: number; 
  userRole: UserRole; 
  onLogout?: () => void 
}

interface NavItem { 
  id: string; 
  icon: LucideIcon; 
  label: string; 
  badge?: number;
  gradient?: string;
  color?: string;
  funIcon?: string;
}

const studentItems: NavItem[] = [
  { id: 'dashboard', icon: Home, label: 'Ana Sayfa', gradient: 'from-indigo-500 to-purple-500', color: 'text-indigo-600', funIcon: '🏠' },
  { id: 'adaptive', icon: Brain, label: 'Adaptif', gradient: 'from-emerald-500 to-teal-500', color: 'text-emerald-600', funIcon: '🧠' },
  { id: 'achievements', icon: Trophy, label: 'Rozetler', gradient: 'from-amber-500 to-orange-500', color: 'text-amber-600', funIcon: '🏆' },
  { id: 'mistakes', icon: RotateCcw, label: 'Tekrar', gradient: 'from-rose-500 to-pink-500', color: 'text-rose-600', funIcon: '🔄' },
  { id: 'glossary', icon: Book, label: 'Sözlük', gradient: 'from-sky-500 to-indigo-500', color: 'text-sky-600', funIcon: '📚' },
];

const parentItems: NavItem[] = [
  { id: 'parent', icon: Home, label: 'Veli Alanı', gradient: 'from-teal-500 to-cyan-500', color: 'text-teal-600', funIcon: '👨‍👩‍👧' },
];

const adminItems: NavItem[] = [
  { id: 'admin', icon: ShieldCheck, label: 'Yönetim', gradient: 'from-slate-500 to-zinc-500', color: 'text-slate-600', funIcon: '⚙️' },
];

export function MobileBottomNav({ currentRoute, onNavigate, mistakesCount, userRole, onLogout }: MobileBottomNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [showBlogHint, setShowBlogHint] = useState(false);
  
  const items: NavItem[] = userRole === 'student' ? studentItems : userRole === 'parent' ? parentItems : adminItems;
  
  const badge = Number.isFinite(mistakesCount) ? Math.max(0, Math.floor(mistakesCount)) : 0;
  
  // Auto-hide blog hint after delay
  useEffect(() => {
    if (userRole !== 'student') return;
    const timer = setTimeout(() => setShowBlogHint(true), 5000);
    return () => clearTimeout(timer);
  }, [userRole]);

  const handlePress = (id: string, active: boolean) => {
    if (!active) {
      setPressedId(id);
      sound.playClick();
      onNavigate(id);
      setTimeout(() => setPressedId(null), 150);
    }
  };

  return (
    <nav 
      aria-label={userRole === 'student' ? 'Öğrenci alt menüsü' : userRole === 'parent' ? 'Veli alt menüsü' : 'Yönetici alt menüsü'} 
      className="md:hidden fixed bottom-0 left-0 w-full z-50 pb-safe"
    >
      {/* Floating Glass Container */}
      <motion.div
        initial={false}
        animate={{ y: 0 }}
        className="mx-3 mb-3"
        style={{ willChange: 'transform' }}
      >
        <div className="relative">
          {/* Background Glow for Active Item */}
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              currentRoute === item.id && (
                <motion.div
                  key={`glow-${item.id}`}
                  layoutId="activeNavGlow"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-gradient-to-r rounded-3xl opacity-20 blur-lg pointer-events-none"
                  style={{ background: item.gradient }}
                />
              )
            ))}
          </AnimatePresence>

          {/* Nav Items */}
          <div className="flex items-center justify-around relative z-10 px-1 py-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl shadow-2xl shadow-zinc-900/5 dark:shadow-black/20">
            {items.map((item, index) => {
              const active = currentRoute === item.id;
              const Icon = item.icon;
              const isMistakes = item.id === 'mistakes';
              
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-label={isMistakes && badge > 0 ? `${item.label}: ${badge} yanlış soru` : item.label}
                  onMouseDown={() => handlePress(item.id, active)}
                  onTouchStart={() => handlePress(item.id, active)}
                  onClick={() => {}}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05, y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  className={`relative flex flex-col items-center justify-center gap-1.5 min-w-0 flex-1 py-3 px-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                    active ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                  style={{ 
                    transform: pressedId === item.id ? 'scale(0.9)' : undefined,
                    transition: 'transform 80ms ease-out'
                  }}
                >
                  {/* Icon Container with Gradient Background when Active */}
                  <div className="relative flex items-center justify-center">
                    <AnimatePresence mode="popLayout">
                      {active ? (
                        <motion.div
                          key="active-bg"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute inset-0 rounded-2xl bg-gradient-to-r"
                          style={{ background: item.gradient }}
                        />
                      ) : null}
                    </AnimatePresence>
                    
                    {/* Fun Emoji Icon for Student */}
                    {(userRole === 'student' && item.funIcon) ? (
                      <motion.span
                        className={`relative z-10 text-2xl sm:text-3xl transition-transform duration-300 ${active ? 'animate-bounce' : ''}`}
                        animate={prefersReducedMotion ? undefined : active ? { rotate: [0, -5, 5, 0] } : undefined}
                        transition={{ duration: 1.5, repeat: active ? Infinity : 0 }}
                      >
                        {item.funIcon}
                      </motion.span>
                    ) : (
                      <Icon 
                        aria-hidden="true" 
                        className={`relative z-10 w-6 h-6 transition-all duration-300 ${active ? 'fill-current' : ''}`}
                      />
                    )}
                    
                    {/* Badge for Mistakes */}
                    {isMistakes && badge > 0 && (
                      <motion.span
                        key={`badge-${badge}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 25 }}
                        className="absolute -top-1 -right-1 min-w-[18px] h-5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black rounded-full px-1.5 flex items-center justify-center shadow-lg shadow-rose-500/40 border-2 border-white dark:border-zinc-900"
                        aria-hidden="true"
                      >
                        {badge > 9 ? '9+' : badge}
                      </motion.span>
                    )}
                    
                    {/* New/Dot Indicator for Glossary */}
                    {item.id === 'glossary' && !active && userRole === 'student' && showBlogHint && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-2 h-2 bg-sky-500 rounded-full border-2 border-white dark:border-zinc-900"
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`relative z-10 text-[10px] sm:text-[11px] font-bold tracking-wide transition-colors ${active ? 'text-white' : ''}`}>
                    {item.label}
                  </span>

                  {/* Active Indicator Bar */}
                  <AnimatePresence mode="popLayout">
                    {active && (
                      <motion.div
                        layoutId="activeIndicator"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '100%', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-full max-w-[60px] h-1 bg-white/60 rounded-full"
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}

            {/* Extra Links for Parent/Admin */}
            {userRole !== 'student' && (
              <>
                <motion.a
                  key="blog"
                  href="/blog"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05, y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  className="relative flex flex-col items-center justify-center gap-1.5 min-w-0 flex-1 py-3 px-2 rounded-2xl transition-all duration-300 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <BookOpen aria-hidden="true" className="relative z-10 w-6 h-6" />
                  </div>
                  <span className="relative z-10 text-[10px] font-bold">Blog</span>
                </motion.a>
                <motion.a
                  key="guide"
                  href={userRole === 'parent' ? '/bilgi/hesap-ve-veli-rehberi' : '/bilgi/hesap-guvenligi'}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05, y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  className="relative flex flex-col items-center justify-center gap-1.5 min-w-0 flex-1 py-3 px-2 rounded-2xl transition-all duration-300 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <CircleHelp aria-hidden="true" className="relative z-10 w-6 h-6" />
                  </div>
                  <span className="relative z-10 text-[10px] font-bold">Rehber</span>
                </motion.a>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Floating Action Hint for Student - Appears on first visit */}
      {userRole === 'student' && !showBlogHint && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mx-3 mb-20 flex justify-center pointer-events-none"
        >
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-indigo-500/40 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 fill-current animate-bounce" />
            <span>Keşfetmek için dokun</span>
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
        </motion.div>
      )}
    </nav>
  );
}