import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {englishBank,englishPuzzle,selectEnglishPuzzles} from '../src/features/international/english-puzzles';
import {EnglishHome} from '../src/features/international/EnglishHome';
import {EnglishPuzzleView} from '../src/features/international/EnglishPuzzleView';
import {ENGLISH_AREAS,ENGLISH_INFO} from '../src/features/international/english-content';
import {parseEnglishProgress,recordEnglishSession,englishProgressStats,emptyEnglishProgress} from '../src/features/international/english-progress';
import {generateColorfulQuestion,independentlyMatchesColorful} from '../src/features/questions/colorful-engine';
import {auditQuestion} from '../src/features/questions/quality';
const bank=englishBank();
test('300 English puzzles have balanced levels, unique source pictures and independently proved answers',()=>{
  assert.equal(bank.length,300);assert.equal(new Set(bank.map(q=>q.id)).size,300);
  const sourceVisuals=new Set<string>();
  for(const q of bank){
    const match=q.id.match(/-color1-d(\d)-s(\d+)$/)!;const source=generateColorfulQuestion(q.area,Number(match[2]),Number(match[1]) as any);
    assert.equal(auditQuestion(source).solverVerified,true,q.id);
    assert.equal(source.options.filter(o=>independentlyMatchesColorful(source.visualConfig as any,o.visualData as any)).length,1);
    assert.equal(source.correctOptionId,q.correctOptionId);
    sourceVisuals.add(JSON.stringify(source.visualConfig));
    assert.deepEqual(englishPuzzle(source,q.level),q);assert.equal(q.options.length,4);
    assert.ok(!/[çğıöşüÇĞİÖŞÜ]/.test(q.prompt+q.explanation.steps.join('')));
    if(q.area==='figure_completion')assert.equal((q.board.source as any).cells[q.board.missing!],null);
  }
  assert.equal(sourceVisuals.size,300);
  for(const l of [1,2,3,4])assert.equal(bank.filter(q=>q.level===l).length,75);
});
test('mixed practice covers five areas, stays in the chosen level and prefers unseen puzzles',()=>{
  for(const level of [1,2,3,4] as const){
    const first=selectEnglishPuzzles(level,'mixed',5,42);assert.equal(first.length,5);assert.equal(new Set(first.map(q=>q.area)).size,5);assert.ok(first.every(q=>q.level===level));
    const next=selectEnglishPuzzles(level,'mixed',5,42,first.map(q=>q.id));assert.ok(next.every(q=>!first.some(p=>p.id===q.id)));
    for(const area of ENGLISH_AREAS){assert.ok(selectEnglishPuzzles(level,area.id,5,7).every(q=>q.area===area.id));}
  }
});
test('altered answer keys and unsupported puzzle kinds do not inherit English certification',()=>{
  const source=generateColorfulQuestion('mirror_reflection',98765,2);source.correctOptionId=source.options.find(o=>o.id!==source.correctOptionId)!.id;
  assert.throws(()=>englishPuzzle(source,1),/unique verified answer/);
  assert.throws(()=>englishPuzzle({...source,type:'matrix_2x2'},1),/Unsupported/);
});
test('English puzzle DOM uses English accessibility labels and memory hides choices while studying',()=>{
  for(const area of ENGLISH_AREAS){const q=bank.find(q=>q.area===area.id)!;const html=renderToStaticMarkup(<EnglishPuzzleView puzzle={q}/>);assert.ok(!/Nesne çizimi|Eksik kare|numaralı kalem|Renkli geometrik|Sağda dikey/.test(html));
    if(area.id==='visual_memory'){assert.match(html,/Hide pattern &amp; answer/);assert.ok(!html.includes('Choice A'));}
    else assert.match(html,/Choice A/);
  }
});
test('English home positions thinking skills without examination branding or IQ promises',()=>{
  const html=renderToStaticMarkup(<EnglishHome/>);assert.match(html,/4,000/);assert.match(html,/300/);assert.match(html,/visual reasoning/);assert.ok(!/BİLSEM|BILSEM|guaranteed IQ increase/.test(html));assert.match(html,/not an IQ test/);
  assert.ok(ENGLISH_INFO.privacy.paragraphs.some(p=>p.includes('IP addresses')));assert.ok(ENGLISH_INFO.privacy.paragraphs.some(p=>p.includes('legal identity')));
});
test('device summaries are bounded, reject malformed data and do not count a session twice',()=>{
  for(const invalid of ['broken','{"version":99,"sessions":[]}',JSON.stringify({version:1,sessions:[{id:'x'}]})])assert.deepEqual(parseEnglishProgress(invalid),emptyEnglishProgress());
  const value={id:'one',date:new Date().toISOString(),level:1,mode:'practice' as const,seconds:12,answers:[{id:'p1',area:'mirror_reflection' as const,correct:true,answered:true},{id:'p2',area:'shadow_matching' as const,correct:false,answered:false}]};
  const p=recordEnglishSession(emptyEnglishProgress(),value);assert.equal(recordEnglishSession(p,value),p);const stats=englishProgressStats(p);assert.equal(stats.attempts,1);assert.equal(stats.accuracy,100);
  assert.throws(()=>recordEnglishSession(p,{...value,id:'two',answers:[{...value.answers[0],answered:false}]}));
  let many=p;for(let i=0;i<50;i++)many=recordEnglishSession(many,{...value,id:String(i)});assert.equal(many.sessions.length,30);
});
test('English entry has its own language and build path; Turkish navigation can reach it',async()=>{
  const [html,vite,routes,navbar]=await Promise.all(['en/index.html','vite.config.ts','vercel.json','src/components/Navbar.tsx'].map(p=>readFile(p,'utf8')));
  assert.match(html,/<html lang="en">/);assert.match(vite,/en\/index.html/);assert.ok(JSON.parse(routes).rewrites.some((r:any)=>r.source==='/en/'&&r.destination==='/en/index.html'));assert.match(navbar,/aria-label="English version"/);
});

