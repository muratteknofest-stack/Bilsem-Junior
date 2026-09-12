import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

import { AnimatePresence, motion } from 'motion/react';
import { UserProfile, UserRole, SkillMastery, MistakeItem, DailyStudyPlan, ReminderAlertEvent, CognitiveCategory } from './types';
import { dataService } from './services/data-service';
import { reminderService } from './services/reminder-service';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LandingPage } from './components/LandingPage';
import { StudentDashboard } from './components/StudentDashboard';
import { PracticeSessionView } from './components/PracticeSessionView';
import { AdaptivePracticeView } from './components/AdaptivePracticeView';
import { ExamSessionView } from './components/ExamSessionView';
import { MistakeNotebookView } from './components/MistakeNotebookView';
import { AchievementsView } from './components/AchievementsView';
import { ParentPortalView } from './components/ParentPortalView';
import { AdminPanelView } from './components/AdminPanelView';
import { StudyReminderInAppAlert } from './components/StudyReminderInAppAlert';
import { StudyReminderSettingsModal } from './components/StudyReminderSettingsModal';
import { LeaderboardView } from './components/LeaderboardView';
import { CognitiveGlossaryView } from './components/CognitiveGlossaryView';
import { LoginPage } from './components/LoginPage';

export default function App() {
  // Auth context
  const { currentUser: authUser, userProfile, loading: authLoading, logout: authLogout } = useAuth();
  
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
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (!dataService.isAuthenticated()) return 'landing';
    const u = dataService.getCurrentUser();
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
      if (currentRoute === 'login' || currentRoute === 'landing') {
        setCurrentRoute(userProfile.role === 'student' ? 'dashboard' : (userProfile.role === 'parent' ? 'parent' : 'admin'));
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
    setLoginRole(role);
    setCurrentRoute('login');
  };

  const navigateTo = (targetRoute: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetRoute.startsWith('login:')) {
      const role = targetRoute.split(':')[1] as UserRole;
      setLoginRole(role);
      setCurrentRoute('login');
      return;
    }

    if (targetRoute === 'login') {
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

    // Student trying to access parent or admin -> stay on dashboard
    if (u.role === 'student' && (targetRoute === 'parent' || targetRoute === 'admin')) {
      setCurrentRoute('dashboard');
      syncState();
      return;
    }

    // Parent can only access parent portal
    if (u.role === 'parent' && targetRoute !== 'parent') {
      setCurrentRoute('parent');
      syncState();
      return;
    }

    // Admin can only access admin panel
    if (u.role === 'admin' && targetRoute !== 'admin') {
      setCurrentRoute('admin');
      syncState();
      return;
    }

    setCurrentRoute(targetRoute);
    syncState();
  };

  const isTestRoute = currentRoute === 'practice' || currentRoute === 'adaptive' || currentRoute === 'exams';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Universal Header - hidden on mobile/tablet during tests for distraction-free full-screen test experience */}
      {!isTestRoute && (
        <Navbar
          currentUser={currentUser}
          onNavigateHome={() => navigateTo(isAuth ? (currentUser?.role === 'student' ? 'dashboard' : currentUser?.role === 'parent' ? 'parent' : 'admin') : 'landing')}
          onNavigate={navigateTo}
          currentRoute={currentRoute}
          onOpenReminderSettings={() => setShowGlobalReminderModal(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 w-full overflow-x-hidden">
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
                  setSelectedPracticeCategory(category || 'mixed');
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
      </main>

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
