import { ProgressSyncBanner } from './components/ProgressSyncBanner';
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { UserProfile, UserRole, SkillMastery, MistakeItem, DailyStudyPlan, ReminderAlertEvent, CognitiveCategory } from './types';
import { dataService } from './services/data-service';
import { sound } from './lib/sound';
import { reminderService } from './services/reminder-service';
import { demoQuestionsRemaining, isDemoUser } from './lib/demo-access';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { StudyReminderInAppAlert } from './components/StudyReminderInAppAlert';
import { StudyReminderSettingsModal } from './components/StudyReminderSettingsModal';

const StudentDashboard = lazy(() => import('./components/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const LandingPage = lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })));
const PracticeSessionView = lazy(() => import('./components/PracticeSessionView').then((m) => ({ default: m.PracticeSessionView })));
const AdaptivePracticeView = lazy(() => import('./components/AdaptivePracticeView').then((m) => ({ default: m.AdaptivePracticeView })));
const ExamSessionView = lazy(() => import('./components/ExamSessionView').then((m) => ({ default: m.ExamSessionView })));
const MistakeNotebookView = lazy(() => import('./components/MistakeNotebookView').then((m) => ({ default: m.MistakeNotebookView })));
const AchievementsView = lazy(() => import('./components/AchievementsView').then((m) => ({ default: m.AchievementsView })));
const ParentPortalView = lazy(() => import('./components/ParentPortalView').then((m) => ({ default: m.ParentPortalView })));
const AdminPanelView = lazy(() => import('./components/AdminPanelView').then((m) => ({ default: m.AdminPanelView })));
const LeaderboardView = lazy(() => import('./components/LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const CognitiveGlossaryView = lazy(() => import('./components/CognitiveGlossaryView').then((m) => ({ default: m.CognitiveGlossaryView })));
const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));

export default function App() {
  const reducedMotion = useReducedMotion();
  // Auth context
  const { currentUser: authUser, userProfile, loading: authLoading, logout: authLogout, switchRole: authSwitchRole } = useAuth();
  
  // We don't block the entire app while auth is loading anymore
  // so we can show a nice skeleton for the dashboard.
  // if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  const handleLogout = async () => {
    await authLogout();
    setIsAuth(false);
    setCurrentRoute('login');
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => dataService.getCurrentUser());
  const [isAuth, setIsAuth] = useState<boolean>(() => dataService.isAuthenticated());
  const [loginRole, setLoginRole] = useState<UserRole>('student');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (!dataService.isAuthenticated()) return 'landing';
    const u = dataService.getCurrentUser();
    if (isDemoUser(u.id) && u.role !== 'student') return 'demo-limit';
    if (u?.role === 'parent') return 'parent';
    if (u?.role === 'admin') return 'admin';
    if (u?.role === 'student') return 'dashboard';
    return 'landing';
  });
  const [masteries, setMasteries] = useState<SkillMastery[]>(() => dataService.getSkillMasteries());
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => dataService.getMistakes());
  const [dailyPlan, setDailyPlan] = useState<DailyStudyPlan>(() => dataService.getDailyPlan());
  const [selectedPracticeCategory, setSelectedPracticeCategory] = useState<CognitiveCategory | 'mixed'>('mixed');
  const [activeAlert, setActiveAlert] = useState<ReminderAlertEvent | null>(null);
  const [showGlobalReminderModal, setShowGlobalReminderModal] = useState(false);


  useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
      setIsAuth(true);
      if (currentRoute === 'login' || currentRoute === 'landing' || (userProfile.role === 'admin' && currentRoute === 'dashboard')) {
        setCurrentRoute(isDemoUser(userProfile.id) && userProfile.role !== 'student' ? 'demo-limit' : userProfile.role === 'student' ? 'dashboard' : (userProfile.role === 'parent' ? 'parent' : 'admin'));
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
    setLoginMode('login');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoginRole(role);
    setCurrentRoute('login');
  };

  const navigateTo = (targetRoute: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetRoute === 'register') {
      setLoginMode('register');
      setLoginRole('parent');
      setCurrentRoute('login');
      return;
    }

    if (targetRoute.startsWith('login:')) {
      setLoginMode('login');
      const role = targetRoute.split(':')[1] as UserRole;
      setLoginRole(role);
      setCurrentRoute('login');
      return;
    }

    if (targetRoute === 'login') {
      setLoginMode('login');
      setCurrentRoute('login');
      return;
    }

    if (targetRoute === 'landing') {
      setCurrentRoute('landing');
      return;
    }

    // Role-based route protection:
    const authenticated = dataService.isAuthenticated();
    if (!authenticated) {
      if (targetRoute === 'parent') setLoginRole('parent');
      else if (targetRoute === 'admin') setLoginRole('admin');
      else setLoginRole('student');
      setCurrentRoute('login');
      return;
    }

    const u = userProfile || currentUser || dataService.getCurrentUser();
    if (!u) {
      setCurrentRoute('login');
      return;
    }

    if (isDemoUser(u.id)) {
      if (targetRoute === 'practice' && demoQuestionsRemaining() === 0) {
        setCurrentRoute('demo-limit');
        return;
      }
      if (['adaptive', 'exams', 'mistakes', 'achievements', 'leaderboard', 'glossary', 'parent'].includes(targetRoute)) {
        setCurrentRoute('demo-limit');
        return;
      }
    }

    // Bidirectional switching between student and parent:
    if (targetRoute === 'parent') {
      if (userProfile?.role !== 'parent' && !u.id.startsWith('demo_')) {
        setCurrentRoute('dashboard');
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
      if (userProfile?.role === 'parent' && !u.id.startsWith('demo_')) {
        setCurrentRoute('parent');
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

    // Admin route protection
    if (targetRoute === 'admin' && (!authUser || userProfile?.role !== 'admin')) {
      setCurrentRoute(u.role === 'parent' ? 'parent' : 'dashboard');
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
      setCurrentRoute('admin');
    }
    syncState();
  };

  const isTestRoute = currentRoute === 'practice' || currentRoute === 'adaptive' || currentRoute === 'exams';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Workspace navigation; public pages own their header. Tests stay distraction-free. */}
      {!isTestRoute && currentRoute !== 'landing' && currentRoute !== 'login' && (
        <Navbar
          currentUser={currentUser}
          onNavigateHome={() => navigateTo(isAuth ? (currentUser?.role === 'parent' ? 'parent' : currentUser?.role === 'admin' ? 'admin' : 'dashboard') : 'landing')}
          onNavigate={navigateTo}
          onSwitchRole={handleSwitchRole}
          currentRoute={currentRoute}
          onOpenReminderSettings={() => setShowGlobalReminderModal(true)}
          onLogout={handleLogout}
        />
      )}

      {isAuth && <ProgressSyncBanner />}
      {/* Main View Router */}
      <div role={currentRoute === 'landing' ? undefined : 'main'} className={`flex-1 w-full ${currentRoute === 'landing' ? '' : 'overflow-x-hidden'}`}>
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status">Yükleniyor…</div>}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentRoute === 'practice' ? `practice-${selectedPracticeCategory}` : currentRoute}
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

            {currentRoute === 'dashboard' && (
              <StudentDashboard
                isLoading={authLoading}
                user={currentUser}
                dailyPlan={dailyPlan}
                masteries={masteries}
                mistakes={mistakes}
                onUserUpdate={(u) => setCurrentUser(u)}
                onStartPractice={(category) => {
                  setSelectedPracticeCategory((category as CognitiveCategory | 'mixed') || 'mixed');
                  navigateTo('practice');
                }}
                onStartAdaptive={() => navigateTo('adaptive')}
                onStartExam={() => navigateTo('exams')}
                onOpenMistakes={() => navigateTo('mistakes')}
                onNavigate={navigateTo}
              />
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

            {currentRoute === 'practice' && (
              <PracticeSessionView
                key={`practice-${selectedPracticeCategory}`}
                initialCategory={selectedPracticeCategory}
                onNavigateHome={() => navigateTo('dashboard')}
                onOpenMistakes={() => navigateTo('mistakes')}
              />
            )}

            {currentRoute === 'adaptive' && (
              <AdaptivePracticeView
                onNavigateHome={() => navigateTo('dashboard')}
              />
            )}

            {currentRoute === 'exams' && (
              <ExamSessionView
                onNavigateHome={() => navigateTo('dashboard')}
              />
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
              />
            )}

            {currentRoute === 'admin' && (
              <AdminPanelView />
            )}

            {currentRoute === 'login' && (
              <LoginPage
                key={`${loginMode}-${loginRole}`}
                initialMode={loginMode}
                initialRole={loginRole}
                onLoginSuccess={(role, profile) => {
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

