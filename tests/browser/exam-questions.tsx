import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {EXAM_MECHANICS,examAllowed,generateExamQuestion} from '../../src/features/questions/exam-lab';
import {QuestionRenderer} from '../../src/features/questions/renderers/QuestionRenderer';
import {AnswerWorkspace} from '../../src/features/questions/renderers/AnswerWorkspace';
import type {BaseQuestion} from '../../src/types';
import type {QuestionResponse} from '../../src/features/questions/answer-interactions';
function Sample({q}:{q:BaseQuestion}){const [response,setResponse]=useState<QuestionResponse|null>(null);return <section data-exam-sample style={{padding:10,margin:'14px 0',border:'1px solid #bbd1e0',background:'white',borderRadius:16,minWidth:0}}><h2 style={{fontSize:15,fontWeight:750}}>{q.targetGrade}. sınıf · {q.prompt}</h2><QuestionRenderer question={q}/><AnswerWorkspace question={q} response={response} onChange={setResponse}/></section>;}
createRoot(document.getElementById('root')!).render(<main style={{padding:8,maxWidth:800,margin:'auto'}}><h1>Görsel deneme atölyesi</h1>{([1,2,3,4] as const).flatMap(g=>EXAM_MECHANICS.filter(m=>examAllowed(m,g,2)).map(m=><Sample key={`${g}-${m}`} q={generateExamQuestion(m,81719,2,g)}/>))}</main>);
