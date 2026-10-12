import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALL_QUESTION_TYPES, STUDENT_CATEGORY_TYPES, generateQuestion, generateQuestionByType } from '../src/features/questions/generators';
import { STUDENT_TYPES } from '../src/features/questions/professional-engine';
import { WORKSHOP_TYPES, topicAllowedForGrade } from '../src/features/questions/topic-catalog';
import { auditQuestion, isQuestionReadyForStudents, questionContentKey } from '../src/features/questions/quality';
import { visibleOptionKey } from '../src/features/questions/mechanical-quality';
import { solveWorkshopBoard, TANGRAM_POLYGONS, type WorkshopBoard, type WorkshopValue } from '../src/features/questions/workshop-mechanics';
import { independentlyMatchesWorkshop } from '../src/features/questions/workshop-independent-solver';
import { runMultiPassQuestionTests } from '../src/features/questions/verifier';
import { evaluateResponse } from '../src/features/questions/answer-interactions';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { MemoryStudy } from '../src/features/questions/renderers/MemoryStudy';
import { AnswerWorkspace } from '../src/features/questions/renderers/AnswerWorkspace';
import { AVAILABLE_CATEGORIES } from '../src/features/student/available-categories';
import { prepareEditorialQuestion } from '../server/editorial-validation';
import { runQuestionPipeline } from '../server/ai-question-pipeline';
import { prepareLearningQuestions, publicLearningQuestion, answerLearningSession, type LearningSession } from '../server/learning-model';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../src/types';

