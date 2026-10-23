import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { TOPIC_CATEGORY } from './topic-catalog';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

export const LAB_ENGINE = 'reasoning-lab-1';
const integer = (min: number, max: number) => z.number().int().min(min).max(max);
const pair = z.tuple([integer(0, 5), integer(0, 5)]);
const common = { displayMode: z.literal('reasoning_lab'), grade: integer(1, 4) };
export const labBoardSchema = z.discriminatedUnion('mechanic', [
  z.object({ ...common, mechanic: z.literal('route-count'), size: integer(2, 4), blocked: z.array(integer(0, 15)).max(3) }).strict(),
  z.object({ ...common, mechanic: z.literal('domino-chain'), chain: z.array(z.tuple([integer(0, 6), integer(0, 6)]).nullable()).min(3).max(6) }).strict(),
  z.object({ ...common, mechanic: z.literal('box-transfer'), initial: z.array(integer(0, 30)).length(3), transfers: z.array(z.object({ from: integer(0, 2), to: integer(0, 2), amount: integer(1, 10) }).strict()).min(2).max(5), target: integer(0, 2) }).strict(),
  z.object({ ...common, mechanic: z.literal('switch-parity'), lamps: z.array(integer(0, 1)).min(2).max(5), presses: z.array(z.array(integer(0, 4)).min(1).max(3)).min(2).max(6) }).strict(),
  z.object({ ...common, mechanic: z.literal('position-swaps'), items: z.array(z.enum(['A', 'B', 'C', 'D', 'E', 'F'])).min(4).max(6), swaps: z.array(pair).min(2).max(6), target: integer(0, 5) }).strict(),
  z.object({ ...common, mechanic: z.literal('boundary-edges'), size: integer(3, 4), cells: z.array(integer(0, 1)).min(9).max(16) }).strict(),
  z.object({ ...common, mechanic: z.literal('guaranteed-draw'), counts: z.array(integer(1, 9)).min(2).max(3), target: integer(2, 5) }).strict(),
  z.object({ ...common, mechanic: z.literal('cheapest-route'), routes: z.array(z.array(integer(1, 12)).min(2).max(4)).length(3) }).strict(),
]);
export type LabBoard = z.infer<typeof labBoardSchema>;
export type LabMechanic = LabBoard['mechanic'];
export const LAB_TOPICS: Record<LabMechanic, QuestionType> = {
  'route-count': 'maze_path', 'domino-chain': 'visual_sequence', 'box-transfer': 'number_pattern',
  'switch-parity': 'symbol_coding', 'position-swaps': 'spatial_relationship',
  'boundary-edges': 'shape_counting', 'guaranteed-draw': 'story_logic', 'cheapest-route': 'direction_path',
};
export const LAB_MECHANICS = Object.keys(LAB_TOPICS) as LabMechanic[];
export const LAB_TITLES: Record<LabMechanic, string> = {
  'route-count': 'Yolları say', 'domino-chain': 'Domino zinciri', 'box-transfer': 'Kutular arası aktarım',
  'switch-parity': 'Lamba düğmeleri', 'position-swaps': 'Yer değiştirme', 'boundary-edges': 'Dış kenarlar',
  'guaranteed-draw': 'Kesin sonuç', 'cheapest-route': 'En kısa toplam',
};

/** Every field is a displayed given. Answers and hidden generation parameters
 * never enter the board or the public student DTO. */
