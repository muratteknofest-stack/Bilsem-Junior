import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { generateVisualFingerprint as fingerprint } from './fingerprint';
import { VISUAL_SYMBOL_IDS, symbolLabel } from './visual-vocabulary';
import { ALL_TOPIC_TYPES } from './topic-catalog';
import { generateProfessionalQuestion as generateLegacyProfessional } from './professional-engine-v5';

export const ENGINE_VERSION = 'verified-8';
export const VERIFIED_TYPES: QuestionType[] = ['matrix_2x2', 'matrix_3x3', 'raven_matrix', 'visual_sequence', 'figure_rotation', 'mirror_reflection', 'number_pattern', 'operation_machine', 'symbol_coding', 'shape_counting', 'logic_grid'];
export const RECOVERED_TYPES: QuestionType[] = ['symmetry_completion', 'shape_combination', 'direction_path', 'number_pyramid'];
export const STUDENT_TYPES: QuestionType[] = [...ALL_TOPIC_TYPES];
export type Tile = { cells: number[]; size: number };
type Value = Tile | { textNumber: number | string };
export type OrderConstraint = { kind: 'position'; name: string; position: number } |
  { kind: 'before'; left: string; right: string } |
  { kind: 'notAdjacent'; left: string; right: string } |
  { kind: 'distance'; left: string; right: string; distance: number };
export function orderSatisfies(board: Board, order: string[]): boolean {
  return (board.clues || []).every(([a,b])=>order.indexOf(b)===order.indexOf(a)+1) &&
    (board.constraints || []).every(c=>c.kind==='position'?order.indexOf(c.name)===c.position-1:
      c.kind==='before'?order.indexOf(c.left)<order.indexOf(c.right):c.kind==='notAdjacent'?Math.abs(order.indexOf(c.right)-order.indexOf(c.left))!==1:order.indexOf(c.right)-order.indexOf(c.left)===c.distance);
}
export function orderClueText(c: OrderConstraint): string {
  return c.kind==='position'?`${c.name}, soldan ${c.position}. sıradadır.`:
    c.kind==='before'?`${c.left}, ${c.right} adlı kişinin solundadır; yan yana olmaları gerekmez.`:
    c.kind==='notAdjacent'?`${c.left} ile ${c.right} yan yana değildir.`:
    c.distance===1?`${c.right}, ${c.left} adlı kişinin hemen sağındadır.`:
    `${c.left} ile ${c.right} arasında ${c.distance-1} kişi vardır. ${c.left} soldadır.`;
}
export type Board = {
  displayMode: 'verified_board';
  kind: 'transform' | 'matrix' | 'numbers' | 'machine' | 'symbols' | 'count' | 'order' | 'symmetry' | 'overlay' | 'path' | 'pyramid';
  base?: number[];
  gridSize?: number;
  start?: [number, number];
  moves?: ('up' | 'down' | 'left' | 'right')[];
  tiles?: (Tile | null)[];
  columns?: number;
  operation?: 'rotate' | 'mirrorX' | 'mirrorY';
  turns?: number;
  transformSteps?: Array<{ operation: 'rotate' | 'mirrorX' | 'mirrorY'; turns: number }>;
  matrixMode?: 'combine-rotate';
  machineQuery?: 'input';
  countScope?: 'border' | 'inside' | 'oddRows' | 'evenRows';
  sequence?: boolean;
  values?: number[];
  rule?: 'add' | 'growing' | 'alternate' | 'interleaved' | 'multiply-add' | 'interleaved-growing';
  examples?: number[][];
  input?: number;
  key?: { symbol: string; value: number }[];
  symbols?: string[];
  items?: string[];
  target?: string;
  names?: string[];
  clues?: [string, string][];
  constraints?: OrderConstraint[];
  position?: number;
};

export function transformTile(tile: Tile, operation: string, turns = 1): Tile {
  let cells = [...tile.cells];
  for (let t = 0; t < (operation === 'rotate' ? ((turns % 4) + 4) % 4 : 1); t++) {
    const next = Array(cells.length).fill(0);
    for (let r = 0; r < tile.size; r++) for (let c = 0; c < tile.size; c++) {
      const nr = operation === 'rotate' ? c : operation === 'mirrorY' ? tile.size - 1 - r : r;
      const nc = operation === 'rotate' ? tile.size - 1 - r : operation === 'mirrorX' ? tile.size - 1 - c : c;
      next[nr * tile.size + nc] = cells[r * tile.size + c];
    }
    cells = next;
  }
  return { size: tile.size, cells };
}
function combine(a: Tile, b: Tile, op: number): Tile {
  return { size: a.size, cells: a.cells.map((x, i) => op === 0 ? Number(Boolean(x || b.cells[i])) : op === 1 ? x ^ b.cells[i] : x & b.cells[i]) };
}
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);
export function countScopeIncludes(board: Board, index: number): boolean {
  if (!board.countScope) return true;
  const columns = board.columns!, row = Math.floor(index / columns), col = index % columns, rows = board.items!.length / columns;
  if (!Number.isInteger(columns) || columns < 3 || !Number.isInteger(rows)) throw Error('Sayma ızgarası geçersiz.');
  const border = row === 0 || row === rows - 1 || col === 0 || col === columns - 1;
  return board.countScope === 'border' ? border : board.countScope === 'inside' ? !border : board.countScope === 'oddRows' ? row % 2 === 0 : row % 2 === 1;
}
function randomTile(rng: SeededRNG, size: number): Tile {
  // A connected piece and, in some compositions, one detached corner marker.
  const cells=Array(size*size).fill(0), count=rng.nextInt(3,size===3?7:8);
  cells[rng.nextInt(0,cells.length-1)]=1;
  for(let filled=1;filled<count;filled++) {
    const frontier=cells.flatMap((v,i)=>!v&&[
      ...(i%size>0?[i-1]:[]),...(i%size<size-1?[i+1]:[]),i-size,i+size,
    ].some(j=>j>=0&&j<cells.length&&cells[j])?[i]:[]);
    if(!frontier.length)throw Error('Desen sınırı geçersiz.');
    cells[rng.pick(frontier)]=1;
  }
  if(count<size*size-2&&rng.nextBool(.55)) {
    const corners=[0,size-1,size*(size-1),size*size-1].filter(i=>!cells[i]&&
      ![...(i%size>0?[i-1]:[]),...(i%size<size-1?[i+1]:[]),i-size,i+size].some(j=>j>=0&&j<cells.length&&cells[j]));
    if(corners.length)cells[rng.pick(corners)]=1;
  }
  return {size,cells};
}
function asymmetricTile(rng: SeededRNG, size: number): Tile {
  for (let i = 0; i < 100; i++) {
    const tile = randomTile(rng, size);
    const variants = [tile, ...[1, 2, 3].map(t => transformTile(tile, 'rotate', t)),
      ...[0, 1, 2, 3].map(t => transformTile(transformTile(tile, 'mirrorX'), 'rotate', t))];
    if (new Set(variants.map(fingerprint)).size === 8) return tile;
  }
  throw new Error('Ayırt edilebilir şekil üretilemedi; başka bir varyasyon deneyin.');
}

