import { z } from 'zod';
import { SeededRNG } from '../../lib/rng';
import type { BaseQuestion, DifficultyLevel } from '../../types';
import { EDUCATION_PROFILES, type SchoolGrade } from './quality-policy';

export const SHADOW_ENGINE = 'shadow-lab-1';
const coordinate = z.number().finite().min(4).max(96);
const pointSchema = z.tuple([coordinate, coordinate]);
const polygonSchema = z.array(pointSchema).min(3).max(12);
const holeSchema = z.object({ x: coordinate, y: coordinate, r: z.number().min(2.8).max(4.5) }).strict();
export const shadowValueSchema = z.object({ shadow: z.literal(true), polygons: z.array(polygonSchema).min(2).max(3), holes: z.array(holeSchema).min(1).max(3) }).strict();
export const shadowBoardSchema = z.object({ displayMode: z.literal('composite_shadow'), grade: z.number().int().min(1).max(4),
  shapes: z.array(z.object({ points: polygonSchema, color: z.number().int().min(0).max(4) }).strict()).min(2).max(3), holes: z.array(holeSchema).min(1).max(3) }).strict();
export type ShadowPoint = z.infer<typeof pointSchema>;
export type ShadowValue = z.infer<typeof shadowValueSchema>;
export type ShadowBoard = z.infer<typeof shadowBoardSchema>;

