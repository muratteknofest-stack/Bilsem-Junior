import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Activity, BarChart3, Brain, Compass, Layers, Lightbulb, Sparkles, Target, Trophy, Zap, ArrowUpRight, BookOpen, Flame } from 'lucide-react';
import type { DailyStudyPlan, QuestionType, SkillMastery, UserProfile } from '../types';
import { isSchoolGrade } from '../features/questions/quality-policy';
import { isDemoUser } from '../lib/demo-access';
import { sound } from '../lib/sound';
import { NativeStudyStart } from './NativeStudyStart';
import { useNativeScreenBack } from '../hooks/useNativeScreenBack';
import { isAndroidApp } from '../lib/native-app';
import { dataService } from '../services/data-service';
import { isAvailableCategory } from '../features/student/available-categories';
import { useStudentReducedMotion } from '../features/student/experience-preferences';
import { levelProgress } from '../features/student/study-hub-model';
import { dailyMissions } from '../features/student/gamification-model';
import { getStudyFavorites, saveStudyFavorites } from '../services/student-preferences-service';
import { StudentHeroBanner } from './student/StudentHeroBanner';
import { StudentModesGrid } from './student/StudentModesGrid';
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
import { DailyChallenge } from './DailyChallenge';
import { MembershipPrompt } from './MembershipPrompt';
import { ProfileBannerSkeleton, ModeCardSkeleton } from './Skeletons';
import './landing/design-system.css';
import './dashboard-design-system.css';
import './student/student-professional.css';
interface StudentDashboardProps {
  isLoading?: boolean; user?: UserProfile | null; dailyPlan?: DailyStudyPlan | null;
  masteries?: SkillMastery[]; mistakes?: any[];
  onUserUpdate: (user: UserProfile) => void;
  onStartPractice: (category?: string) => void;
  onStartTopicPractice?: (topic: QuestionType) => void;
  onStartAdaptive: () => void; onStartExam: () => void; onOpenMistakes: () => void; onNavigate: (view: string) => void;
  membership?: { active: boolean; loading: boolean; error: string; refresh: () => void };
}
const EMPTY_MASTERIES: SkillMastery[] = [];
const SECTIONS = [
  { id: 'modes', label: 'Çalışma alanım', icon: BookOpen },
  { id: 'plan', label: 'Kişisel planım', icon: Compass },
  { id: 'skills', label: 'Yeteneklerim', icon: Brain },
  { id: 'challenges', label: 'Görevlerim', icon: Trophy },
  { id: 'progress', label: 'İlerlemem', icon: BarChart3 },
] as const;
type Section = typeof SECTIONS[number]['id'];
const NATIVE_SECTION_LABELS: Record<Section,string> = {modes:'Çalış',plan:'Planım',skills:'Yetenek',challenges:'Görevler',progress:'İlerleme'};
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

