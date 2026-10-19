import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AndroidStudentHub } from '../../src/components/android/AndroidStudentHub';
import { StudentDashboard } from '../../src/components/StudentDashboard';
import { emptyStoryProgress } from '../../src/features/student/story-adventure';
import type { UserProfile } from '../../src/types';
import '../../src/index.css';

const student: UserProfile = { id:'motion-fixture', role:'student', name:'Deniz', grade:2, avatar:'🦊', xp:300, level:2, streak:3,
  lastActiveDate:new Date().toISOString(), dailyGoalMinutes:15, todayMinutesSpent:5, dailyGoalQuestions:10, todayQuestionsSolved:7,
  todaySessionsCompleted:1, soundEnabled:false };
function Fixture() {
  const [route,setRoute] = useState('dashboard');
  const [action,setAction] = useState('');
  const web = new URLSearchParams(location.search).has('web');
  return <div className={`bilsem-junior-skin ${web ? '' : 'bj-native-shell'}`}>
    <nav aria-label="Yerel kontrol"><button onClick={()=>setRoute('dashboard')}>Macera</button><button onClick={()=>setRoute('student-study')}>Çalış</button><button onClick={()=>setRoute('student-rewards')}>Ödüller</button><button onClick={()=>setRoute('student-profile')}>Profil</button></nav>
    <output aria-label="Son işlem">{action}</output>
    {web ? <StudentDashboard user={student} mistakes={[]} onUserUpdate={()=>{}} onNavigate={setAction} onStartAdaptive={()=>setAction('adaptive')}
      onStartPractice={()=>setAction('practice')} onStartExam={()=>setAction('exam')} onOpenMistakes={()=>setAction('mistakes')} />
      : <AndroidStudentHub key={route} route={route} user={student} progress={emptyStoryProgress()} saveError="" onNavigate={setAction}
        onStartStory={stage=>setAction(stage.id)} onUserUpdate={()=>{}} onReminder={()=>setAction('reminder')} onLogout={()=>setAction('logout')}/>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
