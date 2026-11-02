import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';
import { TOPIC_CATEGORY } from './topic-catalog';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

export const PERCEPTUAL_ENGINE = 'perceptual-1';
export const CARD_SHAPES = ['arrow', 'flag', 'key', 'leaf'] as const;
const int = (a: number, b: number) => z.number().int().min(a).max(b);
export const perceptualValueSchema = z.object({ perceptual: z.literal('card'), shape: z.enum(CARD_SHAPES), count: int(1, 6), rotation: int(0, 3), filled: z.boolean() }).strict();
export type PerceptualValue = z.infer<typeof perceptualValueSchema>;
const common = { displayMode: z.literal('perceptual_board'), grade: int(1, 4) };
export const perceptualBoardSchema = z.discriminatedUnion('mechanic', [
  z.object({ ...common, mechanic: z.literal('analogy-grid'), cards: z.array(perceptualValueSchema.nullable()).length(4) }).strict(),
  z.object({ ...common, mechanic: z.literal('paired-analogy'), cards: z.array(perceptualValueSchema.nullable()).length(6) }).strict(),
  z.object({ ...common, mechanic: z.literal('matrix-attributes'), cards: z.array(perceptualValueSchema.nullable()).length(9) }).strict(),
  z.object({ ...common, mechanic: z.literal('feature-classification'), cards: z.array(perceptualValueSchema).length(3) }).strict(),
  z.object({ ...common, mechanic: z.literal('attribute-sequence'), cards: z.array(perceptualValueSchema.nullable()).length(4) }).strict(),
  z.object({ ...common, mechanic: z.literal('interleaved-sequence'), cards: z.array(perceptualValueSchema.nullable()).length(7) }).strict(),
]);
export type PerceptualBoard = z.infer<typeof perceptualBoardSchema>;
export type PerceptualMechanic = PerceptualBoard['mechanic'];
export const PERCEPTUAL_TOPICS: Record<PerceptualMechanic, QuestionType> = {
  'analogy-grid': 'matrix_2x2', 'paired-analogy': 'visual_analogy', 'matrix-attributes': 'matrix_3x3',
  'feature-classification': 'classification', 'attribute-sequence': 'visual_sequence', 'interleaved-sequence': 'visual_sequence',
};
export const PERCEPTUAL_MECHANICS = Object.keys(PERCEPTUAL_TOPICS) as PerceptualMechanic[];
export const PERCEPTUAL_TITLES: Record<PerceptualMechanic, string> = {
  'analogy-grid': 'Aynı değişimi uygula', 'paired-analogy': 'İki örnekten benzeşim', 'matrix-attributes': 'Satır ve sütun ilişkileri',
  'feature-classification': 'Ortak özellikleri bul', 'attribute-sequence': 'Birlikte değişen özellikler', 'interleaved-sequence': 'İç içe iki örüntü',
};
export const CARD_FEATURES = ['count', 'rotation', 'filled', 'shape'] as const;
type Feature = typeof CARD_FEATURES[number];
const mod = (n: number) => (n % 4 + 4) % 4;
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);
export function validPerceptualValue(value: unknown): value is PerceptualValue { return perceptualValueSchema.safeParse(value).success; }
export function perceptualAllowed(mechanic: PerceptualMechanic, grade: SchoolGrade, difficulty: number) {
  return difficulty <= (mechanic === 'matrix-attributes' ? 4 : 3) && !(mechanic === 'matrix-attributes' && grade === 1) && !(mechanic === 'interleaved-sequence' && (grade === 1 || difficulty < 2));
}