/** Even/odd crossing on the actual polygons, independent of their colour or layer order. */
export function shadowInside(points: ShadowPoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function shadowAt(v: ShadowValue, x: number, y: number): boolean {
  return v.polygons.some(p => shadowInside(p, x, y)) && !v.holes.some(h => (x - h.x) ** 2 + (y - h.y) ** 2 < h.r ** 2);
}
/** Subpixel samples compare the visible union; covered edges cannot invent a new answer. */
export function shadowMask(v: ShadowValue): Uint8Array {
  const out = new Uint8Array(4096);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) out[y * 64 + x] = Number(shadowAt(v, (x + .37) * 100 / 64, (y + .61) * 100 / 64));
  return out;
}
export function shadowKey(v: ShadowValue): string { const m=shadowMask(v);let key='';for(let i=0;i<m.length;i+=4)key+=(m[i]*8+m[i+1]*4+m[i+2]*2+m[i+3]).toString(16);return key; }
export function validShadowValue(v: unknown): v is ShadowValue { return shadowValueSchema.safeParse(v).success; }
export function shadowAnswer(b: ShadowBoard): ShadowValue { return { shadow: true, polygons: b.shapes.map(s => s.points.map(p => [...p] as ShadowPoint)), holes: b.holes.map(h => ({ ...h })) }; }
export function validateShadowBoard(value: unknown): ShadowBoard {
  const b = shadowBoardSchema.parse(value), v = shadowAnswer(b);
  if (b.grade === 1 && (b.shapes.length !== 2 || b.holes.length > 2)) throw Error('SHADOW_GRADE_LOAD');
  for (const p of v.polygons) {
    const area = Math.abs(p.reduce((n, a, i) => n + a[0] * p[(i + 1) % p.length][1] - a[1] * p[(i + 1) % p.length][0], 0)) / 2;
    if (area < 100 || new Set(p.map(a => a.join(','))).size !== p.length) throw Error('SHADOW_DEGENERATE_POLYGON');
  }
  if (v.polygons.slice(1).some((p, i) => !Array.from({length: 36 * 36}, (_, k) => [15 + k % 36 * 2, 15 + Math.floor(k / 36) * 2]).some(([x,y]) => shadowInside(p,x,y) && v.polygons.slice(0,i+1).some(other => shadowInside(other,x,y))))) throw Error('SHADOW_DISCONNECTED_PARTS');
  for (let i = 0; i < b.holes.length; i++) {
    const h = b.holes[i];
    if (b.holes.slice(0, i).some(a => Math.hypot(a.x - h.x, a.y - h.y) < a.r + h.r + 3)) throw Error('SHADOW_HOLES_OVERLAP');
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, x = h.x + (h.r + 1) * Math.cos(a), y = h.y + (h.r + 1) * Math.sin(a);
      if (!v.polygons.some(p => shadowInside(p, x, y))) throw Error('SHADOW_HOLE_OUTSIDE_UNION');
    }
  }
  return b;
}
/** Independent winding-number proof checks every candidate against the visible target. */
export function independentlyMatchesShadow(board: unknown, candidate: unknown): candidate is ShadowValue {
  try {
    const b = validateShadowBoard(board);
    if (!validShadowValue(candidate)) return false;
    const winding = (p: ShadowPoint[], x: number, y: number) => {
      let n = 0;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], c = p[(i + 1) % p.length], cross = (c[0] - a[0]) * (y - a[1]) - (c[1] - a[1]) * (x - a[0]);
        if (a[1] <= y && c[1] > y && cross > 0) n++;
        if (a[1] > y && c[1] <= y && cross < 0) n--;
      }
      return n !== 0;
    };
    const target = (x: number, y: number) => b.shapes.some(s => winding(s.points, x, y)) && b.holes.every(h => Math.hypot(x - h.x, y - h.y) >= h.r);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const px = (x + .37) * 100 / 64, py = (y + .61) * 100 / 64;
      if (target(px, py) !== shadowAt(candidate, px, py)) return false;
    }
    return true;
  } catch { return false; }
}
const rounded = (n: number) => Math.round(n * 100) / 100;
function radial(cx: number, cy: number, r: number, sides: number, star: boolean, phase: number): ShadowPoint[] {
  return Array.from({ length: sides * (star ? 2 : 1) }, (_, i) => {
    const a = phase + i * 2 * Math.PI / (sides * (star ? 2 : 1)), radius = star && i % 2 ? r * .48 : r;
    return [rounded(cx + Math.cos(a) * radius), rounded(cy + Math.sin(a) * radius)];
  });
}
export function generateShadowQuestion(seed: number, difficulty: DifficultyLevel, grade: SchoolGrade): BaseQuestion {
  if (!Number.isSafeInteger(seed) || seed < 1 || !EDUCATION_PROFILES[grade] || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > EDUCATION_PROFILES[grade].maxDifficulty) throw Error('INVALID_SHADOW_INPUT');
  const rng = new SeededRNG(seed), phase = rng.nextInt(0, 7) * Math.PI / 16;
  const shapes = [
    { points: radial(39 + rng.nextInt(-2, 2), 47 + rng.nextInt(-2, 2), 25, rng.pick([4, 5, 6]), true, phase), color: rng.pick([0, 2]) },
    { points: radial(62 + rng.nextInt(-2, 2), 51 + rng.nextInt(-2, 2), 21, rng.pick([3, 5, 6]), false, phase + .31), color: rng.pick([1, 3]) },
  ];
  if (grade >= 3 && difficulty >= 3) shapes.push({ points: radial(48, 65, 15, 3, false, phase + .7), color: 4 });
  const holeCount = grade === 1 ? Math.min(2,difficulty) : grade === 2 ? Math.min(2, difficulty) : difficulty >= 3 ? 3 : 2;
  const holes: ShadowBoard['holes'] = [];
  for (const [x, y] of rng.shuffle(Array.from({length: 9 * 10}, (_, i) => [28 + i % 10 * 5, 28 + Math.floor(i / 10) * 5]))) {
    const h = { x: x + rng.nextInt(-1, 1), y: y + rng.nextInt(-1, 1), r: grade <= 2 ? 3.6 : 3.1 };
    try { validateShadowBoard({ displayMode: 'composite_shadow', grade, shapes, holes: [...holes, h] }); holes.push(h); } catch { /* Another visible interior point is tried. */ }
    if (holes.length === holeCount) break;
  }
  if (holes.length !== holeCount) throw Error('SHADOW_INTERIOR_HOLES');
  const board = validateShadowBoard({ displayMode: 'composite_shadow', grade, shapes, holes }), answer = shadowAnswer(board), mask = shadowMask(answer);
  const choices: { value: ShadowValue; note: string }[] = [{ value: answer, note: '' }], seen = new Set([shadowKey(answer)]);
  const transform = (f: (p: ShadowPoint) => ShadowPoint): ShadowValue => ({ shadow: true, polygons: answer.polygons.map(p => p.map(f)), holes: answer.holes.map(h => { const [x, y] = f([h.x, h.y]); return { ...h, x, y }; }) });
  let movedHoles = answer.holes.map(h => ({...h}));
  for(const [dx,dy] of [[8,0],[-8,0],[0,8],[0,-8]]){
    const candidate=answer.holes.map((h,i)=>i?h:{...h,x:h.x+dx,y:h.y+dy});
    try{validateShadowBoard({...board,holes:candidate});movedHoles=candidate;break;}catch{}
  }
  const mutations: { value: ShadowValue; note: string }[] = [
    { value: { ...answer, holes: movedHoles }, note: 'İç boşluklardan biri doğru konumda değil.' },
    { value: transform(([x, y]) => [100 - x, y]), note: 'Bu şekil sağ-sol aynalanmış; hedefin yönü korunmuyor.' },
    { value: transform(([x, y]) => [100 - y, x]), note: 'Bu şekil çeyrek tur döndürülmüş; hedefin yönü korunmuyor.' },
    { value: { ...answer, polygons: answer.polygons.map((p, i) => i ? p.map(([x, y]) => [x + 7, y] as ShadowPoint) : p) }, note: 'Bir parçanın yeri kaymış; birleşik dış sınır değişmiş.' },
    { value: transform(([x, y]) => [x, 100 - y]), note: 'Bu şekil yukarı-aşağı aynalanmış.' },
    { value: { ...answer, holes: answer.holes.map((h, i) => i ? h : { ...h, r: 4.5 }) }, note: 'İç boşluğun boyutu hedefle aynı değil.' },
  ];
  for (const choice of [mutations[0], ...rng.shuffle(mutations.slice(1))]) {
    if (!validShadowValue(choice.value)) continue;
    const key = shadowKey(choice.value); if (seen.has(key)) continue;
    const other = shadowMask(choice.value); let changed = 0, union = 0;
    for (let i = 0; i < mask.length; i++) { changed += Number(mask[i] !== other[i]); union += Number(!!mask[i] || !!other[i]); }
    if (changed / union < (difficulty <= 2 ? .03 : .02)) continue;
    seen.add(key); choices.push(choice); if (choices.length === 4) break;
  }
  if (choices.length !== 4) throw Error('SHADOW_DISTINCT_CHOICES');
  let correctOptionId = '';
  const distractorNotes: Record<string, string> = {};
  const options = rng.shuffle(choices).map((c, i) => { const id = 'ABCD'[i]; if (c.value === answer) correctOptionId = id; else distractorNotes[id] = c.note; return { id, label: id, visualData: c.value, fingerprint: shadowKey(c.value) }; });
  const prompt = 'Yukarıdaki birleşik şeklin doğru gölgesi hangisidir? Yönünü değiştirmeden dış sınırını ve iç boşluklarını karşılaştır.';
  const steps = ['Renkleri yok say; üst üste gelen parçaları tek bir birleşik şekil olarak incele.', 'Sivri uçların yönünü, dış sınırı ve beyaz boşlukların yerini birlikte karşılaştır.', 'Gölge döndürülmez veya aynalanmaz; yalnızca renkli alanlar tek renge dönüşür.'];
  return { id: `shadow-g${grade}-d${difficulty}-s${seed}`, version: 1, type: 'shadow_matching', category: 'visual_perception', seed, difficulty, targetGrade: grade, targetGrades: [grade], ageGroup: grade <= 2 ? '1-2' : '3-4', prompt,
    visualConfig: board, options, correctOptionId, explanation: { ruleTitle: 'Birleşik şeklin gölgesi', summary: steps.join(' '), steps }, skills: ['compound-silhouette'], estimatedSeconds: 30 + difficulty * 8, status: 'draft', authoring: { engine: SHADOW_ENGINE, objective: prompt, distractorNotes } };
}
