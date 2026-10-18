import React from 'react';
import { isAndroidApp } from '../lib/native-app';
import { Compass, Shapes, UserRound } from 'lucide-react';
import { useStudentReducedMotion } from '../features/student/experience-preferences';
import { motion, useReducedMotion } from 'motion/react';
import {
  Home,
  Brain,
  Trophy,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react';
import { sound } from '../lib/sound';
import type { UserRole } from '../types';

interface MobileBottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  mistakesCount: number;
  userRole: UserRole;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

const studentItems: NavItem[] = [
  { id: 'dashboard', icon: Home, label: 'Ana Sayfa' },
  { id: 'adaptive', icon: Brain, label: 'Adaptif' },
  { id: 'achievements', icon: Trophy, label: 'Rozetler' },
  { id: 'mistakes', icon: RotateCcw, label: 'Tekrar' },
  { id: 'glossary', icon: BookOpen, label: 'Sözlük' },
];

const parentItems: NavItem[] = [
  { id: 'parent', icon: Home, label: 'Veli Alanı' },
];

const adminItems: NavItem[] = [
  { id: 'admin', icon: ShieldCheck, label: 'Yönetim' },
];

export function MobileBottomNav({
  currentRoute,
  onNavigate,
  mistakesCount,
  userRole,
}: MobileBottomNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const studentReducedMotion = useStudentReducedMotion();
  const items: NavItem[] =
    userRole === 'student'
      ? studentItems
      : userRole === 'parent'
      ? parentItems
      : adminItems;

  const badge = Number.isFinite(mistakesCount) ? Math.max(0, Math.floor(mistakesCount)) : 0;

  const handlePress = (id: string, active: boolean) => {
    if (!active) {
      sound.playClick();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(8);
        } catch {}
      }
      onNavigate(id);
    }
  };

  if(isAndroidApp && userRole==='student'){
    const nativeItems=[{id:'dashboard',label:'Macera',icon:Compass},{id:'student-study',label:'Çalış',icon:Shapes},{id:'student-rewards',label:'Ödüller',icon:Trophy},{id:'student-profile',label:'Profil',icon:UserRound}];
    const selected=currentRoute==='dashboard'?'dashboard':currentRoute==='student-profile'?'student-profile':['achievements','leaderboard','student-rewards','student-challenges','student-progress'].includes(currentRoute)?'student-rewards':'student-study';
    return <nav className="bj-native-bottom" aria-label="Öğrenci alt menüsü"><div>{nativeItems.map(({id,label,icon:Icon})=><motion.button key={id} type="button" aria-current={selected===id?'page':undefined} onClick={()=>handlePress(id,currentRoute===id)} whileTap={studentReducedMotion?undefined:{y:3}}><Icon aria-hidden="true"/><span>{label}</span></motion.button>)}</div></nav>;
  }
  return (
    <nav
      aria-label={
        userRole === 'student'
          ? 'Öğrenci alt menüsü'
          : userRole === 'parent'
          ? 'Veli alt menüsü'
          : 'Yönetici alt menüsü'
      }
      className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-zinc-800/80 shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div role="tablist" aria-label="Alt gezinme sekmeleri" className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const active = currentRoute === item.id;
          const Icon = item.icon;
          const isMistakes = item.id === 'mistakes';

          return (
            <motion.button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              aria-label={
                isMistakes && badge > 0
                  ? `${item.label}: ${badge} yanlış soru`
                  : item.label
              }
              onClick={() => handlePress(item.id, active)}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
              className="group relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[48px] min-w-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl cursor-pointer"
            >
              {/* Active top line indicator */}
              {active && (
                <motion.span
                  layoutId="mobileNavTopIndicator"
                  className="absolute -top-px h-[3px] w-8 rounded-full bg-indigo-600 dark:bg-indigo-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}

              {/* Icon container with soft pill active background */}
              <span className="relative flex items-center justify-center h-8 w-14">
                {active && (
                  <motion.span
                    layoutId="mobileNavPill"
                    className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-950/60"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden="true"
                  className={`relative w-[22px] h-[22px] transition-colors duration-200 ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200'
                  }`}
                />

                {/* Badge for Mistakes / Tekrar */}
                {isMistakes && badge > 0 && (
                  <motion.span
                    key={`badge-${badge}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-2 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold leading-none rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shadow-sm tabular-nums"
                    aria-hidden="true"
                  >
                    {badge > 9 ? '9+' : badge}
                  </motion.span>
                )}
              </span>

              {/* Text Label */}
              <span
                className={`text-[11px] leading-tight truncate max-w-full transition-colors duration-200 ${
                  active
                    ? 'font-bold text-indigo-600 dark:text-indigo-400'
                    : 'font-medium text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}

        {/* Extra Navigation Links for Parent / Admin */}
        {userRole !== 'student' && (
          <>
            <a
              key="blog"
              href="/blog"
              className="group relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[48px] min-w-0 select-none outline-none rounded-2xl cursor-pointer"
            >
              <span className="relative flex items-center justify-center h-8 w-14">
                <BookOpen
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className="w-[22px] h-[22px] text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors"
                />
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200">
                Blog
              </span>
            </a>
            <a
              key="guide"
              href={
                userRole === 'parent'
                  ? '/bilgi/hesap-ve-veli-rehberi'
                  : '/bilgi/hesap-guvenligi'
              }
              className="group relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[48px] min-w-0 select-none outline-none rounded-2xl cursor-pointer"
            >
              <span className="relative flex items-center justify-center h-8 w-14">
                <CircleHelp
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className="w-[22px] h-[22px] text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors"
                />
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200">
                Rehber
              </span>
            </a>
          </>
        )}
      </div>
    </nav>
  );
}