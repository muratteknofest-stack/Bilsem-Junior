import { StoryAdventure } from './student/StoryAdventure';
import type { StoryProgress, StoryStage } from '../features/student/story-adventure';
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Activity, ArrowLeft, BarChart3, Brain, Compass, Layers, Lightbulb, Sparkles, Target, Zap, ArrowUpRight, Flame } from 'lucide-react';
import type { DailyStudyPlan, QuestionType, SkillMastery, UserProfile } from '../types';
import { isSchoolGrade } from '../features/questions/quality-policy';
import { isDemoUser } from '../lib/demo-access';
import { sound } from '../lib/sound';
import { dataService } from '../services/data-service';
import { isAvailableCategory } from '../features/student/available-categories';
import { useStudentReducedMotion } from '../features/student/experience-preferences';
import { levelProgress } from '../features/student/study-hub-model';
import { dailyMissions } from '../features/student/gamification-model';
import { getStudyFavorites, saveStudyFavorites } from '../services/student-preferences-service';
import { StudentGameArt, StudentGameBanner } from './student/StudentGameArt';
import { StudentHeroBanner } from './student/StudentHeroBanner';
import { StudentModesGrid } from './student/StudentModesGrid';
import { StudentMissionStrip } from './student/StudentMissionStrip';
import { StudentSkillsGrid } from './student/StudentSkillsGrid';
import { StudentTopicPractice } from './student/StudentTopicPractice';
import { StudentExperienceControls } from './student/StudentExperienceControls';
import { StudentStudyHub } from './StudentStudyHub';
import { TodayPersonalizedStudyPlanCard } from './TodayPersonalizedStudyPlanCard';
import { DailyGoalProgressCard } from './DailyGoalProgressCard';
import { DailyStreakCard } from './DailyStreakCard';
import { WeeklyProgressChartCard } from './WeeklyProgressChartCard';
import { WeeklyChallengesView } from './WeeklyChallengesView';
import { BadgesSection } from './BadgesSection';
import { GamificationArena } from './GamificationArena';
import { WordwallLibrary } from './WordwallLibrary';
import { ProfileBannerSkeleton, ModeCardSkeleton } from './Skeletons';
import './landing/design-system.css';
import './dashboard-design-system.css';
import './student/student-professional.css';
import './student/student-adventure.css';
import './student/student-quest-world.css';
import { StudentMotionToggle, useStudentMotionSurface } from './student/StudentMotion';
export type StudentSection = typeof SECTIONS[number]['id'];
interface StudentDashboardProps {
  storyProgress?: StoryProgress; storySaveError?: string; onStartStory?: (stage:StoryStage)=>void; onSelectStory?: (id:string)=>void;
  initialSection?: StudentSection;
  isLoading?: boolean; user?: UserProfile | null; dailyPlan?: DailyStudyPlan | null;
  masteries?: SkillMastery[]; mistakes?: any[];
  onUserUpdate: (user: UserProfile) => void;
  onStartPractice: (category?: string) => void;
  onStartTopicPractice?: (topic: QuestionType) => void;
  onStartAdaptive: () => void; onStartExam: () => void; onOpenMistakes: () => void; onNavigate: (view: string) => void;
}
const EMPTY_MASTERIES: SkillMastery[] = [];
const SECTIONS = [
  { id: 'adventure', label: 'Maceram', art: 'map' },
  { id: 'modes', label: 'Çalışma alanım', art: 'rocket' },
  { id: 'tests', label: 'Zeka Testleri', art: 'cubes' },
  { id: 'plan', label: 'Kişisel planım', art: 'compass' },
  { id: 'skills', label: 'Yeteneklerim', art: 'puzzle' },
  { id: 'challenges', label: 'Görevlerim', art: 'target' },
  { id: 'progress', label: 'İlerlemem', art: 'medal' },
] as const;
type Section = typeof SECTIONS[number]['id'];
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

