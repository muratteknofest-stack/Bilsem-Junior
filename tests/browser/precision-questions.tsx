import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import '../../src/components/VerifiedLearningView.css';
import {AnswerWorkspace} from '../../src/features/questions/renderers/AnswerWorkspace';
import {FocusedQuestionScreen} from '../../src/components/FocusedQuestionScreen';
import {generatePrecisionQuestion,PRECISION_TYPES,type PrecisionType} from '../../src/features/questions/precision-lab';
import type {SchoolGrade} from '../../src/features/questions/quality-policy';
import type {DifficultyLevel,BaseQuestion} from '../../src/types';
import type {QuestionResponse} from '../../src/features/questions/answer-interactions';
declare global {interface Window {__precision:(type:PrecisionType,grade:SchoolGrade,difficulty:DifficultyLevel,seed:number)=>string;__precisionTypes:readonly PrecisionType[];__precisionAnswer:QuestionResponse|null;__precisionPlace:()=>void;}}
function Preview(){
  const [workspace,setWorkspace]=useState(false);window.__precisionPlace=()=>setWorkspace(true);
  const [q,setQuestion]=useState<BaseQuestion>(()=>generatePrecisionQuestion('maze_path',81719,3,3)),[response,setResponse]=useState<QuestionResponse|null>(null);
  window.__precision=(type,grade,difficulty,seed)=>{const q=generatePrecisionQuestion(type,seed,difficulty,grade);setQuestion(q);setResponse(null);setWorkspace(false);return q.id;};window.__precisionTypes=PRECISION_TYPES;
  if(workspace)return <AnswerWorkspace question={q} response={response} onChange={setResponse} preferredMode="place"/>;
  return <div data-preview-question={q.id}><FocusedQuestionScreen question={q} sessionKey={q.id} index={0} total={20} mode="practice" remaining={240} busy={false} expired={false} feedback={null} submitted={false} progress={{answered:0,streak:0,xp:0}} response={response} error="" onChange={r=>{setResponse(r);window.__precisionAnswer=r;}} onLeave={()=>{}} onPrevious={()=>{}} onNext={()=>{}} onContinueFeedback={()=>{}} tools={<p>Çalışma araçları</p>}/></div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