/** Recomputes the answer from the displayed givens, never from correctOptionId. */
export function solveBoard(board: Board): Value {
  if (board.displayMode !== 'verified_board') throw new Error('Desteklenmeyen gösterim.');
  if (board.tiles) {
    if (board.tiles.length > 9) throw new Error('Görsel hücre sayısı geçersiz.');
    for (const tile of board.tiles) if (tile && (!Number.isInteger(tile.size) || tile.size < 3 || tile.size > 4 ||
      tile.cells.length !== tile.size ** 2 || tile.cells.some(c => c !== 0 && c !== 1))) throw new Error('Görsel ızgara geçersiz.');
    if (new Set(board.tiles.filter(Boolean).map(tile => tile!.size)).size !== 1) throw new Error('Izgara boyutları eşleşmiyor.');
  }
  if (board.kind === 'symmetry') {
    if (board.tiles?.length !== 1 || !board.tiles[0]) throw new Error('Simetri başlangıcı eksik.');
    const t = board.tiles[0], middle = Math.ceil(t.size / 2);
    if (t.cells.some((v, i) => i % t.size >= middle && v !== 0)) throw new Error('Gizli yarıda veri olamaz.');
    return { size: t.size, cells: t.cells.map((v, i) => i % t.size < middle ? v : t.cells[Math.floor(i / t.size) * t.size + t.size - 1 - i % t.size]) };
  }
  if (board.kind === 'overlay') {
    if (board.tiles?.length !== 3 || !board.tiles[0] || !board.tiles[1] || board.tiles[2] !== null) throw new Error('Birleştirme için iki desen gerekli.');
    return combine(board.tiles[0], board.tiles[1], 0);
  }
  if (board.kind === 'pyramid') {
    if (!Array.isArray(board.base) || board.base.length < 3 || board.base.length > 5 || board.base.some(v => !Number.isSafeInteger(v) || v < 1 || v > 20)) throw new Error('Piramit tabanı geçersiz.');
    let row = [...board.base];
    while (row.length > 1) row = row.slice(1).map((v, i) => v + row[i]);
    return { textNumber: row[0] };
  }
  if (board.kind === 'path') {
    const size = board.gridSize;
    if (!Number.isInteger(size) || size! < 3 || size! > 5 || !Array.isArray(board.start) || board.start.length !== 2 || board.start.some(v => !Number.isInteger(v) || v < 0 || v >= size!) || !Array.isArray(board.moves) || board.moves.length < 2 || board.moves.length > 10) throw new Error('Rota verisi geçersiz.');
    let [row, col] = board.start;
    for (const move of board.moves) {
      if (move === 'up') row--; else if (move === 'down') row++; else if (move === 'left') col--; else if (move === 'right') col++; else throw new Error('Yön tanımsız.');
      if (row < 0 || col < 0 || row >= size! || col >= size!) throw new Error('Rota ızgara dışına çıkıyor.');
    }
    return { textNumber: `${row + 1}. satır, ${col + 1}. sütun` };
  }
  if (board.kind === 'transform') {
    if (!board.tiles || ![2, 4].includes(board.tiles.length) || board.tiles.at(-1) !== null || board.tiles.slice(0, -1).some(t => !t)) throw new Error('Dönüşüm görseli eksik.');
    const tiles = board.tiles!.filter((t): t is Tile => t !== null);
    if (board.transformSteps) {
      if (board.sequence || board.transformSteps.length !== 2 || board.transformSteps.some(s => !['rotate','mirrorX','mirrorY'].includes(s.operation) || ![1,2,3].includes(s.turns))) throw Error('İki adımlı dönüşüm geçersiz.');
      const apply = (t: Tile) => board.transformSteps!.reduce((v, s) => transformTile(v, s.operation, s.turns), t);
      if (tiles.length === 3 && !same(apply(tiles[0]), tiles[1])) throw Error('İki adımlı örnek tutarsız.');
      return apply(tiles.at(-1)!);
    }
    if (tiles.length === 0 || !['rotate', 'mirrorX', 'mirrorY'].includes(board.operation || '')) throw new Error('Dönüşüm eksik.');
    if (board.operation === 'rotate' && ![1, 2, 3].includes(board.turns!)) throw new Error('Dönüş açısı geçersiz.');
    if (tiles.length === 3 && board.operation === 'rotate') {
      const candidates = [1, 2, 3].filter(turn => same(transformTile(tiles[0], 'rotate', turn), tiles[1]));
      if (candidates.length !== 1 || candidates[0] !== board.turns) throw new Error('Örnekler tek bir dönüş açısını belirlemiyor.');
    }
    if (board.sequence) {
      for (let i = 1; i < tiles.length; i++) if (!same(transformTile(tiles[i - 1], board.operation!, board.turns), tiles[i])) throw new Error('Örüntü kuralı tutarsız.');
    } else if (tiles.length === 3 && !same(transformTile(tiles[0], board.operation!, board.turns), tiles[1])) throw new Error('Üst satır dönüşümü tutarsız.');
    return transformTile(tiles[tiles.length - 1], board.operation!, board.turns);
  }
  if (board.kind === 'matrix') {
    const t = board.tiles!;
    if (t.length !== 9 || t[8] !== null || t.slice(0, 8).some(v => !v)) throw new Error('Matris eksik.');
    if (board.matrixMode === 'combine-rotate') {
      const rules = [0,1,2].flatMap(op => [1,2,3].map(turns => ({op,turns}))).filter(({op,turns}) => [0,3].every(i => same(transformTile(combine(t[i]!, t[i+1]!, op), 'rotate', turns), t[i+2])));
      if (rules.length !== 1) throw Error('Birleştirme ve döndürme tek bir kural vermiyor.');
      return transformTile(combine(t[6]!, t[7]!, rules[0].op), 'rotate', rules[0].turns);
    }
    const ops = [0, 1, 2].filter(op => same(combine(t[0]!, t[1]!, op), t[2]) && same(combine(t[3]!, t[4]!, op), t[5]));
    if (ops.length !== 1) throw new Error('Matris tek bir ortak kural vermiyor.');
    return combine(t[6]!, t[7]!, ops[0]);
  }
  if (board.kind === 'numbers') {
    const v = board.values!;
    if (!Array.isArray(v) || v.length < 5 || v.length > 8 || v.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('Sayı dizisi eksik.');
    if (board.rule === 'multiply-add') {
      if (v.length !== 6) throw Error('Dönüşümlü işlem için altı örnek gerekli.');
      const addition = v[1] - v[0], factor = v[2] / v[1];
      if (!Number.isInteger(factor) || factor < 2 || !Number.isInteger(addition) || addition === 0 || v.slice(1).some((n,i) => n !== (i % 2 === 0 ? v[i] + addition : v[i] * factor))) throw Error('Dönüşümlü işlem örnekleri tutarsız.');
      return { textNumber: v[5] * factor };
    }
    if (board.rule === 'interleaved-growing') {
      if (v.length !== 8) throw Error('İç içe artan aralık için sekiz örnek gerekli.');
      const a = v.filter((_,i)=>i%2===0), z = v.filter((_,i)=>i%2===1), d = a.slice(1).map((n,i)=>n-a[i]), growth = d[1]-d[0];
      if (growth <= 0 || d[2]-d[1] !== growth || z.slice(1).some((n,i)=>n-z[i]!==z[1]-z[0])) throw Error('İç içe değişen aralıklar tutarsız.');
      return { textNumber: a[3]+d[2]+growth };
    }
    if (board.rule === 'interleaved') {
      if (v.length !== 6) throw new Error('İç içe örüntüde her sıra için üç örnek gerekli.');
      const odd = [v[0], v[2], v[4]], even = [v[1], v[3], v[5]];
      if (odd[2] - odd[1] !== odd[1] - odd[0] || even[2] - even[1] !== even[1] - even[0]) throw new Error('İç içe örüntünün sıraları tutarsız.');
      return { textNumber: odd[2] + odd[1] - odd[0] };
    }
    const diffs = v.slice(1).map((n, i) => n - v[i]);
    const step = diffs[1] - diffs[0];
    if (board.rule === 'add' && diffs.every(d => d === diffs[0])) return { textNumber: v.at(-1)! + diffs[0] };
    if (board.rule === 'growing' && diffs.every((d, i) => d === diffs[0] + i * step)) return { textNumber: v.at(-1)! + diffs.at(-1)! + step };
    if (board.rule === 'alternate' && diffs.every((d, i) => d === diffs[i % 2])) return { textNumber: v.at(-1)! + diffs[diffs.length % 2] };
    throw new Error('Sayı dizisi tanımlanan kurala uymuyor.');
  }
  if (board.kind === 'machine') {
    if (!Array.isArray(board.examples) || board.examples.length < 2 || board.examples.length > 4 || board.examples.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n)))) throw new Error('İşlem örnekleri geçersiz.');
    const [[x1, y1], [x2, y2]] = board.examples!;
    const m = (y2 - y1) / (x2 - x1), b = y1 - m * x1;
    if (!Number.isFinite(m) || !Number.isFinite(board.input) || !board.examples!.every(([x, y]) => m * x + b === y)) throw new Error('İşlem örnekleri tutarsız.');
    if (board.machineQuery === 'input') {
      const value = (board.input! - b) / m;
      if (m === 0 || !Number.isSafeInteger(value) || value < 0) throw Error('Ters makine tek bir doğal sayı vermiyor.');
      return { textNumber: value };
    }
    return { textNumber: m * board.input! + b };
  }
  if (board.kind === 'symbols') {
    if (!Array.isArray(board.key) || !board.key.length || board.key.length > 6 || board.key.some(k => !k || typeof k.symbol !== 'string' || !Number.isFinite(k.value)) || !Array.isArray(board.symbols) || !board.symbols.length || board.symbols.length > 8) throw new Error('Sembol verisi geçersiz.');
    const key = new Map(board.key!.map(k => [k.symbol, k.value]));
    if (key.size !== board.key!.length || board.symbols!.some(s => !key.has(s))) throw new Error('Sembol anahtarı eksik.');
    return { textNumber: board.symbols!.reduce((sum, s) => sum + key.get(s)!, 0) };
  }
  if (board.kind === 'count') {
    if (!Array.isArray(board.items) || !board.items.length || board.items.length > 64 || typeof board.target !== 'string' || board.items.some(i => typeof i !== 'string')) throw new Error('Sayma görseli geçersiz.');
    return { textNumber: board.items.filter((x,i) => x === board.target && countScopeIncludes(board,i)).length };
  }
  if (board.kind === 'order') {
    const names = board.names!;
    if (!Array.isArray(names) || names.length < 3 || names.length > 6 || names.some(n => typeof n !== 'string') || new Set(names).size !== names.length || !Number.isInteger(board.position) || board.position! < 1 || board.position! > names.length || !Array.isArray(board.clues) || board.clues.length > 10 || board.clues.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !names.includes(n)))) throw new Error('Sıralama verisi geçersiz.');
    if(board.constraints!==undefined && (!Array.isArray(board.constraints)||board.constraints.length<2||board.constraints.length>8||board.constraints.some(c=>!c||
      (c.kind==='position'? !names.includes(c.name)||!Number.isInteger(c.position)||c.position<1||c.position>names.length:
       c.kind==='before'||c.kind==='distance'||c.kind==='notAdjacent'? !names.includes(c.left)||!names.includes(c.right)||c.left===c.right||c.kind==='distance'&&(!Number.isInteger(c.distance)||c.distance<1||c.distance>=names.length):true))))throw Error('Sıralama kısıtları geçersiz.');
    const solutions: string[][] = [];
    const visit = (order: string[]) => {
      if (order.length === names.length) {
        if (orderSatisfies(board,order)) solutions.push(order);
      } else for (const name of names) if (!order.includes(name)) visit([...order, name]);
    };
    visit([]);
    if (solutions.length !== 1) throw new Error('Sıralama tek çözümlü değil.');
    return { textNumber: solutions[0][board.position! - 1] };
  }
  throw new Error('Bilinmeyen kural.');
}