export function StudentDashboard({ storyProgress, storySaveError, onStartStory, onSelectStory, initialSection = 'modes', isLoading = false, user, dailyPlan, masteries = EMPTY_MASTERIES, mistakes,
  onUserUpdate, onStartPractice, onStartTopicPractice, onStartAdaptive, onStartExam, onOpenMistakes, onNavigate }: StudentDashboardProps) {
  const activeUser = user || dataService.getCurrentUser();
  const activeMistakes = mistakes ?? dataService.getMistakes();
  const [activeTab, setActiveTab] = useState<Section>(initialSection);
  const [showProgress, setShowProgress] = useState(false);
  const [favorites, setFavorites] = useState(getStudyFavorites);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | 'practice' | 'new'>('all');
  const reduced = useStudentReducedMotion();
  const motionSurface = useStudentMotionSurface(`${activeTab}-${isLoading}`);
  useEffect(() => { setFavorites(getStudyFavorites()); }, [activeUser.id]);
  const unresolved = activeMistakes.filter(m => !m.resolved).length;
  const safeMasteries = useMemo(() => masteries.length ? masteries : dataService.getSkillMasteries() || [], [masteries]);
  const visibleMasteries = safeMasteries.filter(m => isAvailableCategory(m.category)
    && m.categoryName.toLocaleLowerCase('tr-TR').includes(skillSearch.trim().toLocaleLowerCase('tr-TR'))
    && (skillFilter === 'all' || (skillFilter === 'new' ? !m.attemptCount : m.attemptCount > 0 && m.mastery < 80)));
  const weekly = useMemo(() => dataService.getWeeklyQuestionProgressData(activeUser).summary, [activeUser]);
  const xpProgress = levelProgress(activeUser.xp);
  const dailyGoal = dailyMissions(activeUser)[0];
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? { text: 'Günaydın', emoji: '☀️' }
    : hour < 18 ? { text: 'Merhaba', emoji: '✦' } : { text: 'İyi akşamlar', emoji: '🌙' };
  const switchSection = (section: Section) => { sound.playClick(); setActiveTab(section); };
  if (isLoading) return <main id="student-dashboard" aria-busy="true" className="zp-dashboard-page zp-student-dashboard zp-student-pro"><div className="zp-student-shell"><ProfileBannerSkeleton /><div className="zp-mode-grid"><ModeCardSkeleton /><ModeCardSkeleton /></div></div></main>;
  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
    <div ref={motionSurface} className="zp-dashboard-page zp-student-dashboard zp-student-pro bj-student-game bj-motion-world" data-reduced-motion={reduced}>
      <main id="student-dashboard" className="zp-student-shell" data-adventure={activeTab==='adventure'}>
        <div className="zp-student-topline"><span><span className="zp-brand-dot" /> Bilsem Junior <span className="zp-topline-divider">/</span> Çalışma masam</span><StudentExperienceControls /></div>
        {activeTab!=='adventure'&&<StudentMotionToggle />}
        {activeTab !== 'tests' && activeTab !== 'adventure' && <StudentHeroBanner user={activeUser} greeting={greeting} xpProgress={xpProgress} onUserUpdate={onUserUpdate} onNavigate={onNavigate} prefersReducedMotion={reduced} />}
        <nav className="zp-study-navigation" aria-label="Öğrenci paneli bölümleri">{SECTIONS.filter(section=>section.id!=='adventure'||!!onStartStory).map(({ id, label, art }) =>
          <button type="button" key={id} aria-pressed={activeTab === id} aria-controls="zp-student-section" onClick={() => switchSection(id)}>
            <span className="bj-inventory-art" aria-hidden="true"><StudentGameArt kind={art}/></span><span>{label}</span>{activeTab === id && <span className="zp-nav-indicator" aria-hidden="true" />}
          </button>)}</nav>
        <div className="zp-student-workspace" data-study-section={activeTab}>
          <section id="zp-student-section" className="zp-student-section" aria-label={SECTIONS.find(section => section.id === activeTab)!.label}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeTab} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .18 }} className="zp-student-section-stack" data-game-section={activeTab}>
                {activeTab==='plan'&&<StudentGameBanner kind="compass" tone="mint" title="Kendi keşif rotanı çiz" description="Küçük bir hedef seç. Her alıştırma seni bir adım ileri taşısın."/>}
                {activeTab==='skills'&&<StudentGameBanner kind="puzzle" tone="violet" title="Yetenek atölyelerin" description="Bir alan seç, yeni bir yol keşfet. Kendi hızında güçlen."/>}
                {activeTab==='challenges'&&<StudentGameBanner kind="target" tone="gold" title="Görev panon hazır" description="Bugünün küçük görevlerini seç, ilerlemeni birlikte görelim."/>}
                {activeTab==='progress'&&<StudentGameBanner kind="map" title="Keşif günlüğün" description="Çalışmalarına göz at, öğrendiklerini ve rozetlerini keşfet."/>}
                {activeTab === 'adventure' && storyProgress && onStartStory && <StoryAdventure key={`${activeUser.id}-${activeUser.grade}`} user={activeUser} progress={storyProgress} saveError={storySaveError} onStartStory={onStartStory} onSelectStory={onSelectStory} onStudy={()=>switchSection('modes')}/>}
                {activeTab === 'modes' && <>
                  <StudentMissionStrip user={activeUser} weeklyQuestions={weekly.thisWeekTotal} />
                  <StudentModesGrid unresolvedMistakesCount={unresolved} onStartAdaptive={onStartAdaptive} onStartExam={onStartExam} onStartPractice={onStartPractice} onOpenMistakes={onOpenMistakes} onNavigate={onNavigate} onOpenChallenges={() => switchSection('challenges')} />
                  {onStartTopicPractice && isSchoolGrade(activeUser.grade) && !isDemoUser(activeUser.id) && <StudentTopicPractice grade={activeUser.grade} onStart={onStartTopicPractice} />}
                </>}
                {activeTab === 'tests' && <>
                  <button type="button" className="zp-tests-back" onClick={() => switchSection('modes')}><ArrowLeft size={18} aria-hidden="true" /> Çalışma alanıma dön</button>
                  <WordwallLibrary key={`wordwall-${activeUser.id}-${activeUser.grade}`} initialGrade={activeUser.grade} progressOwnerId={activeUser.id} />
                </>}
                {activeTab === 'plan' && <><DailyGoalProgressCard user={activeUser} dailyPlan={dailyPlan || undefined} onUserUpdate={onUserUpdate} onStartPractice={() => onStartPractice('mixed')} /><StudentStudyHub masteries={safeMasteries} unresolved={unresolved} savedExam={dataService.getActiveExam()} favorites={favorites} onFavoriteChange={value => setFavorites(saveStudyFavorites(value))} onPractice={onStartPractice} onMistakes={onOpenMistakes} onResumeExam={onStartExam} />
                  <TodayPersonalizedStudyPlanCard user={activeUser} masteries={safeMasteries} mistakes={activeMistakes} onStartPractice={onStartPractice} onStartAdaptive={onStartAdaptive} onOpenMistakes={onOpenMistakes} onUserUpdate={onUserUpdate} /></>}
                {activeTab === 'skills' && <StudentSkillsGrid safeMasteries={safeMasteries} visibleMasteries={visibleMasteries} skillSearch={skillSearch} setSkillSearch={setSkillSearch} skillFilter={skillFilter} setSkillFilter={setSkillFilter} categoryStyleConfig={CATEGORY_STYLE_CONFIG} onStartPractice={onStartPractice} />}
                {activeTab === 'challenges' && <><GamificationArena user={activeUser} thisWeekQuestions={weekly.thisWeekTotal} lastWeekQuestions={weekly.lastWeekTotal} onPractice={() => onStartPractice('mixed')} onOpenChallenges={() => document.getElementById('zp-weekly-missions')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })} />
                  <div id="zp-weekly-missions"><WeeklyChallengesView user={activeUser} onStartPractice={onStartPractice} onUserUpdate={onUserUpdate} onNavigateToBadges={() => onNavigate('achievements')} /></div></>}
                {activeTab === 'progress' && <><WeeklyProgressChartCard user={activeUser} onStartPractice={() => onStartPractice('mixed')} /><BadgesSection user={activeUser} mistakes={activeMistakes} onUserUpdate={onUserUpdate} onOpenMistakes={onOpenMistakes} onStartPractice={() => onStartPractice()} onNavigate={onNavigate} /></>}
              </motion.div>
            </AnimatePresence>
          </section>
          {activeTab !== 'tests' && activeTab !== 'adventure' && <aside className="zp-student-aside" aria-label="Günlük ilerlemem" data-expanded={showProgress}>
            <button type="button" className="bj-game-progress-toggle" aria-expanded={showProgress} aria-controls="student-progress-drawer" onClick={()=>setShowProgress(value=>!value)}><span><strong>Hedeflerim ve serim</strong><small>{dailyGoal.current}/{dailyGoal.target} soru · {activeUser.streak||0} günlük seri</small></span><span aria-hidden="true">{showProgress?'−':'+'}</span></button>
            <div id="student-progress-drawer" className="bj-game-progress-panels">
            <article className="zp-daily-snapshot" aria-labelledby="zp-daily-snapshot-title">
              <div className="zp-panel-eyebrow"><Target size={16} aria-hidden="true" /> BUGÜNKÜ HEDEFİN</div>
              <h2 id="zp-daily-snapshot-title">{dailyGoal.completed ? 'Hedefini tamamladın!' : 'Her soru bir adım.'}</h2>
              <div className="zp-daily-meter"><div className="zp-daily-ring" style={{ background: `conic-gradient(#5caa94 ${dailyGoal.progress}%, #e6f0ed 0)` }} aria-hidden="true"><strong>%{dailyGoal.progress}</strong></div><div><strong>{dailyGoal.current}<span> / {dailyGoal.target}</span></strong><p>bugün çözülen soru</p></div></div>
              <progress className="sr-only" aria-label="Günlük soru hedefim" value={Math.min(dailyGoal.current, dailyGoal.target)} max={dailyGoal.target} />
              <button type="button" className="zp-daily-start" onClick={() => onStartPractice('mixed')}>{dailyGoal.completed ? 'Keşfetmeye devam et' : 'Kısa pratiğe başla'}<ArrowUpRight size={16} aria-hidden="true" /></button>
              <button type="button" className="zp-daily-edit" onClick={() => switchSection('plan')}>Hedefimi düzenle</button>
            </article>
            <article className="zp-week-overview"><div className="zp-panel-eyebrow"><BarChart3 size={16} aria-hidden="true" /> BU HAFTA</div><h2>Küçük adımlar, kalıcı ilerleme.</h2><div className="zp-week-stats"><div><strong>{weekly.thisWeekTotal}</strong><span>çözülen soru</span></div><div><strong>{activeUser.streak || 0}<Flame size={19} aria-hidden="true" /></strong><span>günlük seri</span></div></div><button type="button" onClick={() => switchSection('progress')}>İlerlememi incele <ArrowUpRight size={16} aria-hidden="true" /></button></article>
            <DailyStreakCard user={activeUser} onUserUpdate={onUserUpdate} onStartPractice={() => onStartPractice('mixed')} onOpenDetailsModal={() => onNavigate('achievements')} />
            <p className="zp-study-note"><Sparkles size={17} aria-hidden="true" /> Kendi hızında ilerle. Her soru yeni bir keşif.</p>
            </div>
          </aside>}
        </div>
      </main>
    </div>
  </MotionConfig>;
}
export default StudentDashboard;