const tile=(cells:number[])=>({size:3,cells});
const a=tile([1,0,0,1,1,0,0,0,0]), rotated=tile([0,1,1,0,1,0,0,0,0]);
const net=[{x:0,y:0,label:'1'},{x:0,y:1,label:'2'},{x:0,y:2,label:'3'},{x:0,y:3,label:'4'},{x:-1,y:1,label:'5'},{x:1,y:1,label:'6'}];
const fixtures:[QuestionType,Partial<WorkshopBoard>,WorkshopValue][]=[
  ['odd_one_out',{symbols:['▲','■','⬟','●']},{symbol:'●'}],
  ['classification',{reference:['▲','■','⬟']},{symbol:'▲'}],
  ['figure_completion',{tiles:[a,tile([1,0,0,0,1,0,0,0,0])]},tile([0,0,0,1,0,0,0,0,0])],
  ['spatial_relationship',{size:3,symbols:['●','▲','■','◆','★','⬟','⬢','✚','♥'],index:4},{symbol:'▲'}],
  ['visual_analogy',{tiles:[a,rotated,a]},rotated],
  ['visual_memory',{tiles:[a]},a],
  ['visual_attention',{reference:['●','▲'],symbols:['●','▲','●','▲','▲','●']},{textNumber:2}],
  ['logical_sequence',{labels:['B','C','A','D'],order:[2,3,1,4],position:1},{textNumber:'B'}],
  ['shape_equation',{totals:[8,11]},{textNumber:7}],
  ['latin_square',{size:3,cells:[1,2,3,2,3,1,3,1,0],index:8},{textNumber:2}],
  ['shadow_matching',{tiles:[a]},a],
  ['balance_scale',{counts:[3],totals:[18]},{textNumber:6}],
  ['gear_rotation',{counts:[3],direction:'clockwise'},{textNumber:'Saat yönünde'}],
  ['paper_folding',{size:3,folds:['x'],holes:[[0,0]]},tile([1,0,1,0,0,0,0,0,0])],
  ['venn_diagram',{groups:[['Ada','Can','Ece'],['Can','Ece','Efe']]},{textNumber:2}],
  ['cube_counting',{size:3,heights:[1,2,0,3,0,1,0,0,1]},{textNumber:8}],
  ['dice_unfold',{net,face:'1'},{textNumber:'3'}],
  ['cryptogram',{entries:[{code:'1',letter:'T'},{code:'2',letter:'O'},{code:'3',letter:'P'}],code:['1','2','3']},{textNumber:'TOP'}],
  ['top_view',{size:3,heights:[1,2,0,3,0,1,0,0,1]},tile([1,1,0,1,0,1,0,0,1])],
  ['verbal_analogy',{pairs:[['kuş','yuva'],['arı','kovan'],['at','ahır'],['tavuk','kümes']],target:1},{textNumber:'kovan'}],
  ['story_logic',{labels:['Ada','Can','Ece','Efe'],edges:[['Can','Ece'],['Ece','Ada'],['Ada','Efe']],position:2},{textNumber:'Ada'}],
  ['tangram_puzzle',{polygon:TANGRAM_POLYGONS[0]},{polygon:TANGRAM_POLYGONS[1]}],
  ['maze_path',{size:3,cells:[0,1,0,0,1,0,0,1,0],start:0,goals:[6,2,5,8]},{textNumber:'A'}],
  ['punch_folding',{size:3,folds:['x','y'],holes:[[0,0]]},tile([1,0,1,0,0,0,1,0,1])],
  ['detail_detection',{tiles:[a,tile([1,0,0,1,0,0,0,0,0])]},{textNumber:'2. satır, 2. sütun'}],
  ['weight_comparison',{labels:['Ada','Can','Ece','Efe'],edges:[['Can','Ece'],['Ece','Ada'],['Ada','Efe']]},{textNumber:'Efe'}],
  ['multiview_perspective',{size:3,heights:[1,2,0,3,0,1,0,0,1]},tile([1,0,0,1,1,0,1,1,1])],
  ['word_scramble_logic',{letters:['P','T','O'],order:[2,3,1]},{textNumber:'TOP'}],
  ['spatial_origami',{net,face:'5'},{textNumber:'6'}],
];
test('all 29 workshop rules agree with hand-solved fixtures and an independent candidate proof',()=>{
  assert.deepEqual(new Set(fixtures.map(f=>f[0])),new Set(WORKSHOP_TYPES));
  for(const [kind,data,expected] of fixtures){const b:WorkshopBoard={displayMode:'workshop_board',kind,...data};assert.deepEqual(solveWorkshopBoard(b,[expected]),expected,kind);assert.equal(independentlyMatchesWorkshop(b,expected),true,kind);}
});
test('the same complete curriculum is available in workshop, AI categories and student study',()=>{
  assert.equal(ALL_QUESTION_TYPES.length,44);assert.equal(WORKSHOP_TYPES.length,29);
  assert.deepEqual(new Set(STUDENT_TYPES),new Set(ALL_QUESTION_TYPES));
  assert.deepEqual(new Set(Object.values(STUDENT_CATEGORY_TYPES).flat()),new Set(ALL_QUESTION_TYPES));
  assert.deepEqual(new Set(Object.keys(STUDENT_CATEGORY_TYPES)),new Set(AVAILABLE_CATEGORIES));
  for(const [category,types] of Object.entries(STUDENT_CATEGORY_TYPES))for(const type of types)assert.equal(generateQuestionByType(type,321,3).category,category);
});
test('2,640 deterministic questions: all 44 topics at six levels pass grading and mutation attacks',()=>{
  for(const type of ALL_QUESTION_TYPES)for(let d=1;d<=6;d++)for(let i=1;i<=10;i++){
    const q=generateQuestionByType(type,i*983,d as DifficultyLevel),r=auditQuestion(q);
    assert.equal(r.solverVerified,true,`${type}: ${JSON.stringify(r)}`);
    assert.equal(runMultiPassQuestionTests(q).isVerified,true,q.id);
    assert.equal(r.mechanics?.uniqueVisibleOptions,4);assert.equal(r.mechanics?.matchingOptions,1);
    assert.deepEqual(q,generateQuestionByType(type,i*983,d as DifficultyLevel));
    for(const option of q.options)assert.deepEqual(evaluateResponse(q,{mode:'choice',optionId:option.id}),{complete:true,correct:option.id===q.correctOptionId});
    const wrong=structuredClone(q);wrong.correctOptionId=wrong.options.find(o=>o.id!==q.correctOptionId)!.id;
    assert.equal(isQuestionReadyForStudents(wrong),false);assert.equal(evaluateResponse(wrong,{mode:'choice',optionId:wrong.correctOptionId}).correct,false);
    const duplicate=structuredClone(q);duplicate.options[1].visualData=duplicate.options[0].visualData;duplicate.options[1].fingerprint='forged';assert.equal(isQuestionReadyForStudents(duplicate),false);
    const prose=structuredClone(q);prose.explanation.steps[0]='Cevap anahtarını tahmin ederek sonuca ulaş.';assert.equal(isQuestionReadyForStudents(prose),false);
  }
});
test('1,038 requests retain their topic, grade and safe difficulty; unavailable prerequisites are explicit',()=>{
  for(const type of ALL_QUESTION_TYPES)for(const grade of [1,2,3,4] as const)for(let d=1;d<=6;d++){
    if(!topicAllowedForGrade(type,grade)){assert.throws(()=>generateQuestion({type,targetGrade:grade,seed:321}),/profilinde/);continue;}
    const q=generateQuestion({type,targetGrade:grade,difficulty:d as DifficultyLevel,seed:321});assert.equal(q.type,type);assert.equal(q.targetGrade,grade);assert.equal(isQuestionReadyForStudents(q),true,q.id);
  }
});
test('invisible option metadata, whitespace aliases and bad geometry cannot mint unique visible options',()=>{
  assert.equal(visibleOptionKey({textNumber:'  aynı\n metin '}),visibleOptionKey({textNumber:'aynı metin'}));
  assert.equal(visibleOptionKey({textNumber:3}),visibleOptionKey({textNumber:'03'}));
  const q=generateQuestionByType('shape_equation',321,3),changed=structuredClone(q);
  changed.options[1].visualData={...changed.options[0].visualData,hiddenNoise:'different'};
  assert.match(auditQuestion(changed).errors.join(' '),/VISIBLE_DUPLICATE|INVISIBLE_OPTION_DATA/);
  assert.equal(isQuestionReadyForStudents(changed),false);
  const label=structuredClone(q);label.options[0].label='Değiştirilmiş etiket';assert.notEqual(questionContentKey(label),questionContentKey(q));assert.equal(isQuestionReadyForStudents(label),false);
  const polygon=generateQuestionByType('tangram_puzzle',321,3);polygon.options[0].visualData={polygon:[[0,0],[99,0],[0,99]]};assert.equal(isQuestionReadyForStudents(polygon),false);
});
test('ambiguous or inconsistent givens fail closed, including disconnected nets and extra maze goals',()=>{
  const board=(kind:QuestionType,data:Partial<WorkshopBoard>)=>({displayMode:'workshop_board' as const,kind,...data});
  for(const b of [
    board('latin_square',{size:3,cells:[1,1,3,2,3,1,3,1,0],index:8}),
    board('story_logic',{labels:['A','B','C','D'],edges:[['A','B']],position:1}),
    board('weight_comparison',{labels:['A','B','C','D'],edges:[['A','B'],['B','A']]}),
    board('dice_unfold',{net:net.map((n,i)=>i===5?{...n,x:3,y:3}:n),face:'1'}),
    board('maze_path',{size:3,cells:Array(9).fill(0),start:0,goals:[1,2,3,4]}),
    board('visual_analogy',{tiles:[tile(Array(9).fill(1)),tile(Array(9).fill(1)),a]}),
    board('balance_scale',{counts:[3],totals:[17]}),
  ])assert.throws(()=>solveWorkshopBoard(b));
  for(const type of WORKSHOP_TYPES){const q=generateQuestionByType(type,321,3);(q.visualConfig as any).hiddenAnswer=q.correctOptionId;assert.equal(isQuestionReadyForStudents(q),false,type);}
});
test('every topic renders givens and all four choices without exposing editorial data',()=>{
  for(const type of WORKSHOP_TYPES){const q=generateQuestionByType(type,321,3),markup=renderToStaticMarkup(<><QuestionRenderer question={q}/>{q.options.map(o=><OptionRenderer key={o.id} question={q} questionType={q.type} option={o}/>)}</>);assert.match(markup,new RegExp(`data-workshop-kind="${type}"`));assert.doesNotMatch(markup,/Tanımsız sembol|görünümü tanımlı değil|\[object Object\]|correctOptionId|distractorNotes/);}
  const q=generateQuestionByType('visual_memory',321,3);const study=renderToStaticMarkup(<MemoryStudy question={q}><QuestionRenderer question={q}/><AnswerWorkspace question={q} response={null} onChange={()=>{}}/></MemoryStudy>);assert.match(study,/Deseni gizle ve cevapla/);assert.doesNotMatch(study,/aria-label="Cevap alanı"/);
  const review=renderToStaticMarkup(<MemoryStudy question={q} review><QuestionRenderer question={q}/><AnswerWorkspace question={q} response={null} onChange={()=>{}}/></MemoryStudy>);assert.match(review,/aria-label="Cevap alanı"/);
});
test('all new topics cross editorial publication and server-owned scoring without seed/key leaks',()=>{
  for(const type of WORKSHOP_TYPES){const q=generateQuestion({type,seed:321,targetGrade:3,difficulty:3});assert.throws(()=>prepareEditorialQuestion(q,'published',0,false,'admin'));const published=prepareEditorialQuestion(q,'published',0,true,'admin');assert.equal(published.status,'published');
    const [snapshot]=prepareLearningQuestions([published]);const dto=publicLearningQuestion(snapshot);assert.equal(dto.type,type);assert.equal('seed' in dto,false);assert.equal('correctOptionId' in dto,false);assert.equal('authoring' in dto,false);
    const session:LearningSession={id:'session',student_id:'student',mode:'practice',title:'Pratik',questions:[snapshot],answers:{},created_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString(),finished_at:null,revision:0,rewarded_xp:0,result:null};const answered=answerLearningSession(session,0,{mode:'choice',optionId:snapshot.correctOptionId});assert.equal(answered.answers['0'].correct,true);assert.ok(answered.answers['0'].xp>0);
  }
});
test('all 29 new topics must pass both AI reviews; approval flags cannot bypass a failed proof',async()=>{
  for(const type of WORKSHOP_TYPES){let blind=0,editorial=0;const client={models:{async generateContent({contents}:{contents:string}){const q=JSON.parse(contents.split('Soru: ')[1]);if(!q.explanation){blind++;const answer=solveWorkshopBoard(q.visualConfig,q.options.map((o:any)=>o.visualData));return {text:JSON.stringify({chosenOptionId:q.options.find((o:any)=>JSON.stringify(o.visualData)===JSON.stringify(answer)).id,uniqueAnswer:true,sufficientInformation:true,issues:[]})};}editorial++;return {text:JSON.stringify({explanationCorrect:true,gradeAppropriate:true,ageAppropriate:true,difficultyAppropriate:true,promptClear:true,distractorsValid:true,issues:[]})};}}};
    const result=await runQuestionPipeline(client as any,{targetGrade:3,questionType:type,category:generateQuestionByType(type,321,3).category,difficulty:3,maxAttempts:1},{nextSeed:()=>321});assert.equal(result.success,true,`${type}: ${result.validationErrors.join(' ')}`);assert.equal(blind,1);assert.equal(editorial,1);assert.equal(result.qualityReport?.stages.length,9);assert.equal(isQuestionReadyForStudents(result.question),true);
  }
});