test('full English bank has 4,000 proven, distinct stems and 1,000 questions per level',async()=>{
 const {englishLearningBank}=await import('../server/english-learning-bank');
 const {isQuestionReadyForStudents}=await import('../src/features/questions/quality');
 const {generateVisualFingerprint}=await import('../src/features/questions/fingerprint');
 const {learningView,prepareLearningQuestions}=await import('../server/learning-model');
 const bank=englishLearningBank(),seen=new Set<string>();assert.equal(bank.length,4000);
 for(const grade of [1,2,3,4])assert.equal(bank.filter(q=>q.targetGrade===grade).length,1000);
 for(const q of bank){assert.equal(isQuestionReadyForStudents(q),true);const key=generateVisualFingerprint({prompt:q.prompt,board:q.visualConfig});assert.ok(!seen.has(key));seen.add(key);const en=englishPuzzle(q,q.targetGrade!);assert.ok(!/[ğüşöçıİĞÜŞÖÇ]/.test(en.prompt+en.explanation.steps.join(' ')));
 const session:any={id:crypto.randomUUID(),student_id:crypto.randomUUID(),mode:'exam',title:'Test',questions:prepareLearningQuestions([q]),answers:{},selection:{grade:q.targetGrade,locale:'en'},created_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString(),finished_at:null,result:null};
 const publicQ=learningView(session).questions[0];assert.equal(publicQ.prompt,en.prompt);assert.ok(!Object.hasOwn(publicQ,'seed'));assert.ok(!Object.hasOwn(publicQ,'correctOptionId'));if(q.type==='figure_completion')assert.equal((publicQ.visualConfig as any).source.cells[(q.visualConfig as any).missing],null);
 }
});
test('English server feedback respects exam secrecy and authoritative, idempotent scoring',async()=>{
 const {englishLearningBank}=await import('../server/english-learning-bank');const {learningView,prepareLearningQuestions,answerLearningSession,finishLearningSession}=await import('../server/learning-model');
 const now=Date.now(),q=englishLearningBank()[0];let s:any={id:crypto.randomUUID(),student_id:crypto.randomUUID(),mode:'exam',title:'Turkish title',questions:prepareLearningQuestions([q]),answers:{},selection:{grade:1,locale:'en'},created_at:new Date(now).toISOString(),expires_at:new Date(now+60000).toISOString(),finished_at:null,result:null,revision:0,rewarded_xp:0};
 const privatePrompt=s.questions[0].prompt;s=answerLearningSession(s,0,{mode:'choice',optionId:q.correctOptionId},now+1000);assert.deepEqual(Object.keys(learningView(s).answers['0']),['response']);assert.equal(learningView(s).solutions,undefined);assert.equal(s.questions[0].prompt,privatePrompt);
 s=finishLearningSession(s,now+2000);const view=learningView(s);assert.equal(view.result!.correctAnswers,1);assert.equal(view.title,'Thinking challenge');assert.match(view.solutions!['0'].explanation.steps.join(' '),/matching choice/);assert.equal(finishLearningSession(s),s);
});
test('English selection balances only its eligible categories, including recent reuse',async()=>{
 const {englishBankForGrade}=await import('../server/english-learning-bank');const {selectLearningQuestions}=await import('../server/learning-question-selection');const candidates=englishBankForGrade(1),categories=[...new Set(candidates.map(q=>q.category))];
 for(const count of [5,15,30,45]){const selected=selectLearningQuestions({count,category:'mixed',categories,candidates,exposure:new Map(),canUse:()=>true,generate:()=>{throw Error('No fallback');}});assert.equal(selected.length,count);assert.ok(selected.every(q=>categories.includes(q.category)));assert.equal(new Set(selected.map(q=>q.id)).size,count);}
});
test('English account history and error notices reject invalid data and avoid leaking raw service errors',async()=>{
 const {historySchema,englishAccountError}=await import('../src/features/international/english-account-model');assert.equal(historySchema.safeParse({sessions:[{id:'wrong'}]}).success,false);assert.match(englishAccountError({code:'invalid_credentials'}),/sign-in details/);assert.ok(!englishAccountError(Error('SQL token secret')).includes('secret'));assert.ok(!/[ğüşöçıİ]/.test(englishAccountError(Error('Oturum açılamadı.'))));
});