export function StudentDashboard({ isLoading = false, user, dailyPlan, masteries = EMPTY_MASTERIES, mistakes,
  onUserUpdate, onStartPractice, onStartTopicPractice, onStartAdaptive, onStartExam, onOpenMistakes, onNavigate, membership }: StudentDashboardProps) {
  const screenRoot = useRef<HTMLElement>(null);
  const activeUser = user || dataService.getCurrentUser();
  const activeMistakes = mistakes ?? dataService.getMistakes();
  const [nativeDetailView, setNativeDetailView] = useState(0);
  const [nativeStudyView, setNativeStudyView] = useState<'quick' | 'topics' | 'games'>('quick');
  const [activeTab, setActiveTab] = useState<Section>('modes');
  const [favorites, setFavorites] = useState(getStudyFavorites);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | 'practice' | 'new'>('all');
  const reduced = useStudentReducedMotion();
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
  const switchSection = (section: Section) => { sound.playClick(); setActiveTab(section); setNativeDetailView(0); if (isAndroidApp) window.scrollTo({ top: 0, behavior: 'instant' }); };
  const demo = isDemoUser(activeUser.id);
  const premium = membership?.active === true && !demo;
  const detailChoices = activeTab === 'plan' ? ['Hedefim','Öneriler','Çalışma planı'] : activeTab === 'challenges' ? ['Haftalık yarış','Günlük görev','Rozet görevi'] : activeTab === 'progress' ? ['Grafik','Rozetler','Günlük özet'] : [];
  const lockedSection = !premium && ['plan', 'skills', 'challenges'].includes(activeTab);
  useNativeScreenBack(screenRoot, () => {
    if (nativeDetailView !== 0) { setNativeDetailView(0); }
    else if (activeTab !== 'modes') { setActiveTab('modes'); setNativeStudyView('quick'); }
    else if (nativeStudyView !== 'quick') { setNativeStudyView('quick'); }
    else return false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  });
  if (isLoading) return <main id="student-dashboard" aria-busy="true" className="zp-dashboard-page zp-student-dashboard zp-student-pro"><div className="zp-student-shell"><ProfileBannerSkeleton /><div className="zp-mode-grid"><ModeCardSkeleton /><ModeCardSkeleton /></div></div></main>;
  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
    <div className="zp-dashboard-page zp-student-dashboard zp-student-pro" data-reduced-motion={reduced}>
      <main ref={screenRoot} id="student-dashboard" className="zp-student-shell">
        <div className="zp-student-topline"><span><span className="zp-brand-dot" /> ZekaPark <span className="zp-topline-divider">/</span> Çalışma masam</span><StudentExperienceControls /></div>
        <StudentHeroBanner user={activeUser} greeting={greeting} xpProgress={xpProgress} onUserUpdate={onUserUpdate} onNavigate={onNavigate} prefersReducedMotion={reduced} />
        <nav className="zp-study-navigation" aria-label="Öğrenci paneli bölümleri">{SECTIONS.map(({ id, label, icon: Icon }) =>
          <button type="button" key={id} aria-label={label} aria-pressed={activeTab === id} aria-controls="zp-student-section" onClick={() => switchSection(id)}>
            <Icon size={18} aria-hidden="true" /><span>{isAndroidApp ? NATIVE_SECTION_LABELS[id] : label}</span>{!premium && ['plan','skills','challenges'].includes(id) && <span className="zp-section-lock" aria-label="Üyelik gerekli">✦</span>}{activeTab === id && <span className="zp-nav-indicator" aria-hidden="true" />}
          </button>)}</nav>
        <div className="zp-student-workspace">
          <section id="zp-student-section" className="zp-student-section" aria-label={SECTIONS.find(section => section.id === activeTab)!.label}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeTab} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .18 }} className="zp-student-section-stack">
                {isAndroidApp && !lockedSection && detailChoices.length > 0 && <nav className="zp-native-study-picker" aria-label="Bölüm görünümü">{detailChoices.map((label, index) => <button type="button" key={label} aria-pressed={nativeDetailView === index} onClick={() => { setNativeDetailView(index); window.scrollTo({top:0,behavior:'instant'}); }}>{label}</button>)}</nav>}
                {lockedSection ? <MembershipPrompt onUpgrade={() => onNavigate('parent')} onRegister={demo ? () => onNavigate('register') : undefined} loading={membership?.loading} error={membership?.error} onRetry={membership?.refresh} /> : <>
                {activeTab === 'modes' && <>
                  {isAndroidApp && <nav className="zp-native-study-picker" aria-label="Çalışma türü">{([{id:'quick',label:'Hızlı başla'},{id:'topics',label:'Konu testleri'},{id:'games',label:'Oyunlar'}] as const).map(view => <button type="button" key={view.id} aria-pressed={nativeStudyView === view.id} onClick={() => { setNativeStudyView(view.id); window.scrollTo({ top: 0, behavior: 'instant' }); }}>{view.label}</button>)}</nav>}
                  {(!isAndroidApp || nativeStudyView === 'quick') && <>
                  {!premium && !demo && <DailyChallenge />}
                  {!premium && <MembershipPrompt onUpgrade={() => onNavigate('parent')} onRegister={demo ? () => onNavigate('register') : undefined} loading={membership?.loading} error={membership?.error} onRetry={membership?.refresh} />}
                  {isAndroidApp && premium && <NativeStudyStart user={activeUser} unresolved={unresolved} savedExam={dataService.getActiveExam()} onPractice={() => onStartPractice('mixed')} onAdaptive={onStartAdaptive} onExam={onStartExam} onMistakes={onOpenMistakes} onTopics={() => setNativeStudyView('topics')} onGames={() => setNativeStudyView('games')} />}
                  {(!isAndroidApp || demo) && <StudentModesGrid unresolvedMistakesCount={unresolved} onStartAdaptive={onStartAdaptive} onStartExam={onStartExam} onStartPractice={onStartPractice} onOpenMistakes={onOpenMistakes} onNavigate={onNavigate} onOpenChallenges={() => switchSection('challenges')} />}
                  </>}
                  {isAndroidApp && nativeStudyView !== 'quick' && !premium && <MembershipPrompt onUpgrade={() => onNavigate('parent')} onRegister={demo ? () => onNavigate('register') : undefined} loading={membership?.loading} error={membership?.error} onRetry={membership?.refresh} />}
                  {(!isAndroidApp || nativeStudyView === 'topics') && premium && onStartTopicPractice && isSchoolGrade(activeUser.grade) && <StudentTopicPractice grade={activeUser.grade} onStart={onStartTopicPractice} />}
                  {(!isAndroidApp || nativeStudyView === 'games') && premium && <WordwallLibrary key={`wordwall-${activeUser.id}-${activeUser.grade}`} initialGrade={activeUser.grade} />}
                </>}
                {activeTab === 'plan' && <>{(!isAndroidApp || nativeDetailView === 0) && <DailyGoalProgressCard user={activeUser} dailyPlan={dailyPlan || undefined} onUserUpdate={onUserUpdate} onStartPractice={() => onStartPractice('mixed')} />}{(!isAndroidApp || nativeDetailView === 1) && <StudentStudyHub masteries={safeMasteries} unresolved={unresolved} savedExam={dataService.getActiveExam()} favorites={favorites} onFavoriteChange={value => setFavorites(saveStudyFavorites(value))} onPractice={onStartPractice} onMistakes={onOpenMistakes} onResumeExam={onStartExam} />}
                  {(!isAndroidApp || nativeDetailView === 2) && <TodayPersonalizedStudyPlanCard user={activeUser} masteries={safeMasteries} mistakes={activeMistakes} onStartPractice={onStartPractice} onStartAdaptive={onStartAdaptive} onOpenMistakes={onOpenMistakes} onUserUpdate={onUserUpdate} />}</>}
                {activeTab === 'skills' && <StudentSkillsGrid safeMasteries={safeMasteries} visibleMasteries={visibleMasteries} skillSearch={skillSearch} setSkillSearch={setSkillSearch} skillFilter={skillFilter} setSkillFilter={setSkillFilter} categoryStyleConfig={CATEGORY_STYLE_CONFIG} onStartPractice={onStartPractice} />}
                {activeTab === 'challenges' && <>{(!isAndroidApp || nativeDetailView < 2) && <GamificationArena view={isAndroidApp ? (nativeDetailView === 0 ? 'race' : 'missions') : 'all'} user={activeUser} thisWeekQuestions={weekly.thisWeekTotal} lastWeekQuestions={weekly.lastWeekTotal} onPractice={() => onStartPractice('mixed')} onOpenChallenges={() => { if(isAndroidApp) setNativeDetailView(2); else document.getElementById('zp-weekly-missions')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }} />}
                  {(!isAndroidApp || nativeDetailView === 2) && <div id="zp-weekly-missions"><WeeklyChallengesView user={activeUser} onStartPractice={onStartPractice} onUserUpdate={onUserUpdate} onNavigateToBadges={() => onNavigate('achievements')} /></div>}</>}
                {activeTab === 'progress' && <>{(!isAndroidApp || nativeDetailView === 0) && <WeeklyProgressChartCard user={activeUser} onStartPractice={() => onStartPractice('mixed')} />}{(!isAndroidApp || nativeDetailView === 1) && <BadgesSection user={activeUser} mistakes={activeMistakes} onUserUpdate={onUserUpdate} onOpenMistakes={onOpenMistakes} onStartPractice={() => onStartPractice()} onNavigate={onNavigate} />}</>}
                </>}
              </motion.div>
            </AnimatePresence>
          </section>
          {(!isAndroidApp || (activeTab === 'progress' && nativeDetailView === 2)) && <aside className="zp-student-aside" aria-label="Günlük ilerlemem">
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
          </aside>}
        </div>
      </main>
    </div>
  </MotionConfig>;
}
export default StudentDashboard;
