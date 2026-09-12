import React, { useState, useEffect, useMemo } from 'react';
import { Achievement, DailyMission, UserProfile, BadgeTier } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Trophy,
  Sparkles,
  Flame,
  Star,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Award,
  Zap,
  Search,
  Check,
  ShieldCheck,
  BookCheck,
  Compass,
  Crown,
  Info,
  X,
  Plus,
  TrendingUp,
  Brain,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface AchievementsViewProps {
  user?: UserProfile | null;
  onNavigateHome: () => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
  onStartPractice?: () => void;
}

type CategoryFilter = 'all' | 'streak' | 'questions' | 'special' | 'mastery' | 'exam';
type StatusFilter = 'all' | 'unlocked' | 'locked' | 'almost';
type TierFilter = 'all' | 'bronze' | 'silver' | 'gold' | 'diamond';

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  user,
  onNavigateHome,
  onUserUpdate,
  onStartPractice,
}) => {
  const activeUser = user || dataService.getCurrentUser();

  // Sync badges on load with progress
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    return dataService.syncBadgesWithProgress();
  });

  const [missions, setMissions] = useState<DailyMission[]>([
    { id: 'm1', title: 'Bugün 5 soru çöz', rewardXP: 30, current: 3, target: 5, completed: false },
    { id: 'm2', title: 'Matris kategorisinde 2 soru tamamla', rewardXP: 40, current: 2, target: 2, completed: true },
    { id: 'm3', title: 'Hata Defterinden 1 soruyu tekrar dene', rewardXP: 50, current: 1, target: 1, completed: true },
  ]);

  const [claimedMissions, setClaimedMissions] = useState<Record<string, boolean>>({
    m2: true,
  });

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep achievements updated if user changes
  useEffect(() => {
    setAchievements(dataService.syncBadgesWithProgress());
  }, [activeUser?.streak, activeUser?.totalQuestionsSolved, activeUser?.resolvedMistakesCount, activeUser?.xp]);

  const showCelebrationToast = (msg: string) => {
    setToastMessage(msg);
    sound.playLevelUp();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'],
      });
    } catch {}
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleClaimMissionReward = (mission: DailyMission) => {
    if (claimedMissions[mission.id] || !mission.completed) return;
    sound.playLevelUp();
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {}
    const res = dataService.addXP(mission.rewardXP);
    setClaimedMissions((prev) => ({ ...prev, [mission.id]: true }));
    if (onUserUpdate) {
      onUserUpdate(dataService.getCurrentUser());
    }
  };

  const handleClaimBadgeReward = (badge: Achievement) => {
    if (!badge.unlocked || badge.rewardClaimed) return;
    const result = dataService.claimBadgeReward(badge.id);
    if (result.success) {
      setAchievements(dataService.getAchievements());
      if (onUserUpdate) {
        onUserUpdate(result.user);
      }
      
      sound.playSuccess();
      try {
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#3b82f6', '#10b981'],
          disableForReducedMotion: true,
          zIndex: 9999
        });
      } catch {}
      
      showCelebrationToast(`Tebrikler! "${badge.title}" rozet ödülü +${result.xpAwarded} XP hesabına eklendi! 🎉`);
    }
  };

  const handleToggleEquipBadge = (badgeId: string) => {
    sound.playClick();
    const currentEquipped = activeUser.featuredBadgeIds || [];
    const isEquipped = currentEquipped.includes(badgeId);

    if (isEquipped) {
      const result = dataService.unequipBadge(badgeId);
      if (onUserUpdate) onUserUpdate(result.user);
      setToastMessage('Rozet vitrinden çıkarıldı.');
      setTimeout(() => setToastMessage(null), 2500);
    } else {
      const result = dataService.equipBadge(badgeId);
      if (result.success) {
        if (onUserUpdate) onUserUpdate(result.user);
        showCelebrationToast('Rozet başarıyla profil vitrinine eklendi! 🌟');
      } else if (result.message) {
        alert(result.message);
      }
    }
  };

  const handleShareBadge = (badge: Achievement) => {
    sound.playClick();
    const shareText = `yapyap BİLSEM platformunda "${badge.title}" rozetini kazandım! 🎉 Zihinsel potansiyelimi geliştiriyorum. Sen de denemelisin!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'yapyap BİLSEM Başarısı',
        text: shareText,
        url: window.location.origin,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText + ' ' + window.location.origin);
      showCelebrationToast('Rozet metni panoya kopyalandı! Sosyal medyada paylaşabilirsin. 💬');
    }
  };

  // Badge statistics
  const totalBadges = achievements.length;
  const unlockedBadges = achievements.filter((a) => a.unlocked);
  const unlockedCount = unlockedBadges.length;
  const completionPercentage = Math.round((unlockedCount / totalBadges) * 100);

  const totalEarnedBadgeXP = unlockedBadges.reduce((acc, curr) => acc + (curr.rewardXP || 0), 0);

  const bronzeCount = unlockedBadges.filter((b) => b.tier === 'bronze').length;
  const silverCount = unlockedBadges.filter((b) => b.tier === 'silver').length;
  const goldCount = unlockedBadges.filter((b) => b.tier === 'gold').length;
  const diamondCount = unlockedBadges.filter((b) => b.tier === 'diamond').length;

  // Next badge in progress
  const nextTargetBadge = useMemo(() => {
    const inProgress = achievements
      .filter((a) => !a.unlocked && a.maxProgress > 0)
      .sort((a, b) => (b.progress / b.maxProgress) - (a.progress / a.maxProgress));
    return inProgress[0] || null;
  }, [achievements]);

  // Filtered badges list
  const filteredBadges = useMemo(() => {
    return achievements.filter((b) => {
      // Category
      if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;

      // Tier
      if (tierFilter !== 'all' && b.tier !== tierFilter) return false;

      // Status
      if (statusFilter === 'unlocked' && !b.unlocked) return false;
      if (statusFilter === 'locked' && b.unlocked) return false;
      if (statusFilter === 'almost') {
        const ratio = b.progress / b.maxProgress;
        if (b.unlocked || ratio < 0.6) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = b.title.toLowerCase().includes(q);
        const matchesDesc = b.description.toLowerCase().includes(q);
        const matchesPedagogy = b.pedagogyNote?.toLowerCase().includes(q);
        const matchesCriteria = b.criteriaLabel?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesPedagogy && !matchesCriteria) {
          return false;
        }
      }

      return true;
    });
  }, [achievements, categoryFilter, tierFilter, statusFilter, searchQuery]);

  // Helper for tier styling
  const getTierVisuals = (tier?: BadgeTier) => {
    switch (tier) {
      case 'diamond':
        return {
          badgeBg: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 text-white',
          border: 'border-purple-300 ring-1 ring-purple-400/30',
          badgeText: 'text-purple-700 bg-purple-100',
          glow: ' ',
          label: 'Elmas & Efsanevi',
          accent: 'text-purple-600',
          iconBg: 'bg-purple-600 text-white',
        };
      case 'gold':
        return {
          badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
          border: 'border-amber-300 ring-1 ring-amber-400/30',
          badgeText: 'text-amber-800 bg-amber-100',
          glow: ' ',
          label: 'Altın',
          accent: 'text-amber-600',
          iconBg: 'bg-amber-500 text-white',
        };
      case 'silver':
        return {
          badgeBg: 'bg-gradient-to-r from-slate-400 to-indigo-400 text-white',
          border: 'border-slate-300 ring-1 ring-slate-300/40',
          badgeText: 'text-slate-700 bg-slate-100',
          glow: '',
          label: 'Gümüş',
          accent: 'text-indigo-600',
          iconBg: 'bg-indigo-500 text-white',
        };
      case 'bronze':
      default:
        return {
          badgeBg: 'bg-gradient-to-r from-amber-700 to-orange-600 text-white',
          border: 'border-amber-200 ring-1 ring-amber-200/40',
          badgeText: 'text-amber-900 bg-amber-50',
          glow: '',
          label: 'Bronz',
          accent: 'text-amber-700',
          iconBg: 'bg-orange-500 text-white',
        };
    }
  };

  const equippedBadgeObjects = (activeUser.featuredBadgeIds || [])
    .map((id) => achievements.find((a) => a.id === id))
    .filter(Boolean) as Achievement[];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl  border border-slate-700 flex items-center gap-3 animate-fade-in text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2.5 rounded-xl bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer  active:scale-95"
            title="Öğrenci Paneline Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Öğrenci Rozet Sistemi & Başarılar
              </h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                BİLSEM Vitrini
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Zihinsel süreklilik, problem çözme azmi ve bilişsel ustalık rozetlerin
            </p>
          </div>
        </div>

        {onStartPractice && (
          <button
            onClick={onStartPractice}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm   active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Rozet İçin Soru Çöz</span>
          </button>
        )}
      </div>

      {/* STUDENT PROFILE & FEATURED BADGES SHOWCASE CARD */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7  border border-indigo-900/50">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar & Student Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 backdrop-blur-md border-2 border-amber-400/40 flex items-center justify-center text-3xl sm:text-4xl  shrink-0">
                {activeUser.avatar || '🦊'}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-slate-900">
                Sv.{activeUser.level || 1}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold font-['Outfit',sans-serif]">
                  {activeUser.name || 'Öğrenci'}
                </h2>
                <span className="text-[11px] font-semibold text-indigo-200 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  {activeUser.grade || 2}. Sınıf BİLSEM Adayı
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {activeUser.xp || 0} Toplam XP
                </span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1 font-bold text-orange-400">
                  <Flame className="w-3.5 h-3.5 fill-orange-400" />
                  {activeUser.streak || 1} Günlük Kesintisiz Seri
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-indigo-300">
                  En Uzun: {activeUser.longestStreak || activeUser.streak || 1} Gün
                </span>
              </div>
            </div>
          </div>

          {/* FEATURED BADGES SHOWCASE (3 SLOTS) */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 sm:p-4.5 flex flex-col gap-2 min-w-[280px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-amber-300 flex items-center gap-1.5 font-['Outfit',sans-serif]">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Profil Vitrin Rozetlerin (Maks. 3)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {equippedBadgeObjects.length} / 3 Takıldı
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[0, 1, 2].map((slotIdx) => {
                const badge = equippedBadgeObjects[slotIdx];
                if (badge) {
                  const visuals = getTierVisuals(badge.tier);
                  return (
                    <div
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge)}
                      className="group relative p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-amber-300/60 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 active:scale-95"
                      title={`${badge.title} - Detayları gör veya çıkar`}
                    >
                      <span className="text-2xl filter drop- group-hover:scale-110 transition-transform">
                        {badge.badgeIcon || '🏅'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-200 line-clamp-1">
                        {badge.title}
                      </span>
                      <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {visuals.label}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={slotIdx}
                    className="p-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center text-center gap-1 text-slate-400"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs">
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[9px] font-medium text-slate-400">
                      Boş Yuva
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Aşağıdaki kazanılmış rozetlerden birini seçerek vitrine ekleyebilirsin.
            </p>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Seviye {user.level} Tamamlama</span>
            <span className="font-mono text-amber-300 font-bold">
              {user.xp % 250} / 250 XP
            </span>
          </div>
          <div className="w-full sm:w-64 h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(((user.xp % 250) / 250) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ROZET KOLEKSİYONU & SÜREKLİLİK ÖZET İSTATİSTİKLERİ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/80  flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Kazanılan Rozetler</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <strong className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              {unlockedCount}
            </strong>
            <span className="text-xs text-slate-400 font-semibold">/ {totalBadges}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/80  flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Rozetlerden Gelen XP</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <strong className="text-2xl font-extrabold text-amber-600 font-['Outfit',sans-serif]">
              +{totalEarnedBadgeXP}
            </strong>
            <span className="text-xs text-amber-800 font-bold">XP</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2">
            Seviye atlamana doğrudan katkı sağlar
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white/80  flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Süreklilik Serisi</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <strong className="text-2xl font-extrabold text-orange-600 font-['Outfit',sans-serif] flex items-center gap-1">
              <Flame className="w-5 h-5 fill-orange-500" />
              {user.streak}
            </strong>
            <span className="text-xs text-orange-800 font-bold">Gün</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-2">
            🔥 Süreklilik rozetleri açık
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white/80  flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Koleksiyon Kademeleri</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
              🥉 {bronzeCount}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold">
              🥈 {silverCount}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
              🥇 {goldCount}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
              💎 {diamondCount}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2">
            Özel BİLSEM madalya dağılımı
          </span>
        </div>
      </div>

      {/* NEXT TARGET BADGE HERO BANNER (IF ANY) */}
      {nextTargetBadge && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-2xl  shrink-0">
              {nextTargetBadge.badgeIcon || '🎯'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Kazanmaya Çok Yakınsın!
                </span>
                <span className="text-xs font-bold text-amber-800">
                  +{nextTargetBadge.rewardXP} XP
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                {nextTargetBadge.title}: {nextTargetBadge.criteriaLabel || nextTargetBadge.description}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                {nextTargetBadge.pedagogyNote || nextTargetBadge.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto shrink-0">
            <div className="text-right sm:w-28">
              <span className="text-xs font-mono font-bold text-amber-900">
                {nextTargetBadge.progress} / {nextTargetBadge.maxProgress}
              </span>
              <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((nextTargetBadge.progress / nextTargetBadge.maxProgress) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {onStartPractice && (
              <button
                onClick={onStartPractice}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs  active:scale-95 transition-all cursor-pointer shrink-0"
              >
                Hemen Tamamla →
              </button>
            )}
          </div>
        </div>
      )}

      {/* DAILY MISSIONS SECTION */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-['Outfit',sans-serif]">
            <Zap className="w-5 h-5 text-indigo-600" />
            <span>Günün Süreklilik Görevleri</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Her gün 00:00'da yenilenir
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {missions.map((m, i) => {
            const isClaimed = !!claimedMissions[m.id];
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
                whileHover={{ scale: 1.02 }}
                key={m.id}
                className="p-4 rounded-xl bg-slate-50 border border-zinc-200/80 flex flex-col justify-between gap-3  hover: transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      +{m.rewardXP} XP
                    </span>
                    <span className="font-semibold text-slate-400 text-[11px]">
                      {m.current} / {m.target}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{m.title}</h4>
                </div>

                <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between">
                  {m.completed ? (
                    isClaimed ? (
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ödül Alındı</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaimMissionReward(m)}
                        className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs  transition-all cursor-pointer active:scale-98 animate-pulse"
                      >
                        Ödülü Al (+{m.rewardXP} XP)
                      </button>
                    )
                  ) : (
                    <div className="w-full">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${Math.round((m.current / m.target) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Devam ediyor
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH BAR */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-3">
          {[
            { id: 'all', label: 'Tüm Rozetler', icon: Trophy },
            { id: 'streak', label: '🔥 Süreklilik & Alışkanlık', icon: Flame },
            { id: 'questions', label: '🎯 Soru Maratonu', icon: Star },
            { id: 'special', label: '🛡️ Hata Fatihi & Azim', icon: ShieldCheck },
            { id: 'mastery', label: '🧠 Bilişsel Ustalık', icon: Brain },
            { id: 'exam', label: '🏅 Deneme & Hız', icon: Award },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sound.playClick();
                setCategoryFilter(cat.id as CategoryFilter);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white '
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-Filters: Status & Tier & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <span className="text-slate-400 font-semibold text-[11px]">Durum:</span>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'unlocked', label: 'Açılanlar' },
              { id: 'locked', label: 'Kilitliler' },
              { id: 'almost', label: 'Az Kalanlar (%60+)' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as StatusFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === st.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}

            <span className="text-slate-300 mx-1">|</span>

            {/* Tier Filter */}
            <span className="text-slate-400 font-semibold text-[11px]">Kademe:</span>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'bronze', label: 'Bronz' },
              { id: 'silver', label: 'Gümüş' },
              { id: 'gold', label: 'Altın' },
              { id: 'diamond', label: 'Elmas' },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTierFilter(tf.id as TierFilter)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                  tierFilter === tf.id
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rozet veya beceri ara..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-zinc-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BADGES MAIN GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Toplam <strong>{filteredBadges.length}</strong> rozet listeleniyor
          </span>
          {unlockedCount === totalBadges && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Tüm rozetler tamamlandı! Muhteşem BİLSEM hazırlığı!
            </span>
          )}
        </div>

        {filteredBadges.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-zinc-200 text-slate-500 space-y-3">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">Seçili filtrelere uygun rozet bulunamadı.</p>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
                setTierFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Filtreleri Sıfırla
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBadges.map((badge) => {
              const visuals = getTierVisuals(badge.tier);
              const isEquipped = (user.featuredBadgeIds || []).includes(badge.id);
              const hasClaimableReward = badge.unlocked && !badge.rewardClaimed;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={badge.unlocked ? { scale: 1.02, y: -4 } : { scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`relative p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left group ${
                    badge.unlocked
                      ? `bg-white ${visuals.border} ${visuals.glow}  hover:`
                      : 'bg-slate-50/70 border-zinc-200/80 opacity-75 hover:opacity-100 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Top Badges & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl  shrink-0 transition-transform group-hover:scale-105 ${
                          badge.unlocked ? 'bg-slate-100 border border-zinc-200' : 'bg-slate-200/80 grayscale'
                        }`}
                      >
                        {badge.badgeIcon || '🏅'}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${visuals.badgeText}`}
                          >
                            {visuals.label}
                          </span>
                          {badge.rewardXP && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                              +{badge.rewardXP} XP
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mt-1 font-['Outfit',sans-serif]">
                          {badge.title}
                        </h4>
                      </div>
                    </div>

                    {/* Lock or Equipped Indicator */}
                    <div className="shrink-0">
                      {badge.unlocked ? (
                        isEquipped ? (
                          <span
                            title="Profil Vitrinine Takılı"
                            className="p-1 rounded-lg bg-amber-100 text-amber-900 block border border-amber-300"
                          >
                            <Crown className="w-3.5 h-3.5 fill-amber-400" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                            ✓
                          </span>
                        )
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description & Criteria */}
                  <div className="space-y-1 my-1">
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {badge.description}
                    </p>
                    {badge.criteriaLabel && (
                      <p className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                        <span>Hedef:</span>
                        <span>{badge.criteriaLabel}</span>
                      </p>
                    )}
                  </div>

                  {/* Progress / Actions */}
                  <div className="pt-3 border-t border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      {badge.unlocked ? (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Kazanıldı</span>
                          {badge.unlockedAt && (
                            <span className="text-slate-400 font-normal">
                              ({badge.unlockedAt})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          İlerleme: <strong>{badge.progress}</strong> / {badge.maxProgress}
                        </span>
                      )}

                      <span className="text-slate-400 text-[10px] group-hover:text-indigo-600 font-bold transition-colors">
                        Detaylar →
                      </span>
                    </div>

                    {!badge.unlocked && (
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((badge.progress / badge.maxProgress) * 100))}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Claim Button if Unlocked & Not Claimed */}
                    {hasClaimableReward && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimBadgeReward(badge);
                        }}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs   active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>Ödülü Al (+{badge.rewardXP} XP)</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* BADGE INSPECTION & DETAIL MODAL */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-xl max-w-lg w-full p-6 sm:p-7  border border-zinc-200 space-y-5 relative"
            >
              {/* Close Button */}
              <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            {(() => {
              const visuals = getTierVisuals(selectedBadge.tier);
              const isEquipped = (user.featuredBadgeIds || []).includes(selectedBadge.id);

              return (
                <>
                  <div className="flex flex-col items-center text-center gap-3 pt-2">
                    <div
                      className={`w-24 h-24 rounded-xl flex items-center justify-center text-5xl  border-2 ${
                        selectedBadge.unlocked
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-slate-100 border-slate-300 grayscale'
                      }`}
                    >
                      {selectedBadge.badgeIcon || '🏅'}
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`text-xs font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full ${visuals.badgeText}`}
                        >
                          {visuals.label} Rozet
                        </span>
                        {selectedBadge.rewardXP && (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            +{selectedBadge.rewardXP} XP Ödül
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif] mt-2">
                        {selectedBadge.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md">
                        {selectedBadge.description}
                      </p>
                    </div>
                  </div>

                  {/* Pedagogical & Child Development Benefit Note */}
                  {selectedBadge.pedagogyNote && (
                    <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 text-left">
                      <Brain className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-extrabold text-indigo-950 font-['Outfit',sans-serif]">
                          Pedagojik & Bilişsel Değer
                        </h4>
                        <p className="text-xs text-indigo-900 mt-0.5 leading-relaxed">
                          {selectedBadge.pedagogyNote}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Criteria & Current Progress */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200/80 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Gereksinim:</span>
                      <strong className="text-slate-900">
                        {selectedBadge.criteriaLabel || selectedBadge.description}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-semibold text-slate-600">Durum:</span>
                      {selectedBadge.unlocked ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Kazanıldı {selectedBadge.unlockedAt ? `(${selectedBadge.unlockedAt})` : ''}
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold">
                          {selectedBadge.progress} / {selectedBadge.maxProgress} Tamamlandı
                        </span>
                      )}
                    </div>

                    {!selectedBadge.unlocked && (
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((selectedBadge.progress / selectedBadge.maxProgress) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions in Modal */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    {selectedBadge.unlocked ? (
                      <>
                        <div className="flex w-full gap-2">
                          <button
                            onClick={() => handleToggleEquipBadge(selectedBadge.id)}
                            className={`flex-1 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2  active:scale-98 ${
                              isEquipped
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                : 'bg-amber-500 hover:bg-amber-600 text-white '
                            }`}
                          >
                            <Crown className="w-4 h-4" />
                            <span>
                              {isEquipped ? 'Çıkar' : 'Sergile'}
                            </span>
                          </button>

                          <button
                            onClick={() => handleShareBadge(selectedBadge)}
                            className="px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2  active:scale-98"
                            title="Sosyal Medyada Paylaş"
                          >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Paylaş</span>
                          </button>
                        </div>

                        {!selectedBadge.rewardClaimed && selectedBadge.rewardXP && (
                          <button
                            onClick={() => {
                              handleClaimBadgeReward(selectedBadge);
                              setSelectedBadge((prev) => prev ? { ...prev, rewardClaimed: true } : null);
                            }}
                            className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2  active:scale-98"
                          >
                            <Sparkles className="w-4 h-4 text-emerald-200" />
                            <span>Ödülü Al (+{selectedBadge.rewardXP} XP)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      onStartPractice && (
                        <button
                          onClick={() => {
                            setSelectedBadge(null);
                            onStartPractice();
                          }}
                          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2   active:scale-98"
                        >
                          <Zap className="w-4 h-4 text-amber-300" />
                          <span>Bu Rozet İçin Hemen Pratik Yap</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setSelectedBadge(null)}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      Kapat
                    </button>
                  </div>
                </>
              );
            })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
