import React from 'react';
import {createRoot} from 'react-dom/client';
import {LessonLibrary} from '../../src/components/lessons/LessonLibrary';
import {AdminLessonAudio} from '../../src/components/admin/AdminLessonAudio';
import {auth,supabase} from '../../src/lib/supabase';
import '../../src/index.css';
await supabase.auth.initialize();
// This isolated fixture owns auth; a queued provider INITIAL_SESSION must not replace it.
const fixtureUser={uid:'fixture-student',email:'fixture@example.invalid',displayName:'Fixture',emailVerified:true,getIdToken:async()=> 'fixture-access',getIdTokenResult:async()=>({claims:{}})};
Object.defineProperty(auth,'currentUser',{configurable:true,get:()=>fixtureUser,set:()=>{}});
declare global{interface Window{lessonPractice?:string;lessonBack?:boolean;lessonMembership?:boolean;}}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('admin')?<div className="mx-auto max-w-3xl p-5"><AdminLessonAudio/></div>:<LessonLibrary studentId={new URLSearchParams(location.search).get('owner')||'fixture-student'} grade={2} onBack={()=>{window.lessonBack=true;}} onPractice={id=>{window.lessonPractice=id;}} onMembership={()=>{window.lessonMembership=true;}}/>);