test('multi-clue equations and multi-blank squares require a unique independently proved solution',()=>{
  const equations:WorkshopBoard={displayMode:'workshop_board',kind:'shape_equation',equations:[[2,1,0,8],[0,2,1,8],[1,0,1,7]],expression:[1,2,1]};
  // Square 3, circle 2, triangle 4: 3 + 2*2 + 4 = 11.
  assert.deepEqual(solveWorkshopBoard(equations),{textNumber:11});
  for(const n of [7,9,10,11,12])assert.equal(independentlyMatchesWorkshop(equations,{textNumber:n}),n===11);
  const ambiguous={...equations,equations:[[1,1,0,5],[2,2,0,10],[0,0,1,4]]};
  assert.throws(()=>solveWorkshopBoard(ambiguous));
  assert.equal(independentlyMatchesWorkshop(ambiguous,{textNumber:11}),false);
  const square:WorkshopBoard={displayMode:'workshop_board',kind:'latin_square',size:3,cells:[0,0,3,0,3,1,3,1,0],index:0};
  assert.deepEqual(solveWorkshopBoard(square),{textNumber:1});
  assert.equal(independentlyMatchesWorkshop(square,{textNumber:1}),true);
  assert.equal(independentlyMatchesWorkshop(square,{textNumber:2}),false);
  assert.throws(()=>solveWorkshopBoard({...square,size:4,index:8,cells:[1,2,3,4,2,3,4,1,0,0,0,0,0,0,0,0]}));
});

