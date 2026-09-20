import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';

import { AnimatePresence, motion } from 'motion/react';
import { UserProfile, UserRole, SkillMastery, MistakeItem, DailyStudyPlan, ReminderAlertEvent, CognitiveCategory } from './types';
import { dataService } from './services/data-service';
import { reminderService } from './services/reminder-service';
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

const ROUTE_PATHS: Record<string, string> = {
  landing: '/',
  login: '/giris',
  dashboard: '/ogrenci',
  practice: '/pratik',
  adaptive: '/adaptif',
  exams: '/denemeler',
  mistakes: '/hata-defteri',
  achievements: '/basarilar',
  leaderboard: '/siralamalar',
  glossary: '/sozluk',
  parent: '/veli',
  admin: '/yonetim',
};
const PUBLIC_ROUTES = new Set(['landing', 'login', 'glossary']);

function routeFromPath(pathname: string): string | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return Object.entries(ROUTE_PATHS).find(([, path]) => path === normalized)?.[0] || null;
}

function homeForRole(role?: UserRole): string {
  return role === 'parent' ? 'parent' : role === 'admin' ? 'admin' : 'dashboard';
}

function roleCanOpen(role: UserRole, route: string): boolean {
  if (PUBLIC_ROUTES.has(route)) return true;
  if (role === 'parent') return route === 'parent';
  if (role === 'admin') return route !== 'parent';
  return !['parent', 'admin'].includes(route);
}

export default function App() {
  // Auth context
  const { currentUser: authUser, userProfile, loading: authLoading, logout: authLogout } = useAuth();
  
  // We don't block the entire app while auth is loading anymore
  // so we can show a nice skeleton for the dashboard.
  // if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => dataService.getCurrentUser());
  const [isAuth, setIsAuth] = useState<boolean>(() => dataService.isAuthenticated());
  const [loginRole, setLoginRole] = useState<UserRole>('student');
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const requested = typeof window !== 'undefined' ? routeFromPath(window.location.pathname) : null;
    if (!dataService.isAuthenticated()) return requested && PUBLIC_ROUTES.has(requested) ? requested : (requested ? 'login' : 'landing');
    const u = dataService.getCurrentUser();
    return requested && roleCanOpen(u.role, requested) ? requested : homeForRole(u.role);
  });
  const [masteries, setMasteries] = useState<SkillMastery[]>(() => dataService.getSkillMasteries());
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => dataService.getMistakes());
  const [dailyPlan, setDailyPlan] = useState<DailyStudyPlan>(() => dataService.getDailyPlan());
  const [selectedPracticeCategory, setSelectedPracticeCategory] = useState<CognitiveCategory | 'mixed'>('mixed');
  const [activeAlert, setActiveAlert] = useState<ReminderAlertEvent | null>(null);
  const [showGlobalReminderModal, setShowGlobalReminderModal] = useState(false);

  const commitRoute = (route: string, historyMode: 'push' | 'replace' | 'none' = 'push') => {
    setCurrentRoute(route);
    if (historyMode !== 'none' && typeof window !== 'undefined') {
      const path = ROUTE_PATHS[route] || ROUTE_PATHS.landing;
      const method = historyMode === 'replace' ? 'replaceState' : 'pushState';
      if (window.location.pathname !== path || historyMode === 'replace') {
        window.history[method]({ route }, '', path);
      }
    }
  };

  const handleLogout = async () => {
    await authLogout();
    setIsAuth(false);
    commitRoute('login');
  };

  useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
      setIsAuth(true);
      if (currentRoute === 'login' || currentRoute === 'landing' || (userProfile.role === 'admin' && currentRoute === 'dashboard')) {
        commitRoute(homeForRole(userProfile.role), 'replace');
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
      commitRoute('glossary');
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
    setLoginRole(role);
    commitRoute('login');
  };

  const navigateTo = (targetRoute: string, historyMode: 'push' | 'replace' | 'none' = 'push') => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetRoute.startsWith('login:')) {
      const role = targetRoute.split(':')[1] as UserRole;
      setLoginRole(role);
      commitRoute('login', historyMode);
      return;
    }

    if (targetRoute === 'login') {
      commitRoute('login', historyMode);
      return;
    }

    if (targetRoute === 'landing') {
      commitRoute('landing', historyMode);
      return;
    }

    if (targetRoute === 'glossary') {
      commitRoute('glossary', historyMode);
      return;
    }

    // Role-based route protection:
    const authenticated = dataService.isAuthenticated();
    if (!authenticated) {
      if (targetRoute === 'parent') setLoginRole('parent');
      else if (targetRoute === 'admin') setLoginRole('admin');
      else setLoginRole('student');
      commitRoute('login', historyMode === 'none' ? 'replace' : historyMode);
      return;
    }

    const u = dataService.getCurrentUser();
    if (!u) {
      commitRoute('login', historyMode === 'none' ? 'replace' : historyMode);
      return;
    }

    if (!roleCanOpen(u.role, targetRoute)) {
      commitRoute(homeForRole(u.role), historyMode === 'none' ? 'replace' : historyMode);
      syncState();
      return;
    }

    commitRoute(targetRoute, historyMode);
    syncState();
  };

  const navigateRef = useRef(navigateTo);
  navigateRef.current = navigateTo;

  useEffect(() => {
    const requested = routeFromPath(window.location.pathname);
    if (!requested || requested !== currentRoute) {
      const canonical = ROUTE_PATHS[currentRoute] || ROUTE_PATHS.landing;
      window.history.replaceState({ route: currentRoute }, '', canonical);
    }
    const handlePopState = () => navigateRef.current(routeFromPath(window.location.pathname) || 'landing', 'none');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isTestRoute = currentRoute === 'practice' || currentRoute === 'adaptive' || currentRoute === 'exams';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Universal Header - hidden on mobile/tablet during tests for distraction-free full-screen test experience */}
      {!isTestRoute && (
        <Navbar
          currentUser={isAuth ? currentUser : null}
          onNavigateHome={() => navigateTo(isAuth ? (currentUser?.role === 'student' ? 'dashboard' : currentUser?.role === 'parent' ? 'parent' : 'admin') : 'landing')}
          onNavigate={navigateTo}
          currentRoute={currentRoute}
          onOpenReminderSettings={() => setShowGlobalReminderModal(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 w-full overflow-x-hidden">
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" role="status">Yükleniyor…</div>}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentRoute === 'practice' ? `practice-${selectedPracticeCategory}` : currentRoute}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
              />
            )}

            {currentRoute === 'admin' && (
              <AdminPanelView />
            )}

            {currentRoute === 'login' && (
              <LoginPage
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
      </main>

      {/* Mobile Bottom Navigation Bar - Hidden during test routes for full screen test view */}
      {isAuth && currentRoute !== 'landing' && currentRoute !== 'login' && !isTestRoute && (
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