/** Only visible givens are serialized. No answer, coefficient or inferred rule is stored. */
export function validatePerceptualBoard(value: unknown): PerceptualBoard {
  const b = perceptualBoardSchema.parse(value);
  if (b.mechanic !== 'feature-classification' && (b.cards.at(-1) !== null || b.cards.slice(0, -1).some(c => c === null))) throw Error('Yalnız son kart boş olmalı.');
  if (b.grade === 1 && (b.mechanic === 'matrix-attributes' || b.mechanic === 'interleaved-sequence' || b.cards.some(c => c && c.count > 4))) throw Error('Sınıfın görsel yükü aşılıyor.');
  return b;
}
type CountRule = { kind: 'add'; step: number } | { kind: 'double' | 'half' };
type Rule = { count: CountRule; turns: number; flip: boolean };
function countResult(n: number, r: CountRule) { return r.kind === 'add' ? n + r.step : r.kind === 'double' ? n * 2 : n / 2; }
export function inferCardRule(pairs: Array<[PerceptualValue, PerceptualValue]>, additive = false): Rule {
  const rules: CountRule[] = [...[-2, -1, 0, 1, 2].map(step => ({ kind: 'add' as const, step })), ...(!additive ? [{ kind: 'double' as const }, { kind: 'half' as const }] : [])];
  const count = rules.filter(r => pairs.every(([a, b]) => countResult(a.count, r) === b.count));
  const turns = mod(pairs[0][1].rotation - pairs[0][0].rotation), flip = pairs[0][0].filled !== pairs[0][1].filled;
  if (count.length !== 1 || pairs.some(([a, b]) => a.shape !== b.shape || mod(b.rotation - a.rotation) !== turns || (a.filled !== b.filled) !== flip)) throw Error('Örneklerden tek ve tutarlı dönüşüm çıkarılamıyor.');
  return { count: count[0], turns, flip };
}
function applyRule(a: PerceptualValue, r: Rule): PerceptualValue {
  return perceptualValueSchema.parse({ ...a, count: countResult(a.count, r.count), rotation: mod(a.rotation + r.turns), filled: r.flip ? !a.filled : a.filled });
}
function series(cards: PerceptualValue[]): PerceptualValue {
  const r = inferCardRule(cards.slice(1).map((b, i) => [cards[i], b]), true);
  if (cards.some(c => c.shape !== cards[0].shape)) throw Error('Dizideki şekil sabit olmalı.');
  return applyRule(cards.at(-1)!, r);
}
export function sharedCardFeatures(cards: PerceptualValue[]): Feature[] { return CARD_FEATURES.filter(k => cards.every(c => c[k] === cards[0][k])); }

/** Rule identity ignores glyph names, palette, seed and numerical coefficients. */
export function perceptualReasoningDescriptor(value: unknown) {
  const b = validatePerceptualBoard(value), c = b.cards as PerceptualValue[];
  if (b.mechanic === 'feature-classification') return { task: b.mechanic, features: sharedCardFeatures(c) };
  if (b.mechanic === 'matrix-attributes') return { task: b.mechanic, horizontalTurn: c[0].rotation !== c[1].rotation, verticalTurn: c[0].rotation !== c[3].rotation, horizontalFill: c[0].filled !== c[1].filled, verticalFill: c[0].filled !== c[3].filled };
  const r = b.mechanic === 'paired-analogy' ? inferCardRule([[c[0], c[1]], [c[2], c[3]]]) : b.mechanic === 'interleaved-sequence' ? inferCardRule([[c[0], c[2]], [c[2], c[4]]], true) : inferCardRule([[c[0], c[1]]], true);
  return { task: b.mechanic, count: r.count.kind === 'add' ? r.count.step === 0 ? 'constant' : r.count.step > 0 ? 'increase' : 'decrease' : r.count.kind, rotation: r.turns !== 0, fill: r.flip };
}

