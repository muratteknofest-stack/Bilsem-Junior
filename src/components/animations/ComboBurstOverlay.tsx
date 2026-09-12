import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getComboTier } from './ComboStreakIndicator';
import { Sparkles, Trophy, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ComboBurstOverlayProps {
  streak: number | null;
  onDismiss: () => void;
  bonusXP?: number;
}

export const ComboBurstOverlay: React.FC<ComboBurstOverlayProps> = ({
  streak,
  onDismiss,
  bonusXP = 50,
}) => {
  useEffect(() => {
    if (!streak || streak < 2) return;

    // Fire celebratory confetti burst
    try {
      if (streak >= 5) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.4 },
          colors: ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'],
          zIndex: 9999,
        });
      } else {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.45 },
          colors: ['#f59e0b', '#fbbf24', '#f97316'],
          zIndex: 9999,
        });
      }
    } catch {}

    const timer = setTimeout(() => {
      onDismiss();
    }, 2400);

    return () => clearTimeout(timer);
  }, [streak, onDismiss]);

  if (!streak || streak < 2) return null;

  const tier = getComboTier(streak);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs cursor-pointer select-none"
      >
        {/* Glow Aura behind card */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [1, 1.4, 1.2], opacity: [0.3, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute w-80 h-80 rounded-full blur-3xl pointer-events-none ${
            streak >= 10
              ? 'bg-pink-500/40'
              : streak >= 5
              ? 'bg-amber-500/40'
              : 'bg-orange-500/30'
          }`}
        />

        {/* Floating Modal Content */}
        <motion.div
          initial={{ scale: 0.3, y: 40, rotate: -6 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.7, y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className={`relative flex flex-col items-center text-center p-6 sm:p-8 rounded-xl border-2 ${tier.borderColor} ${tier.badgeBg}  max-w-sm w-full mx-auto text-white`}
        >
          {/* Animated Icon Avatar */}
          <div className="relative mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              className="absolute -inset-4 rounded-full border-2 border-white/30 border-dashed"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [-8, 8, -8],
              }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center  border border-white/40"
            >
              {React.cloneElement(tier.icon as React.ReactElement, {
                className: 'w-12 h-12 text-white fill-white/80',
              })}
            </motion.div>

            {/* Sparkle Badges */}
            <motion.div
              animate={{ y: [-4, 4, -4], rotate: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute -top-2 -right-2 bg-yellow-400 text-amber-950 p-1.5 rounded-full "
            >
              <Sparkles className="w-4 h-4 fill-amber-950" />
            </motion.div>
          </div>

          {/* Heading */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-1"
          >
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 border border-white/30">
              {streak} Soru Art Arda Doğru!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-">
              {tier.label}
            </h2>
            <p className="text-white/90 text-sm font-bold">{tier.sublabel}</p>
          </motion.div>

          {/* XP & Multiplier Bonus */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mt-4 flex items-center gap-2 bg-black/25 px-4 py-2 rounded-xl border border-white/25"
          >
            <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>+{bonusXP} Bonus XP</span>
            </div>
            <span className="text-white/40 font-bold">•</span>
            <span className="text-xs font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-lg ">
              {tier.multiplierText} Çarpanı
            </span>
          </motion.div>

          <p className="mt-3 text-[11px] font-semibold text-white/70">
            Devam etmek için ekrana dokun
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
