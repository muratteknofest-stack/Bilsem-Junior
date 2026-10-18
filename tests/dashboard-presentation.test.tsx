import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ParentProgressOverview, ParentWeeklyVolume } from '../src/components/parent/ParentProgressOverview';
import { StudentMissionStrip } from '../src/components/student/StudentMissionStrip';
import type { SkillMastery, UserProfile, WeeklyQuestionProgressData } from '../src/types';

const student: UserProfile = { id:'presentation-student', role:'student', name:'Kaşif', avatar:'🦊', level:2, xp:300, streak:3,
  lastActiveDate:new Date().toISOString(), dailyGoalMinutes:15, todayMinutesSpent:5, dailyGoalQuestions:10, todayQuestionsSolved:7,
  todaySessionsCompleted:1, soundEnabled:false };
const weekly: WeeklyQuestionProgressData = {
  dailyStats:[0,2,4,0,3,6,0].map((thisWeek,dayIndex)=>({dayIndex,dayName:['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'][dayIndex],shortDay:['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][dayIndex],thisWeek,lastWeek:0,isToday:false})),
  allTimeTotal:15, fourWeeksTrend:[],
  summary:{thisWeekTotal:15,lastWeekTotal:0,difference:15,percentChange:0,direction:'up',weeklyTarget:30,targetCompletionRate:50,dailyAverage:15/7,bestDay:{dayName:'Cumartesi',shortDay:'Cmt',count:6}},
};
const skills: SkillMastery[] = [{category:'matrix',categoryName:'Matris',mastery:55,attemptCount:8,accuracy:60,recentTrend:'neutral'}, {category:'logic',categoryName:'Mantık',mastery:0,attemptCount:0,accuracy:0,recentTrend:'neutral'}];

test('parent overview uses actual weekly volume, active days, practiced skills and current goal',()=>{
  const html=renderToStaticMarkup(<ParentProgressOverview student={student} weeklyData={weekly} masteries={skills}/>);
  assert.match(html,/<strong>15<small>soru/);
  assert.match(html,/<strong>4<small>\/ 7 gün/);
  assert.match(html,/<strong>1<small>alan/);
  assert.match(html,/yüzde 70: 7 \/ 10 soru/);
  assert.match(html,/Resmî sınav puanı değildir/);
});

test('empty weeks remain empty and accessible chart rows retain exact daily counts',()=>{
  const empty=renderToStaticMarkup(<ParentWeeklyVolume weeklyData={null}/>);
  assert.match(empty,/henüz çalışma kaydı yok/);
  assert.equal((empty.match(/data-empty="true"/g)||[]).length,7);
  assert.doesNotMatch(empty,/--bar-height:[1-9]/);
  const populated=renderToStaticMarkup(<ParentWeeklyVolume weeklyData={weekly}/>);
  assert.match(populated,/<th>Cmt<\/th><td>6<\/td>/);
  assert.match(populated,/--bar-height:100%/);
  assert.equal((populated.match(/data-empty="true"/g)||[]).length,3);
});

test('daily missions do not treat yesterday’s work as today’s progress',()=>{
  const old={...student,lastActiveDate:'2020-01-01T12:00:00Z'};
  const html=renderToStaticMarkup(<StudentMissionStrip user={old} weeklyQuestions={15}/>);
  assert.equal((html.match(/value="0"/g)||[]).length,3);
  assert.equal((html.match(/data-complete="false"/g)||[]).length,3);
  assert.match(html,/Bronz ligi/);
  const parent=renderToStaticMarkup(<ParentProgressOverview student={old} weeklyData={weekly} masteries={skills}/>);
  assert.match(parent,/yüzde 0: 0 \/ 10 soru/);
});
