// Visual and navigation fixtures only. This file is not an application build input.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentDashboard, type StudentSection } from '../../src/components/StudentDashboard';
import { AndroidStudentHub } from '../../src/components/android/AndroidStudentHub';
import { AchievementsView } from '../../src/components/AchievementsView';
import { MistakeNotebookView } from '../../src/components/MistakeNotebookView';
import { CognitiveGlossaryView } from '../../src/components/CognitiveGlossaryView';
import { LeaderboardView } from '../../src/components/LeaderboardView';
import { emptyStoryProgress } from '../../src/features/student/story-adventure';
import { syncUserFromSupabase } from '../../src/services/modules/profile-service';
import { dataService } from '../../src/services/data-service';
import { auth, supabase } from '../../src/lib/supabase';
import type { UserProfile } from '../../src/types';
import '../../src/index.css';
import '../../src/components/wordwall.css';

const student: UserProfile = { id:'22222222-2222-4222-8222-222222222222', role:'student', name:'Deniz', grade:2, avatar:'🦊', xp:300, level:2, streak:3,
  lastActiveDate:new Date().toISOString(), dailyGoalMinutes:15, todayMinutesSpent:5, dailyGoalQuestions:10, todayQuestionsSolved:7, todaySessionsCompleted:1,
  totalQuestionsSolved:37, soundEnabled:false };
await supabase.auth.initialize();
const fixtureUser = { uid:student.id, email:'student@example.invalid', displayName:student.name, emailVerified:true, getIdToken:async()=> 'fixture-access', getIdTokenResult:async()=>({claims:{}}) };
Object.defineProperty(auth,'currentUser',{configurable:true,get:()=>fixtureUser,set:()=>{}});
syncUserFromSupabase(student);
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, location.origin);
  if (url.pathname === '/api/learning/rewards') return Response.json({badges:dataService.syncBadgesWithProgress(),reviewToday:0});
  if (url.pathname === '/api/challenges/today') return Response.json({points:0,completed:0,limit:3,day:new Date().toISOString().slice(0,10)});
  if (url.pathname === '/api/ai-daily-plan') return Response.json({success:true,fallback:true});
  if (url.pathname.startsWith('/api/')) throw Error('Unexpected isolated design API '+url.pathname);
  return originalFetch(input,init);
};

function Gallery() {
  const screen = new URLSearchParams(location.search).get('screen') || 'modes';
  const [action,setAction] = useState('');
  const update = () => {};
  const home = () => setAction('home');
  let content: React.ReactNode;
  if (screen.startsWith('native-')) {
    const nativeRoutes: Record<string,string> = {'native-story':'dashboard','native-study':'student-study','native-rewards':'student-rewards','native-profile':'student-profile'};
    const route = nativeRoutes[screen] || 'dashboard';
    content = <AndroidStudentHub route={route} user={student} progress={emptyStoryProgress()} saveError="" onNavigate={setAction} onStartStory={()=>setAction('story-start')} onUserUpdate={update} onReminder={()=>setAction('reminder')} onLogout={()=>setAction('logout')}/>;
  } else if (screen === 'achievements') content = <AchievementsView user={student} onNavigateHome={home} onUserUpdate={update} onStartPractice={()=>setAction('practice')}/>;
  else if (screen === 'mistakes') content = <MistakeNotebookView onNavigateHome={home}/>;
  else if (screen === 'glossary') content = <CognitiveGlossaryView onNavigateHome={home} onStartPractice={()=>setAction('practice')}/>;
  else if (screen === 'growth') content = <LeaderboardView currentUser={student} onNavigateHome={home} onStartPractice={()=>setAction('practice')}/>;
  else content = <StudentDashboard key={screen} initialSection={screen as StudentSection} user={student} mistakes={[]} storyProgress={emptyStoryProgress()} onStartStory={()=>setAction('story-start')} onUserUpdate={update} onNavigate={setAction} onStartPractice={()=>setAction('practice')} onStartTopicPractice={id=>setAction(id)} onStartAdaptive={()=>setAction('adaptive')} onStartExam={()=>setAction('exam')} onOpenMistakes={()=>setAction('mistakes')}/>;
  return <div className={`bilsem-junior-skin ${screen.startsWith('native-')?'bj-native-shell':''}`} data-student-space="true"><output aria-label="İşlem kaydı" className="sr-only">{action}</output>{content}</div>;
}
createRoot(document.getElementById('root')!).render(<Gallery/>);
