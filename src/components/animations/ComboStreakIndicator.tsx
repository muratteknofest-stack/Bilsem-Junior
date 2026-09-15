import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Zap, Star, Trophy, Sparkles, Rocket, Crown } from 'lucide-react';

export interface ComboTierInfo {
  tier: number;
  label: string;
  sublabel: string;
  multiplier: number;
  multiplierText: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  glowClass: string;
  icon: React.ReactNode;
}

export function getComboTier(streak: number): ComboTierInfo {
  if (streak >= 10) {
    return {
      tier: 5,
      label: 'EFSANE ZEKÂ!',
      sublabel: 'Durdurulamaz Güç!',
      multiplier: 2.5,
      multiplierText: '2.5x XP',
      badgeBg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500',
      borderColor: 'border-pink-300',
      textColor: 'text-amber-100',
      glowClass: 'animate-rainbow-glow',
      icon: <Crown className="w-5 h-5 text-amber-300 fill-amber-300" />,
    };
  }
  if (streak >= 7) {
    return {
      tier: 4,
      label: 'ROKET SERİSİ!',
      sublabel: 'Işık Hızı!',
      multiplier: 2.0,
      multiplierText: '2.0x XP',
      badgeBg: 'bg-gradient-to-r from-violet-600 to-indigo-600',
      borderColor: 'border-violet-300',
      textColor: 'text-violet-100',
      glowClass: ' ',
      icon: <Rocket className="w-5 h-5 text-violet-200 fill-violet-400" />,
    };
  }
  if (streak >= 5) {
    return {
      tier: 3,
      label: 'KUSURSUZ SERİ!',
      sublabel: 'Yüksek Odak!',
      multiplier: 1.5,
      multiplierText: '1.5x XP',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-100',
      glowClass: '  animate-flame',
      icon: <Sparkles className="w-5 h-5 text-yellow-200 fill-yellow-300" />,
    };
  }
  if (streak >= 3) {
    return {
      tier: 2,
      label: 'ALEV ALDIN!',
      sublabel: 'Harika Ritim!',
      multiplier: 1.2,
      multiplierText: '1.2x XP',
      badgeBg: 'bg-gradient-to-r from-orange-500 to-red-500',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-100',
      glowClass: '  animate-flame',
      icon: <Flame className="w-5 h-5 text-orange-200 fill-orange-300" />,
    };
  }
  if (streak >= 2) {
    return {
      tier: 1,
      label: 'İKİLİ SERİ!',
      sublabel: 'Devam Et!',
      multiplier: 1.1,
      multiplierText: '1.1x XP',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-amber-500',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-950',
      glowClass: ' ',
      icon: <Zap className="w-4 h-4 text-amber-900 fill-amber-900" />,
    };
  }
  return {
    tier: 0,
    label: 'BAŞLANGIÇ',
    sublabel: 'Seri Yakala!',
    multiplier: 1.0,
    multiplierText: '1.0x XP',
    badgeBg: 'bg-slate-100',
    borderColor: 'border-zinc-200',
    textColor: 'text-slate-600',
    glowClass: '',
    icon: <Star className="w-4 h-4 text-slate-400" />,
  };
}

interface ComboStreakIndicatorProps {
  streak: number;
  variant?: 'hud' | 'badge' | 'compact' | 'meter';
  className?: string;
  showMultiplier?: boolean;
}

export const ComboStreakIndicator: React.FC<ComboStreakIndicatorProps> = ({
  streak,
  variant = 'hud',
  className = '',
  showMultiplier = true,
}) => {
  if (streak <= 0 && variant !== 'meter') return null;

  const tierInfo = getComboTier(streak);
  const isActive = streak >= 2;

  if (variant === 'compact') {
    if (!isActive) return null;
    return (
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`compact-${streak}`}
          initial={{ scale: 0.8, opacity: 0, y: 5 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black  ${tierInfo.badgeBg} ${tierInfo.textColor} ${tierInfo.glowClass} ${className}`}
        >
          <motion.div
            animate={{ rotate: [-8, 8, -8], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          >
            {tierInfo.icon}
          </motion.div>
          <span>{streak}x Kombo</span>
          {showMultiplier && streak >= 3 && (
            <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-md tracking-wider">
              {tierInfo.multiplierText}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === 'badge') {
    if (!isActive) return null;
    return (
      <motion.div
        key={`badge-${streak}`}
        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${tierInfo.borderColor} ${tierInfo.badgeBg} ${tierInfo.textColor} ${tierInfo.glowClass} ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              rotate: [-5, 5, -5],
            }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {tierInfo.icon}
          </motion.div>
          {streak >= 3 && (
            <motion.div
              className="absolute -inset-1 rounded-full bg-white/30 blur-xs"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-sm">{streak}x</span>
            <span className="font-black text-xs tracking-wide uppercase">{tierInfo.label}</span>
          </div>
          {showMultiplier && (
            <span className="text-[10px] font-semibold opacity-90 leading-tight">
              {tierInfo.multiplierText} Bonusu
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === 'meter') {
    // 5-node progress indicator for streak milestones (1 -> 2 -> 3 -> 5 -> 7 -> 10)
    const milestoneSteps = [2, 3, 5, 7, 10];
    return (
      <div className={`flex flex-col gap-1.5 p-3 rounded-xl bg-white  ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={isActive ? { scale: [1, 1.3, 1], rotate: [-6, 6, -6] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {tierInfo.icon}
            </motion.div>
            <span className="text-xs font-black text-slate-800">
              {isActive ? `${streak}x ${tierInfo.label}` : 'Kombo Serisi Başlat'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {tierInfo.multiplierText}
          </span>
        </div>

        {/* Meter Nodes */}
        <div className="flex items-center gap-1.5">
          {milestoneSteps.map((step, idx) => {
            const isReached = streak >= step;
            const isCurrent = streak === step;
            return (
              <div key={step} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 border border-zinc-200/60 relative">
                  {isReached && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                      className={`h-full ${
                        step >= 10
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                          : step >= 5
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-yellow-400 to-amber-500'
                      }`}
                    />
                  )}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 bg-white/50"
                      animate={{ opacity: [0, 0.7, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                  )}
                </div>
                <span className={`text-[9px] font-bold ${isReached ? 'text-amber-600' : 'text-slate-400'}`}>
                  {step}x
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default HUD Variant
  if (!isActive) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`hud-${streak}`}
        initial={{ scale: 0.7, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black  border ${tierInfo.borderColor} ${tierInfo.badgeBg} ${tierInfo.textColor} ${tierInfo.glowClass} ${className}`}
      >
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [-6, 6, -6],
          }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          {tierInfo.icon}
        </motion.div>

        <div className="flex items-center gap-1 font-extrabold tracking-tight">
          <motion.span
            key={streak}
            initial={{ scale: 1.4, y: -2 }}
            animate={{ scale: 1, y: 0 }}
            className="text-sm font-black"
          >
            {streak}
          </motion.span>
          <span>Seri</span>
          <span className="opacity-90 font-bold hidden sm:inline">• {tierInfo.label}</span>
        </div>

        {showMultiplier && streak >= 3 && (
          <span className="ml-0.5 text-[10px] font-black bg-white/20 px-1.5 py-0.5 rounded-md backdrop-blur-xs tracking-wider">
            {tierInfo.multiplierText}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