export function solvePerceptual(value: unknown, options: PerceptualValue[] = []): PerceptualValue {
  const b = validatePerceptualBoard(value), c = b.cards as PerceptualValue[];
  if (b.mechanic === 'feature-classification') {
    const features = sharedCardFeatures(c);
    if (!features.length || features.length > 2) throw Error('Bir veya iki açık ortak özellik gerekli.');
    const matches = options.filter(o => validPerceptualValue(o) && features.every(k => o[k] === c[0][k]));
    if (matches.length !== 1) throw Error('Ortak özelliklere uyan tek seçenek gerekli.');
    return matches[0];
  }
  if (b.mechanic === 'analogy-grid') return applyRule(c[2], inferCardRule([[c[0], c[1]]], true));
  if (b.mechanic === 'paired-analogy') return applyRule(c[4], inferCardRule([[c[0], c[1]], [c[2], c[3]]]));
  if (b.mechanic === 'attribute-sequence') return series(c.slice(0, 3));
  if (b.mechanic === 'interleaved-sequence') { series([c[1], c[3], c[5]]); return series([c[0], c[2], c[4]]); }
  const first = c.slice(0, 3), second = c.slice(3, 6), counts = first.map(v => v.count).sort();
  if (new Set(counts).size !== 3 || !same(counts, second.map(v => v.count).sort()) || c.some(v => v && v.shape !== c[0].shape)) throw Error('Matrisin ortak sayıları veya şekilleri tutarsız.');
  const missing = counts.filter(n => n !== c[6].count && n !== c[7].count);
  if (missing.length !== 1) throw Error('Eksik adet tek olmalı.');
  const dx = mod(c[1].rotation - c[0].rotation), dy = mod(c[3].rotation - c[0].rotation), fx = c[1].filled !== c[0].filled, fy = c[3].filled !== c[0].filled;
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    if (c[i].rotation !== mod(c[0].rotation + col * dx + row * dy) || c[i].filled !== (Boolean(Number(c[0].filled) ^ (col % 2 * Number(fx)) ^ (row % 2 * Number(fy))))) throw Error('Matrisin yön veya doluluk ilişkileri tutarsız.');
  }
  for (let col = 0; col < 2; col++) if (!same([c[col].count, c[col + 3].count, c[col + 6].count].sort(), counts)) throw Error('Sütunlarda aynı adetler bulunmalı.');
  if (!same([c[2].count, c[5].count, missing[0]].sort(), counts)) throw Error('Satır ve sütun çözümleri uyuşmuyor.');
  return { ...c[0], count: missing[0], rotation: mod(c[0].rotation + 2 * dx + 2 * dy), filled: c[0].filled };
}

function ruleSteps(r: Rule): string[] {
  const count = r.count.kind === 'add' ? r.count.step === 0 ? 'Şekil adedi aynı kalır.' : `Her adımda şekil adedi ${Math.abs(r.count.step)} ${r.count.step > 0 ? 'artar' : 'azalır'}.` : r.count.kind === 'double' ? 'Şekil adedi iki katına çıkar.' : 'Şekil adedi yarıya iner.';
  return [count, `Yön ${r.turns === 0 ? 'değişmez' : `saat yönünde ${r.turns} çeyrek tur değişir`}; doluluk ${r.flip ? 'dolu ile boş arasında değişir' : 'aynı kalır'}.`];
}
function explanation(b: PerceptualBoard): string[] {
  const c = b.cards as PerceptualValue[];
  if (b.mechanic === 'feature-classification') {
    const names = { count: 'şekil adedi', rotation: 'yön', filled: 'doluluk', shape: 'şekil türü' };
    return [`Üç örneğin ortak özellikleri: ${sharedCardFeatures(c).map(k => names[k]).join(' ve ')}.`, 'Bu özelliklerin hepsini birlikte taşıyan seçeneği seç; örneklerde değişen özellikleri koşul olarak kullanma.'];
  }
  if (b.mechanic === 'matrix-attributes') return ['Her satırda ve her sütunda aynı üç şekil adedi birer kez bulunur; eksik adedi iki yönden kontrol et.', 'Yönün satır ve sütundaki çeyrek tur değişimlerini ayrı izle; doluluk düzenini de aynı anda tamamla.'];
  if (b.mechanic === 'interleaved-sequence') return ['1, 3, 5 ve 7. kartlar bir dizi; 2, 4 ve 6. kartlar ayrı bir dizidir.', ...ruleSteps(inferCardRule([[c[0], c[2]], [c[2], c[4]]], true)), 'Eksik 7. kartı tek numaralı dizinin devamıyla bul.'];
  return ruleSteps(b.mechanic === 'paired-analogy' ? inferCardRule([[c[0], c[1]], [c[2], c[3]]]) : b.mechanic === 'analogy-grid' ? inferCardRule([[c[0], c[1]]], true) : inferCardRule([[c[0], c[1]], [c[1], c[2]]], true));
}