function deductionOrder(rng: SeededRNG, names: string[], difficulty: number): Board {
  const permutations: string[][] = [];
  const visit = (row: string[]) => row.length === names.length ? permutations.push(row) : names.filter(n=>!row.includes(n)).forEach(n=>visit([...row,n]));
  visit([]);
  for (let attempt=0;attempt<60;attempt++) {
    const planted = rng.shuffle(names), pool: OrderConstraint[] = [];
    planted.forEach((name,i)=>{
      if(i===0||i===names.length-1)pool.push({kind:'position',name,position:i+1});
      planted.slice(i+1).forEach((right,j)=>{
        pool.push({kind:'before',left:name,right},{kind:'distance',left:name,right,distance:j+1});
        if(difficulty>=4 && j>0)pool.push({kind:'notAdjacent',left:name,right});
      });
    });
    const board: Board = {displayMode:'verified_board',kind:'order',names,clues:[],constraints:[],position:2};
    let remaining = permutations;
    for(const c of rng.shuffle(pool)) {
      const next=remaining.filter(order=>orderSatisfies({...board,constraints:[c]},order));
      if(next.length===remaining.length)continue;
      board.constraints!.push(c);remaining=next;
      if(remaining.length===1)break;
    }
    for(const c of [...board.constraints!]) {
      const reduced=board.constraints!.filter(v=>v!==c);
      if(permutations.filter(order=>orderSatisfies({...board,constraints:reduced},order)).length===1)board.constraints=reduced;
    }
    if(remaining.length!==1 || board.constraints!.length<3 || board.constraints!.length>7)continue;
    const queries=rng.shuffle(Array.from({length:names.length},(_,i)=>i+1));
    for(const position of queries) {
      // A query must need several clues, rather than reading a named position.
      const subsets=board.constraints!.flatMap((c,i)=>difficulty>=4?board.constraints!.slice(i+1).map(d=>[c,d]):[[c]]);
      if(subsets.some(constraints=>new Set(permutations.filter(order=>orderSatisfies({...board,constraints},order)).map(order=>order[position-1])).size===1))continue;
      return {...board,position};
    }
  }
  throw Error('Birden çok ipucu gerektiren sıralama üretilemedi.');
}

