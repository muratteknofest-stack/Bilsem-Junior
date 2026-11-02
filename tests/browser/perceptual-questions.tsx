import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '../../src/index.css';
import { generatePerceptualQuestion, PERCEPTUAL_MECHANICS, type PerceptualValue } from '../../src/features/questions/perceptual-engine';
import { QuestionRenderer } from '../../src/features/questions/renderers/QuestionRenderer';
import { PerceptualCard } from '../../src/features/questions/renderers/PerceptualBoard';
import { AnswerWorkspace } from '../../src/features/questions/renderers/AnswerWorkspace';
import type { QuestionResponse } from '../../src/features/questions/answer-interactions';
import type { BaseQuestion } from '../../src/types';
function Sample({ q }: { q: BaseQuestion }) {
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  return <section data-perceptual-sample style={{ marginTop: 24, border: '1px solid #b6ccef', borderRadius: 16, background: '#fff', padding: 12, minWidth: 0 }}><h2 style={{ fontSize: 16, fontWeight: 750, marginBottom: 12 }}>{q.prompt}</h2><QuestionRenderer question={q}/><AnswerWorkspace question={q} response={response} onChange={setResponse} preferredMode="choice"/></section>;
}
const root = createRoot(document.getElementById('root')!);
const render = () => root.render(<main style={{ padding: 10, maxWidth: 1000, margin: 'auto', background: '#f4f8ff' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>Bilsem Junior · Görsel ilişkiler</h1>{PERCEPTUAL_MECHANICS.map(m => <Sample key={m} q={generatePerceptualQuestion(m, 982451, 3, 2)}/>)}</main>);
(window as any).__renderPerceptualCard = (value: PerceptualValue) => flushSync(() => root.render(<div data-card-proof style={{ width: 256, height: 256 }}><PerceptualCard value={value}/></div>));
(window as any).__renderPerceptualSamples = () => flushSync(render);
render();
