import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isAndroidApp } from './lib/native-app';
import { advanceStory, storyCollection, storyBadges, nextCampaignStage, isStoryStageComplete, type StoryStage, type StoryProgress, type StoryReward } from './features/student/story-adventure';
import { readStoryProgress, saveStoryProgress } from './services/story-progress-service';
import type { LearningSessionView } from './features/student/learning-contract';
import type { StudentSection } from './components/StudentDashboard';
import { topicCategory, type LearningTopic } from './features/student/learning-topics';
import { ProgressSyncBanner } from './components/ProgressSyncBanner';
import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ADMIN_PANEL_PATH, ADMIN_LOGIN_PATH, hasVerifiedAdminAccess } from './lib/admin-access';
import { accountEntry, accountEntryPath } from './features/auth/account-entry';
import { routeFromPathname } from './lib/route-sync';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { UserProfile, UserRole, SkillMastery, MistakeItem, DailyStudyPlan, ReminderAlertEvent, CognitiveCategory } from './types';
import { dataService } from './services/data-service';
import { openLinkedStudentSession, openLinkedParentSession, cancelAccountSwitch } from './services/account-security-service';
import { ParentAccessDialog } from './features/auth/components/ParentAccessDialog';
import { sound } from './lib/sound';
import { reminderService } from './services/reminder-service';
import { demoQuestionsRemaining, isDemoUser } from './lib/demo-access';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { StudyReminderInAppAlert } from './components/StudyReminderInAppAlert';
import { StudyReminderSettingsModal } from './components/StudyReminderSettingsModal';

const AndroidStudentHub = lazy(() => import('./components/android/AndroidStudentHub').then(m => ({default:m.AndroidStudentHub})));
const nativeSections: Record<string, StudentSection> = {'student-tests':'tests','student-plan':'plan','student-skills':'skills','student-challenges':'challenges','student-progress':'progress','student-topics':'modes'};
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const LandingPage = lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })));
const VerifiedLearningView = lazy(() => import('./components/VerifiedLearningView').then(m => ({ default: m.VerifiedLearningView })));
const PracticeSessionView = lazy(() => import('./components/PracticeSessionView').then((m) => ({ default: m.PracticeSessionView })));
const MistakeNotebookView = lazy(() => import('./components/MistakeNotebookView').then((m) => ({ default: m.MistakeNotebookView })));
const AchievementsView = lazy(() => import('./components/AchievementsView').then((m) => ({ default: m.AchievementsView })));
const ParentPortalView = lazy(() => import('./components/ParentPortalView').then((m) => ({ default: m.ParentPortalView })));
const LeaderboardView = lazy(() => import('./components/LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const CognitiveGlossaryView = lazy(() => import('./components/CognitiveGlossaryView').then((m) => ({ default: m.CognitiveGlossaryView })));
const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));
const isTestPage = (route: string) => ['practice', 'adaptive', 'exams'].includes(route);

