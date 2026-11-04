import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PHOTO_MECHANICS, PHOTO_IDS, PHOTO_ASSETS, PHOTO_TOPICS, generatePhotoQuestion, validatePhotoBoard, solvePhotoBoard, independentlyMatchesPhoto, photoValueKey, type PhotoBoard } from '../src/features/questions/photo-lab';
import { EDUCATION_PROFILES } from '../src/features/questions/quality-policy';
import type { DifficultyLevel } from '../src/types';
import { auditQuestion, isQuestionReadyForStudents } from '../src/features/questions/quality';
import { assessCandidate } from '../src/features/questions/multi-stage-quality';
import { solveQuestion } from '../src/features/questions/universal-solver';
import { QuestionRenderer } from '../src/features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../src/features/questions/renderers/OptionRenderer';
import { MemoryStudy } from '../src/features/questions/renderers/MemoryStudy';
import { generateQuestion } from '../src/features/questions/generators';
import { assertLearningQuestionFormat, currentReasoningCandidate, generateVariedLearningQuestion } from '../server/learning-question-selection';
import { LEARNING_QUESTION_FORMAT, supportsPhotoFormat, supportsShadowFormat } from '../src/features/student/learning-question-format';

test('real photographs have pinned local bytes, source provenance and public-domain licenses', () => {
  const credits = JSON.parse(readFileSync('public/question-photos/v1/credits.json', 'utf8')) as Array<{id:string;path:string;license:string;sourcePage:string;sha256:string;width:number;height:number;author:string}>;
  assert.deepEqual(new Set(credits.map(c => c.id)), new Set(PHOTO_IDS));
  for (const c of credits) {
    assert.ok(['CC0','Public Domain'].includes(c.license)); assert.match(c.sourcePage, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.ok(c.author.length > 2); assert.ok(c.width >= 400 && c.height >= 400);
    assert.equal(c.path, PHOTO_ASSETS[c.id as keyof typeof PHOTO_ASSETS].src);
    const bytes = readFileSync(`public${c.path}`);
    assert.equal(bytes.subarray(0,4).toString(),'RIFF'); assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);
  }
});

test('all four grades and allowed difficulties have one independently proven answer and pass educational gates', () => {
  let count = 0;
  for (const grade of [1,2,3,4] as const) for (let d = 1; d <= EDUCATION_PROFILES[grade].maxDifficulty; d++) for (const mechanic of PHOTO_MECHANICS) for (let seed = 1; seed <= 12; seed++) {
    const q=generatePhotoQuestion(mechanic,seed*109+grade,d as DifficultyLevel,grade), b=validatePhotoBoard(q.visualConfig);
    const independentlyCorrect = q.options.filter(o => independentlyMatchesPhoto(b,o.visualData));
    assert.equal(independentlyCorrect.length,1); assert.equal(independentlyCorrect[0].id,q.correctOptionId);
    assert.equal(new Set(q.options.map(o=>JSON.stringify(o.visualData))).size,4);
    assert.equal(solveQuestion(q).isMatch,true);
    assert.equal(isQuestionReadyForStudents(q),true,JSON.stringify(auditQuestion(q)));
    if(seed===1){const failed=assessCandidate(q,{grade,difficulty:d}).stages.filter(s=>s.status==='failed');assert.deepEqual(failed,[]);}
    assert.equal(photoValueKey(solvePhotoBoard(b)),photoValueKey(independentlyCorrect[0].visualData as ReturnType<typeof solvePhotoBoard>));
    count++;
  }
  assert.equal(count,720);
});

test('malformed boards, extra answers, remote image identities and invisible changes fail closed', () => {
  const q=generatePhotoQuestion('photo-difference',19,2,2), b=validatePhotoBoard(q.visualConfig) as Extract<PhotoBoard,{mechanic:'photo-difference'}>;
  assert.throws(()=>validatePhotoBoard({...b,right:b.left}));
  assert.throws(()=>validatePhotoBoard({...b,answer:2}));
  assert.throws(()=>validatePhotoBoard({...b,left:b.left.map(()=> 'https://example.com/image.jpg')}));
  const count=generatePhotoQuestion('photo-count',13,2,2), cb=validatePhotoBoard(count.visualConfig) as Extract<PhotoBoard,{mechanic:'photo-count'}>;
  assert.throws(()=>validatePhotoBoard({...cb,cards:cb.cards.map(()=>cb.target)}));
  const wrong=structuredClone(q);wrong.correctOptionId=q.options.find(o=>o.id!==q.correctOptionId)!.id;
  assert.equal(isQuestionReadyForStudents(wrong),false);
  const tampered=structuredClone(q);tampered.prompt='Bu fotoğraflardan en güzel olan hangisidir?';
  assert.equal(isQuestionReadyForStudents(tampered),false);
  const duplicate=structuredClone(q);duplicate.options[1].visualData=duplicate.options[0].visualData;
  assert.equal(isQuestionReadyForStudents(duplicate),false);
  assert.throws(()=>generatePhotoQuestion('photo-memory',7,6,1));
});

test('rendered photos are local, responsive and memory clues and answer choices stay hidden until recall', () => {
  for (const mechanic of PHOTO_MECHANICS) {
    const q=generatePhotoQuestion(mechanic,31,2,2);
    const html=renderToStaticMarkup(<QuestionRenderer question={q}/>);
    assert.match(html,/data-photo-mechanic/);assert.match(html,/src="\/question-photos\/v1\//);
    assert.doesNotMatch(html,/<svg/);assert.doesNotMatch(html,/src="https?:/);
    for (const option of q.options) assert.match(renderToStaticMarkup(<OptionRenderer option={option} question={q} questionType={q.type}/>),/bj-photo-(card|number)/);
  }
  const q=generatePhotoQuestion('photo-memory',9,2,2);
  const html=renderToStaticMarkup(<MemoryStudy question={q}><QuestionRenderer question={q}/>{q.options.map(option=><OptionRenderer key={option.id} option={option} question={q}/>)}</MemoryStudy>);
  assert.match(html,/Deseni gizle ve cevapla/);assert.doesNotMatch(html,/zp-answer-option/);assert.doesNotMatch(html,/Soldan sağa \d\. kartta/);
});

test('old APK formats never receive photo boards; authoring and learning generators can select the new engine', () => {
  assert.equal(LEARNING_QUESTION_FORMAT,'photo-lab-1'); assert.equal(supportsPhotoFormat('shadow-lab-1'),false); assert.equal(supportsShadowFormat(LEARNING_QUESTION_FORMAT),true);
  for(const mechanic of PHOTO_MECHANICS){
    const q=generateQuestion({profile:'photo-lab',targetGrade:2,type:PHOTO_TOPICS[mechanic],difficulty:2,seed:41});
    assert.doesNotThrow(()=>assertLearningQuestionFormat([q],LEARNING_QUESTION_FORMAT));
    for(const legacy of ['shadow-lab-1','visual-lab-1',undefined])assert.throws(()=>assertLearningQuestionFormat([q],legacy));
    assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true,true,true,true,false),false);
    assert.equal(currentReasoningCandidate(q,2,true,true,true,true,true,true,true,true,true),true);
  }
  const q=generateVariedLearningQuestion({grade:2,category:'memory',difficulty:2,seed:71,typeCounts:new Map(),photo:true,randomIndex:max=>max-1});
  assert.equal(q.authoring?.engine,'photo-lab-1');
});