export function validateLabBoard(value: unknown): LabBoard {
  const b = labBoardSchema.parse(value);
  const unique = (xs: unknown[]) => new Set(xs).size === xs.length;
  switch (b.mechanic) {
    case 'route-count':
      if (!unique(b.blocked) || b.blocked.some(i => i <= 0 || i >= b.size ** 2 - 1)) throw Error('Geçersiz kapalı hücre.'); break;
    case 'domino-chain': {
      const missing = b.chain.indexOf(null);
      if (b.chain.filter(x => x === null).length !== 1 || missing <= 0 || missing >= b.chain.length - 1 || b.chain.some((d, i) => d && b.chain[i + 1] && d[1] !== b.chain[i + 1]![0])) throw Error('Domino bağlantıları tutarsız.'); break;
    }
    case 'box-transfer': {
      const boxes = [...b.initial];
      for (const t of b.transfers) {
        if (t.from === t.to || boxes[t.from] < t.amount) throw Error('Aktarılacak yeterli nesne yok.');
        boxes[t.from] -= t.amount; boxes[t.to] += t.amount;
      } break;
    }
    case 'switch-parity':
      if (b.presses.some(p => !unique(p) || p.some(i => i >= b.lamps.length))) throw Error('Lamba numarası geçersiz.'); break;
    case 'position-swaps':
      if (!unique(b.items) || b.target >= b.items.length || b.swaps.some(([a, c]) => a === c || a >= b.items.length || c >= b.items.length)) throw Error('Yer değiştirme geçersiz.'); break;
    case 'boundary-edges':
      if (b.cells.length !== b.size ** 2 || !b.cells.some(Boolean)) throw Error('Kenar ızgarası geçersiz.'); break;
    case 'guaranteed-draw':
      if (!b.counts.some(n => n >= b.target)) throw Error('İstenen sayıda top yok.'); break;
    case 'cheapest-route': {
      const sums = b.routes.map(r => r.reduce((a, n) => a + n, 0));
      if (sums.filter(n => n === Math.min(...sums)).length !== 1) throw Error('En az toplam tek olmalı.'); break;
    }
  }
  return b;
}

export function solveLab(value: unknown): number | string {
  const b = validateLabBoard(value);
  switch (b.mechanic) {
    case 'route-count': {
      const ways = Array<number>(b.size ** 2).fill(0); ways[0] = 1;
      for (let i = 1; i < ways.length; i++) if (!b.blocked.includes(i)) ways[i] = (i % b.size ? ways[i - 1] : 0) + (i >= b.size ? ways[i - b.size] : 0);
      return ways.at(-1)!;
    }
    case 'domino-chain': { const i = b.chain.indexOf(null); return `${b.chain[i - 1]![1]} | ${b.chain[i + 1]![0]}`; }
    case 'box-transfer': {
      const boxes = [...b.initial];
      for (const t of b.transfers) { boxes[t.from] -= t.amount; boxes[t.to] += t.amount; }
      return boxes[b.target];
    }
    case 'switch-parity': { const lamps = [...b.lamps]; for (const p of b.presses) for (const i of p) lamps[i] = 1 - lamps[i]; return lamps.reduce((a, n) => a + n, 0); }
    case 'position-swaps': { const items = [...b.items]; for (const [a, c] of b.swaps) [items[a], items[c]] = [items[c], items[a]]; return items[b.target]; }
    case 'boundary-edges': {
      let edges = 0;
      b.cells.forEach((n, i) => { if (n) for (const j of [i >= b.size ? i - b.size : -1, i < b.size * (b.size - 1) ? i + b.size : -1, i % b.size ? i - 1 : -1, i % b.size < b.size - 1 ? i + 1 : -1]) if (j < 0 || !b.cells[j]) edges++; });
      return edges;
    }
    case 'guaranteed-draw': return b.counts.reduce((n, c) => n + Math.min(c, b.target - 1), 0) + 1;
    case 'cheapest-route': { const sums = b.routes.map(r => r.reduce((a, n) => a + n, 0)); return 'ABC'[sums.indexOf(Math.min(...sums))]; }
  }
}

