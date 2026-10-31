import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { generateCurriculumV2 } from '../../src/features/questions/curriculum-v2';
import { QuestionRenderer } from '../../src/features/questions/renderers/QuestionRenderer';
import { AnswerWorkspace } from '../../src/features/questions/renderers/AnswerWorkspace';
import { publicVisualConfig } from '../../src/features/questions/public-visual';
import type { CompleteBoard } from '../../src/features/questions/complete-curriculum';
const questions = [generateCurriculumV2('shape_equation', 71371, 2, 1), generateCurriculumV2('balance_scale', 76531, 4, 3), generateCurriculumV2('visual_sequence', 92311, 4, 3), generateCurriculumV2('operation_machine', 81421, 4, 3)];
for (const rule of ['alternating-add', 'multiply', 'growing-difference']) for (let seed = 1; seed < 100; seed++) { const q = generateCurriculumV2('number_pattern', seed * 104729, 4, 3); if ((q.visualConfig as CompleteBoard).numberRule === rule) { questions.push(q); break; } }
createRoot(document.getElementById('root')!).render(<main style={{ padding: 12, maxWidth: 1100, margin: 'auto', color: '#152d46', background: '#f4f8ff' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>Bilsem Junior · Yeni soru atölyesi</h1>{questions.map(q => <section key={q.id} data-premium-question={q.type} style={{ minWidth: 0, marginTop: 24, border: '2px solid #b6ccef', borderRadius: 20, background: '#fff', padding: 12 }}><h2 style={{ fontSize: 18, fontWeight: 750, marginBottom: 12 }}>{q.prompt}</h2><QuestionRenderer question={{ ...q, visualConfig: publicVisualConfig(q) }} /><AnswerWorkspace question={q} response={null} onChange={() => {}} preferredMode="choice" /></section>)}</main>);
