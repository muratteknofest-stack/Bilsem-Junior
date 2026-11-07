import React from 'react';
import { isAndroidApp, publicPageUrl } from '../lib/native-app';
import { useStudentReducedMotion } from '../features/student/experience-preferences';
import { useParentPortalTab, type ParentPortalTab } from '../features/parent/parent-tab-sync';
import { motion, useReducedMotion } from 'motion/react';
import {
  Home,
  Brain,
  Trophy,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  CircleHelp,
  Compass,
  Shapes,
  UserRound,
  CreditCard,
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

interface ParentTabItem {
  id: ParentPortalTab;
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

const parentTabItems: ParentTabItem[] = [
  { id: 'overview', icon: Home, label: 'Özet' },
  { id: 'skills', icon: Brain, label: 'Beceriler' },
  { id: 'membership', icon: CreditCard, label: 'Üyelik' },
  { id: 'preferences', icon: UserRound, label: 'Hesap' },
];

const adminItems: NavItem[] = [
  { id: 'admin', icon: ShieldCheck, label: 'Yönetim' },
];

/**
 * MobileBottomNav - Mobil Alt Bar (%15 Ekran Yüksekliği ve 44px Dokunma Kuralı).
 * Kompakt h-14 (56px) + safe-area yüksekliği, en az 44px x 44px dokunma hedefleri ve
 * motion/react layoutId transform/opacity (<=200ms) geçişleri.
 */
export function MobileBottomNav({
  currentRoute,
  onNavigate,
  mistakesCount,
  userRole,
}: MobileBottomNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const studentReducedMotion = useStudentReducedMotion();
  const [activeParentTab, setParentTab] = useParentPortalTab();

  const badge = Number.isFinite(mistakesCount) ? Math.max(0, Math.floor(mistakesCount)) : 0;

  const vibrateLight = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  };

  const handlePress = (id: string, active: boolean) => {
    if (!active) {
      sound.playClick();
      vibrateLight();
      onNavigate(id);
    }
  };

  const handleParentTabPress = (tabId: ParentPortalTab, active: boolean) => {
    if (!active) {
      sound.playClick();
      vibrateLight();
    }
    setParentTab(tabId);
    if (currentRoute !== 'parent') {
      onNavigate('parent');
    }
  };

  // Android Native Bottom Bar (Preserved for Capacitor / Android runtime)
  if (isAndroidApp && userRole === 'student') {
    const nativeItems = [
      { id: 'dashboard', label: 'Macera', icon: Compass },
      { id: 'student-study', label: 'Çalış', icon: Shapes },
      { id: 'student-rewards', label: 'Ödüller', icon: Trophy },
      { id: 'student-profile', label: 'Profil', icon: UserRound },
    ];
    const selected =
      currentRoute === 'dashboard'
        ? 'dashboard'
        : currentRoute === 'student-profile'
        ? 'student-profile'
        : ['achievements', 'leaderboard', 'student-rewards', 'student-challenges', 'student-progress'].includes(
            currentRoute
          )
        ? 'student-rewards'
        : 'student-study';

    return (
      <nav
        className="bj-native-bottom"
        data-reduced-motion={studentReducedMotion}
        aria-label="Öğrenci alt menüsü"
      >
        <div>
          {nativeItems.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              type="button"
              aria-current={selected === id ? 'page' : undefined}
              onClick={() => handlePress(id, currentRoute === id)}
              whileTap={studentReducedMotion ? undefined : { y: 3 }}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </motion.button>
          ))}
        </div>
      </nav>
    );
  }

  const routeItems = userRole === 'student' ? studentItems : adminItems;

  // Web Mobile Viewport Bottom Navigation
  return (
    <nav
      aria-label={
        userRole === 'student'
          ? 'Öğrenci alt menüsü'
          : userRole === 'parent'
          ? 'Veli alt menüsü'
          : 'Yönetici alt menüsü'
      }
      className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-zinc-800/80 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center h-14 max-w-lg mx-auto px-1 gap-0.5">
        <div
          role="tablist"
          aria-label={userRole === 'parent' ? 'Veli portalı sekmeleri' : 'Alt gezinme sekmeleri'}
          className="flex flex-1 min-w-0 items-center justify-around h-full"
        >
          {userRole === 'parent'
            ? parentTabItems.map((tab) => {
                const active = currentRoute === 'parent' && activeParentTab === tab.id;
                const Icon = tab.icon;

                return (
                  <motion.button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-current={active ? 'page' : undefined}
                    aria-label={tab.label}
                    onClick={() => handleParentTabPress(tab.id, active)}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                    className="group relative flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-0.5 px-0.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl cursor-pointer"
                  >
                    {active && (
                      <motion.span
                        layoutId="mobileNavTopIndicator"
                        className="absolute -top-px h-[2.5px] w-6 rounded-full bg-emerald-600 dark:bg-emerald-400"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.18, ease: 'easeOut' }
                        }
                      />
                    )}

                    <span className="relative flex items-center justify-center h-6 w-9 sm:w-11">
                      {active && (
                        <motion.span
                          layoutId="mobileNavPill"
                          className="absolute inset-0 rounded-full bg-emerald-50 dark:bg-emerald-950/60"
                          transition={
                            prefersReducedMotion
                              ? { duration: 0 }
                              : { duration: 0.18, ease: 'easeOut' }
                          }
                        />
                      )}
                      <Icon
                        strokeWidth={active ? 2.3 : 1.9}
                        aria-hidden="true"
                        className={`relative w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-180 ${
                          active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200'
                        }`}
                      />
                    </span>

                    <span
                      className={`text-[10px] leading-tight truncate max-w-full transition-colors duration-180 ${
                        active
                          ? 'font-bold text-emerald-700 dark:text-emerald-400'
                          : 'font-medium text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })
            : routeItems.map((item) => {
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
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                    className="group relative flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-0.5 px-0.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl cursor-pointer"
                  >
                    {/* Active top line indicator */}
                    {active && (
                      <motion.span
                        layoutId="mobileNavTopIndicator"
                        className="absolute -top-px h-[2.5px] w-7 rounded-full bg-indigo-600 dark:bg-indigo-400"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.18, ease: 'easeOut' }
                        }
                      />
                    )}

                    {/* Icon container with soft pill active background */}
                    <span className="relative flex items-center justify-center h-7 w-10 sm:w-12">
                      {active && (
                        <motion.span
                          layoutId="mobileNavPill"
                          className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-950/60"
                          transition={
                            prefersReducedMotion
                              ? { duration: 0 }
                              : { duration: 0.18, ease: 'easeOut' }
                          }
                        />
                      )}
                      <Icon
                        strokeWidth={active ? 2.3 : 1.9}
                        aria-hidden="true"
                        className={`relative w-5 h-5 transition-colors duration-180 ${
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
                          transition={{ duration: 0.15 }}
                          className="absolute -top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold leading-none rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shadow-xs tabular-nums"
                          aria-hidden="true"
                        >
                          {badge > 9 ? '9+' : badge}
                        </motion.span>
                      )}
                    </span>

                    {/* Text Label */}
                    <span
                      className={`text-[10px] leading-tight truncate max-w-full transition-colors duration-180 ${
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
        </div>

        {/* Informational Utility Links for Parent / Admin (Outside role="tablist" for valid ARIA) */}
        {userRole !== 'student' && (
          <div className="flex items-center shrink-0 pl-0.5 border-l border-slate-200/80 dark:border-zinc-800/80">
            <a
              href={publicPageUrl('/blog')}
              aria-label="Blog"
              className="group inline-flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-0.5 px-1 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl cursor-pointer"
            >
              <span className="flex items-center justify-center h-6 w-8">
                <BookOpen
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors"
                />
              </span>
              <span className="text-[9.5px] font-medium leading-tight text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200">
                Blog
              </span>
            </a>
            <a
              href={publicPageUrl(
                userRole === 'parent'
                  ? '/bilgi/hesap-ve-veli-rehberi'
                  : '/bilgi/hesap-guvenligi'
              )}
              aria-label="Rehber"
              className="group inline-flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-0.5 px-1 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl cursor-pointer"
            >
              <span className="flex items-center justify-center h-6 w-8">
                <CircleHelp
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-400 dark:text-zinc-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors"
                />
              </span>
              <span className="text-[9.5px] font-medium leading-tight text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200">
                Rehber
              </span>
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
