import React from 'react';
import { UserProfile, StreakMilestone } from '../types';
import { dataService, STREAK_MILESTONES } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Flame,
  Shield,
  Award,
  Trophy,
  Crown,
  Sparkles,
  CheckCircle2,
  X,
  Zap,
  Target,
  ArrowRight,
  Gift,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StreakMilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdate: (updatedUser: UserProfile) => void;
  onStartPractice: () => void;
}

export const StreakMilestonesModal: React.FC<StreakMilestonesModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdate,
  onStartPractice,
}) => {
  if (!isOpen) return null;

  const streak = user.streak || 0;
  const longestStreak = user.longestStreak || Math.max(streak, 7);
  const claimedDays = user.claimedStreakDays || [3];
  const streakFreezeCount = user.streakFreezeCount ?? 1;

  const handleClaim = (milestone: StreakMilestone) => {
    sound.playLevelUp();
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.5 },
      });
    } catch {}

    const result = dataService.claimStreakReward(milestone.day);
    if (result.success) {
      onUserUpdate(result.user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white w-full max-w-lg rounded-xl  border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Flame className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-100 font-bold">
                Günlük Seri Sistemi
              </span>
              <h3 className="text-xl font-extrabold font-['Outfit',sans-serif]">
                Seri Başarıları & Ödüller
              </h3>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/20 text-center">
            <div className="bg-black/15 rounded-xl p-2">
              <span className="text-[10px] text-amber-100 block font-medium">Mevcut Seri</span>
              <strong className="text-base sm:text-lg font-extrabold">{streak} Gün</strong>
            </div>
            <div className="bg-black/15 rounded-xl p-2">
              <span className="text-[10px] text-amber-100 block font-medium">En Uzun Seri</span>
              <strong className="text-base sm:text-lg font-extrabold">{longestStreak} Gün</strong>
            </div>
            <div className="bg-black/15 rounded-xl p-2">
              <span className="text-[10px] text-amber-100 block font-medium">Koruma Kalkanı</span>
              <strong className="text-base sm:text-lg font-extrabold">{streakFreezeCount} Adet</strong>
            </div>
          </div>
        </div>

        {/* Scrollable Milestones List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Kazanılacak Basamak Ödülleri</span>
          </div>

          {STREAK_MILESTONES.map((m) => {
            const isUnlocked = streak >= m.day;
            const isClaimed = claimedDays.includes(m.day);

            return (
              <div
                key={m.day}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isClaimed
                    ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                    : isUnlocked
                    ? 'border-amber-400 bg-amber-50/80 '
                    : 'border-zinc-200 bg-slate-50 text-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                      isClaimed
                        ? 'bg-emerald-100 border border-emerald-200'
                        : isUnlocked
                        ? 'bg-amber-100 border border-amber-300'
                        : 'bg-slate-200 border border-slate-300 opacity-60'
                    }`}
                  >
                    {m.badge}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {m.day}. Gün: {m.title}
                      </h4>
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        +{m.xpReward} XP
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>

                {/* Claim Button / Status */}
                <div className="shrink-0">
                  {isClaimed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Alındı</span>
                    </span>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => handleClaim(m)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs   active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Ödülü Al</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-slate-200/80 text-slate-500 font-bold text-[11px]">
                      {m.day - streak} gün kaldı
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Shield Explanation Box */}
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-start gap-3 mt-4 text-xs text-indigo-950">
            <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Seri Koruma Kalkanı Nedir?</strong>
              <p className="text-indigo-800 mt-0.5">
                Tatil günleri veya yoğun zamanlarda bir gün pratik yapamazsan kalkanın devreye girer ve serinin sıfırlanmasını engeller. 7. gün ödülüyle yeni kalkan kazanabilirsin!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-zinc-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-white transition-colors cursor-pointer"
          >
            Kapat
          </button>

          <button
            onClick={() => {
              onClose();
              onStartPractice();
            }}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm   transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
          >
            <span>Bugünün Pratiğini Yap</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
