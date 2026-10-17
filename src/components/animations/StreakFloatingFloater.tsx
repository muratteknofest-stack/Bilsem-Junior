import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Star, Zap } from 'lucide-react';

interface StreakFloatingFloaterProps {
  show: boolean;
  xpEarned: number;
  streakCount: number;
}

export const StreakFloatingFloater: React.FC<StreakFloatingFloaterProps> = ({
  show,
  xpEarned,
  streakCount,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.6 }}
          animate={{ opacity: 1, y: -25, scale: 1.05 }}
          exit={{ opacity: 0, y: -45, scale: 0.8 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white  border border-amber-400/40 text-xs font-black select-none whitespace-nowrap"
        >
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>+{xpEarned} XP</span>
          </div>

          {streakCount >= 2 && (
            <>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-400 animate-pulse" />
                <span>{streakCount}x Seri!</span>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