test('new square levels require reasoning across blanks and legacy published questions remain valid',async()=>{
  const {generateWorkshopQuestion:legacy}=await import('../src/features/questions/workshop-engine-v1');
  for(const type of WORKSHOP_TYPES)assert.equal(isQuestionReadyForStudents(legacy(type,321,3)),true,type);
  for(const difficulty of [2,3,4,5,6] as const)for(let seed=1;seed<=15;seed++){
    const q=generateQuestionByType('latin_square',seed,difficulty),b=q.visualConfig as unknown as WorkshopBoard;
    const n=b.size!,r=Math.floor(b.index!/n),c=b.index!%n;
    const candidates=Array.from({length:n},(_,i)=>i+1).filter(v=>!b.cells!.slice(r*n,(r+1)*n).includes(v)&&!b.cells!.some((x,i)=>i%n===c&&x===v));
    assert.ok(candidates.length>1,'Target must not be a one-step row/column lookup');
    assert.ok(b.cells!.filter(v=>v===0).length>=3);
    assert.equal(auditQuestion(q).solverVerified,true);
  }
});

test('equation diagrams show every coefficient, cube SVG has exact units and no answer metadata',async()=>{
  const {CubeSculpture}=await import('../src/features/questions/renderers/CubeSculpture');
  const q=generateQuestionByType('shape_equation',731,4),b=q.visualConfig as unknown as WorkshopBoard;
  const html=renderToStaticMarkup(<QuestionRenderer question={q}/>);
  for(const row of b.equations!)assert.ok(html.includes(`eşittir ${row.at(-1)}`));
  const cube=renderToStaticMarkup(<CubeSculpture size={3} heights={[1,2,0,3,0,1,0,0,1]}/>);
  assert.equal((cube.match(/data-unit-cube="true"/g)||[]).length,8);
  assert.doesNotMatch(cube,/data-cube-count|correctOptionId|NaN|undefined/);
});
