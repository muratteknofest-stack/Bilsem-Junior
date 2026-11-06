/** Select a daily ORIGINAL question from Bilsem Junior's checked question engine.
 * Only solver-verified, unambiguous multiple-choice questions are exported.
 * Prioritizes 3D spatial reasoning (cube counting, layers, blocks, perspectives, folding nets).
 * No student, profile, analytics, or user data is touched.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  generateCubeQuestion,
  cubeAllowed,
  CUBE_MECHANICS,
  type CubeMechanic,
  type CubeBoard,
} from '../../src/features/questions/cube-lab';
import {
  generatePerceptualQuestion,
  perceptualAllowed,
  PERCEPTUAL_MECHANICS,
  type PerceptualMechanic,
} from '../../src/features/questions/perceptual-engine';
import { auditQuestion } from '../../src/features/questions/quality';
import { solveQuestion } from '../../src/features/questions/universal-solver';
import type { BaseQuestion, DifficultyLevel } from '../../src/types';

const dateFromClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const day = process.env.REEL_DATE || dateFromClock;
if (!/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(Date.parse(day + 'T00:00:00Z')) ||
    new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day) {
  throw Error('REEL_DATE must be a real YYYY-MM-DD date');
}
const dayIndex = Math.floor(Date.parse(day + 'T00:00:00Z') / 86_400_000);
const requestId = process.env.REEL_REQUEST_ID || '';
if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
  throw Error('Invalid manual Reel request ID');
}
const gradeInput = process.env.REEL_GRADE;
const difficultyInput = process.env.REEL_DIFFICULTY;
if (gradeInput && !/^[1-4]$/.test(gradeInput)) throw Error('Invalid Reel grade');
if (difficultyInput && !/^[1-4]$/.test(difficultyInput)) throw Error('Invalid Reel difficulty');
const grade = (gradeInput ? Number(gradeInput) : 1 + ((dayIndex % 4 + 4) % 4)) as 1 | 2 | 3 | 4;
const difficulty = (difficultyInput ? Number(difficultyInput) : grade === 1 ? 1 + (dayIndex % 2) : 2 + (dayIndex % 2)) as DifficultyLevel;
const requestedMechanic = process.env.REEL_MECHANIC || 'auto';

const isCubeMechanic = (m: string): m is CubeMechanic => (CUBE_MECHANICS as readonly string[]).includes(m);
const isPerceptualMechanic = (m: string): m is PerceptualMechanic => (PERCEPTUAL_MECHANICS as readonly string[]).includes(m);

if (requestedMechanic !== 'auto' && !isCubeMechanic(requestedMechanic) && !isPerceptualMechanic(requestedMechanic)) {
  throw Error('Invalid Reel topic');
}

// 3D cube mechanics are the primary format for rich, engaging 3D spatial reels
const use3d = requestedMechanic === 'auto' || isCubeMechanic(requestedMechanic);

function formatVideoPrompt(q: BaseQuestion): string {
  const b = q.visualConfig as Record<string, unknown> | undefined;
  if (!b) return q.prompt;
  if (b.displayMode === 'cube_lab') {
    const m = String(b.mechanic || '');
    if (m === 'total') return 'Bu 3 boyutlu yapıda toplam kaç küp var?';
    if (m === 'layer-count') return `Zeminden ${b.layer || 2}. katmanda kaç küp var?`;
    if (m === 'complete-block') return `Bloğu ${b.targetHeight || 2} kata tamamlamak için kaç küp gerekir?`;
    if (m === 'front-view') return 'ÖN ok yönünden bakıldığında görünüş hangisidir?';
    if (m === 'right-view') return 'SAĞ ok yönünden bakıldığında görünüş hangisidir?';
    if (m === 'top-view') return 'Yapıya üstten bakıldığında görünüş hangisidir?';
    if (m === 'rotated-top') return '90° döndürüldüğünde yeni üst görünüş hangisidir?';
    if (m === 'net-opposite') return `${b.target} numaralı yüzün karşısında hangi yüz bulunur?`;
  }
  return q.prompt;
}

let selected: {
  day: string;
  grade: number;
  difficulty: number;
  mechanic: string;
  requestId: string;
  question: {
    type: string;
    prompt: string;
    fullPrompt: string;
    visualConfig: unknown;
    options: Array<{ id: string; label: string; visualData: unknown }>;
    correctOptionId: string;
    explanation: string;
  };
} | undefined;

if (use3d) {
  const allowedCube = CUBE_MECHANICS.filter(m => cubeAllowed(m, grade, difficulty) && (requestedMechanic === 'auto' || m === requestedMechanic));
  if (allowedCube.length > 0) {
    const start = ((Math.floor(dayIndex / 4) % allowedCube.length) + allowedCube.length) % allowedCube.length;
    for (let attempt = 0; attempt < 16 * allowedCube.length; attempt++) {
      const mechanic = allowedCube[(start + attempt) % allowedCube.length];
      const seedHex = createHash('sha256').update('bilsem-junior-reels-3d-v1:' + day + ':' + requestId + ':' + grade + ':' + difficulty + ':' + mechanic + ':' + attempt).digest('hex');
      const seed = parseInt(seedHex.slice(0, 7), 16) + 1;
      try {
        const q = generateCubeQuestion(mechanic, seed, difficulty, grade);
        const audit = auditQuestion(q);
        const solved = solveQuestion(q);
        if (audit.errors.length || audit.reviewRequired.length || !audit.solverVerified ||
            !solved.canSolve || !solved.isMatch || solved.ambiguityDetected ||
            solved.expectedAnswerId !== q.correctOptionId || q.options.length !== 4) continue;
        selected = {
          day, grade, difficulty, mechanic, requestId,
          question: {
            type: q.type,
            prompt: formatVideoPrompt(q),
            fullPrompt: q.prompt,
            visualConfig: q.visualConfig,
            options: q.options.map(o => ({ id: o.id, label: o.label, visualData: o.visualData })),
            correctOptionId: q.correctOptionId,
            explanation: q.explanation.summary,
          },
        };
        break;
      } catch {
        // Deterministic retry
      }
    }
  }
}

// Fallback to perceptual if 3D selection didn't yield or if a perceptual mechanic was explicitly requested
if (!selected) {
  const allowedPerceptual = PERCEPTUAL_MECHANICS.filter(m => perceptualAllowed(m, grade, difficulty) && (requestedMechanic === 'auto' || m === requestedMechanic));
  if (!allowedPerceptual.length) throw Error('Chosen question type is not available at this class/difficulty');
  const start = ((Math.floor(dayIndex / 4) % allowedPerceptual.length) + allowedPerceptual.length) % allowedPerceptual.length;
  for (let attempt = 0; attempt < 16 * allowedPerceptual.length; attempt++) {
    const mechanic = allowedPerceptual[(start + attempt) % allowedPerceptual.length];
    const seedHex = createHash('sha256').update('bilsem-junior-reels-v2:' + day + ':' + requestId + ':' + grade + ':' + difficulty + ':' + mechanic + ':' + attempt).digest('hex');
    const seed = parseInt(seedHex.slice(0, 7), 16) + 1;
    try {
      const q = generatePerceptualQuestion(mechanic, seed, difficulty, grade);
      const audit = auditQuestion(q);
      const solved = solveQuestion(q);
      if (audit.errors.length || audit.reviewRequired.length || !audit.solverVerified ||
          !solved.canSolve || !solved.isMatch || solved.ambiguityDetected ||
          solved.expectedAnswerId !== q.correctOptionId || q.options.length !== 4 ||
          ((q.visualConfig || {}) as Record<string, unknown>).displayMode !== 'perceptual_board') continue;
      selected = {
        day, grade, difficulty, mechanic, requestId,
        question: {
          type: q.type,
          prompt: q.prompt,
          fullPrompt: q.prompt,
          visualConfig: q.visualConfig,
          options: q.options.map(o => ({ id: o.id, label: o.label, visualData: o.visualData })),
          correctOptionId: q.correctOptionId,
          explanation: q.explanation.summary,
        },
      };
      break;
    } catch {
      // Deterministic retry
    }
  }
}

if (!selected) throw Error('Daily question verification failed; do not publish');
const target = process.env.REEL_QUESTION_PATH || 'reels-out/question.json';
await mkdir(dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(selected, null, 2) + '\n');
console.log('Validated Reel question: ' + day + ', grade ' + grade + ', ' + selected.mechanic + ' (3D: ' + (selected.question.visualConfig as Record<string, unknown>).displayMode + ')');