export function generatePerceptualQuestion(mechanic: PerceptualMechanic, seed: number, difficulty: DifficultyLevel, grade: SchoolGrade): BaseQuestion {
  if (!PERCEPTUAL_MECHANICS.includes(mechanic) || !Number.isSafeInteger(seed) || seed < 1 || !EDUCATION_PROFILES[grade] || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > EDUCATION_PROFILES[grade].maxDifficulty || !perceptualAllowed(mechanic, grade, difficulty)) throw Error('INVALID_PERCEPTUAL_INPUT');
  const rng = new SeededRNG(seed), maxCount = grade === 1 ? 4 : 6;
  const card = (): PerceptualValue => ({ perceptual: 'card', shape: rng.pick(CARD_SHAPES), count: rng.nextInt(1, maxCount), rotation: rng.nextInt(0, 3), filled: rng.nextBool() });
  let b: PerceptualBoard, answer: PerceptualValue, prompt: string;
  const base = { displayMode: 'perceptual_board' as const, grade };
  if (mechanic === 'feature-classification') {
    const exemplar = card(), active = rng.pickUnique(CARD_FEATURES, difficulty === 1 ? 1 : 2), cards = Array.from({ length: 3 }, card);
    for (const k of CARD_FEATURES) {
      if (active.includes(k)) for (const v of cards) Object.assign(v, { [k]: exemplar[k] });
      else if (cards.every(v => v[k] === cards[0][k])) Object.assign(cards[2], { [k]: k === 'filled' ? !cards[0].filled : k === 'shape' ? CARD_SHAPES[(CARD_SHAPES.indexOf(cards[0].shape) + 1) % 4] : k === 'rotation' ? mod(cards[0].rotation + 1) : cards[0].count % maxCount + 1 });
    }
    answer = card(); for (const k of active) Object.assign(answer, { [k]: exemplar[k] });
    b = { ...base, mechanic, cards }; prompt = 'Üç örneğin hepsinde ortak olan özellikleri bul. Bu ortak özelliklerin tamamını hangi seçenek taşır?';
  } else if (mechanic === 'matrix-attributes') {
    const root = card();
    // Choose a single scale, so every row/column contains three distinct counts.
    const scale = grade >= 3 && difficulty >= 4 && rng.nextBool() ? 2 : 1;
    const counts = rng.shuffle([scale, scale * 2, scale * 3]);
    const dx = difficulty >= 2 ? rng.pick([1, 2, 3]) : 0, dy = difficulty >= 4 ? rng.pick([1, 2, 3]) : 0, fx = difficulty >= 3, fy = difficulty >= 4;
    const cards = Array.from({ length: 9 }, (_, i) => { const row = Math.floor(i / 3), col = i % 3; return { ...root, count: counts[(row + col) % 3], rotation: mod(root.rotation + dx * col + dy * row), filled: Boolean(Number(root.filled) ^ (col % 2 * Number(fx)) ^ (row % 2 * Number(fy))) }; });
    answer = cards[8]; b = { ...base, mechanic, cards: [...cards.slice(0, 8), null] };
    prompt = 'Her satır ve sütunda aynı üç şekil adedi birer kez bulunur. Yön ve doluluk düzenini de izleyerek eksik kartı bul.';
  } else {
    const paired = mechanic === 'paired-analogy', interleaved = mechanic === 'interleaved-sequence', grid = mechanic === 'analogy-grid';
    const kind: CountRule['kind'] = paired && difficulty >= 2 ? rng.pick(['add', 'double', 'half'] as const) : 'add';
    const rule: Rule = { count: kind === 'add' ? { kind, step: rng.pick([-1, 1]) } : { kind }, turns: difficulty >= 2 ? rng.pick([1, 2, 3]) : 0, flip: difficulty >= 3 };
    const start = (length: number): PerceptualValue => {
      const v = card();
      if (rule.count.kind === 'add') { const step = rule.count.step; v.count = rng.nextInt(1 + Math.max(0, -step * (length - 1)), maxCount - Math.max(0, step * (length - 1))); }
      else v.count = rule.count.kind === 'double' ? rng.nextInt(1, Math.floor(maxCount / 2)) : rng.nextInt(1, Math.floor(maxCount / 2)) * 2;
      return v;
    };
    if (grid || paired) {
      const a = start(2), query = start(2), cards: Array<PerceptualValue | null> = [a, applyRule(a, rule)];
      if (paired) { const other = start(2); const eligible = Array.from({ length: maxCount }, (_, i) => i + 1).filter(n => n !== a.count && Number.isInteger(countResult(n, rule.count)) && countResult(n, rule.count) >= 1 && countResult(n, rule.count) <= maxCount); other.count = rng.pick(eligible); cards.push(other, applyRule(other, rule)); }
      cards.push(query, null); b = { ...base, mechanic: grid ? 'analogy-grid' : 'paired-analogy', cards }; answer = applyRule(query, rule);
      prompt = grid ? 'Üst sıradaki adet ekleme veya çıkarma, yön ve doluluk değişimini alt sırada da uygula. Eksik kart hangisi?' : 'İlk iki örnek çiftteki aynı değişimi bul. Adet, yön ve doluluk ilişkisini son çifte uygula. Eksik kart hangisi?';
    } else {
      const first = start(4), seq = [first]; for (let i = 1; i < 4; i++) seq.push(applyRule(seq.at(-1)!, rule));
      if (interleaved) {
        const other = card(), turn = rng.pick([1, 2, 3]), alt = [other, { ...other, rotation: mod(other.rotation + turn) }, { ...other, rotation: mod(other.rotation + 2 * turn) }];
        b = { ...base, mechanic, cards: [seq[0], alt[0], seq[1], alt[1], seq[2], alt[2], null] };
        prompt = 'Tek numaralı kartlar kendi arasında, çift numaralı kartlar kendi arasında bir düzen izler. 7. kart hangisidir?';
      } else { b = { ...base, mechanic: 'attribute-sequence', cards: [...seq.slice(0, 3), null] }; prompt = 'Kartlarda adet, yön ve doluluk düzenini izle. Aynı değişimler sürerse sıradaki kart hangisi olur?'; }
      answer = seq[3];
    }
  }
  const candidates: PerceptualValue[] = [answer], add = (v: PerceptualValue) => { if (validPerceptualValue(v) && !candidates.some(a => same(a, v))) candidates.push(v); };
  const active: readonly Feature[] = b.mechanic === 'feature-classification' ? sharedCardFeatures(b.cards) : ['count', 'rotation', 'filled'];
  for (const k of rng.shuffle(active)) add({ ...answer, [k]: k === 'count' ? answer.count % maxCount + 1 : k === 'rotation' ? mod(answer.rotation + 1) : k === 'filled' ? !answer.filled : CARD_SHAPES[(CARD_SHAPES.indexOf(answer.shape) + 1) % 4] });
  for (const k of rng.shuffle(active)) {
    const changed = { ...answer }; for (const key of active) if (key === k || active.length === 1) Object.assign(changed, { [key]: key === 'count' ? answer.count % maxCount + 1 : key === 'rotation' ? mod(answer.rotation + 2) : key === 'filled' ? !answer.filled : CARD_SHAPES[(CARD_SHAPES.indexOf(answer.shape) + 2) % 4] });
    add(changed);
  }
  // A single boolean criterion has only one violating value; vary a free feature
  // as well, while every distractor still violates the actual common condition.
  for (let i = 0; candidates.length < 4 && i < 30; i++) { const v = card(); if (b.mechanic === 'feature-classification' && active.every(k => v[k] === answer[k])) continue; add(v); }
  if (candidates.length < 4) throw Error('Dört farklı kart üretilemedi.');
  const options = rng.shuffle(candidates.slice(0, 4)).map((visualData, i) => ({ id: 'ABCD'[i], label: 'ABCD'[i], visualData, fingerprint: fingerprint(visualData) }));
  const proved = solvePerceptual(b, options.map(o => o.visualData)); if (!same(proved, answer)) throw Error('Görünür örneklerin sonucu uyuşmuyor.');
  const correctOptionId = options.find(o => same(o.visualData, answer))!.id, type = PERCEPTUAL_TOPICS[mechanic], steps = explanation(b);
  const names = { count: 'adet', rotation: 'yön', filled: 'doluluk', shape: 'şekil türü' };
  return { id: `${PERCEPTUAL_ENGINE}-${mechanic}-g${grade}-d${difficulty}-s${seed}`, version: 1, type, category: TOPIC_CATEGORY[type], seed, difficulty, targetGrade: grade, targetGrades: [grade], ageGroup: grade <= 2 ? '1-2' : '3-4', prompt, visualConfig: b, options, correctOptionId, explanation: { ruleTitle: PERCEPTUAL_TITLES[mechanic], summary: steps.join(' '), steps }, skills: [mechanic], estimatedSeconds: 30 + difficulty * 10, status: 'draft', authoring: { engine: PERCEPTUAL_ENGINE, objective: prompt, distractorNotes: Object.fromEntries(options.filter(o => o.id !== correctOptionId).map(o => [o.id, `Bu kartta ${active.filter(k => o.visualData[k] !== answer[k]).map(k => names[k]).join(' ve ')} ilişkisi sağlanmıyor.`])) } };
}
