import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardPeriod, UserProfile } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  Trophy,
  Medal,
  Flame,
  Zap,
  Sparkles,
  Crown,
  Shield,
  Clock,
  CheckCircle2,
  ThumbsUp,
  ArrowRight,
  TrendingUp,
  Award,
  Star,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeaderboardViewProps {
  currentUser?: UserProfile | null;
  onNavigateHome: () => void;
  onStartPractice: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUser,
  onNavigateHome,
  onStartPractice,
}) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [clappedIds, setClappedIds] = useState<Set<string>>(new Set());

  const refreshLeaderboard = () => {
    const list = dataService.getLeaderboard(period, gradeFilter);
    setEntries(list);
  };

  useEffect(() => {
    refreshLeaderboard();
    
    // Gerçek zamanlı hissi vermek için her 5 saniyede bir panoyu güncelle
    const interval = setInterval(() => {
      refreshLeaderboard();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [period, gradeFilter]);

  const handlePeriodChange = (newPeriod: LeaderboardPeriod) => {
    sound.playClick();
    setPeriod(newPeriod);
  };

  const handleGradeFilterChange = (filter: number | 'all') => {
    sound.playClick();
    setGradeFilter(filter);
  };

  const handleClap = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    sound.playSuccess();
    dataService.clapForUser(entryId);

    setClappedIds((prev) => new Set([...prev, entryId]));
    refreshLeaderboard();

    // Trigger celebratory small confetti burst
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 25,
      spread: 45,
      origin: { x, y },
      colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899'],
      disableForReducedMotion: true,
    });
  };

  // Identify current user's entry in current filtered list
  const userEntry = entries.find((e) => e.isCurrentUser);
  const top3 = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  // Position gap calculation for user to climb
  let gapToAhead: number | null = null;
  if (userEntry && userEntry.rank > 1) {
    const entryAhead = entries[userEntry.rank - 2];
    if (entryAhead) {
      gapToAhead = entryAhead.xpEarned - userEntry.xpEarned;
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-28 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 ">
        {/* Background glow ornaments */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-extrabold text-xs flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                BİLSEM Yıldızlar Ligi
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold">
                Canlı Sıralama
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] tracking-tight">
              {period === 'daily' ? '⚡ Günün En İyileri' : '📅 Haftanın Çalışkanları'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
              Akranlarınla zeka soruları çözerek yarış, günlük serini koru ve BİLSEM liginde üst sıralara tırman!
            </p>
          </div>

          {/* Privacy & Safety Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/15 text-xs text-indigo-100 flex items-start gap-2.5 max-w-xs shrink-0">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-white font-bold text-[11px] uppercase tracking-wider">
                Anonim ve Güvenli
              </strong>
              <p className="text-[11px] text-indigo-200 leading-tight mt-0.5">
                Öğrenci gizliliği için tüm isimler eğlenceli ve korumalı takma adlarla gösterilir.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Tabs: Period & Grade Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-xl border border-zinc-200 ">
        {/* Period Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => handlePeriodChange('daily')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              period === 'daily'
                ? 'bg-white text-indigo-700  font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Günün En İyileri</span>
          </button>

          <button
            onClick={() => handlePeriodChange('weekly')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              period === 'weekly'
                ? 'bg-white text-indigo-700  font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Haftanın Çalışkanları</span>
          </button>
        </div>

        {/* Grade Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">Sınıf:</span>
          {(['all', 2, 3, 4] as const).map((g) => (
            <button
              key={g}
              onClick={() => handleGradeFilterChange(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gradeFilter === g
                  ? 'bg-slate-900 text-white '
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {g === 'all' ? 'Tüm Sınıflar' : `${g}. Sınıf`}
            </button>
          ))}
        </div>
      </div>

      {/* Current User Highlight Banner */}
      {userEntry && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-indigo-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5  flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold   shrink-0">
              #{userEntry.rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                  {userEntry.anonymousAlias}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-950">
                  Senin Sıran
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Şu an <strong>{userEntry.xpEarned} XP</strong> ile <strong>{userEntry.rank}. sıradasın</strong>.
                {gapToAhead !== null && gapToAhead > 0 && (
                  <span className="text-indigo-700 font-bold ml-1">
                    (Bir üst sıraya geçmek için yalnızca {gapToAhead + 5} XP kaldı!)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto shrink-0">
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold px-4 py-2 bg-white rounded-xl border border-amber-200/80">
              <span className="flex items-center gap-1 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {userEntry.minutesSpent} dk
              </span>
              <span className="flex items-center gap-1 text-orange-600 font-bold">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                {userEntry.streak} Gün
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onStartPractice();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs   active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sıranı Yükselt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Podium (Visual Showcase) */}
      {top3.length >= 3 && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-zinc-200 ">
          <div className="text-center mb-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Şampiyonlar Podyumu
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto pt-4">
            {/* 2nd Place (Silver) */}
            <div className="flex flex-col items-center text-center order-1">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-2xl ">
                  {top3[1].avatar}
                </div>
                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center  border-2 border-white">
                  2
                </div>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[100px] sm:max-w-none">
                {top3[1].anonymousAlias}
              </h4>
              <span className="text-[11px] font-extrabold text-indigo-600 font-mono">
                {top3[1].xpEarned} XP
              </span>

              {/* Podium Step */}
              <div className="w-full mt-3 h-20 sm:h-24 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl border-t-2 border-slate-300 flex items-center justify-center text-slate-500 font-extrabold text-sm sm:text-base ">
                🥈 2. Sıra
              </div>
            </div>

            {/* 1st Place (Gold / Champion) */}
            <div className="flex flex-col items-center text-center order-2 -mt-4">
              <div className="relative mb-2">
                <Crown className="w-7 h-7 text-amber-500 fill-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-amber-200 to-amber-400 border-4 border-amber-300 flex items-center justify-center text-3xl sm:text-4xl  ">
                  {top3[0].avatar}
                </div>
                <div className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center  border-2 border-white">
                  1
                </div>
              </div>
              <h4 className="text-xs sm:text-base font-extrabold text-slate-900 truncate max-w-[110px] sm:max-w-none">
                {top3[0].anonymousAlias}
              </h4>
              <span className="text-xs sm:text-sm font-extrabold text-amber-600 font-mono">
                {top3[0].xpEarned} XP
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 mt-0.5">
                {top3[0].specialBadge || 'Lider'}
              </span>

              {/* Podium Step */}
              <div className="w-full mt-3 h-28 sm:h-34 bg-gradient-to-t from-amber-200 to-amber-100 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center text-amber-900 font-extrabold text-sm sm:text-lg ">
                🥇 1. Sıra
              </div>
            </div>

            {/* 3rd Place (Bronze) */}
            <div className="flex flex-col items-center text-center order-3">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-50 border-2 border-amber-300/80 flex items-center justify-center text-2xl ">
                  {top3[2].avatar}
                </div>
                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center  border-2 border-white">
                  3
                </div>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[100px] sm:max-w-none">
                {top3[2].anonymousAlias}
              </h4>
              <span className="text-[11px] font-extrabold text-indigo-600 font-mono">
                {top3[2].xpEarned} XP
              </span>

              {/* Podium Step */}
              <div className="w-full mt-3 h-16 sm:h-20 bg-gradient-to-t from-amber-100 to-amber-50 rounded-t-2xl border-t-2 border-amber-300 flex items-center justify-center text-amber-800 font-extrabold text-xs sm:text-sm ">
                🥉 3. Sıra
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-xl border border-zinc-200  overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Tüm Sıralama Listesi</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Toplam {entries.length} Öğrenci Yarışıyor
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-slate-50/70 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Sıra</th>
                <th className="py-3 px-4">Öğrenci (Anonim)</th>
                <th className="py-3 px-4 text-center">Sınıf</th>
                <th className="py-3 px-4 text-center">Çözülen Soru</th>
                <th className="py-3 px-4 text-center">Çalışma Süresi</th>
                <th className="py-3 px-4 text-center">Seri</th>
                <th className="py-3 px-4 text-right">Kazanılan XP</th>
                <th className="py-3 px-4 text-center w-24">Alkışla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isClapped = clappedIds.has(entry.id);
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      entry.isCurrentUser
                        ? 'bg-amber-50/70 hover:bg-amber-100/60 font-medium'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {entry.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs ">
                          🥇
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black text-xs ">
                          🥈
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs ">
                          🥉
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-slate-500 text-xs">
                          #{entry.rank}
                        </span>
                      )}
                    </td>

                    {/* Anonymous Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                          {entry.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 truncate">
                              {entry.anonymousAlias}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-300 text-amber-950">
                                Sen
                              </span>
                            )}
                          </div>
                          {entry.specialBadge && (
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              {entry.specialBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Grade */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600 text-xs">
                      {entry.grade}. Sınıf
                    </td>

                    {/* Questions */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 text-xs">
                      {entry.questionsSolved} Soru
                    </td>

                    {/* Minutes */}
                    <td className="py-3.5 px-4 text-center text-slate-600 text-xs">
                      {entry.minutesSpent} dk
                    </td>

                    {/* Streak */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200/60">
                        <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                        {entry.streak}g
                      </span>
                    </td>

                    {/* XP */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-extrabold text-indigo-700 text-sm">
                        {entry.xpEarned} XP
                      </span>
                    </td>

                    {/* Clap Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => handleClap(e, entry.id)}
                        title="Tebrik Et ve Alkışla!"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-90 ${
                          isClapped
                            ? 'bg-rose-100 text-rose-700 '
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>👏</span>
                        <span className="font-mono text-[11px]">{entry.clapsCount}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
