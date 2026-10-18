import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LearningSetupPanel } from '../../src/components/student/LearningSetupPanel';
import type { LearningTopic } from '../../src/features/student/learning-topics';
import type { LearningDifficulty } from '../../src/features/student/learning-selection';
import { useStudentReducedMotion } from '../../src/features/student/experience-preferences';
import type { LearningCategory } from '../../src/features/student/learning-contract';
import '../../src/index.css';
import '../../src/components/VerifiedLearningView.css';

declare global { interface Window { launchSelection?: { topic: LearningTopic; difficulty: LearningDifficulty; count: number }; } }
function Fixture() {
  const [topic,setTopic] = useState<LearningTopic>('mixed');
  const [category,setCategory] = useState<LearningCategory>('mixed');
  const [difficulty,setDifficulty] = useState<LearningDifficulty>('mixed');
  const [count,setCount] = useState('10');
  const reduced = useStudentReducedMotion();
  const grade = Number(new URLSearchParams(location.search).get('grade'));
  const safeGrade = grade === 1 || grade === 2 || grade === 3 || grade === 4 ? grade : 4;
  return <main className="zp-learning zp-game zp-learning-setup mx-auto w-full" data-reduced-motion={reduced}><header className="zp-page-header flex flex-wrap justify-between"><div><p className="zp-eyebrow">Bilsem Junior · Oyun alanı</p><h1>Adaptif çalışma</h1></div><button>Ana sayfaya dön</button></header><div className="zp-game-shell"><div className="zp-screen"><div className="zp-screen-bar"><span>KEŞFET · DÜŞÜN · ÇÖZ</span><span>{safeGrade}. SINIF</span></div><LearningSetupPanel mode="adaptive" grade={safeGrade} review={false} busy={false} topic={topic} onTopic={setTopic} category={category} onCategory={setCategory} difficulty={difficulty} onDifficulty={setDifficulty} questionCount={count} onCount={setCount} validCount={/^\d+$/.test(count) && Number(count)>=1 && Number(count)<=50} exam="mini" onExam={()=>{}} exams={[]} onStart={()=>{window.launchSelection={topic,difficulty,count:Number(count)};}} /></div></div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
