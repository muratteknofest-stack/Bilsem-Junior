import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  DailyStudyPlan, 
  SkillMastery, 
  CognitiveCategory,
  COGNITIVE_CATEGORY_LABELS 
} from '../types';
import {
  Brain,
  Target,
  Flame,
  Award,
  Zap,
  TrendingUp,
  RotateCcw,
  Star,
  Trophy,
  BookOpen,
  Activity,
  Play,
  Copy,
  Check,
  KeyRound,
  Sparkles,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  BarChart3,
  Calendar,
  Clock,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { sound } from '../lib/sound';
import { dataService } from '../services/data-service';
import { DailyStreakCard } from './DailyStreakCard';
import { DailyGoalProgressCard } from './DailyGoalProgressCard';
import { BadgesSection } from './BadgesSection';
import { WeeklyProgressChartCard } from './WeeklyProgressChartCard';
import { TodayPersonalizedStudyPlanCard } from './TodayPersonalizedStudyPlanCard';
import { WeeklyChallengesView } from './WeeklyChallengesView';
import { WeeklyChallengesBannerCard } from './WeeklyChallengesBannerCard';
import {
  CardSkeleton,
  ChartSkeleton,
  ProfileBannerSkeleton,
  DailyTaskSkeleton,
  ModeCardSkeleton,
  MasterySkeleton,
} from './Skeletons';

interface StudentDashboardProps {
  isLoading?: boolean;
  user?: UserProfile | null;
  dailyPlan?: DailyStudyPlan | null;
  masteries?: SkillMastery[];
  mistakes?: any[];
  onUserUpdate: (u: UserProfile) => void;
  onStartPractice: (category?: string) => void;
  onStartAdaptive: () => void;
  onStartExam: () => void;
  onOpenMistakes: () => void;
  onNavigate: (view: string) => void;
}

const CATEGORY_STYLE_CONFIG: Record<string, {
  color: string;
  bgLight: string;
  borderLight: string;
  gradient: string;
  icon: any;
}> = {
  pattern: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderLight: 'border-emerald-200/60 dark:border-emerald-800/40',
    gradient: 'from-emerald-500 to-teal-400',
    icon: Sparkles
  },
  matrix: {
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderLight: 'border-indigo-200/60 dark:border-indigo-800/40',
    gradient: 'from-indigo-500 to-violet-500',
    icon: Layers
  },
  attention: {
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    borderLight: 'border-amber-200/60 dark:border-amber-800/40',
    gradient: 'from-amber-500 to-orange-400',
    icon: Target
  },
  spatial: {
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50 dark:bg-purple-950/30',
    borderLight: 'border-purple-200/60 dark:border-purple-800/40',
    gradient: 'from-purple-500 to-fuchsia-500',
    icon: Compass
  },
  logic: {
    color: 'text-sky-600 dark:text-sky-400',
    bgLight: 'bg-sky-50 dark:bg-sky-950/30',
    borderLight: 'border-sky-200/60 dark:border-sky-800/40',
    gradient: 'from-sky-500 to-blue-500',
    icon: Lightbulb
  },
  memory: {
    color: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderLight: 'border-rose-200/60 dark:border-rose-800/40',
    gradient: 'from-rose-500 to-pink-500',
    icon: Brain
  },
  visual_perception: {
    color: 'text-teal-600 dark:text-teal-400',
    bgLight: 'bg-teal-50 dark:bg-teal-950/30',
    borderLight: 'border-teal-200/60 dark:border-teal-800/40',
    gradient: 'from-teal-500 to-cyan-500',
    icon: Activity
  },
  numerical: {
    color: 'text-violet-600 dark:text-violet-400',
    bgLight: 'bg-violet-50 dark:bg-violet-950/30',
    borderLight: 'border-violet-200/60 dark:border-violet-800/40',
    gradient: 'from-violet-500 to-indigo-500',
    icon: Zap
  },
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  isLoading = false,
  user,
  dailyPlan,
  masteries = [],
  mistakes = [],
  onUserUpdate,
  onStartPractice,
  onStartAdaptive,
  onStartExam,
  onOpenMistakes,
  onNavigate
}) => {
  const activeUser = user || dataService.getCurrentUser();
  const activeMistakes = mistakes && mistakes.length > 0 ? mistakes : dataService.getMistakes();
  
  const [activeTab, setActiveTab] = useState<'modes' | 'plan' | 'skills' | 'challenges' | 'progress'>('modes');
  const [copiedStudentCode, setCopiedStudentCode] = useState(false);
  const [cheeredUser, setCheeredUser] = useState<string | null>(null);

  const studentCodeDisplay = activeUser.studentCode || (activeUser.name ? `${activeUser.name.replace(/\s+/g, '').toUpperCase()}2026` : 'DEMIR2026');

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

  const handleCheerPeer = (id: string, name: string) => {
    sound.playSuccess();
    setCheeredUser(name);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    setTimeout(() => setCheeredUser(null), 2500);
  };

  const unresolvedMistakesCount = useMemo(() => 
    activeMistakes.filter(m => !m.resolved).length,
  [activeMistakes]);

  const weeklyLeaderboard = useMemo(() => 
    dataService.getLeaderboard('weekly'),
  []);

  const safeMasteries = useMemo(() => {
    const list = (masteries && masteries.length > 0 
      ? masteries 
      : dataService.getSkillMasteries()) || [];
    return list;
  }, [masteries]);

  // Weakest category for adaptive prompt
  const weakestSkill = useMemo(() => {
    if (safeMasteries.length === 0) return null;
    return [...safeMasteries].sort((a, b) => (a.mastery || 0) - (b.mastery || 0))[0];
  }, [safeMasteries]);

  // Next level XP calculations
  const nextLvlXp = activeUser.nextLevelXp || (activeUser.level * 250);
  const currentXp = activeUser.xp || 0;
  const progressPct = Math.min(100, Math.round((currentXp / nextLvlXp) * 100));
  const remainingXp = Math.max(0, nextLvlXp - currentXp);

  // Time based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Günaydın', emoji: '☀️' };
    if (hour >= 12 && hour < 18) return { text: 'Tünaydın', emoji: '🚀' };
    return { text: 'İyi Akşamlar', emoji: '🌙' };
  }, []);

  if (isLoading) {
    return (
      <main id="student-dashboard" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-24 lg:pb-12 min-h-screen">
        <ProfileBannerSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-8">
            <DailyTaskSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModeCardSkeleton />
              <ModeCardSkeleton />
            </div>
          </div>
          <div className="space-y-6">
            <CardSkeleton className="h-[210px]" />
            <ChartSkeleton className="h-[320px]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      
      {/* Dynamic Animated Subtle Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-20 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1.1, 1, 1.1],
            x: [0, -35, 0],
            y: [0, 40, 0],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-80 -right-20 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl"
        />
      </div>

      <main id="student-dashboard" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        
        {/* Next-Gen Futuristic Profile Hero Banner */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 md:p-8 shadow-sm transition-all"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Student Info & Level Progress */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
              
              {/* Animated 3D-Feel Floating Avatar */}
              <motion.div 
                whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAvatarClick}
                className="relative w-22 h-22 rounded-3xl bg-gradient-to-br from-indigo-50 via-indigo-100/70 to-indigo-200/50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-5xl shadow-md border-2 border-indigo-200/60 dark:border-indigo-500/20 shrink-0 cursor-pointer group select-none"
              >
                <motion.span 
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  {activeUser.avatar || '🦊'}
                </motion.span>

                {/* Level Badge on Avatar */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full ring-4 ring-white dark:ring-zinc-900 shadow-md flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  <span>{activeUser.level || 1}</span>
                </div>
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight font-['Outfit',sans-serif]">
                    {greeting.text}, {activeUser.name?.split(' ')[0] || 'Zeka Şampiyonu'} {greeting.emoji}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                    <Sparkles className="w-3 h-3" /> {activeUser.title || 'BİLSEM Kaşifi'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                  Bilişsel hedeflerine bugün de bir adım daha yaklaşmaya hazır mısın?
                </p>

                {/* XP & Next Level Bar */}
                <div className="mt-4 max-w-md">
                  <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                      <Zap className="w-3.5 h-3.5 fill-current" /> Seviye {activeUser.level || 1}
                    </span>
                    <span>
                      <strong className="text-zinc-900 dark:text-white font-bold">{currentXp}</strong> / {nextLvlXp} XP 
                      <span className="text-zinc-400 ml-1 text-[11px]">({remainingXp} XP kaldı)</span>
                    </span>
                  </div>
                  
                  <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                    </motion.div>
                  </div>
                </div>

                {/* Student Code Badge */}
                {studentCodeDisplay && (
                  <div className="mt-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyStudentCode}
                      title="Giriş kodunu kopyala"
                      className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3 py-1 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/70 transition-colors cursor-pointer group"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-500 transition-colors" />
                      <span>Giriş Kodu: <strong className="tracking-wider font-mono text-zinc-900 dark:text-white">{studentCodeDisplay}</strong></span>
                      {copiedStudentCode ? (
                        <span className="text-emerald-500 flex items-center gap-1 font-bold"><Check className="w-3 h-3" /> Kopyalandı</span>
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                      )}
                    </motion.button>
                  </div>
                )}

              </div>
            </div>
            
            {/* Quick Interactive Stat Cards */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
              
              {/* Streak Pill */}
              <motion.button 
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStreakBadgeClick}
                className="flex-1 sm:flex-none flex items-center gap-3.5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-800/90 dark:to-zinc-800/40 border border-amber-200/60 dark:border-amber-500/20 rounded-2xl p-4 cursor-pointer shadow-xs text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
                  <Flame className="w-6 h-6 animate-pulse fill-current" />
                </div>
                <div>
                  <div className="text-xl font-black text-amber-950 dark:text-amber-400 leading-tight flex items-center gap-1">
                    {activeUser.streak || 0} Gün
                  </div>
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-500/80 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-indigo-500" /> {activeUser.streakFreezeCount || 0} Kalkan
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
                className="flex-1 sm:flex-none flex items-center gap-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-800/90 dark:to-zinc-800/40 border border-indigo-200/60 dark:border-indigo-500/20 rounded-2xl p-4 cursor-pointer shadow-xs text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="text-xl font-black text-indigo-950 dark:text-indigo-400 leading-tight">
                    #{activeUser.rank || 1}
                  </div>
                  <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                    Liderlikte <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.button>

            </div>

          </div>
        </motion.section>

        {/* Dynamic AI Weakness Callout Banner */}
        {weakestSkill && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-zinc-900 border border-amber-300/60 dark:border-amber-500/30 rounded-3xl relative overflow-hidden backdrop-blur-md shadow-sm"
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  <Brain className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      Adaptif Yapay Zeka Tespiti
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Başarı: %{Math.round(weakestSkill.mastery || 0)}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1 font-['Outfit',sans-serif]">
                    {weakestSkill.categoryName} Alanında Hızlı Gelişim Fırsatı!
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-0.5 max-w-xl">
                    Son analizlere göre bu kategoriyi pekiştirmek BİLSEM denemelerindeki puanını doğrudan %15 artırabilir.
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sound.playClick();
                  onStartPractice(weakestSkill.category);
                }}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                {weakestSkill.categoryName.split(' ')[0]} Antrenmanına Başla
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Modern Segmented Navigation Bar */}
        <div className="flex p-1.5 bg-zinc-200/70 dark:bg-zinc-900/80 rounded-2xl w-fit border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md shadow-inner gap-1 flex-wrap sm:flex-nowrap">
          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('modes');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'modes' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'modes' && (
              <motion.div 
                layoutId="activeStudentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" /> Hızlı Modlar
            </span>
          </button>

          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('plan');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'plan' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'plan' && (
              <motion.div 
                layoutId="activeStudentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Günün AI Planı
            </span>
          </button>

          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('skills');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'skills' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'skills' && (
              <motion.div 
                layoutId="activeStudentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" /> Bilişsel Yetenekler
            </span>
          </button>

          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('challenges');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'challenges' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'challenges' && (
              <motion.div 
                layoutId="activeStudentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Haftalık Görevler
              <span className="text-[10px] font-black px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-full">
                Rozetli
              </span>
            </span>
          </button>

          <button 
            onClick={() => {
              sound.playClick();
              setActiveTab('progress');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'progress' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'progress' && (
              <motion.div 
                layoutId="activeStudentTab"
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/40"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" /> Haftalık İlerleme
            </span>
          </button>
        </div>

        {/* Dashboard 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            
            <AnimatePresence mode="wait">
              
              {/* TAB 1: QUICK MODES (Hızlı Modlar) */}
              {activeTab === 'modes' && (
                <motion.div 
                  key="tab-modes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        BİLSEM Hazırlık Modları
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Zihnini güçlendirecek antrenman türünü seç ve hemen başla
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* 1. Adaptif BİLSEM Testi (Special Glow & Recommendation) */}
                    <motion.button
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        sound.playClick();
                        onStartAdaptive();
                      }}
                      className="group relative p-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white text-left shadow-lg shadow-indigo-500/20 overflow-hidden cursor-pointer flex flex-col justify-between h-52 border border-indigo-400/30"
                    >
                      <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                      
                      <div className="flex items-start justify-between w-full relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                          <Brain className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-400 text-zinc-900 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-current" /> Önerilen
                        </span>
                      </div>

                      <div className="relative z-10">
                        <h3 className="text-lg font-black text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
                          Adaptif Test
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </h3>
                        <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                          Yapay zeka başarına göre zorluğu anında ayarlar, eksiklerini kapatır.
                        </p>
                      </div>
                    </motion.button>

                    {/* 2. Gerçek Süreli Deneme Sınavı */}
                    <motion.button
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        sound.playClick();
                        onStartExam();
                      }}
                      className="group relative p-6 rounded-3xl bg-white dark:bg-zinc-900 text-left shadow-sm border border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between h-52"
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 group-hover:scale-110 transition-transform">
                          <Clock className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                          Süreli Simülasyon
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                          Deneme Sınavı
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-amber-500" />
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          Gerçek BİLSEM tablet sınavı formatında süreye karşı yeteneklerini sına.
                        </p>
                      </div>
                    </motion.button>

                    {/* 3. 10 Soru Karışık Pratik */}
                    <motion.button
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        sound.playClick();
                        onStartPractice('mixed');
                      }}
                      className="group relative p-6 rounded-3xl bg-white dark:bg-zinc-900 text-left shadow-sm border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between h-52"
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50 group-hover:scale-110 transition-transform">
                          <Target className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                          10 Soru Isınma
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                          Karışık Pratik
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-500" />
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          Tüm kategorilerden derlenen dinamik soru setiyle zihnini zinde tut.
                        </p>
                      </div>
                    </motion.button>

                    {/* 4. Hata Defteri (Hata Avcısı) */}
                    <motion.button
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        sound.playClick();
                        onOpenMistakes();
                      }}
                      className="group relative p-6 rounded-3xl bg-white dark:bg-zinc-900 text-left shadow-sm border border-zinc-200/80 dark:border-zinc-800 hover:border-rose-400 dark:hover:border-rose-500/50 transition-all cursor-pointer flex flex-col justify-between h-52"
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                          unresolvedMistakesCount > 0 
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/50 dark:border-rose-800/50' 
                            : 'bg-teal-50 dark:bg-teal-950/40 text-teal-500 border border-teal-200/50 dark:border-teal-800/50'
                        }`}>
                          <RotateCcw className="w-6 h-6" />
                        </div>
                        
                        {unresolvedMistakesCount > 0 ? (
                          <span className="text-[11px] font-extrabold bg-rose-500 text-white px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                            {unresolvedMistakesCount} Hata Bekliyor
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                            Tertemiz ✨
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] group-hover:text-rose-600 transition-colors flex items-center gap-1.5">
                          Hata Defteri
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-rose-500" />
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {unresolvedMistakesCount > 0 
                            ? 'Yanıldığın soruları pedagojik yapay zeka ipuçlarıyla yeniden çöz.' 
                            : 'Tüm hatalarını başarıyla çözdün! Yeni sorularla kendini geliştir.'}
                        </p>
                      </div>
                    </motion.button>

                  </div>

                  {/* Secondary Explore Row: Glossary & Weekly Challenges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bilişsel Sözlük & Mini Oyunlar Shortcut Card */}
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        sound.playClick();
                        onNavigate('glossary');
                      }}
                      className="p-5 rounded-3xl bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-950/30 dark:to-purple-950/30 border border-sky-200/80 dark:border-sky-800/40 flex items-center justify-between gap-4 cursor-pointer hover:border-sky-400 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 group-hover:rotate-6 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-['Outfit',sans-serif] truncate">
                              Bilişsel Sözlük
                            </h4>
                            <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded-full shrink-0">
                              Simülatör
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            İnteraktif görsel kavram mini oyunları
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0 shadow-xs">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </motion.div>

                    {/* Haftalık Bilişsel Görevler & Rozetler Shortcut Card */}
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        sound.playClick();
                        setActiveTab('challenges');
                      }}
                      className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-violet-500/10 dark:from-amber-950/30 dark:to-indigo-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between gap-4 cursor-pointer hover:border-amber-400 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:rotate-6 transition-transform">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-['Outfit',sans-serif] truncate">
                              Haftalık Görevler
                            </h4>
                            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full shrink-0">
                              8 Rozet
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            Kategori hedeflerini tamamla, rozetleri kap
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 shadow-xs">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: AI PERSONALIZED STUDY PLAN */}
              {activeTab === 'plan' && (
                <motion.div 
                  key="tab-plan"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <TodayPersonalizedStudyPlanCard
                    user={activeUser}
                    masteries={safeMasteries}
                    mistakes={activeMistakes}
                    onStartPractice={(category) => onStartPractice(category)}
                    onStartAdaptive={onStartAdaptive}
                    onOpenMistakes={onOpenMistakes}
                    onUserUpdate={onUserUpdate}
                  />
                </motion.div>
              )}

              {/* TAB 3: 8 COGNITIVE SKILLS MATRIX */}
              {activeTab === 'skills' && (
                <motion.div 
                  key="tab-skills"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-500" />
                        8 Bilişsel Zeka Alanı
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Her alandaki ustalık dereceni gör ve istediğin alanda anında antrenmana başla
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {safeMasteries.map((m: SkillMastery, i: number) => {
                      const cfg = CATEGORY_STYLE_CONFIG[m.category] || {
                        color: 'text-indigo-600 dark:text-indigo-400',
                        bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
                        borderLight: 'border-indigo-200/60 dark:border-indigo-800/40',
                        gradient: 'from-indigo-500 to-purple-500',
                        icon: Sparkles
                      };
                      const Icon = cfg.icon;
                      const masteryPct = Math.min(100, Math.max(0, m.mastery || 0));

                      return (
                        <motion.div
                          key={m.category}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          whileHover={{ y: -3 }}
                          className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-11 h-11 rounded-2xl ${cfg.bgLight} ${cfg.color} flex items-center justify-center border ${cfg.borderLight} group-hover:scale-110 transition-transform`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${cfg.bgLight} ${cfg.color} border ${cfg.borderLight}`}>
                                %{masteryPct} Ustalık
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {m.categoryName}
                            </h3>

                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 mb-1.5 font-medium">
                              <span>{m.attemptCount || 0} Çözülen Soru</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">%{m.accuracy || 0} Doğruluk</span>
                            </div>

                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 }}
                                className={`h-full bg-gradient-to-r ${cfg.gradient} rounded-full`}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              sound.playClick();
                              onStartPractice(m.category);
                            }}
                            className="mt-4 w-full py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Bu Kategoride Pratik Yap
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: WEEKLY CHALLENGES (HAFTALIK BİLİŞSEL GÖREVLER & ROZETLER) */}
              {activeTab === 'challenges' && (
                <motion.div 
                  key="tab-challenges"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <WeeklyChallengesView
                    user={activeUser}
                    onStartPractice={(category) => onStartPractice(category)}
                    onUserUpdate={onUserUpdate}
                    onNavigateToBadges={() => onNavigate && onNavigate('achievements')}
                  />
                </motion.div>
              )}

              {/* TAB 5: WEEKLY PROGRESS CHARTS */}
              {activeTab === 'progress' && (
                <motion.div 
                  key="tab-progress"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <WeeklyProgressChartCard 
                    user={activeUser}
                    onStartPractice={() => onStartPractice('mixed')}
                  />
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* Right Sidebar Gamification Area (1 Col) */}
          <aside className="space-y-6">
            
            {/* Daily Streak Card with Milestones & Freeze */}
            <DailyStreakCard 
              user={activeUser} 
              onUserUpdate={onUserUpdate} 
            />

            {/* Weekly Challenges Banner Card */}
            <WeeklyChallengesBannerCard
              user={activeUser}
              onOpenChallenges={() => setActiveTab('challenges')}
              onStartPractice={(cat) => onStartPractice(cat)}
            />
            
            {/* Daily Goal Card (Interactive Questions / Time Modes) */}
            <DailyGoalProgressCard 
              user={activeUser}
              dailyPlan={dailyPlan || undefined}
              onUserUpdate={onUserUpdate}
              onStartPractice={() => onStartPractice('mixed')}
            />

            {/* Badges Section */}
            <BadgesSection 
              user={activeUser} 
              mistakes={activeMistakes} 
              onUserUpdate={onUserUpdate}
              onOpenMistakes={onOpenMistakes}
              onStartPractice={() => onStartPractice()}
              onNavigate={onNavigate}
            />

            {/* Weekly Leaderboard Widget with Interactive Cheer */}
            <article className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif]">
                    Haftalık Liderlik
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
                  Canlı Sıralama
                </span>
              </div>

              {cheeredUser && (
                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 animate-in fade-in">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {cheeredUser} arkadaşına tebrik gönderildi! 🎉
                </div>
              )}

              <div className="space-y-2">
                {weeklyLeaderboard.slice(0, 5).map((lb: any, idx: number) => {
                  const isMe = lb.isMe || lb.name === activeUser.name;
                  const rank = lb.rank || idx + 1;
                  
                  return (
                    <div 
                      key={lb.id || idx} 
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isMe 
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-xs' 
                          : 'bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-5 text-xs font-black text-center ${
                          rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : rank === 3 ? 'text-amber-700' : 'text-zinc-400'
                        }`}>
                          {rank}
                        </span>
                        <span className="text-xl shrink-0">{lb.avatar || '⭐'}</span>
                        <div className="min-w-0 truncate">
                          <p className={`text-xs truncate ${isMe ? 'font-bold text-indigo-950 dark:text-indigo-200' : 'font-semibold text-zinc-800 dark:text-zinc-300'}`}>
                            {lb.name} {isMe && '(Sen)'}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {lb.score || lb.xp || 0} XP
                          </p>
                        </div>
                      </div>

                      {!isMe && (
                        <button
                          onClick={() => handleCheerPeer(lb.id || idx.toString(), lb.name)}
                          title="Tebrik Et / Alkışla"
                          className="px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-500 hover:text-amber-500 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0"
                        >
                          👏
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  sound.playClick();
                  onNavigate('leaderboard');
                }}
                className="w-full mt-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Tüm Sıralamayı Gör
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </article>

          </aside>

        </div>

      </main>
    </div>
  );
};