export default function App() {
  const reducedMotion = useReducedMotion();
  // Auth context
  const { currentUser: authUser, userProfile, loading: authLoading, isAdminAuthorized, logout: authLogout, switchRole: authSwitchRole } = useAuth();
  
  // We don't block the entire app while auth is loading anymore
  // so we can show a nice skeleton for the dashboard.
  // if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  const handleLogout = async () => {
    cancelAccountSwitch();
    switchAttemptRef.current++;
    pendingStudentIdRef.current = null;
    setIsSwitchingStudent(false);
    setStudentSwitchError(null);
    setShowParentAccess(false);
    try { await authLogout(); }
    catch { setStudentSwitchError('Oturum kapatılamadı. Bağlantınızı kontrol edip tekrar deneyin.'); return; }
    setIsAuth(false);
    setCurrentRoute('login');
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => dataService.getCurrentUser());
  const [storyProgress,setStoryProgress] = useState<StoryProgress>(()=>readStoryProgress(currentUser.id,currentUser.grade||1));
  const [storySaveError,setStorySaveError] = useState('');
  const [storyReward,setStoryReward]=useState<StoryReward|undefined>();
  const selectStory=(id:string)=>{
    const next={...storyProgress,selectedStoryId:id};
    const saved=saveStoryProgress(currentUser.id,currentUser.grade||1,next);
    setStoryProgress(next);
    setStorySaveError(saved?'':'Hikâye seçimin bu cihazda kaydedilemedi.');
  };
  const [activeStory,setActiveStory] = useState<{stage:StoryStage;userId:string;grade:number}|null>(null);
  useEffect(()=>{setStoryProgress(readStoryProgress(currentUser.id,currentUser.grade||1));setStorySaveError('');setActiveStory(null);setStoryReward(undefined);},[currentUser.id,currentUser.grade]);
  const completeStory = (session:LearningSessionView) => {
    if(!activeStory || dataService.getCurrentUser().id!==activeStory.userId || currentUser.grade!==activeStory.grade)return;
    const next=advanceStory(storyProgress,activeStory.stage.id,session,activeStory.grade);
    if(next===storyProgress)return;
    const previousBadges=storyBadges(storyProgress,activeStory.grade);
    setStoryReward({
      sessionId:session.id,
      replay:isStoryStageComplete(storyProgress,activeStory.stage),
      improved:(next.stageResults?.[activeStory.stage.id]?.bestCorrect||0)>(storyProgress.stageResults?.[activeStory.stage.id]?.bestCorrect||0),
      bestCorrect:next.stageResults?.[activeStory.stage.id]?.bestCorrect||0,
      points:storyCollection(next,activeStory.grade).points-storyCollection(storyProgress,activeStory.grade).points,
      badges:storyBadges(next,activeStory.grade).filter(b=>b.unlocked&&!previousBadges.some(old=>old.id===b.id&&old.unlocked)).map(b=>b.title),
    });
    const saved=saveStoryProgress(activeStory.userId,activeStory.grade,next);
    setStorySaveError(saved?'':'Hikâye ilerlemesi cihazına kaydedilemedi. Bu oturumda devam edebilirsin; uygulamayı kapatınca son durak korunmayabilir.');
    setStoryProgress(next);
  };
  const [isSwitchingStudent, setIsSwitchingStudent] = useState(false);
  const [studentSwitchError, setStudentSwitchError] = useState<string | null>(null);
  const [showParentAccess, setShowParentAccess] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<'student' | 'parent'>('student');
  const pendingStudentIdRef = useRef<string | null>(null);
  const switchAttemptRef = useRef(0);
  const previousAccountIdRef = useRef(userProfile?.id);
  const [isAuth, setIsAuth] = useState<boolean>(() => dataService.isAuthenticated());
  const initialAccountEntry = useRef(accountEntry(new URL(window.location.href)));
  const [loginRole, setLoginRole] = useState<UserRole>(initialAccountEntry.current?.role || 'student');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>(initialAccountEntry.current?.mode || 'login');
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (!dataService.isAuthenticated()) {
      if (initialAccountEntry.current) return 'login';
      const initialUrlRoute = routeFromPathname(window.location.pathname, 'landing');
      return initialUrlRoute === 'wordwall' ? 'wordwall' : 'landing';
    }
    const u = dataService.getCurrentUser();
    if (isDemoUser(u.id) && u.role !== 'student') return 'demo-limit';
    if (u?.role === 'parent') return 'parent';
    if (u?.role === 'admin') return 'landing';
    if (u?.role === 'student') return 'dashboard';
    return 'landing';
  });
  const previousRouteRef = useRef(currentRoute);
  const testReturnRouteRef = useRef('dashboard');
  const hasTestHistoryEntryRef = useRef(false);
  const [masteries, setMasteries] = useState<SkillMastery[]>(() => dataService.getSkillMasteries());
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => dataService.getMistakes());
  const [dailyPlan, setDailyPlan] = useState<DailyStudyPlan>(() => dataService.getDailyPlan());
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState<LearningTopic>('mixed');
  const [selectedPracticeCategory, setSelectedPracticeCategory] = useState<CognitiveCategory | 'mixed'>('mixed');
  const [activeAlert, setActiveAlert] = useState<ReminderAlertEvent | null>(null);
  const [showGlobalReminderModal, setShowGlobalReminderModal] = useState(false);

  // These pages render without the main navigation. Give mobile browser Back a
  // real history entry and remember the screen that opened the test.
  useEffect(() => {
    const handlePopState = () => {
      if (!hasTestHistoryEntryRef.current || !isTestPage(previousRouteRef.current)) return;
      hasTestHistoryEntryRef.current = false;
      setCurrentRoute(dataService.isAuthenticated() ? testReturnRouteRef.current : 'landing');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const previous = previousRouteRef.current;
    if (isTestPage(currentRoute) && !isTestPage(previous)) {
      testReturnRouteRef.current = previous;
      window.history.pushState({ ...window.history.state, zekaparkTestPage: true }, '', window.location.href);
      hasTestHistoryEntryRef.current = true;
    } else if (!isTestPage(currentRoute) && isTestPage(previous) && hasTestHistoryEntryRef.current) {
      // An in-app link left the test without using Back (for example, Mistakes).
      // Do not leave a stale test marker on the current history entry.
      window.history.replaceState({ ...window.history.state, zekaparkTestPage: false }, '', window.location.href);
      hasTestHistoryEntryRef.current = false;
    }
    previousRouteRef.current = currentRoute;
  }, [currentRoute]);


  useEffect(() => {
    if (currentRoute !== 'login' && hasVerifiedAdminAccess({ currentUser: authUser, userProfile, loading: authLoading, isAdminAuthorized })) {
      window.location.replace(ADMIN_PANEL_PATH);
    }
  }, [authUser, userProfile, authLoading, isAdminAuthorized, currentRoute]);

  useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
      setIsAuth(true);
      // The public form must finish its role check before any redirect. Existing
      // verified administrator sessions are routed by the separate effect above.
      if (userProfile.role === 'admin') return;
      const accountChanged = previousAccountIdRef.current !== userProfile.id;
      previousAccountIdRef.current = userProfile.id;
      if (accountChanged) {
        setStudentSwitchError(null);
        setMasteries(dataService.getSkillMasteries());
        setMistakes(dataService.getMistakes());
        setDailyPlan(dataService.getDailyPlan());
      }
      if (pendingStudentIdRef.current === userProfile.id && ['student', 'parent'].includes(userProfile.role)) {
        pendingStudentIdRef.current = null;
        setIsSwitchingStudent(false);
        setStudentSwitchError(null);
        setMasteries(dataService.getSkillMasteries());
        setMistakes(dataService.getMistakes());
        setDailyPlan(dataService.getDailyPlan());
        setShowParentAccess(false);
        setCurrentRoute(userProfile.role === 'parent' ? 'parent' : 'dashboard');
      } else if (accountChanged || currentRoute === 'login' || currentRoute === 'landing') {
        setCurrentRoute(isDemoUser(userProfile.id) && userProfile.role !== 'student' ? 'demo-limit' : userProfile.role === 'student' ? 'dashboard' : 'parent');
      }
    } else {
      if (dataService.isAuthenticated()) {
        const localUser = dataService.getCurrentUser();
        setCurrentUser(localUser);
        setIsAuth(true);
      } else {
        setIsAuth(false);
        const fallbackUser = dataService.getCurrentUser();
        setCurrentUser(fallbackUser);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    if (!isSwitchingStudent) return;
    const timeout = window.setTimeout(() => {
      cancelAccountSwitch();
      switchAttemptRef.current++;
      pendingStudentIdRef.current = null;
      setIsSwitchingStudent(false);
      setStudentSwitchError('Hesap bilgileri yüklenemedi. Lütfen yeniden giriş yapın.');
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [isSwitchingStudent]);

  const openStudentPanel = async (selectedStudentId?: string) => {
    if (pendingStudentIdRef.current) return;
    const studentId = userProfile?.role === 'parent' ? selectedStudentId ?? userProfile.linkedStudentIds?.[0] : undefined;
    if (!studentId || !userProfile?.linkedStudentIds?.includes(studentId)) {
      setStudentSwitchError('Bu veli hesabına bağlı öğrenci bulunamadı. Lütfen destek bölümünden yardım isteyin.');
      return;
    }
    pendingStudentIdRef.current = studentId;
    const attempt = ++switchAttemptRef.current;
    setSwitchTarget('student');
    setIsSwitchingStudent(true);
    setStudentSwitchError(null);
    try {
      await openLinkedStudentSession(studentId);
      // AuthContext loads the student's own profile and progress before routing.
    } catch (error) {
      if (attempt !== switchAttemptRef.current) return;
      pendingStudentIdRef.current = null;
      setIsSwitchingStudent(false);
      setStudentSwitchError(error instanceof Error ? error.message : 'Öğrenci paneli açılamadı. Tekrar deneyin.');
    }
  };

  const requestParentPanel = () => {
    if (isSwitchingStudent) return;
    if (userProfile?.role === 'student' && userProfile.linkedParentId) {
      setStudentSwitchError(null); setShowParentAccess(true);
    } else handleNavigateToLogin('parent');
  };
  const openParentPanel = async (password: string) => {
    const parentId = userProfile?.role === 'student' ? userProfile.linkedParentId : undefined;
    if (!parentId || pendingStudentIdRef.current) throw new Error('Bağlı veli hesabı doğrulanamadı.');
    pendingStudentIdRef.current = parentId;
    const attempt = ++switchAttemptRef.current;
    setSwitchTarget('parent'); setIsSwitchingStudent(true); setStudentSwitchError(null);
    try { await openLinkedParentSession(parentId, password); }
    catch (error) {
      if (attempt !== switchAttemptRef.current) throw new Error('Hesap geçişi iptal edildi. Yeniden deneyin.');
      pendingStudentIdRef.current = null; setIsSwitchingStudent(false);
      throw error;
    }
  };

  // Subscribe to background/instant study reminder alerts
  useEffect(() => {
    const handleOpenGlossaryEvent = () => {
      setCurrentRoute('glossary');
    };
    window.addEventListener('open-glossary', handleOpenGlossaryEvent);

    const unsubscribeReminders = reminderService.subscribeToAlerts((alert) => {
      setActiveAlert(alert);
    });

    return () => {
      window.removeEventListener('open-glossary', handleOpenGlossaryEvent);
      unsubscribeReminders();
    };
  }, []);

  // Refresh dynamic state from storage
  const syncState = () => {
    setCurrentUser(dataService.getCurrentUser());
    setIsAuth(dataService.isAuthenticated());
    setMasteries(dataService.getSkillMasteries());
    setMistakes(dataService.getMistakes());
    setDailyPlan(dataService.getDailyPlan());
  };

  

  const handleNavigateToLogin = (role: UserRole) => {
    if (role === 'admin') { window.location.assign(ADMIN_LOGIN_PATH); return; }
    setLoginMode('login');
    window.history.replaceState(window.history.state, '', accountEntryPath('login', role));
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoginRole(role);
    setCurrentRoute('login');
  };

  const navigateTo = (targetRoute: string, practiceTopic: LearningTopic = 'mixed', story?: StoryStage) => {
    if(targetRoute==='adaptive'){setStoryReward(undefined);setActiveStory(story?{stage:story,userId:currentUser.id,grade:currentUser.grade||1}:null);}
    if (targetRoute === 'practice') setSelectedPracticeTopic(practiceTopic);
    window.scrollTo({ top: 0, behavior: isAndroidApp ? 'instant' : 'smooth' });

    if (targetRoute === 'admin' || targetRoute === 'login:admin') { window.location.assign(ADMIN_PANEL_PATH); return; }

    if (targetRoute === 'register') {
      window.history.replaceState(window.history.state, '', accountEntryPath('register', 'parent'));
      setLoginMode('register');
      setLoginRole('parent');
      setCurrentRoute('login');
      return;
    }

    if (targetRoute.startsWith('login:')) {
      setLoginMode('login');
      const role = targetRoute.split(':')[1] as UserRole;
      window.history.replaceState(window.history.state, '', accountEntryPath('login', role));
      setLoginRole(role);
      setCurrentRoute('login');
      return;
    }

    if (targetRoute === 'login') {
      window.history.replaceState(window.history.state, '', accountEntryPath('login', loginRole));
      setLoginMode('login');
      setCurrentRoute('login');
      return;
    }

    if (targetRoute === 'landing') {
      if (accountEntry(new URL(window.location.href))) window.history.replaceState(window.history.state, '', '/');
      setCurrentRoute('landing');
      return;
    }

    // Role-based route protection:
    const authenticated = dataService.isAuthenticated();
    if (!authenticated) {
      if (targetRoute === 'parent') setLoginRole('parent');
      else setLoginRole('student');
      setCurrentRoute('login');
      return;
    }

    const u = userProfile && currentUser?.id===userProfile.id ? {...userProfile,...currentUser,role:userProfile.role} : userProfile || currentUser || dataService.getCurrentUser();
    if (!u) {
      setCurrentRoute('login');
      return;
    }

    if (isDemoUser(u.id)) {
      if (targetRoute === 'practice' && demoQuestionsRemaining() === 0) {
        setCurrentRoute('demo-limit');
        return;
      }
      if (['adaptive', 'exams', 'mistakes', 'achievements', 'leaderboard', 'glossary', 'parent','student-tests','student-topics','student-plan','student-skills','student-challenges','student-progress'].includes(targetRoute)) {
        setCurrentRoute('demo-limit');
        return;
      }
    }

    // Bidirectional switching between student and parent:
    if (targetRoute === 'parent') {
      if (userProfile?.role !== 'parent' && !u.id.startsWith('demo_')) {
        requestParentPanel();
        return;
      }
      const updated = { ...u, role: 'parent' as UserRole };
      setCurrentUser(updated);
      dataService.switchRole('parent');
      if (authSwitchRole) authSwitchRole('parent');
      setCurrentRoute('parent');
      syncState();
      return;
    }

    if (targetRoute === 'dashboard') {
      if(userProfile?.role==='student'){setCurrentRoute('dashboard');syncState();return;}
      if (userProfile?.role === 'parent' && !u.id.startsWith('demo_')) {
        void openStudentPanel();
        return;
      }
      const updated = { ...u, role: 'student' as UserRole };
      setCurrentUser(updated);
      dataService.switchRole('student');
      if (authSwitchRole) authSwitchRole('student');
      setCurrentRoute('dashboard');
      syncState();
      return;
    }

    // If parent navigates to student test/practice/achievements, allow it in student role
    if (targetRoute.startsWith('student-') && u.role==='parent' && !u.id.startsWith('demo_')) {void openStudentPanel();return;}
    if (['practice', 'adaptive', 'exams', 'mistakes', 'achievements', 'leaderboard', 'glossary'].includes(targetRoute)) {
      if (u.role === 'parent' && u.id.startsWith('demo_')) {
        const updated = { ...u, role: 'student' as UserRole };
        setCurrentUser(updated);
        dataService.switchRole('student');
        if (authSwitchRole) authSwitchRole('student');
      }
      setCurrentRoute(targetRoute);
      syncState();
      return;
    }

    setCurrentRoute(targetRoute);
    syncState();
  };

  const handleSwitchRole = (newRole: UserRole) => {
    if (isDemoUser(currentUser.id) && newRole !== 'student') {
      setCurrentRoute('demo-limit');
      return;
    }
    if (newRole === 'student' && userProfile?.role === 'parent') {
      void openStudentPanel();
      return;
    }
    if (newRole === 'parent' && userProfile?.role === 'student') {
      requestParentPanel();
      return;
    }
    if (!currentUser.id.startsWith('demo_') && userProfile?.role !== newRole) return;
    if (newRole === 'admin' && (!authUser || userProfile?.role !== 'admin')) return;
    sound.playClick();
    const updated = { ...currentUser, role: newRole };
    setCurrentUser(updated);
    dataService.switchRole(newRole);
    if (authSwitchRole) authSwitchRole(newRole);
    if (newRole === 'parent') {
      setCurrentRoute('parent');
    } else if (newRole === 'student') {
      setCurrentRoute('dashboard');
    } else if (newRole === 'admin') {
      window.location.assign(ADMIN_PANEL_PATH);
    }
    syncState();
  };

  const isTestRoute = currentRoute === 'practice' || currentRoute === 'adaptive' || currentRoute === 'exams';
  const leaveTest = () => {
    if (hasTestHistoryEntryRef.current && window.history.state?.zekaparkTestPage) {
      window.history.back();
      return;
    }
    navigateTo(isAuth ? (currentUser.role === 'parent' ? 'parent' : currentUser.role === 'admin' ? 'admin' : 'dashboard') : 'landing');
  };

  useEffect(()=>{
    if(!isAndroidApp || !Capacitor.isNativePlatform() || isTestRoute)return;
    let disposed=false;let remove:(()=>Promise<void>)|undefined;
    void CapacitorApp.addListener('backButton',({canGoBack})=>{
      if(showParentAccess){setShowParentAccess(false);return;}
      if(currentUser.role==='student'&&currentRoute!=='dashboard'&&!['landing','login'].includes(currentRoute)){
        const target=['student-tests','student-topics','student-plan','student-skills','mistakes','glossary'].includes(currentRoute)?'student-study':['student-challenges','student-progress','achievements','leaderboard'].includes(currentRoute)?'student-rewards':'dashboard';
        navigateTo(target);return;
      }
      if(canGoBack)window.history.back();else void CapacitorApp.minimizeApp();
    }).then(handle=>{if(disposed)void handle.remove();else remove=()=>handle.remove();}).catch(()=>{});
    return()=>{disposed=true;void remove?.();};
  },[currentRoute,isTestRoute,showParentAccess,currentUser.role]);

  if (authLoading && authUser && !userProfile) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><p role="status">Hesap ve ilerleme bilgileri yükleniyor…</p></main>;
  if (currentRoute !== 'login' && hasVerifiedAdminAccess({ currentUser: authUser, userProfile, loading: authLoading, isAdminAuthorized })) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><p role="status">Yönetici alanına yönlendiriliyorsunuz…</p></main>;

  return (
    <div className={`${isAndroidApp ? 'bj-native-shell ' : ''}bilsem-junior-skin min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]`}>
      {/* Workspace navigation; public pages own their header. Tests stay distraction-free. */}
      {!isTestRoute && currentRoute !== 'landing' && currentRoute !== 'login' && (
        <Navbar
          currentUser={currentUser}
          onNavigateHome={() => navigateTo(isAuth ? (currentUser?.role === 'parent' ? 'parent' : currentUser?.role === 'admin' ? 'admin' : 'dashboard') : 'landing')}
          onNavigate={navigateTo}
          onSwitchRole={handleSwitchRole}
          isSwitchingStudent={isSwitchingStudent}
          currentRoute={currentRoute}
          onOpenReminderSettings={() => setShowGlobalReminderModal(true)}
          onLogout={handleLogout}
        />
      )}

      {isAuth && <ProgressSyncBanner />}
      {studentSwitchError && <div role="alert" className="mx-auto my-3 w-full max-w-7xl rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">{studentSwitchError}</div>}
      {showParentAccess && <ParentAccessDialog busy={isSwitchingStudent} onVerify={openParentPanel} onClose={() => setShowParentAccess(false)} onLogin={() => { setShowParentAccess(false); handleNavigateToLogin('parent'); }} />}
      {isSwitchingStudent && <div role="status" className="mx-auto my-3 w-full max-w-7xl rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm text-indigo-800">{switchTarget === 'parent' ? 'Veli oturumu açılıyor…' : 'Öğrenci oturumu açılıyor…'}</div>}
      {/* Main View Router */}
      <div role={currentRoute === 'landing' ? undefined : 'main'} className={`flex-1 w-full ${currentRoute === 'landing' ? '' : 'overflow-x-hidden'}`}>
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status">Yükleniyor…</div>}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentRoute === 'practice' ? `practice-${selectedPracticeCategory}-${selectedPracticeTopic}` : currentRoute}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex-1 flex flex-col"
          >
            {currentRoute === 'landing' && (
              <LandingPage
                onNavigateToLogin={handleNavigateToLogin}
                onNavigate={navigateTo}
              />
            )}

            {isAndroidApp && currentUser.role==='student' && ['dashboard','student-study','student-rewards','student-profile'].includes(currentRoute) && <AndroidStudentHub key={`${currentUser.id}-${currentUser.grade}-${currentRoute}`} route={currentRoute} user={currentUser} progress={storyProgress} saveError={storySaveError} onNavigate={navigateTo} onStartStory={stage=>navigateTo('adaptive','mixed',stage)} onSelectStory={selectStory} onUserUpdate={setCurrentUser} onReminder={()=>setShowGlobalReminderModal(true)} onLogout={()=>void handleLogout()} />}
            {((currentRoute === 'dashboard' && !isAndroidApp) || (isAndroidApp && !!nativeSections[currentRoute])) && (
              <div className={isAndroidApp?'bj-native-detail':undefined}>
              {isAndroidApp&&<button type="button" className="bj-native-back" onClick={()=>navigateTo(['student-challenges','student-progress'].includes(currentRoute)?'student-rewards':'student-study')}>← Geri dön</button>}
              <StudentDashboard
                key={currentRoute}
                initialSection={!isAndroidApp&&currentRoute==='dashboard'?'adventure':nativeSections[currentRoute]}
                storyProgress={storyProgress} storySaveError={storySaveError} onStartStory={stage=>navigateTo('adaptive','mixed',stage)} onSelectStory={selectStory}
                isLoading={authLoading}
                user={currentUser}
                dailyPlan={dailyPlan}
                masteries={masteries}
                mistakes={mistakes}
                onUserUpdate={(u) => setCurrentUser(u)}
                onStartPractice={(category) => {
                  setSelectedPracticeTopic('mixed');
                  setSelectedPracticeCategory((category as CognitiveCategory | 'mixed') || 'mixed');
                  navigateTo('practice');
                }}
                onStartTopicPractice={topic => { setSelectedPracticeTopic(topic); setSelectedPracticeCategory(topicCategory(topic, 'mixed')); navigateTo('practice', topic); }}
                onStartAdaptive={() => navigateTo('adaptive')}
                onStartExam={() => navigateTo('exams')}
                onOpenMistakes={() => navigateTo('mistakes')}
                onNavigate={navigateTo}
              /></div>
            )}

            {currentRoute === 'demo-limit' && (
              <div className="mx-auto w-full max-w-2xl px-5 py-20 text-center" role="status">
                <span className="text-5xl" aria-hidden="true">✦</span>
                <h1 className="mt-6 text-3xl font-bold text-slate-900">Bu alan deneme hesabında kapalı</h1>
                <p className="mt-4 text-slate-600">Deneme hesabı toplam üç örnek soru içerir. Adaptif çalışma, sınavlar, raporlar ve veli portalı tam üyelik içindir.</p>
                <p className="mt-2 text-sm text-slate-500">Kalan örnek soru: {demoQuestionsRemaining()}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {demoQuestionsRemaining() > 0 && <button type="button" onClick={() => navigateTo('practice')} className="rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white">Örnek soruları çöz</button>}
                  <button type="button" onClick={() => navigateTo('register')} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-900">Hesap oluştur</button>
                </div>
              </div>
            )}

            {currentRoute === 'practice' && (isDemoUser(currentUser.id) ? (
              <PracticeSessionView
                key={`practice-${selectedPracticeCategory}`}
                initialCategory={selectedPracticeCategory}
                onNavigateHome={leaveTest}
                onOpenMistakes={() => navigateTo('mistakes')}
              />
            ) : <VerifiedLearningView key={`verified-${selectedPracticeCategory}-${selectedPracticeTopic}`} mode="practice" initialCategory={selectedPracticeCategory} initialTopic={selectedPracticeTopic} onNavigateHome={leaveTest} />)}

            {currentRoute === 'adaptive' && (
              <VerifiedLearningView key={activeStory?.stage.id || 'free-adaptive'} mode="adaptive" storyStage={activeStory?.stage} storyReward={storyReward} onStoryComplete={completeStory} onContinueStory={activeStory&&isStoryStageComplete(storyProgress,activeStory.stage)&&nextCampaignStage(storyProgress,activeStory.stage.campaignId||'')?()=>navigateTo('adaptive','mixed',nextCampaignStage(storyProgress,activeStory.stage.campaignId||'')):undefined} onNavigateHome={leaveTest} />
            )}

            {currentRoute === 'exams' && (
              <VerifiedLearningView mode="exam" onNavigateHome={leaveTest} />
            )}

            {currentRoute === 'mistakes' && (
              <MistakeNotebookView
                onNavigateHome={() => navigateTo('dashboard')}
              />
            )}

            {currentRoute === 'achievements' && (
              <AchievementsView
                user={currentUser}
                onNavigateHome={() => navigateTo('dashboard')}
                onUserUpdate={(u) => setCurrentUser(u)}
                onStartPractice={() => navigateTo('practice')}
              />
            )}

            {currentRoute === 'leaderboard' && (
              <LeaderboardView
                currentUser={currentUser}
                onNavigateHome={() => navigateTo('dashboard')}
                onStartPractice={() => navigateTo('practice')}
              />
            )}

            {currentRoute === 'glossary' && (
              <CognitiveGlossaryView
                onNavigateHome={() => navigateTo('dashboard')}
                onStartPractice={() => navigateTo('practice')}
              />
            )}

            {currentRoute === 'parent' && (
              <ParentPortalView
                student={currentUser}
                masteries={masteries}
                onNavigate={navigateTo}
                isSwitchingStudent={isSwitchingStudent}
                onOpenStudent={studentId => void openStudentPanel(studentId)}
              />
            )}

            {currentRoute === 'login' && (
              <LoginPage
                key={`${loginMode}-${loginRole}`}
                initialMode={loginMode}
                initialRole={loginRole}
                onModeChange={(mode, role) => window.history.replaceState(window.history.state, '', accountEntryPath(mode, role))}
                onLoginSuccess={(role, profile) => {
                  if (accountEntry(new URL(window.location.href))) window.history.replaceState(window.history.state, '', '/');
                  setIsAuth(true);
                  if (profile) {
                    setCurrentUser(profile);
                  } else {
                    setCurrentUser(dataService.getCurrentUser());
                  }
                  if (role === 'student') navigateTo('dashboard');
                  else if (role === 'parent') navigateTo('parent');
                  else if (role === 'admin') navigateTo('admin');
                }}
                onNavigateHome={() => navigateTo('landing')}
              />
            )}
          </motion.div>
        </AnimatePresence>
        </Suspense>
      </div>

      {/* Mobile Bottom Navigation Bar - Hidden during test routes for full screen test view */}
      {currentRoute !== 'landing' && currentRoute !== 'login' && !isTestRoute && (
        <MobileBottomNav
          currentRoute={currentRoute}
          onNavigate={navigateTo}
          mistakesCount={(mistakes || []).filter((m) => !m.resolved).length}
          userRole={currentUser?.role || 'student'}
          onLogout={handleLogout}
        />
      )}

      {/* Global In-App Study Reminder Alert (Modal / Banner) */}
      {activeAlert && (
        <StudyReminderInAppAlert
          alert={activeAlert}
          onNavigateToAction={(action) => {
            setActiveAlert(null);
            navigateTo(action);
          }}
          onClose={() => setActiveAlert(null)}
        />
      )}

      {/* Global Study Reminder Settings Modal */}
      <StudyReminderSettingsModal
        user={currentUser}
        isOpen={showGlobalReminderModal}
        onClose={() => setShowGlobalReminderModal(false)}
        onConfigSaved={() => {
          syncState();
        }}
      />
    </div>
  );
}


