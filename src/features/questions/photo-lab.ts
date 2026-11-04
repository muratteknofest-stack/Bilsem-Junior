import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';
import { TOPIC_CATEGORY } from './topic-catalog';

/** Real camera photographs; local, pinned files, never arbitrary remote URLs. */
export const PHOTO_ASSETS = {
  lemon: { label: 'limon', src: '/question-photos/v1/lemon.webp' },
  bananas: { label: 'muz', src: '/question-photos/v1/bananas.webp' },
  cat: { label: 'kedi', src: '/question-photos/v1/cat.webp' },
  dog: { label: 'köpek', src: '/question-photos/v1/dog.webp' },
  penguin: { label: 'penguen', src: '/question-photos/v1/penguin.webp' },
  bird: { label: 'kuş', src: '/question-photos/v1/bird.webp' },
} as const;
export type PhotoId = keyof typeof PHOTO_ASSETS;
export const PHOTO_IDS = Object.keys(PHOTO_ASSETS) as PhotoId[];
export const PHOTO_ENGINE = 'photo-lab-1';
export const PHOTO_MECHANICS = ['photo-sequence', 'photo-difference', 'photo-count', 'photo-memory'] as const;
export type PhotoMechanic = typeof PHOTO_MECHANICS[number];
export const PHOTO_TOPICS: Record<PhotoMechanic, QuestionType> = {
  'photo-sequence': 'visual_sequence', 'photo-difference': 'detail_detection',
  'photo-count': 'visual_attention', 'photo-memory': 'visual_memory',
};
const integer = (min: number, max: number) => z.number().int().min(min).max(max);
const photo = z.enum(PHOTO_IDS as [PhotoId, ...PhotoId[]]);
const common = { displayMode: z.literal('photo_lab'), grade: integer(1, 4) };
export const photoBoardSchema = z.discriminatedUnion('mechanic', [
  z.object({ ...common, mechanic: z.literal('photo-sequence'), unit: z.array(photo).min(2).max(4), sequence: z.array(photo).min(4).max(11) }).strict(),
  z.object({ ...common, mechanic: z.literal('photo-difference'), columns: integer(2, 3), left: z.array(photo).min(4).max(9), right: z.array(photo).min(4).max(9) }).strict(),
  z.object({ ...common, mechanic: z.literal('photo-count'), columns: integer(2, 4), cards: z.array(photo).min(6).max(16), target: photo }).strict(),
  z.object({ ...common, mechanic: z.literal('photo-memory'), cards: z.array(photo).min(3).max(6), position: integer(1, 6) }).strict(),
]);
export type PhotoBoard = z.infer<typeof photoBoardSchema>;
export const photoValueSchema = z.union([
  z.object({ photoAnswer: z.literal('photo'), id: photo }).strict(),
  z.object({ photoAnswer: z.enum(['count', 'position']), number: integer(1, 16) }).strict(),
]);
export type PhotoValue = z.infer<typeof photoValueSchema>;
export const validPhotoValue = (value: unknown): value is PhotoValue => photoValueSchema.safeParse(value).success;
export const photoValueKey = (value: PhotoValue) => value.photoAnswer === 'photo' ? `photo:${value.id}` : `${value.photoAnswer}:${value.number}`;
export function photoAllowed(mechanic: PhotoMechanic, grade: SchoolGrade, difficulty: number) {
  return PHOTO_MECHANICS.includes(mechanic) && !!EDUCATION_PROFILES[grade] && Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= EDUCATION_PROFILES[grade].maxDifficulty;
}
export function validatePhotoBoard(value: unknown): PhotoBoard {
  const b = photoBoardSchema.parse(value), profile = EDUCATION_PROFILES[b.grade as SchoolGrade];
  if (b.mechanic === 'photo-sequence') {
    if (new Set(b.unit).size !== b.unit.length || b.sequence.length < 2 * b.unit.length || b.sequence.some((id, i) => id !== b.unit[i % b.unit.length])) throw Error('PHOTO_PATTERN_AMBIGUOUS');
    if (b.unit.length > profile.maxSymbols) throw Error('PHOTO_SYMBOL_LOAD');
  } else if (b.mechanic === 'photo-difference') {
    if (b.left.length !== b.right.length || b.left.length % b.columns || b.left.filter((id, i) => id !== b.right[i]).length !== 1) throw Error('PHOTO_DIFFERENCE_NOT_UNIQUE');
    if (b.left.length * 2 > profile.maxItems || new Set([...b.left, ...b.right]).size > profile.maxSymbols) throw Error('PHOTO_GRID_LOAD');
  } else if (b.mechanic === 'photo-count') {
    const count = b.cards.filter(id => id === b.target).length;
    if (!count || count === b.cards.length || b.cards.length % b.columns || new Set(b.cards).size > profile.maxSymbols) throw Error('PHOTO_COUNT_EVIDENCE');
  } else if (new Set(b.cards).size !== b.cards.length || b.position > b.cards.length || b.cards.length > profile.maxSymbols) throw Error('PHOTO_MEMORY_AMBIGUOUS');
  return b;
}
export function solvePhotoBoard(b: PhotoBoard): PhotoValue {
  if (b.mechanic === 'photo-sequence') return { photoAnswer: 'photo', id: b.unit[b.sequence.length % b.unit.length] };
  if (b.mechanic === 'photo-memory') return { photoAnswer: 'photo', id: b.cards[b.position - 1] };
  if (b.mechanic === 'photo-count') return { photoAnswer: 'count', number: b.cards.filter(id => id === b.target).length };
  return { photoAnswer: 'position', number: b.left.findIndex((id, i) => id !== b.right[i]) + 1 };
}
/** Recomputes from the rendered evidence without reading the stored answer or options. */
export function independentlyMatchesPhoto(value: unknown, candidate: unknown): candidate is PhotoValue {
  try {
    const b = validatePhotoBoard(value);
    if (!validPhotoValue(candidate)) return false;
    if (b.mechanic === 'photo-sequence') {
      for (let period = 1; period <= b.sequence.length / 2; period++) {
        if (b.sequence.every((id, i) => id === b.sequence[i % period])) return candidate.photoAnswer === 'photo' && candidate.id === b.sequence[b.sequence.length % period];
      }
      return false;
    }
    if (b.mechanic === 'photo-memory') return candidate.photoAnswer === 'photo' && b.cards.map((id, index) => ({ id, ordinal: index + 1 })).some(card => card.ordinal === b.position && card.id === candidate.id);
    if (b.mechanic === 'photo-count') {
      let total = 0; for (const card of b.cards) if (card === b.target) total++;
      return candidate.photoAnswer === 'count' && candidate.number === total;
    }
    const changed: number[] = []; for (let i = b.left.length - 1; i >= 0; i--) if (b.left[i] !== b.right[i]) changed.push(i + 1);
    return candidate.photoAnswer === 'position' && changed.length === 1 && changed[0] === candidate.number;
  } catch { return false; }
}
export function generatePhotoQuestion(mechanic: PhotoMechanic, seed: number, difficulty: DifficultyLevel, grade: SchoolGrade): BaseQuestion {
  if (!Number.isSafeInteger(seed) || seed < 1 || !photoAllowed(mechanic, grade, difficulty)) throw Error('INVALID_PHOTO_INPUT');
  const rng = new SeededRNG(seed), profile = EDUCATION_PROFILES[grade];
  const base = { displayMode: 'photo_lab' as const, grade };
  let b: PhotoBoard;
  if (mechanic === 'photo-sequence') {
    const unit = rng.pickUnique(PHOTO_IDS, Math.min(4, profile.maxSymbols, 1 + difficulty));
    const length = 2 * unit.length + rng.nextInt(0, unit.length - 1);
    b = { ...base, mechanic, unit, sequence: Array.from({ length }, (_, i) => unit[i % unit.length]) };
  } else if (mechanic === 'photo-difference') {
    const columns = grade >= 3 && difficulty >= 3 ? 3 : 2, size = columns === 3 ? 9 : grade === 1 ? 4 : 6;
    const pool = rng.pickUnique(PHOTO_IDS, Math.min(profile.maxSymbols, 2 + difficulty)), left = Array.from({ length: size }, () => rng.pick(pool)), right = [...left], changed = rng.nextInt(0, size - 1);
    right[changed] = rng.pick(pool.filter(id => id !== left[changed]));
    b = { ...base, mechanic, columns, left, right };
  } else if (mechanic === 'photo-count') {
    const columns = grade >= 3 && difficulty >= 3 ? 4 : 3, size = columns === 4 ? difficulty >= 4 ? 16 : 12 : grade === 1 ? 6 : 9;
    const pool = rng.pickUnique(PHOTO_IDS, Math.min(profile.maxSymbols, 2 + difficulty)), target = pool[0], count = rng.nextInt(2, size - 2);
    b = { ...base, mechanic, columns, target, cards: rng.shuffle([...Array<PhotoId>(count).fill(target), ...Array.from({ length: size - count }, () => rng.pick(pool.slice(1)))]) };
  } else {
    const cards = rng.pickUnique(PHOTO_IDS, Math.min(profile.maxSymbols, 6, 2 + difficulty));
    b = { ...base, mechanic, cards, position: rng.nextInt(1, cards.length) };
  }
  b = validatePhotoBoard(b);
  const answer = solvePhotoBoard(b);
  const values: PhotoValue[] = answer.photoAnswer === 'photo'
    ? [answer, ...rng.pickUnique(PHOTO_IDS.filter(id => id !== answer.id), 3).map(id => ({ photoAnswer: 'photo' as const, id }))]
    : [answer, ...rng.pickUnique(Array.from({ length: b.mechanic === 'photo-difference' ? b.left.length : b.mechanic === 'photo-count' ? b.cards.length : 16 }, (_, i) => i + 1).filter(n => n !== answer.number), 3).map(number => ({ photoAnswer: answer.photoAnswer, number }))];
  let correctOptionId = '';
  const distractorNotes: Record<string, string> = {};
  const options = rng.shuffle(values).map((visualData, i) => {
    const id = 'ABCD'[i]; if (photoValueKey(visualData) === photoValueKey(answer)) correctOptionId = id;
    else distractorNotes[id] = mechanic === 'photo-sequence' ? 'Bu fotoğraf tekrar sırasını devam ettirmiyor.' : mechanic === 'photo-memory' ? 'Sorulan sıradaki fotoğraf bu değildi.' : mechanic === 'photo-count' ? 'Hedef fotoğrafın bulunduğu kartları birer kez say.' : 'Bu numaradaki fotoğraf iki panoda aynı kalmış.';
    return { id, label: id, visualData, fingerprint: photoValueKey(visualData) };
  });
  const prompts: Record<PhotoMechanic, string> = {
    'photo-sequence': 'Fotoğraflar aynı sırayla tekrar ediyor. Sıradaki boş karta hangi fotoğraf gelmeli?',
    'photo-difference': 'İki panoda yalnızca bir fotoğraf değişti. Değişen kartın numarası hangisidir?',
    'photo-count': 'Hedef fotoğrafın aynısı kaç kartta var? Fotoğraftaki nesneleri değil, kartları say.',
    'photo-memory': 'Fotoğrafların sırasını incele. Hazır olduğunda gizle ve sorulan sıradaki fotoğrafı bul.',
  };
  const detail = answer.photoAnswer === 'photo' ? `${PHOTO_ASSETS[answer.id].label} fotoğrafı` : `${answer.number}${answer.photoAnswer === 'position' ? '. kart' : ' kart'}`;
  const steps = mechanic === 'photo-sequence' ? ['İlk tekrar grubundaki fotoğrafların sırasını belirle.', 'İkinci grupta aynı sırayı doğrula ve bir sonraki fotoğrafı seç.']
    : mechanic === 'photo-difference' ? ['İki panodaki aynı numaralı kartları sırayla karşılaştır.', 'Yalnızca fotoğrafı değişen tek kartı belirle.']
    : mechanic === 'photo-count' ? ['Önce hedef karttaki fotoğrafı tanı.', 'Her satırı soldan sağa tara; hedef fotoğrafın bulunduğu her kartı bir kez say.']
    : ['Fotoğrafları soldan sağa sırayla aklında tut.', 'Fotoğrafları gizledikten sonra sorulan konumdaki fotoğrafı hatırla.'];
  return { id: `photo-${mechanic}-g${grade}-d${difficulty}-s${seed}`, version: 1, type: PHOTO_TOPICS[mechanic], category: TOPIC_CATEGORY[PHOTO_TOPICS[mechanic]], seed, difficulty, targetGrade: grade, targetGrades: [grade], ageGroup: grade <= 2 ? '1-2' : '3-4', prompt: prompts[mechanic], visualConfig: b, options, correctOptionId,
    explanation: { ruleTitle: 'Gerçek fotoğraflarla düşün', summary: `Doğru cevap: ${detail}.`, steps: [...steps, `Sonuç: ${detail}.`] }, skills: [mechanic], estimatedSeconds: 25 + difficulty * 6, status: 'draft', authoring: { engine: PHOTO_ENGINE, objective: prompts[mechanic], distractorNotes } };
}
