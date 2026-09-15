import React from 'react';
import { WeeklyChallengesState, UserProfile } from '../types';
import { weeklyChallengesService } from '../services/weekly-challenges-service';
import { sound } from '../lib/sound';
import { motion } from 'motion/react';
import { Trophy, Sparkles, ChevronRight, ArrowRight, Target, Flame } from 'lucide-react';

interface WeeklyChallengesBannerCardProps {
  user?: UserProfile | null;
  onOpenChallenges: () => void;
  onStartPractice: (category?: string) => void;
}

export const WeeklyChallengesBannerCard: React.FC<WeeklyChallengesBannerCardProps> = ({
  user,
  onOpenChallenges,
  onStartPractice,
}) => {
  const challengesState = weeklyChallengesService.getWeeklyChallenges();
  const nextIncomplete = challengesState.challenges.find((c) => !c.isCompleted);
  const unearnedBadgesCount = challengesState.challenges.filter((c) => !c.isCompleted).length;
  const completedPct = Math.min(
    100,
    Math.round((challengesState.completedChallengesCount / challengesState.challenges.length) * 100)
  );

  return (
    <article className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-900 text-white shadow-sm border border-indigo-800/50 relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black font-['Outfit',sans-serif] tracking-tight text-white">
                Haftalık Bilişsel Görevler
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                Rozetli
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/80">
              {challengesState.completedChallengesCount} / {challengesState.challenges.length} Kategori Rozeti
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/10">
          {challengesState.daysRemaining} gün kaldı
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completedPct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-gradient-to-r from-amber-400 to-indigo-400 rounded-full"
          />
        </div>
      </div>

      {/* Next challenge recommendation */}
      {nextIncomplete ? (
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{nextIncomplete.badgeReward.badgeIcon}</span>
            <div className="truncate">
              <p className="font-bold text-white truncate text-[11px]">
                {nextIncomplete.title}
              </p>
              <p className="text-[10px] text-indigo-300 truncate">
                {nextIncomplete.completedQuestions} / {nextIncomplete.targetQuestions} soru tamamlandı
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onStartPractice(nextIncomplete.category);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-[11px] transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            Çöz
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 mb-4 text-xs text-emerald-300 font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Tüm haftalık bilişsel meydan okumaları tamamladın! 🎉</span>
        </div>
      )}

      {/* Action to view all challenges */}
      <motion.button
        whileHover={{ x: 2 }}
        onClick={() => {
          sound.playClick();
          onOpenChallenges();
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
      >
        <span>Tüm Haftalık Görevleri & Rozetleri Gör</span>
        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
      </motion.button>
    </article>
  );
};
