import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider,useAuth} from '../../src/contexts/AuthContext';
import {LoginPage} from '../../src/components/LoginPage';
import {AccountCenter} from '../../src/components/AccountCenter';
import {AccountDeletionAction} from '../../src/components/admin/AccountDeletionAction';
import {QuestionReviewStatus} from '../../src/components/admin/QuestionReviewStatus';
import App from '../../src/App';
import {AdminPortal} from '../../src/components/AdminPortal';
import {supabase} from '../../src/lib/supabase';
import {openLinkedParentSession,openLinkedStudentSession} from '../../src/services/account-security-service';
import '../../src/index.css';
function Fixture(){
 const {userProfile}=useAuth();const [mode,setMode]=useState(new URLSearchParams(location.search).get('mode')||'register');
 // Like the real App, restore the verified role after AuthProvider's loading boundary remounts children.
 useEffect(()=>{if(userProfile?.role==='parent'||userProfile?.role==='student'){const role=userProfile.role;setMode(current=>['admin','completed','review'].includes(current)?current:role);}},[userProfile?.id,userProfile?.role]);
 if(mode==='review')return <main className="p-4"><QuestionReviewStatus/></main>;
 if(mode==='admin')return <main className="p-4"><AccountDeletionAction requestId="55555555-5555-4555-8555-555555555555" onCompleted={async()=>{if(new URLSearchParams(location.search).has('refreshFailure'))throw Error('Fixture refresh failed');setMode('completed');}}/></main>;
 if(mode==='completed')return <main><h1>Silme tamamlandı</h1></main>;
 if(mode==='parent')return <main className="mx-auto max-w-xl p-4"><h1>Veli oturumu doğrulandı</h1><AccountCenter/><button onClick={async()=>{await openLinkedStudentSession('22222222-2222-4222-8222-222222222222');setMode('student');}}>Bağlı öğrenciye geç</button></main>;
 if(mode==='student')return <main className="p-4"><h1>Öğrenci oturumu doğrulandı</h1><p>{userProfile?.role}</p><button onClick={async()=>{await openLinkedParentSession('11111111-1111-4111-8111-111111111111','ExampleOnly123');setMode('parent');}}>Veli hesabına dön</button></main>;
 return <LoginPage initialMode={mode==='register'?'register':'login'} initialRole="parent" onNavigateHome={()=>setMode('register')} onLoginSuccess={role=>setMode(role)}/>;
}
function ReviewPortalFixture(){
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;void supabase.auth.signInWithPassword({email:'admin@example.invalid',password:'ExampleOnly123'}).then(result=>{if(!active)return;if(result.error)setError(result.error.message);else setReady(true);});return()=>{active=false;};},[]);
 if(error)return <p role="alert">{error}</p>;
 return ready?<AuthProvider><AdminPortal/></AuthProvider>:<p role="status">Yalıtılmış yönetici senaryosu açılıyor…</p>;
}
function StudentAppFixture(){
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;void supabase.auth.signInWithPassword({email:'student@example.invalid',password:'ExampleOnly123'}).then(result=>{if(!active)return;if(result.error)setError(result.error.message);else setReady(true);});return()=>{active=false;};},[]);
 if(error)return <p role="alert">{error}</p>;
 return ready?<AuthProvider><App/></AuthProvider>:<p role="status">Yalıtılmış öğrenci senaryosu açılıyor…</p>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).get('mode')==='student-app'?<StudentAppFixture/>:new URLSearchParams(location.search).get('mode')==='workbench'?<ReviewPortalFixture/>:<AuthProvider><Fixture/></AuthProvider>);
