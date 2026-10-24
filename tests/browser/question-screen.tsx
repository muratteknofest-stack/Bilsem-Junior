import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/components/VerifiedLearningView.css';
import { FocusedQuestionScreen } from '../../src/components/FocusedQuestionScreen';
import { generateQuestion, ALL_QUESTION_TYPES } from '../../src/features/questions/generators';
import { generateLabQuestion, type LabMechanic } from '../../src/features/questions/reasoning-lab';
import type { QuestionResponse } from '../../src/features/questions/answer-interactions';
import type { AnswerFeedback } from '../../src/features/student/answer-feedback';
import type { LearningMode } from '../../src/features/student/learning-contract';
import type { SessionProgress } from '../../src/features/student/session-progress';

// A local rendering fixture. No authentication, API or database writes occur here.
const controls = window as any;
const params = new URLSearchParams(location.search);
function QA() {
  const [scenario, setScenario] = useState<any>(null);
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [preview, setPreview] = useState<{
    index: number; total: number; mode: LearningMode; progress: SessionProgress;
    remaining: number; busy: boolean; expired: boolean; feedback: AnswerFeedback | null;
  }>({ index: 0, total: 20, mode: 'practice', progress: { answered: 0, streak: 0, xp: 0 }, remaining: 240, busy: false, expired: false, feedback: null });
  const show = (next: any) => { setScenario(next); setResponse(null); };
  controls.__show = (type: string, grade = 4) => show({ type, grade });
  controls.__showComplete = (type: string, grade = 4, difficulty = 6) => show({ type, grade, difficulty, profile: 'complete' });
  controls.__showReasoning = (type: string, seed: number, grade = 4, difficulty = 6) => show({ type, grade, difficulty, seed, profile: 'professional' });
  controls.__preview = (next: Partial<typeof preview>) => setPreview(value => ({ ...value, ...next }));
  const q = useMemo(() => params.has('lab')
    ? generateLabQuestion(params.get('lab') as LabMechanic, Number(params.get('seed') || 321), Number(params.get('difficulty') || 2) as any, Number(params.get('grade') || 1) as any)
    : generateQuestion({ profile: scenario?.profile, type: scenario?.type || params.get('type') || 'mirror_reflection', targetGrade: Number(scenario?.grade || params.get('grade') || 2) as any, difficulty: scenario?.difficulty || 6, seed: scenario?.seed || 321 }), [scenario]);
  return <FocusedQuestionScreen {...preview} question={q} sessionKey={q.id} submitted={false} response={response}
    onChange={value => { setResponse(value); controls.__answer = value; }} error="" onLeave={() => {}}
    onPrevious={() => {}} onNext={() => {}} onContinueFeedback={() => { controls.__continued = (controls.__continued || 0) + 1; setPreview(value => ({ ...value, feedback: null })); }}
    tools={<p>Çalışma araçları</p>} />;
}
controls.__types = ALL_QUESTION_TYPES;
createRoot(document.getElementById('root')!).render(<QA />);
