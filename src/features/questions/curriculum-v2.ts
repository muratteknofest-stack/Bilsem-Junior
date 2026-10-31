import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { generateVisualFingerprint } from './fingerprint';
import { generateCompleteCurriculum, independentlyMatchesComplete, solveComplete, validCompleteValue, type CompleteBoard, type CompleteValue } from './complete-curriculum';
import type { SchoolGrade } from './quality-policy';
import { nextPatternNumber, type NumberPatternRule } from './curriculum-rules';
import { RELATION_OBJECTS, RELATION_OBJECT_IDS } from './relation-objects';

export const CURRICULUM_V2 = 'curriculum-2';
export function generateCurriculumV2(type: QuestionType, seed: number, difficulty: DifficultyLevel, grade: SchoolGrade): BaseQuestion {
  const original = generateCompleteCurriculum(type, seed, difficulty, grade);
  const b = structuredClone(original.visualConfig) as CompleteBoard;
  const rng = new SeededRNG((seed + 314159) % 2147483647 || 1);
  let prompt = original.prompt, steps = [...original.explanation.steps];
  const mistakes: CompleteValue[] = [];
  if (type === 'number_pyramid') {
    // Expand the visible sums, within the existing grade limits, rather than
    // reissuing the small legacy 1–5 base pool under new question IDs.
    const maxBase = grade === 1 ? 6 : grade === 2 ? 14 : grade === 3 ? 20 : 45;
    b.base = Array.from({ length: b.base!.length }, () => rng.nextInt(1, maxBase));
  }
  if (type === 'number_pattern' && grade >= 2 && difficulty >= 2) {
    const pool: NumberPatternRule[] = grade === 2 ? ['alternating-add'] : difficulty <= 2 ? ['alternating-add', 'multiply'] : ['alternating-add', 'multiply', 'growing-difference'];
    b.numberRule = rng.pick(pool);
    const start = rng.nextInt(1, grade === 2 ? 12 : 8), a = rng.nextInt(1, 4), c = a + rng.nextInt(1, 3);
    if (b.numberRule === 'alternating-add') {
      b.values = [start];
      for (let i = 0; i < 4; i++) b.values.push(b.values.at(-1)! + (i % 2 ? c : a));
      prompt = 'Artış miktarları iki adımda bir aynı sırayla tekrarlanıyor. Sıradaki sayı nedir?';
      steps = [`Artışlar sırayla ${a} ve ${c}: +${a}, +${c}, +${a}, +${c}.`, `Sıradaki artış ${a}; ${b.values.at(-1)} + ${a} = ${nextPatternNumber(b.values, b.numberRule)}.`];
      mistakes.push({ textNumber: b.values.at(-1)! + c }, { textNumber: b.values.at(-1)! - a });
    } else if (b.numberRule === 'multiply') {
      const ratio = grade === 4 && difficulty >= 5 ? rng.pick([2, 3]) : 2;
      const first = rng.nextInt(1, 3);
      b.values = Array.from({ length: 5 }, (_, i) => first * ratio ** i);
      prompt = 'Her adımda aynı çarpma işlemi uygulanıyor. Sıradaki sayı nedir?';
      steps = [`Her sayı bir öncekinin ${ratio} katı.`, `${b.values.at(-1)} × ${ratio} = ${nextPatternNumber(b.values, b.numberRule)}.`];
      mistakes.push({ textNumber: b.values.at(-1)! + ratio }, { textNumber: b.values.at(-1)! / ratio });
    } else {
      b.values = [start];
      for (let i = 0; i < 4; i++) b.values.push(b.values.at(-1)! + a + i * c);
      const lastGap = a + 3 * c, nextGap = lastGap + c;
      prompt = 'Ardışık sayılar arasındaki farklar her seferinde aynı miktarda artıyor. Sıradaki sayı nedir?';
      steps = [`Farklar ${[0, 1, 2, 3].map(i => a + i * c).join(', ')}; her yeni fark ${c} büyüyor.`, `Yeni fark ${nextGap}; ${b.values.at(-1)} + ${nextGap} = ${nextPatternNumber(b.values, b.numberRule)}.`];
      mistakes.push({ textNumber: b.values.at(-1)! + lastGap }, { textNumber: b.values.at(-1)! + c });
    }
    mistakes.push({ textNumber: b.values.at(-1)! });
  }
  if (type === 'visual_sequence' && grade >= 2 && difficulty >= 3) {
    b.sequenceRule = 'two-attributes';
    b.shapePeriod = rng.pick([2, 3]); b.colorPeriod = b.shapePeriod === 2 ? 3 : 2;
    const shapes = rng.pickUnique([0, 1, 2, 3, 4, 5], b.shapePeriod), colors = rng.pickUnique([0, 1, 2, 3, 4, 5], b.colorPeriod);
    b.sequence = Array.from({ length: 8 }, (_, i) => i === 7 ? null : { shape: shapes[i % b.shapePeriod!], color: colors[i % b.colorPeriod!] });
    delete b.period;
    prompt = 'Şekillerin ve renklerin kendi tekrar sıraları var. İki sıraya da uyan sonraki kartı seç.';
    steps = [`Şekiller ${b.shapePeriod}, renkler ${b.colorPeriod} adımda bir kendi sırasını tekrar ediyor.`, 'Önce sıradaki şekli, sonra sıradaki rengi bul. İkisini birlikte taşıyan kartı seç.'];
    const answer = solveComplete(b) as Extract<CompleteValue, { curriculum: 'token' }>;
    mistakes.push({ ...answer, shape: shapes.find(n => n !== answer.shape)! }, { ...answer, color: colors.find(n => n !== answer.color)! }, { ...answer, shape: shapes.find(n => n !== answer.shape)!, color: colors.find(n => n !== answer.color)! });
  }
  if (type === 'shape_equation' || type === 'balance_scale') {
    b.objects = rng.pickUnique(RELATION_OBJECT_IDS, 2) as NonNullable<CompleteBoard['objects']>;
    const [first, second] = b.objects.map(id => RELATION_OBJECTS[id].label);
    const [a, , total] = b.equations![0], x = total / a, y = b.equations![1][2] - x;
    prompt = 'Meyve resimleri birer sayıyı temsil ediyor. Aynı meyve her satırda aynı sayıdır. Son satırın toplamını bul.';
    steps = [`${a} ${first} ${total} değerinde; bir ${first}: ${total} ÷ ${a} = ${x}.`, `${first} ve ${second} toplamı ${x + y}; bir ${second}: ${x + y} − ${x} = ${y}.`, `Son satır: ${b.expression![0] * x} + ${b.expression![1] * y} = ${b.expression![0] * x + b.expression![1] * y}.`];
  }
  if (type === 'operation_machine' && grade >= 3 && difficulty >= 3) {
    const multiplier = rng.nextInt(2, grade), added = rng.nextInt(1, 9), inputs = rng.pickUnique(Array.from({ length: 12 }, (_, i) => i + 1), 4), answer = inputs[3];
    b.examples = inputs.slice(0, 3).map(x => [x, x * multiplier + added]);
    b.machineQuery = 'input'; b.outputTarget = answer * multiplier + added;
    delete b.input; // The hidden input must never be in the public visual DTO.
    prompt = 'Makine her girişi aynı sayıyla çarpıp aynı sayıyı ekliyor. Son çıkış için girişe hangi sayı yazılmalı?';
    steps = [`Örneklerde giriş ${multiplier} ile çarpılıyor ve ${added} ekleniyor.`, `Ters sırayla ilerle: ${b.outputTarget} − ${added} = ${answer * multiplier}.`, `${answer * multiplier} ÷ ${multiplier} = ${answer}; giriş ${answer} olmalı.`];
    mistakes.push({ textNumber: b.outputTarget }, { textNumber: b.outputTarget - added }, { textNumber: Math.floor(b.outputTarget / multiplier) });
  }
  const answer = solveComplete(b, original.options.map(o => o.visualData as CompleteValue));
  const choices: CompleteValue[] = [answer];
  const add = (value: CompleteValue) => { if (validCompleteValue(value) && !choices.some(v => generateVisualFingerprint(v) === generateVisualFingerprint(value)) && !independentlyMatchesComplete(b, value)) choices.push(value); };
  mistakes.forEach(add); original.options.forEach(o => add(o.visualData as CompleteValue));
  if ('textNumber' in answer && typeof answer.textNumber === 'number') for (const difference of rng.shuffle([1, -1, 2, -2, 3, 4, 5, 6])) add({ textNumber: answer.textNumber + difference });
  if (choices.length < 4) throw Error('CURRICULUM_V2_DISTRACTORS: Dört farklı seçenek gerekli.');
  const options = rng.shuffle(choices.slice(0, 4)).map((visualData, i) => ({ id: 'ABCD'[i], label: 'ABCD'[i], visualData, fingerprint: generateVisualFingerprint(visualData) }));
  const matching = options.filter(o => independentlyMatchesComplete(b, o.visualData));
  if (matching.length !== 1 || generateVisualFingerprint(matching[0].visualData) !== generateVisualFingerprint(answer)) throw Error('CURRICULUM_V2_PROOF: Bağımsız çözüm tek yanıt vermeli.');
  return { ...original, id: `${type}-curr2-g${grade}-d${difficulty}-s${seed}`, prompt, visualConfig: b, options, correctOptionId: matching[0].id, explanation: { ...original.explanation, summary: steps.join(' '), steps }, authoring: { engine: CURRICULUM_V2, objective: prompt, distractorNotes: Object.fromEntries(options.filter(o => o.id !== matching[0].id).map(o => [o.id, 'Görünen kuralın sonucunu sağlamaz; yalnızca bir özellik veya son işlem dikkate alınmış olabilir.'])) } };
}
