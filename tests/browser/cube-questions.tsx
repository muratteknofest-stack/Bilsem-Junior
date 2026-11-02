import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {generateCubeQuestion,CUBE_MECHANICS,cubeAllowed} from '../../src/features/questions/cube-lab';
import {QuestionRenderer} from '../../src/features/questions/renderers/QuestionRenderer';
import {AnswerWorkspace} from '../../src/features/questions/renderers/AnswerWorkspace';
import type {QuestionResponse} from '../../src/features/questions/answer-interactions';
import type {BaseQuestion} from '../../src/types';
function Sample({q}:{q:BaseQuestion}){const [response,setResponse]=useState<QuestionResponse|null>(null);return <section data-cube-sample style={{margin:'16px 0',padding:12,border:'1px solid #b6ccef',borderRadius:16,background:'#fff',minWidth:0}}><h2 style={{fontSize:15,fontWeight:750}}>{q.targetGrade}. sınıf · {q.prompt}</h2><QuestionRenderer question={q}/><AnswerWorkspace question={q} response={response} onChange={setResponse} preferredMode="choice"/></section>;}
createRoot(document.getElementById('root')!).render(<main style={{padding:10,maxWidth:900,margin:'auto',background:'#f4f9ff'}}><h1 style={{fontSize:22,fontWeight:800}}>Bilsem Junior · Küp atölyesi</h1>{([1,2,3,4] as const).map(g=><div key={g} data-cube-grade={g}>{CUBE_MECHANICS.filter(m=>cubeAllowed(m,g,g===1?2:3)).map(m=><Sample key={m} q={generateCubeQuestion(m,81719,(g===1?2:3),g)}/>)}</div>)}</main>);
