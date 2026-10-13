import React, { useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Zap,
  KeyRound,
  Copy,
  Check,
  Flame,
  Shield,
  Trophy,
  ChevronRight,
  Star,
} from 'lucide-react';
import { sound } from '../../lib/sound';
import { StudentGradeSelector } from '../StudentGradeSelector';
import type { UserProfile } from '../../types';

export interface StudentHeroBannerProps {
  user: UserProfile;
  greeting: { text: string; emoji: string };
  xpProgress: { level: number; xp: number; percent: number; remaining: number };
  onUserUpdate: (u: UserProfile) => void;
  onNavigate: (view: string) => void;
  prefersReducedMotion?: boolean | null;
}

export const StudentHeroBanner: React.FC<StudentHeroBannerProps> = ({
  user,
  greeting,
  xpProgress,
  onUserUpdate,
  onNavigate,
  prefersReducedMotion,
}) => {
  const [copiedStudentCode, setCopiedStudentCode] = useState(false);
  const studentCodeDisplay = user.studentCode || '';

  const handleCopyStudentCode = () => {
    if (studentCodeDisplay) {
      navigator.clipboard.writeText(studentCodeDisplay);
      setCopiedStudentCode(true);
      sound.playClick();
      setTimeout(() => setCopiedStudentCode(false), 2000);
    }
  };

  const handleAvatarClick = () => {
    sound.playLevelUp();
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.3 } });
  };

  const handleStreakBadgeClick = () => {
    sound.playSuccess();
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.35 } });
  };

  const nextLvlXp = xpProgress.level * 250;
  const currentXp = xpProgress.xp;
  const progressPct = xpProgress.percent;
  const remainingXp = xpProgress.remaining;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="zp-dashboard-hero relative overflow-hidden rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-6 xl:p-8 shadow-sm transition-all"
    >
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        {/* Student Info & Level Progress */}
        <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full xl:flex-1">
          {/* Animated 3D-Feel Floating Avatar */}
          <motion.button
            type="button"
            aria-label="Avatar kutlaması"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08, rotate: [0, -3, 3, 0] }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            onClick={handleAvatarClick}
            className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50 via-indigo-100/70 to-indigo-200/50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-4xl sm:text-5xl shadow-md border-2 border-indigo-200/60 dark:border-indigo-500/20 shrink-0 cursor-pointer group select-none"
          >
            <motion.span
              animate={prefersReducedMotion ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {user.avatar || '🦊'}
            </motion.span>

            {/* Level Badge on Avatar */}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full ring-4 ring-white dark:ring-zinc-900 shadow-md flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>{xpProgress.level}</span>
            </div>
          </motion.button>

          <div className="flex-1 min-w-0">
            <p className="zp-dashboard-kicker">ÖĞRENCİ ALANI / BUGÜN</p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight font-['Outfit',sans-serif]">
                {greeting.text}, {user.name?.split(' ')[0] || 'Zeka Şampiyonu'} {greeting.emoji}
              </h1>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                <Sparkles className="w-3 h-3" /> Seviye {xpProgress.level}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              Bilişsel hedeflerine bugün de bir adım daha yaklaşmaya hazır mısın?
            </p>

            <StudentGradeSelector key={user.id} user={user} onSaved={onUserUpdate} />

            {/* XP & Next Level Bar */}
            <div className="mt-3 sm:mt-4 max-w-md w-full">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                  <Zap className="w-3.5 h-3.5 fill-current" /> Seviye {xpProgress.level}
                </span>
                <span className="tabular-nums">
                  <strong className="text-zinc-900 dark:text-white font-bold">{currentXp}</strong> / {nextLvlXp} XP{' '}
                  <span className="text-zinc-400 ml-1 text-[11px]">({remainingXp} XP kaldı)</span>
                </span>
              </div>

              <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </motion.div>
              </div>
            </div>

            {/* Student Code Badge */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {studentCodeDisplay && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyStudentCode}
                  title="Giriş kodunu kopyala"
                  className="inline-flex max-w-full flex-wrap items-center gap-2 break-all bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3 py-1 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/70 transition-colors cursor-pointer group"
                >
                  <KeyRound className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-500 transition-colors" />
                  <span>
                    Giriş Kodu:{' '}
                    <strong className="tracking-wider font-mono text-zinc-900 dark:text-white">
                      {studentCodeDisplay}
                    </strong>
                  </span>
                  {copiedStudentCode ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> Kopyalandı
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                  )}
                </motion.button>
              )}
              {user.id.startsWith('demo_') && (
                <span className="inline-flex items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
                  Deneme: toplam 3 örnek soru
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Interactive Stat Cards */}
        <div className="zp-student-hero-stats grid items-stretch gap-2.5 sm:gap-3 w-full xl:w-auto xl:shrink-0">
          {/* Streak Pill */}
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStreakBadgeClick}
            className="min-w-0 flex items-center gap-2.5 sm:gap-3.5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-800/90 dark:to-zinc-800/40 border border-amber-200/60 dark:border-amber-500/20 rounded-2xl p-3 sm:p-4 cursor-pointer shadow-xs text-left group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse fill-current" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-black text-amber-950 dark:text-amber-400 leading-tight flex items-center gap-1">
                {user.streak || 0} Gün
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-500/80 flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-500" /> {user.streakFreezeCount || 0} Kalkan
              </div>
            </div>
          </motion.button>

          {/* Leaderboard Rank Pill */}
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              sound.playClick();
              onNavigate('leaderboard');
            }}
            className="min-w-0 flex items-center gap-2.5 sm:gap-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-800/90 dark:to-zinc-800/40 border border-indigo-200/60 dark:border-indigo-500/20 rounded-2xl p-3 sm:p-4 cursor-pointer shadow-xs text-left group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-black text-indigo-950 dark:text-indigo-400 leading-tight">
                {user.xp || 0} XP
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                İlerleme <ChevronRight className="w-3 h-3 hidden sm:inline" />
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
};
