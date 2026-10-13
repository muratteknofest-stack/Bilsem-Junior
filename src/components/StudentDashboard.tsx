import { isAvailableCategory } from '../features/student/available-categories';
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  DailyStudyPlan, 
  SkillMastery, 
} from '../types';
import {
  Brain,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  Sparkles,
  BarChart3,
  Layers,
  Compass,
  Lightbulb,
  Activity,
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
import { GamificationArena } from './GamificationArena';
import { StudentStudyHub } from './StudentStudyHub';
import { WordwallLibrary } from './WordwallLibrary';
import { levelProgress } from '../features/student/study-hub-model';
import { getStudyFavorites, saveStudyFavorites } from '../services/student-preferences-service';
import { StudentHeroBanner } from './student/StudentHeroBanner';
import { StudentModesGrid } from './student/StudentModesGrid';
import { StudentSkillsGrid } from './student/StudentSkillsGrid';
import './landing/design-system.css';
import './dashboard-design-system.css';
import {
  CardSkeleton,
  ChartSkeleton,
  ProfileBannerSkeleton,
  DailyTaskSkeleton,
  ModeCardSkeleton,
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
  mistakes,
  onUserUpdate,
  onStartPractice,
  onStartAdaptive,
  onStartExam,
  onOpenMistakes,
  onNavigate
}) => {
  const activeUser = user || dataService.getCurrentUser();
  const activeMistakes = mistakes ?? dataService.getMistakes();
  
  const [activeTab, setActiveTab] = useState<'modes' | 'plan' | 'skills' | 'challenges' | 'progress'>('modes');
  const [cheeredUser, setCheeredUser] = useState<string | null>(null);
  const [favorites, setFavorites] = useState(getStudyFavorites);
  const [skillSearch, setSkillSearch] = useState('');
  const prefersReducedMotion = useReducedMotion();
  const [skillFilter, setSkillFilter] = useState<'all' | 'practice' | 'new'>('all');
  useEffect(() => { setFavorites(getStudyFavorites()); }, [activeUser.id]);

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
  [activeUser]);

  const safeMasteries = useMemo(() => {
    const list = (masteries && masteries.length > 0 
      ? masteries 
      : dataService.getSkillMasteries()) || [];
    return list;
  }, [masteries]);

  const visibleMasteries = safeMasteries.filter(m => {
    if (!isAvailableCategory(m.category)) return false;
    const matches = m.categoryName.toLocaleLowerCase('tr-TR').includes(skillSearch.trim().toLocaleLowerCase('tr-TR'));
    return matches && (skillFilter === 'all' || (skillFilter === 'new' ? !m.attemptCount : m.attemptCount > 0 && m.mastery < 80));
  });
  const weeklyStats = useMemo(() => dataService.getWeeklyQuestionProgressData(activeUser).summary, [activeUser]);
  const xpProgress = levelProgress(activeUser.xp);

  // Time based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Günaydın', emoji: '☀️' };
    if (hour >= 12 && hour < 18) return { text: 'Tünaydın', emoji: '🚀' };
    return { text: 'İyi Akşamlar', emoji: '🌙' };
  }, []);

  if (isLoading) {
    return (
      <main id="student-dashboard" className="zp-dashboard-page zp-student-dashboard w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 pb-24 lg:pb-12 min-h-screen">
        <ProfileBannerSkeleton />
        <div className="zp-student-content-grid">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <DailyTaskSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModeCardSkeleton />
              <ModeCardSkeleton />
            </div>
          </div>
          <div className="min-w-0 space-y-4 sm:space-y-6">
            <CardSkeleton className="h-[210px]" />
            <ChartSkeleton className="h-[320px]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="zp-dashboard-page zp-student-dashboard w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Animated Subtle Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={prefersReducedMotion ? undefined : {
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-20 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl"
        />
        <motion.div 
          animate={prefersReducedMotion ? undefined : {
            scale: [1.1, 1, 1.1],
            x: [0, -35, 0],
            y: [0, 40, 0],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-80 -right-20 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl"
        />
      </div>

      <main id="student-dashboard" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Subcomponent: StudentHeroBanner */}
        <StudentHeroBanner
          user={activeUser}
          greeting={greeting}
          xpProgress={xpProgress}
          onUserUpdate={onUserUpdate}
          onNavigate={onNavigate}
          prefersReducedMotion={prefersReducedMotion}
        />

        <GamificationArena user={activeUser}
          thisWeekQuestions={weeklyStats.thisWeekTotal} lastWeekQuestions={weeklyStats.lastWeekTotal}
          onPractice={() => onStartPractice?.('mixed')}
          onOpenChallenges={() => setActiveTab('challenges')} />
        
        <StudentStudyHub
          masteries={safeMasteries}
          unresolved={unresolvedMistakesCount}
          savedExam={dataService.getActiveExam()}
          favorites={favorites}
          onFavoriteChange={value => setFavorites(saveStudyFavorites(value))}
          onPractice={onStartPractice}
          onMistakes={onOpenMistakes}
          onResumeExam={onStartExam}
        />

        <WordwallLibrary key={`wordwall-${activeUser.id}-${activeUser.grade}`} initialGrade={activeUser.grade} />

        {/* Modern Segmented Navigation Bar */}
        <div className="zp-dashboard-tabs p-1.5 bg-zinc-200/70 dark:bg-zinc-900/80 rounded-2xl w-full border border-zinc-200/80 dark:border-zinc-800/80 shadow-inner gap-1" role="group" aria-label="Öğrenci paneli bölümleri">
          <button 
            type="button"
            aria-pressed={activeTab === 'modes'}
            onClick={() => {
              sound.playClick();
              setActiveTab('modes');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            type="button"
            aria-pressed={activeTab === 'plan'}
            onClick={() => {
              sound.playClick();
              setActiveTab('plan');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            type="button"
            aria-pressed={activeTab === 'skills'}
            onClick={() => {
              sound.playClick();
              setActiveTab('skills');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            type="button"
            aria-pressed={activeTab === 'challenges'}
            onClick={() => {
              sound.playClick();
              setActiveTab('challenges');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
            type="button"
            aria-pressed={activeTab === 'progress'}
            onClick={() => {
              sound.playClick();
              setActiveTab('progress');
            }}
            className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
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
        <div className="zp-student-content-grid">
          {/* Main Content Area (Left Col) */}
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <AnimatePresence mode="wait">
              {/* TAB 1: QUICK MODES (Subcomponent) */}
              {activeTab === 'modes' && (
                <StudentModesGrid
                  unresolvedMistakesCount={unresolvedMistakesCount}
                  onStartAdaptive={onStartAdaptive}
                  onStartExam={onStartExam}
                  onStartPractice={onStartPractice}
                  onOpenMistakes={onOpenMistakes}
                  onNavigate={onNavigate}
                  onOpenChallenges={() => setActiveTab('challenges')}
                />
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

              {/* TAB 3: COGNITIVE SKILLS MATRIX (Subcomponent) */}
              {activeTab === 'skills' && (
                <StudentSkillsGrid
                  safeMasteries={safeMasteries}
                  visibleMasteries={visibleMasteries}
                  skillSearch={skillSearch}
                  setSkillSearch={setSkillSearch}
                  skillFilter={skillFilter}
                  setSkillFilter={setSkillFilter}
                  categoryStyleConfig={CATEGORY_STYLE_CONFIG}
                  onStartPractice={onStartPractice}
                />
              )}

              {/* TAB 4: WEEKLY CHALLENGES */}
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

          {/* Right Sidebar Gamification Area (Right Col) */}
          <aside className="min-w-0 space-y-4 sm:space-y-6">
            <DailyStreakCard 
              user={activeUser} 
              onUserUpdate={onUserUpdate} 
              onStartPractice={() => onStartPractice('mixed')}
              onOpenDetailsModal={() => onNavigate('achievements')}
            />

            <WeeklyChallengesBannerCard
              user={activeUser}
              onOpenChallenges={() => setActiveTab('challenges')}
              onStartPractice={(cat) => onStartPractice(cat)}
            />
            
            <DailyGoalProgressCard 
              user={activeUser}
              dailyPlan={dailyPlan || undefined}
              onUserUpdate={onUserUpdate}
              onStartPractice={() => onStartPractice('mixed')}
            />

            {/* Weekly Leaderboard Widget with Interactive Cheer */}
            <article className="zp-dashboard-surface p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif]">
                    Kişisel XP Özeti
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
                  Kendi verilerin
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
                  const isMe = lb.isCurrentUser;
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
                          {isMe ? '★' : rank}
                        </span>
                        <span className="text-xl shrink-0">{lb.avatar || '⭐'}</span>
                        <div className="min-w-0 truncate">
                          <p className={`text-xs truncate ${isMe ? 'font-bold text-indigo-950 dark:text-indigo-200' : 'font-semibold text-zinc-800 dark:text-zinc-300'}`}>
                            {lb.anonymousAlias}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {lb.xpEarned || 0} toplam XP
                          </p>
                        </div>
                      </div>

                      {!isMe && (
                        <button
                          onClick={() => handleCheerPeer(lb.id || idx.toString(), lb.anonymousAlias)}
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
                Ayrıntılı Özeti Gör
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </article>
          </aside>
        </div>

        {/* Rozet koleksiyonu */}
        <BadgesSection
          user={activeUser}
          mistakes={activeMistakes}
          onUserUpdate={onUserUpdate}
          onOpenMistakes={onOpenMistakes}
          onStartPractice={() => onStartPractice()}
          onNavigate={onNavigate}
        />
      </main>
    </div>
  );
};
export default StudentDashboard;