export function generateLabQuestion(mechanic: LabMechanic, seed: number, difficulty: DifficultyLevel, grade: SchoolGrade): BaseQuestion {
  if (!LAB_MECHANICS.includes(mechanic) || !Number.isSafeInteger(seed) || seed < 1 || !EDUCATION_PROFILES[grade] || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > EDUCATION_PROFILES[grade].maxDifficulty) throw Error('INVALID_LAB_INPUT');
  const rng = new SeededRNG(seed), load = Math.min(5, difficulty + 1), common = { displayMode: 'reasoning_lab' as const, grade };
  let b: LabBoard, prompt: string, steps: string[];
  switch (mechanic) {
    case 'route-count': {
      const size = difficulty === 1 ? 2 : grade <= 2 || difficulty <= 3 ? 3 : 4;
      const blocked = difficulty <= 2 ? [] : rng.pickUnique(Array.from({ length: size ** 2 - 2 }, (_, i) => i + 1), difficulty >= 5 ? 2 : 1);
      b = { ...common, mechanic, size, blocked };
      prompt = 'S hücresinden H hücresine yalnız sağa veya aşağı ilerle. Kapalı hücreye basmadan kaç farklı yol kullanabilirsin?';
      steps = ['Her hücreye soldan veya üstten ulaşan yolları ayrı ayrı say.', 'Birleşen yolların sayılarını topla; kapalı hücreye ulaşan yol sayısı sıfırdır.']; break;
    }
    case 'domino-chain': {
      const values = Array.from({ length: Math.min(6, load + 2) }, () => rng.nextInt(0, grade <= 2 ? 4 : 6));
      const chain: Array<[number, number] | null> = values.slice(1).map((v, i) => [values[i], v]);
      chain[rng.nextInt(1, chain.length - 2)] = null; b = { ...common, mechanic, chain };
      prompt = 'Komşu domino uçları aynı sayıda nokta taşır. Boş yere hangi domino, çevrilmeden gelmelidir?';
      steps = ['Boşluğun solundaki domino ucunu bul; bu, yeni taşın sol ucudur.', 'Sağdaki taşın sol ucunu bul; yeni taşın sağ ucuyla eşleşmelidir.']; break;
    }
    case 'box-transfer': {
      const initial = Array.from({ length: 3 }, () => rng.nextInt(3, grade <= 2 ? 6 : 9)), boxes = [...initial], transfers: Extract<LabBoard, { mechanic: 'box-transfer' }>['transfers'] = [];
      for (let i = 0; i < load; i++) {
        const from = rng.pick([0, 1, 2].filter(j => boxes[j] > 0)), to = rng.pick([0, 1, 2].filter(j => j !== from)), amount = rng.nextInt(1, Math.min(boxes[from], grade + 1));
        transfers.push({ from, to, amount }); boxes[from] -= amount; boxes[to] += amount;
      }
      b = { ...common, mechanic, initial, transfers, target: rng.nextInt(0, 2) };
      prompt = `Kutulardaki topları ok sırasıyla aktar. Sonunda ${'ABC'[b.target]} kutusunda kaç top kalır?`;
      steps = ['Her aktarımda çıkan kutudan top sayısını çıkar, gelen kutuya ekle.', 'İşlemleri verilen sırada uygula; sorulan kutunun son sayısını kontrol et.']; break;
    }
    case 'switch-parity': {
      const n = grade === 1 ? 3 : Math.min(5, grade + 2);
      b = { ...common, mechanic, lamps: Array.from({ length: n }, () => rng.nextInt(0, 1)), presses: Array.from({ length: load }, () => rng.pickUnique(Array.from({ length: n }, (_, i) => i), rng.nextInt(1, grade === 1 ? 2 : 3)).sort()) };
      prompt = 'Her adımda yazılı lambaların düğmesine bir kez bas. Yanan söner, sönük yanar. Sonunda kaç lamba yanar?';
      steps = ['Her düğmeye basıldığında yalnız o lambanın durumunu değiştir.', 'Bütün adımlar bitince açık durumda kalan lambaları say.']; break;
    }
    case 'position-swaps': {
      const items = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F'] as const).slice(0, EDUCATION_PROFILES[grade].maxPeople);
      b = { ...common, mechanic, items, swaps: Array.from({ length: load }, () => rng.pickUnique(Array.from({ length: items.length }, (_, i) => i), 2) as [number, number]), target: rng.nextInt(0, items.length - 1) };
      prompt = `Kartları sırayla yer değiştir. İşlem numaraları kartları değil, kutuları gösterir. Sonunda ${b.target + 1}. kutuda hangi kart bulunur?`;
      steps = ['Her adımda belirtilen iki kutunun içindeki kartları değiştir.', 'Kutuların numaralarını sabit tut; son durumda hedef kutudaki harfi oku.']; break;
    }
    case 'boundary-edges': {
      const size = grade <= 2 || difficulty <= 3 ? 3 : 4, cells = Array<number>(size ** 2).fill(0); cells[rng.nextInt(0, cells.length - 1)] = 1;
      for (let k = 1; k < Math.min(size ** 2 - 1, load + 2); k++) {
        const next = cells.flatMap((n, i) => !n && [i >= size ? i - size : -1, i < size * (size - 1) ? i + size : -1, i % size ? i - 1 : -1, i % size < size - 1 ? i + 1 : -1].some(j => j >= 0 && cells[j]) ? [i] : []);
        cells[rng.pick(next)] = 1;
      }
      b = { ...common, mechanic, size, cells };
      prompt = 'Dolu hücrelerin dışta kalan birim kenarlarını say. İki dolu hücrenin ortak kenarını sayma. Toplam kaç kenar vardır?';
      steps = ['Dolu bir hücrenin boşluğa veya ızgara dışına bakan her kenarını say.', 'Dolu hücreler arasındaki ortak kenarlar dış sınırda değildir; onları sayma.']; break;
    }
    case 'guaranteed-draw': {
      const target = Math.min(5, difficulty + 1), counts = Array.from({ length: grade === 1 ? 2 : 3 }, () => rng.nextInt(target, Math.min(9, target + grade + 1)));
      b = { ...common, mechanic, counts, target };
      prompt = `Torbadaki toplar gösteriliyor. Bakmadan, geri koymadan çek. Aynı renkten en az ${target} topu kesin elde etmek için en az kaç top çekmelisin?`;
      steps = [`En elverişsiz durumda her renkten önce en fazla ${target - 1} top çekebilirsin.`, 'Bu toplamdan bir fazla çektiğinde en az bir renkte istenen sayıya mutlaka ulaşırsın.']; break;
    }
    case 'cheapest-route': {
      const routes = Array.from({ length: 3 }, () => Array.from({ length: Math.min(4, grade === 1 ? 2 : load) }, () => rng.nextInt(1, grade <= 2 ? 4 : 9)));
      // Deterministic retry, with an independently checked unique minimum.
      for (let tries = 0; ; tries++) {
        const sums = routes.map(r => r.reduce((a, n) => a + n, 0));
        if (sums.filter(n => n === Math.min(...sums)).length === 1) break;
        if (tries > 30) throw Error('Tek en kısa yol üretilemedi.');
        routes[rng.nextInt(0, 2)][rng.nextInt(0, routes[0].length - 1)] = rng.nextInt(1, grade <= 2 ? 4 : 9);
      }
      b = { ...common, mechanic, routes };
      prompt = 'S ile H arasındaki üç yolun bölüm uzunlukları yazılı. Bölümleri topla. Toplam uzunluğu en az olan yol hangisidir?';
      steps = ['Her yolun üzerindeki bölüm uzunluklarını kendi içinde topla.', 'Üç toplamı karşılaştır; en küçük toplamın yolunu seç.']; break;
    }
  }
  const answer = solveLab(b), choices: Array<string | number> = [answer];
  const add = (v: string | number) => { if (!choices.includes(v)) choices.push(v); };
  if (typeof answer === 'number') for (const n of rng.shuffle([answer - 1, answer + 1, answer - 2, answer + 2, 0, 1, 2, 3, 4])) { if (n >= 0 && n <= EDUCATION_PROFILES[grade].maxNumber) add(n); }
  else if (mechanic === 'domino-chain') {
    const [left, right] = answer.split(' | ').map(Number);
    for (const v of rng.shuffle([`${right} | ${left}`, `${(left + 1) % 7} | ${right}`, `${left} | ${(right + 1) % 7}`, `${(left + 2) % 7} | ${(right + 2) % 7}`])) add(v);
  } else for (const c of rng.shuffle(mechanic === 'cheapest-route' ? ['A', 'B', 'C', 'Eşit'] : ['A', 'B', 'C', 'D', 'E', 'F'])) add(c);
  if (choices.length < 4) throw Error('Dört farklı seçenek gerekli.');
  const options = rng.shuffle(choices.slice(0, 4)).map((textNumber, i) => ({ id: 'ABCD'[i], label: 'ABCD'[i], visualData: { textNumber }, fingerprint: fingerprint({ textNumber }) }));
  const correctOptionId = options.find(o => o.visualData.textNumber === answer)!.id, type = LAB_TOPICS[mechanic];
  return { id: `${LAB_ENGINE}-${mechanic}-g${grade}-d${difficulty}-s${seed}`, version: 1, type, category: TOPIC_CATEGORY[type], seed, difficulty, targetGrade: grade, targetGrades: [grade], ageGroup: grade <= 2 ? '1-2' : '3-4', prompt, visualConfig: b, options, correctOptionId,
    explanation: { ruleTitle: LAB_TITLES[mechanic], summary: steps.join(' '), steps }, skills: [mechanic], estimatedSeconds: 30 + difficulty * 10, status: 'draft',
    authoring: { engine: LAB_ENGINE, objective: prompt, distractorNotes: Object.fromEntries(options.filter(o => o.id !== correctOptionId).map(o => [o.id, 'Gösterilen koşulların sonucuyla uyuşmaz.'])) } };
}
