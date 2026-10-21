import {generateQuestion} from '../../src/features/questions/generators';
import {EDUCATION_PROFILES} from '../../src/features/questions/quality-policy';
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import '../../src/index.css';import '../../src/components/VerifiedLearningView.css';
import {FocusedQuestionScreen} from '../../src/components/FocusedQuestionScreen';import type {BaseQuestion} from '../../src/types';import type {QuestionResponse} from '../../src/features/questions/answer-interactions';import pilot from '../../docs/question-engine-v2/pilot-100.json';
const persisted=pilot.questions as unknown as BaseQuestion[];
const extra=([1,2,3,4] as const).flatMap(grade=>Array.from({length:3},(_,i)=>generateQuestion({profile:'professional-v2',type:'shape_equation',targetGrade:grade,difficulty:EDUCATION_PROFILES[grade].maxDifficulty,seed:87191+i*7919})));
// Explicitly authored layout examples, never presented as AI output or persisted.
const contextExamples=extra.filter((_,i)=>i%3===0).map(q=>({...q,id:q.id+'-context',context:{title:'Keşif durağı',story:'Meraklı kaşif, gizemli atölyenin yeni kapısına ulaştı.'}}));
const questions=[...persisted,...extra,...contextExamples];
declare global{interface Window{__pilotCount:number;__showPilot:(index:number)=>void;__pilotAnswer:QuestionResponse|null;__pilotTypes:string[]}}
function Pilot(){const [index,setIndex]=useState(0),[response,setResponse]=useState<QuestionResponse|null>(null);window.__showPilot=value=>{setIndex(value);setResponse(null);window.__pilotAnswer=null;};window.__pilotCount=questions.length;window.__pilotTypes=questions.map(q=>q.type);const q=questions[index];return <FocusedQuestionScreen key={q.id} question={q} sessionKey={q.id} index={index} total={questions.length} remaining={240} busy={false} submitted={false} response={response} onChange={answer=>{setResponse(answer);window.__pilotAnswer=answer;}} error="" onLeave={()=>{}} onNext={()=>setIndex((index+1)%questions.length)} tools={<p>Gerçek soru bileşenleri. Oturum veya API taklidi kullanılmaz.</p>}/>;}
createRoot(document.getElementById('root')!).render(<Pilot/>);