export function generateProfessionalQuestion(type: QuestionType, seed: number, difficulty: DifficultyLevel, legacyV3 = false): BaseQuestion {
  if(legacyV3)return generateLegacyProfessional(type,seed,difficulty,true);
  if (!VERIFIED_TYPES.includes(type) || !Number.isSafeInteger(seed) || seed < 1 || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 6) throw new Error('Soru parametreleri geçersiz.');
  const rng = new SeededRNG(seed);
  const size = difficulty >= 4 ? 4 : 3;
  let board: Board;
  let prompt: string, ruleTitle: string, summary: string, steps: string[], objective: string, category: CognitiveCategory;
  if (['matrix_2x2', 'visual_sequence', 'figure_rotation', 'mirror_reflection'].includes(type)) {
    const turns = rng.pick(difficulty <= 2 ? [1] : [1, 2, 3]);
    const operation = type === 'mirror_reflection' ? rng.pick(['mirrorX', 'mirrorY'] as const) :
      type === 'matrix_2x2' && difficulty >= 3 ? rng.pick(['rotate', 'mirrorX', 'mirrorY'] as const) :
      type==='visual_sequence'&&difficulty>=3?rng.pick(['rotate','rotate','mirrorX','mirrorY'] as const):'rotate';
    const first = asymmetricTile(rng, size);
    const direction = operation === 'mirrorX' ? 'soldan sağa' : 'yukarıdan aşağıya';
    const transform = (tile: Tile) => transformTile(tile, operation, turns);
    board = { displayMode: 'verified_board', kind: 'transform', operation, turns, columns: type === 'matrix_2x2' ? 2 : 4, tiles: [first, null] };
    if (type === 'matrix_2x2') board.tiles = [first, transform(first), asymmetricTile(rng, size), null];
    if (type === 'visual_sequence') { board.tiles = [first, transform(first), transform(transform(first)), null]; board.sequence = true; }
    prompt = type === 'matrix_2x2' ? 'Üst satırdaki dönüşümü alt satıra uygula. Eksik kare hangisidir?' :
      type === 'visual_sequence' ? 'Her adımda aynı dönüşüm uygulanıyor. Örüntüyü hangi kare tamamlar?' :
      type === 'figure_rotation' ? 'Şekil saat yönünde ' + turns * 90 + '° döndürülürse hangisi oluşur?' :
      'Şeklin ' + direction + ' ayna görüntüsü hangisidir?';
    category = type === 'matrix_2x2' ? 'matrix' : type === 'visual_sequence' ? 'pattern' : 'spatial';
    ruleTitle = operation === 'rotate' ? 'Konumları koruyarak döndürme' : 'Aynaya göre konum eşleme';
    summary = operation === 'rotate' ? 'Izgaranın tamamı saat yönünde ' + turns * 90 + '° döner; dolu hücre sayısı değişmez.' :
      'Ayna ' + (operation === 'mirrorX' ? 'sağdadır. Her satırdaki hücreler ters sıraya geçer.' : 'alttadır. Satırların sırası tersine döner.');
    steps = ['Ayırt edici bir köşe ve yanındaki dolu hücreleri seç.', summary, 'Seçtiğin hücreleri yeni konumlarında bul; bütün hücreleri kontrol et.'];
    objective = 'Döndürme ile yansımayı ayırt etme; uzamsal konumları takip etme.';
    if (difficulty>=3 && (type==='figure_rotation'||type==='matrix_2x2') && rng.nextBool(.7)) {
      const reflection = rng.pick(['mirrorX','mirrorY'] as const), rotate = {operation:'rotate' as const,turns:turns===2?rng.pick([1,3]):turns}, mirror={operation:reflection,turns:1};
      board.transformSteps = rng.nextBool() ? [rotate,mirror] : [mirror,rotate];
      const instructions=board.transformSteps.map(s=>s.operation==='rotate'?`saat yönünde ${s.turns*90}° döndür`:`${s.operation==='mirrorX'?'sağ-sol':'üst-alt'} aynasını al`);
      const apply=(tile:Tile)=>board.transformSteps!.reduce((t,s)=>transformTile(t,s.operation,s.turns),tile);
      if(type==='matrix_2x2')board.tiles=[first,apply(first),asymmetricTile(rng,size),null];
      prompt=`Önce ${instructions[0]}, sonra ${instructions[1]}. ${type==='matrix_2x2'?'Aynı iki işlemi alt desene uygula.':'Son desen hangisidir?'}`;
      ruleTitle='Sıralı iki uzamsal işlem';summary=`İşlemler verilen sırayla yapılır: önce ${instructions[0]}, sonra ${instructions[1]}.`;
      steps=['Başlangıç deseninde bir köşe işaretini takip et.',`Birinci adım: ${instructions[0]}.`,`İkinci adım: ${instructions[1]}.`,'Yalnız ilk işlemi yapmak veya sırayı değiştirmek farklı sonuç verir.'];
      objective='İki farklı uzamsal işlemi doğru sırayla birleştirme.';
    }
  } else if (type === 'matrix_3x3' || type === 'raven_matrix') {
    const op = difficulty <= 2 ? 0 : rng.nextInt(0, 2);
    const combined=difficulty>=4, matrixTurns=rng.nextInt(1,3);
    let tiles: Tile[] = [];
    for (let attempt = 0; attempt < 100; attempt++) {
      tiles = [];
      for (let row = 0; row < 3; row++) {
        const a = randomTile(rng, size), b = randomTile(rng, size);
        tiles.push(a, b, combined?transformTile(combine(a,b,op),'rotate',matrixTurns):combine(a, b, op));
      }
      const candidate: Board = { displayMode: 'verified_board', kind: 'matrix', tiles: [...tiles.slice(0, 8), null], columns: 3 };
      if(combined)candidate.matrixMode='combine-rotate';
      const answerCells = tiles[8].cells.reduce((sum, n) => sum + n, 0);
      try {
        solveBoard(candidate);
        if (answerCells < 2 || answerCells > size * size - 2) throw new Error('Sonuç deseni fazla boş veya dolu.');
        if (new Set(tiles.slice(0, 8).map(fingerprint)).size < 6) throw new Error('Örnekler yeterince çeşitli değil.');
        break;
      } catch {
        if (attempt === 99) throw new Error('Açık ve ayırt edilebilir matris üretilemedi.');
      }
    }
    board = { displayMode: 'verified_board', kind: 'matrix', tiles: [...tiles.slice(0, 8), null], columns: 3 };
    if(combined)board.matrixMode='combine-rotate';
    prompt = 'Her satırda ilk iki kare aynı kuralla birleşiyor. Son karede hangi desen olmalı?';
    ruleTitle = ['Birleşim', 'Ortakları çıkarma', 'Kesişim'][op];
    summary = ['İki kareden en az birinde dolu olan konum, sonuçta doludur.', 'Yalnızca bir karede dolu olan konum sonuçta kalır; iki karede de dolu olan konum boşalır.', 'Yalnızca iki karede de dolu olan konumlar sonuçta kalır.'][op];
    steps = ['İlk satırdaki kareleri hücre hücre karşılaştır.', summary, 'İkinci satırda aynı kuralı doğrula.', 'Son satırdaki iki kareye bu kuralı uygula.'];
    objective = 'İki örnekten ortak görsel kuralı çıkarma ve yeni bir duruma aktarma.';
    category = 'matrix';
    if(combined){prompt='Her satırda ilk iki desen aynı kuralla birleştirilip saat yönünde döndürülüyor. İki tamamlanmış satırdan her iki kuralı bul. Eksik desen hangisidir?';summary+=` Birleşen desen ayrıca saat yönünde ${matrixTurns*90}° döndürülür.`;steps=['Önce iki tamamlanmış satırda dolu hücrelerin nasıl birleştiğini bul.',summary,'Birleştirme kuralını ve dönüş açısını iki satırda da denetle.','Son satırın ilk iki desenini birleştir, aynı açıyla döndür.'];ruleTitle='Birleştirme ve dönüş kuralını birlikte keşfet';}
  } else if (type === 'number_pattern') {
    const rule = difficulty === 1 ? 'add' : difficulty===2 ? rng.pick(['add','add','add','alternate','alternate'] as const) : rng.pick(difficulty >= 4 ? ['growing', 'interleaved', 'multiply-add','interleaved-growing'] as const : ['growing', 'alternate','multiply-add'] as const);
    const start = rng.nextInt(1, difficulty <= 2 ? 8 : 15), a = rng.nextInt(2, difficulty <= 2 ? 4 : 7), b = rng.nextInt(1, difficulty <= 4 ? 3 : 4);
    const descending = rule === 'add' && difficulty >= 2 && rng.nextBool(.65);
    // Six decrements, including the missing term, must remain non-negative and
    // within the first-grade limit of 30 when this level is used by grade one.
    const values = [descending ? 6 * a + rng.nextInt(0, 6) : start];
    if (rule === 'interleaved') {
      const second = start + a + b;
      values.splice(0, 1, start, second, start + a, second + a + b, start + 2 * a, second + 2 * (a + b));
    } else if(rule==='interleaved-growing') {
      values.splice(0,1,...Array.from({length:8},(_,i)=>i%2===0?start+(i/2)*a+(i/2)*(i/2-1)/2*b:start+3+(Math.floor(i/2))*(a+2)));
    } else if(rule==='multiply-add') {
      const factor=difficulty<=3?2:rng.nextInt(2,3), addition=rng.nextInt(1,9);
      values[0]=rng.nextInt(1,20);
      for(let i=0;i<5;i++)values.push(i%2===0?values.at(-1)!+addition:values.at(-1)!*factor);
    } else for (let i = 0; i < 5; i++) values.push(values.at(-1)! + (rule === 'add' ? (descending ? -a : a) : rule === 'growing' ? a + i * b : i % 2 === 0 ? a : a + b));
    board = { displayMode: 'verified_board', kind: 'numbers', values, rule };
    prompt = rule === 'interleaved' ? 'Birer sayı atlayarak iki ayrı sıra oluştur. Her sıra kendi içinde aynı miktarda artıyor. Sıradaki sayı kaçtır?' : 'Sayılar arasındaki değişimi incele. Aynı düzen devam ederse sıradaki sayı kaç olur?';
    summary = rule === 'interleaved' ? 'Tek numaralı adımlar ' + a + ', çift numaralı adımlar ' + (a + b) + ' artar.' : rule === 'add' ? 'Her adımda ' + a + (descending ? ' çıkarılır.' : ' eklenir.') : rule === 'growing' ? 'Artış miktarı ' + a + ' ile başlar ve her adımda ' + b + ' büyür.' : 'Artışlar sırayla ' + a + ' ve ' + (a + b) + ' olarak tekrar eder.';
    ruleTitle = rule === 'interleaved' ? 'İç içe iki örüntü' : 'Değişimleri karşılaştır'; steps = ['Sayıların yerlerini ve değişimlerini incele.', summary, 'Bulduğun kuralı bütün verilen sayılarda denetle.'];
    category = 'numerical'; objective = 'Sabit, azalan, dönüşümlü ve iç içe sayı örüntülerini ayırt etme.';
    if(rule==='multiply-add'){prompt='İki işlem sırayla tekrarlanıyor: bir miktar ekleme ve bir sayıyla çarpma. Bütün geçişleri kontrol et. Sıradaki sayı kaçtır?';ruleTitle='Dönüşümlü toplama ve çarpma';summary=`Önce ${values[1]-values[0]} eklenir, sonra ${values[2]/values[1]} ile çarpılır; iki işlem sırayla tekrar eder.`;}
    if(rule==='interleaved-growing'){prompt='Tek ve çift adımlar iki ayrı sıra oluşturuyor. Bir sırada artış sabit, diğerinde düzenli büyüyor. Dokuzuncu adım kaçtır?';ruleTitle='İç içe sıralarda değişen aralık';summary=`Tek adımlardaki artışlar ${a} ile başlar ve her defasında ${b} büyür. Çift adımlar ${a+2} artar.`;}
  } else if (type === 'operation_machine') {
    const m = rng.nextInt(2, difficulty < 3 ? 3 : 7);
    const subtract = difficulty >= 4 && rng.nextBool();
    const rawOffset = difficulty <= 2 ? 0 : subtract ? -rng.nextInt(1, m * 2) : rng.nextInt(1, 12);
    const xs = rng.pickUnique(subtract ? [3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9], 4).sort((x, y) => x - y);
    const b = subtract ? Math.max(rawOffset, -xs[3]) : rawOffset;
    board = { displayMode: 'verified_board', kind: 'machine', examples: xs.slice(0, 3).map(x => [x, m * x + b]), input: xs[3] };
    if(difficulty>=3&&rng.nextBool()){board.machineQuery='input';board.input=m*xs[3]+b;}
    prompt = 'Makine her girdiye aynı işlemi uyguluyor: önce aynı sayıyla çarpıyor, sonra aynı miktarı ' + (subtract ? 'çıkarıyor.' : 'ekliyor.') + ' Son çıktı kaçtır?';
    ruleTitle = 'Girdi–çıktı ilişkisi'; summary = 'Girdi ' + m + ' ile çarpılır' + (b ? (subtract ? ', sonuçtan ' : ', sonuca ') + Math.abs(b) + (subtract ? ' çıkarılır.' : ' eklenir.') : '. Eklenen miktar sıfırdır.');
    steps = ['İki örneğin girdi ve çıktı farklarını karşılaştır.', summary, 'Bu işlemi son girdiye uygula ve diğer örneklerle denetle.'];
    category = 'numerical'; objective = 'Örneklerden doğrusal bir işlem kuralı çıkarma.';
    if(board.machineQuery){prompt=prompt.replace('Son çıktı kaçtır?','Son çıktı verilmiş. Bu çıktıyı veren girdi kaçtır?');ruleTitle='Kuralı keşfet ve tersine uygula';objective='Girdi–çıktı kuralını keşfedip işlemleri ters sırayla geri alma.';}
  } else if (type === 'symbol_coding' || type === 'shape_counting') {
    const symbols = legacyV3 ? ['●', '▲', '■', '◆'] : rng.pickUnique(VISUAL_SYMBOL_IDS, difficulty <= 2 ? 3 : 4);
    if (type === 'symbol_coding') {
      board = { displayMode: 'verified_board', kind: 'symbols', key: rng.pickUnique(Array.from({ length: difficulty * 3 + 4 }, (_, i) => i + 1), symbols.length).map((value, i) => ({ symbol: symbols[i], value })), symbols: rng.shuffle([...rng.pickUnique(symbols, Math.min(4, difficulty + 1)), ...(difficulty >= 3 ? [symbols[0]] : [])]) };
      prompt = 'Anahtardaki değerleri kullan. Aşağıdaki sembollerin toplamı kaçtır?';
      ruleTitle = 'Sembolü sayıya çevir'; summary = 'Her sembol anahtarda karşısındaki sayıyı temsil eder. Tekrar eden semboller de toplama katılır.';
      category = 'coding'; objective = 'Sembol–değer eşlemesini kullanma ve çalışma belleği.';
    } else {
      const target = rng.pick(symbols);
      const total = [12, 16, 20, 24, 30, 36][difficulty - 1];
      const targetCount = rng.nextInt(difficulty>=2?3:2, Math.floor(total / 3));
      const otherSymbols = symbols.filter(s => s !== target);
      const items = rng.shuffle([...Array(targetCount).fill(target), ...Array.from({ length: total - targetCount }, () => rng.pick(otherSymbols))]);
      board = { displayMode: 'verified_board', kind: 'count', items, target };
      if(difficulty>=2){board.columns=difficulty>=5?6:4;board.countScope=rng.pick(difficulty>=4?['border','inside','oddRows','evenRows'] as const:['oddRows','evenRows'] as const);}
      if(board.countScope){
        const indices=Array.from({length:total},(_,i)=>i),inside=indices.filter(i=>countScopeIncludes(board,i)),outside=indices.filter(i=>!countScopeIncludes(board,i));
        const selected=new Set([...rng.pickUnique(inside,2),rng.pick(outside)]);
        for(const i of rng.shuffle(indices.filter(i=>!selected.has(i)))){if(selected.size>=targetCount)break;selected.add(i);}
        board.items=indices.map(i=>selected.has(i)?target:rng.pick(otherSymbols));
      }
      prompt = legacyV3 ? 'Izgarada toplam kaç tane ' + target + ' var?' : 'Izgarada hedef olarak gösterilen ' + symbolLabel(target) + ' görselinden kaç tane var?';
      ruleTitle = 'Sistemli tarama'; summary = 'Yalnızca hedef sembolü say. Her satırı soldan sağa bir kez tara.';
      category = 'attention'; objective = 'Benzer uyaranlar arasından hedefi seçme ve sistemli tarama.';
      if(board.countScope){const region={border:'dış çerçevedeki',inside:'dış çerçeve hariç iç bölgedeki',oddRows:'yukarıdan 1., 3. ve varsa 5. satırdaki',evenRows:'yukarıdan 2., 4. ve varsa 6. satırdaki'}[board.countScope];prompt=`Yalnızca ${region} ${symbolLabel(target)} görsellerini say. Bu bölgedeki hedef sayısı kaçtır?`;ruleTitle='Bölge ve şekil koşulunu birlikte uygula';summary='Önce belirtilen bölgeyi seç, sonra yalnızca hedef şekilleri say.';}
    }
    steps = ['Hedef sembolü ve verilen bilgileri dikkatle incele.', summary, 'Bulduğun sonucu ikinci kez kontrol et.'];
  } else {
    const names = rng.pickUnique(['Ada', 'Ece', 'Can', 'Efe', 'Duru', 'Mert', 'Oya', 'Deniz'], difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6);
    let order = rng.shuffle(names); const position = rng.nextInt(1, names.length);
    board = { displayMode: 'verified_board', kind: 'order', names, clues: [], position };
    if(difficulty<=2)board.clues=rng.shuffle(order.slice(1).map((n,i)=>[order[i],n] as [string,string]));
    else {
      board=deductionOrder(rng,names,difficulty);
      const solutions:string[][]=[];const visit=(row:string[])=>row.length===names.length?(orderSatisfies(board,row)&&solutions.push(row)):names.filter(n=>!row.includes(n)).forEach(n=>visit([...row,n]));visit([]);order=solutions[0];
    }
    prompt = 'İpuçlarına göre soldan ' + board.position + '. sırada kim vardır?';
    ruleTitle = 'Konum ve sıra ipuçlarını birleştir'; summary = 'Soldan sağa sıra: ' + order.join(' → ') + '.';
    steps = board.constraints?['Önce her ipucunun izin verdiği konumları belirle.','Uzaklık, önce gelme ve varsa yan yana olmama koşullarını birlikte kullan.','Tek ipucuyla karar verme; bütün ipuçları aynı sıralamayı sağlamalı.',summary]:['Her ipucundaki iki kişiyi yan yana düşün.', 'Ortak isimleri kullanarak parçaları tek sırada birleştir.', summary];
    category = 'logic'; objective = 'Birden çok sıralama kısıtından tek çözüm üretme.';
  }
  const answer = solveBoard(board);
  if(board.countScope&&'textNumber' in answer&&(Number(answer.textNumber)<2||answer.textNumber===board.items!.filter(s=>s===board.target).length))throw Error('Bölge koşulu sonucu ayırt etmeli.');
  // Concrete derivations are part of the canonical content, not free-form AI prose.
  if ('textNumber' in answer && typeof answer.textNumber === 'number') {
    if (board.kind === 'numbers') {
      const diffs = board.values!.slice(1).map((v, i) => v - board.values![i]);
      const nextChange = answer.textNumber - board.values!.at(-1)!;
      steps = board.rule === 'interleaved' ? [
        '1., 3. ve 5. adımlar: ' + board.values!.filter((_, i) => i % 2 === 0).join(' → ') + '.',
        '2., 4. ve 6. adımlar: ' + board.values!.filter((_, i) => i % 2 === 1).join(' → ') + '.',
        summary, '7. adım birinci sırayı sürdürür: ' + board.values![4] + ' + ' + (board.values![2] - board.values![0]) + ' = ' + answer.textNumber + '.',
      ] : ['Komşu sayıların farkları: ' + diffs.join(', ') + '.', summary,
        'Sıradaki değişim ' + nextChange + ' olur.',
        board.values!.at(-1) + (nextChange < 0 ? ' − ' : ' + ') + Math.abs(nextChange) + ' = ' + answer.textNumber + '.'];
      if(board.rule==='multiply-add')steps=[summary,...board.values!.slice(1).map((n,i)=>`${board.values![i]} ${i%2===0?'+':'×'} ${i%2===0?board.values![1]-board.values![0]:board.values![2]/board.values![1]} = ${n}.`),`${board.values![5]} × ${board.values![2]/board.values![1]} = ${answer.textNumber}.`];
      if(board.rule==='interleaved-growing'){
        const odd=board.values!.filter((_,i)=>i%2===0),even=board.values!.filter((_,i)=>i%2===1),gaps=odd.slice(1).map((n,i)=>n-odd[i]),nextGap=gaps[2]+gaps[1]-gaps[0];
        steps=[`Tek adımlar: ${odd.join(' → ')}.`,`Tek adımların artışları: ${gaps.join(', ')}.`, `Çift adımlar: ${even.join(' → ')}; kendi artışı sabit kalır.`,summary,`9. adım tek sıradadır: ${odd[3]} + ${nextGap} = ${answer.textNumber}.`];
      }
    } else if (board.kind === 'machine') {
      const [[x1, y1], [x2, y2]] = board.examples!;
      const m = (y2 - y1) / (x2 - x1), offset = y1 - m * x1;
      steps = ['Girdi farkı ' + (x2 - x1) + ', çıktı farkı ' + (y2 - y1) + ': çarpan ' + m + '.',
        offset < 0 ? 'Bir örnekle çıkarılanı bul: ' + x1 + ' × ' + m + ' − ' + y1 + ' = ' + Math.abs(offset) + '.' : 'Bir örnekle ekleneni bul: ' + y1 + ' − ' + x1 + ' × ' + m + ' = ' + offset + '.',
        board.input + ' × ' + m + (offset < 0 ? ' − ' : ' + ') + Math.abs(offset) + ' = ' + answer.textNumber + '.',
        'Aynı işlemi verilen üç örnekte de kontrol et.'];
      if(board.machineQuery)steps=[...steps.slice(0,2),'Çıktıdan geriye giderken önce sabit miktarla yapılan işlemi geri al.',`${board.input} ${offset<0?'+':'−'} ${Math.abs(offset)} = ${answer.textNumber*m}.`,`${answer.textNumber*m} ÷ ${m} = ${answer.textNumber}.`,`Kontrol: ${answer.textNumber} × ${m} ${offset<0?'−':'+'} ${Math.abs(offset)} = ${board.input}.`];
    } else if (board.kind === 'symbols') {
      const values = board.symbols!.map(s => board.key!.find(k => k.symbol === s)!.value);
      steps = ['Her sembolü anahtardaki değeriyle eşleştir.', board.symbols!.map((s, i) => s + ' = ' + values[i]).join('; ') + '.',
        'Tekrar eden sembolleri atlamadan topla: ' + values.join(' + ') + ' = ' + answer.textNumber + '.'];
    } else if (board.kind === 'count') {
      const groups: number[] = [];
      const columns=board.columns||6;
      for (let i = 0; i < board.items!.length; i += columns) groups.push(board.items!.slice(i, i + columns).filter((s,j) => s === board.target&&countScopeIncludes(board,i+j)).length);
      steps = ['Hedef ' + board.target + ' sembolüdür; diğer şekilleri sayma.',
        (board.countScope?'Bölge dışındaki hedefleri saymadan satırları tara: ':'Görselleri baştan başlayarak altışarlı gruplar halinde tara: ') + groups.join(', ') + ' hedef.',
        'Grup sayılarını topla: ' + groups.join(' + ') + ' = ' + answer.textNumber + '.'];
    }
  }
  const choices: { value: Value; note: string }[] = [{ value: answer, note: 'Gösterilen bütün verilerle uyumludur.' }];
  const add = (value: Value, note: string) => {
    if ('textNumber' in value && typeof value.textNumber === 'number' && (!Number.isSafeInteger(value.textNumber) || value.textNumber < 0)) return;
    if (!choices.some(c => same(c.value, value))) choices.push({ value, note });
  };
  if ('cells' in answer) {
    if(board.kind==='transform' || board.kind==='matrix') {
      const filled=rng.pick(answer.cells.flatMap((v,i)=>v?[i]:[]));
      const empty=rng.pick(answer.cells.flatMap((v,i)=>!v?[i]:[]));
      const cells=[...answer.cells];cells[filled]=0;cells[empty]=1;
      add({size:answer.size,cells},`Dolu hücre sayısı korunmuş; ancak ${Math.floor(filled/size)+1}. satırın ${filled%size+1}. sütunundaki işaret yanlış konuma taşınmış.`);
    }
    if(board.transformSteps){const source=board.tiles!.filter((t):t is Tile=>t!==null).at(-1)!;const [a,z]=board.transformSteps;add(transformTile(source,a.operation,a.turns),'Yalnız ilk işlem uygulanmış; ikinci işlem atlanmış.');add(transformTile(transformTile(source,z.operation,z.turns),a.operation,a.turns),'İşlemlerin sırası ters çevrilmiş.');}
    if (board.kind === 'matrix') for (const op of [0, 1, 2]) add(combine(board.tiles![6]!, board.tiles![7]!, op), 'Örneklerle uyuşmayan bir hücre birleştirme kuralı uygulanmış.');
    const source = board.tiles!.filter((t): t is Tile => t !== null).at(-1)!;
    add(source, 'Dönüşüm uygulanmamış; başlangıç deseni aynen bırakılmış.');
    for (const turn of rng.shuffle([1, 2, 3])) add(transformTile(source, 'rotate', turn), 'Şekil saat yönünde ' + turn * 90 + '° döndürülmüş; verilen kural bu dönüşümle uyuşmuyor.');
    add(transformTile(source, 'mirrorX'), 'Sağ-sol yansıması kullanılmış; verilen dönüşümle uyuşmuyor.');
    add(transformTile(source, 'mirrorY'), 'Üst-alt yansıması kullanılmış; verilen dönüşümle uyuşmuyor.');
    for (const i of rng.shuffle(Array.from({ length: answer.cells.length }, (_, i) => i))) {
      if (choices.length >= 4) break;
      const cells = [...answer.cells]; cells[i] = 1 - cells[i];
      add({ size: answer.size, cells }, (Math.floor(i / size) + 1) + '. satırın ' + (i % size + 1) + '. hücresinde dolu-boş durumu ters aktarılmış.');
    }
  } else if (typeof answer.textNumber === 'number') {
    const number = (n: number, note: string) => add({ textNumber: n }, note);
    if (board.kind === 'numbers') {
      const v = board.values!, last = v.at(-1)!, firstDiff = v[1] - v[0], lastDiff = last - v.at(-2)!;
      if (board.rule === 'interleaved') {
        number(v[5] + v[3] - v[1], '7. adım yerine çift numaralı sıranın bir sonraki sayısı bulunmuş.');
        number(v[4] + v[3] - v[1], 'Tek numaralı sıraya diğer sıranın artışı uygulanmış.');
        number(v[4], 'Tek numaralı sıradaki son sayı tekrar edilmiş; kendi artışı eklenmemiş.');
      }
      if(board.rule==='multiply-add'){number(last+firstDiff,'Çarpma adımında yeniden toplama yapılmış.');number(last*(v[2]/v[1])+firstDiff,'Sıradaki tek işlem yerine iki işlem birlikte yapılmış.');number(last,'Son terim tekrar edilmiş.');}
      if(board.rule==='interleaved-growing'){number(v[7]+v[3]-v[1],'Tek sıra yerine çift sıranın sonraki terimi seçilmiş.');number(v[6]+v[6]-v[4],'Büyüyen artış yerine son artış aynı tutulmuş.');number(v[6]+v[2]-v[0],'Yalnızca ilk artış kullanılmış.');}
      number(last + lastDiff, 'Son artış aynen tekrar edilmiş; artışların düzeni kontrol edilmemiş.');
      number(last + firstDiff, 'Yalnızca ilk artış kullanılmış; sonraki artışların değişimi atlanmış.');
      number(last, 'Son sayı yeniden yazılmış; sıradaki artış uygulanmamış.');
      number(last + 2 * (answer.textNumber - last), 'Sıradaki artış bir kez yerine iki kez eklenmiş.');
      number(last - firstDiff, 'İleri gitmek yerine ilk artış çıkarılmış.');
    } else if (board.kind === 'machine') {
      const [[x1, y1], [x2, y2]] = board.examples!;
      const m = (y2 - y1) / (x2 - x1), offset = y1 - m * x1, x = board.input!;
      if(board.machineQuery){number(Math.floor(x/m),'Sabit miktarla yapılan işlem geri alınmadan bölünmüş.');number(x-offset,'Sabit miktar geri alınmış ancak çarpma geri alınmamış.');number(answer.textNumber+Math.max(1,Math.abs(offset)),'Çıktıdaki sabit miktar girdi sonucuna tekrar eklenmiş.');}
      number(x * m, 'Çarpma yapılmış ancak sabit miktarla yapılacak son işlem unutulmuş.');
      number((x + offset) * m, 'İşlem sırası ters uygulanmış; sabit miktarla işlem çarpmadan önce yapılmış.');
      number(x + m + offset, 'Çarpma yerine toplama yapılmış.');
      number(x * (m + 1) + offset, 'Çarpan bir fazla alınmış.');
      number(x * m + offset + m, 'Çarpan ayrıca sonuca eklenmiş.');
    } else if (board.kind === 'symbols') {
      const values = board.symbols!.map(s => board.key!.find(k => k.symbol === s)!.value);
      number([...new Set(board.symbols!)].reduce((sum, s) => sum + board.key!.find(k => k.symbol === s)!.value, 0), 'Tekrar eden semboller yalnızca bir kez sayılmış.');
      number(answer.textNumber - values.at(-1)!, 'Son sembolün değeri toplama katılmamış.');
      number(answer.textNumber + values[0], 'İlk sembolün değeri fazladan bir kez daha eklenmiş.');
      number(values.length, 'Sembol değerlerini toplamak yerine sembol adedi sayılmış.');
    } else if (board.kind === 'count') {
      if(board.countScope){number(board.items!.filter(s=>s===board.target).length,'Bölge koşulu unutularak bütün hedefler sayılmış.');number(board.items!.filter((s,i)=>s===board.target&&!countScopeIncludes(board,i)).length,'İstenen bölge yerine dışarıda kalan hedefler sayılmış.');}
      for (const symbol of (legacyV3 ? ['●', '▲', '■', '◆'] : [...new Set(board.items!)]).filter(s => s !== board.target))
        number(board.items!.filter(s => s === symbol).length, 'Hedef yerine ' + symbol + ' sembolleri sayılmış.');
      number(answer.textNumber - 1, 'Bir hedef sembol gözden kaçırılmış.');
      number(answer.textNumber + 1, 'Bir sembol iki kez sayılmış veya hedef olmayan bir şekil eklenmiş.');
    }
    for (const offset of rng.shuffle([-1, 1, 2, -2, 3])) if (choices.length < 4)
      number(answer.textNumber + offset, 'Hesap sonucu ' + Math.abs(offset) + (offset > 0 ? ' fazla' : ' eksik') + ' bulunmuş; işlem adımlarını yeniden kontrol et.');
  } else for (const name of board.names!) add({ textNumber: name }, name + ' istenen sırada değildir; bütün ipuçlarını birlikte kullanarak konumunu kontrol et.');
  if (choices.length < 4) throw new Error('Dört farklı seçenek üretilemedi.');
  let correctOptionId = '';
  const notes: Record<string, string> = {};
  const options = rng.shuffle(choices.slice(0, 4)).map((c, i) => {
    const id = 'ABCD'[i]; if (same(c.value, answer)) correctOptionId = id; notes[id] = c.note;
    return { id, label: id, fingerprint: fingerprint(c.value), visualData: c.value };
  });
  const version = 8;
  return { id: type + '-v' + version + '-d' + difficulty + '-s' + seed, version, type, category, difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4', prompt, options, correctOptionId,
    explanation: { ruleTitle, summary, steps: [...steps, 'Bu kurala uyan seçenek: ' + correctOptionId + '.'] },
    estimatedSeconds: (board.kind === 'matrix' || board.kind === 'order' ? 45 : 25) + difficulty * 8, skills: [objective], seed, visualConfig: board, status: 'draft',
    authoring: { engine: legacyV3 ? 'verified-3' : ENGINE_VERSION, objective, distractorNotes: notes } };
}


