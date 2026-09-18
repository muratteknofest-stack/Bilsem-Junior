import type { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

export const ENGINE_VERSION = 'verified-2';
export const VERIFIED_TYPES: QuestionType[] = ['matrix_2x2', 'matrix_3x3', 'raven_matrix', 'visual_sequence', 'figure_rotation', 'mirror_reflection', 'number_pattern', 'operation_machine', 'symbol_coding', 'shape_counting', 'logic_grid'];
export type Tile = { cells: number[]; size: number };
type Value = Tile | { textNumber: number | string };
export type Board = {
  displayMode: 'verified_board';
  kind: 'transform' | 'matrix' | 'numbers' | 'machine' | 'symbols' | 'count' | 'order';
  tiles?: (Tile | null)[];
  columns?: number;
  operation?: 'rotate' | 'mirrorX' | 'mirrorY';
  turns?: number;
  sequence?: boolean;
  values?: number[];
  rule?: 'add' | 'growing' | 'alternate';
  examples?: number[][];
  input?: number;
  key?: { symbol: string; value: number }[];
  symbols?: string[];
  items?: string[];
  target?: string;
  names?: string[];
  clues?: [string, string][];
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
function randomTile(rng: SeededRNG, size: number): Tile {
  return { size, cells: Array.from({ length: size * size }, () => Number(rng.nextBool(0.45))) };
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
  if (board.kind === 'transform') {
    if (!board.tiles || ![2, 4].includes(board.tiles.length) || board.tiles.at(-1) !== null || board.tiles.slice(0, -1).some(t => !t)) throw new Error('Dönüşüm görseli eksik.');
    const tiles = board.tiles!.filter((t): t is Tile => t !== null);
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
    if (t.length !== 9 || t.slice(0, 8).some(v => !v)) throw new Error('Matris eksik.');
    const ops = [0, 1, 2].filter(op => same(combine(t[0]!, t[1]!, op), t[2]) && same(combine(t[3]!, t[4]!, op), t[5]));
    if (ops.length !== 1) throw new Error('Matris tek bir ortak kural vermiyor.');
    return combine(t[6]!, t[7]!, ops[0]);
  }
  if (board.kind === 'numbers') {
    const v = board.values!;
    if (!Array.isArray(v) || v.length < 5 || v.length > 8 || v.some(n => !Number.isFinite(n))) throw new Error('Sayı dizisi eksik.');
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
    return { textNumber: board.items.filter(x => x === board.target).length };
  }
  if (board.kind === 'order') {
    const names = board.names!;
    if (!Array.isArray(names) || names.length < 3 || names.length > 6 || names.some(n => typeof n !== 'string') || new Set(names).size !== names.length || !Number.isInteger(board.position) || !board.position || board.position > names.length || !Array.isArray(board.clues) || board.clues.length > 10 || board.clues.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !names.includes(n)))) throw new Error('Sıralama verisi geçersiz.');
    const solutions: string[][] = [];
    const visit = (order: string[]) => {
      if (order.length === names.length) {
        if (board.clues!.every(([a, b]) => order.indexOf(b) === order.indexOf(a) + 1)) solutions.push(order);
      } else for (const name of names) if (!order.includes(name)) visit([...order, name]);
    };
    visit([]);
    if (solutions.length !== 1) throw new Error('Sıralama tek çözümlü değil.');
    return { textNumber: solutions[0][board.position - 1] };
  }
  throw new Error('Bilinmeyen kural.');
}

export function generateProfessionalQuestion(type: QuestionType, seed: number, difficulty: DifficultyLevel): BaseQuestion {
  if (!VERIFIED_TYPES.includes(type) || !Number.isSafeInteger(seed) || seed < 1 || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 6) throw new Error('Soru parametreleri geçersiz.');
  const rng = new SeededRNG(seed);
  const size = difficulty >= 4 ? 4 : 3;
  let board: Board;
  let prompt: string, ruleTitle: string, summary: string, steps: string[], objective: string, category: CognitiveCategory;
  if (['matrix_2x2', 'visual_sequence', 'figure_rotation', 'mirror_reflection'].includes(type)) {
    const turns = rng.pick(difficulty <= 2 ? [1] : [1, 2, 3]);
    const operation = type === 'mirror_reflection' ? rng.pick(['mirrorX', 'mirrorY'] as const) : 'rotate';
    const first = asymmetricTile(rng, size);
    const direction = operation === 'mirrorX' ? 'soldan sağa' : 'yukarıdan aşağıya';
    const transform = (tile: Tile) => transformTile(tile, operation, turns);
    board = { displayMode: 'verified_board', kind: 'transform', operation, turns, columns: type === 'matrix_2x2' ? 2 : 4, tiles: [first, null] };
    if (type === 'matrix_2x2') board.tiles = [first, transform(first), asymmetricTile(rng, size), null];
    if (type === 'visual_sequence') { board.tiles = [first, transform(first), transform(transform(first)), null]; board.sequence = true; }
    prompt = type === 'matrix_2x2' ? 'Üst satırdaki dönüşümü alt satıra uygula. Eksik kare hangisidir?' :
      type === 'visual_sequence' ? 'Her adımda aynı miktarda dönen örüntüyü hangi kare tamamlar?' :
      type === 'figure_rotation' ? 'Şekil saat yönünde ' + turns * 90 + '° döndürülürse hangisi oluşur?' :
      'Şeklin ' + direction + ' ayna görüntüsü hangisidir?';
    category = type === 'matrix_2x2' ? 'matrix' : type === 'visual_sequence' ? 'pattern' : 'spatial';
    ruleTitle = operation === 'rotate' ? 'Konumları koruyarak döndürme' : 'Aynaya göre konum eşleme';
    summary = operation === 'rotate' ? 'Izgaranın tamamı saat yönünde ' + turns * 90 + '° döner; dolu hücre sayısı değişmez.' :
      'Ayna ' + (operation === 'mirrorX' ? 'sağdadır. Her satırdaki hücreler ters sıraya geçer.' : 'alttadır. Satırların sırası tersine döner.');
    steps = ['Ayırt edici bir köşe ve yanındaki dolu hücreleri seç.', summary, 'Seçtiğin hücreleri yeni konumlarında bul; bütün hücreleri kontrol et.'];
    objective = 'Döndürme ile yansımayı ayırt etme; uzamsal konumları takip etme.';
  } else if (type === 'matrix_3x3' || type === 'raven_matrix') {
    const op = difficulty <= 2 ? 0 : rng.nextInt(0, 2);
    let tiles: Tile[] = [];
    for (let attempt = 0; attempt < 100; attempt++) {
      tiles = [];
      for (let row = 0; row < 3; row++) {
        const a = randomTile(rng, size), b = randomTile(rng, size);
        tiles.push(a, b, combine(a, b, op));
      }
      const candidate: Board = { displayMode: 'verified_board', kind: 'matrix', tiles: [...tiles.slice(0, 8), null], columns: 3 };
      try { solveBoard(candidate); break; } catch { 
        if (attempt === 99) {
          tiles = [];
          for (let row = 0; row < 3; row++) {
            const a = { size, cells: Array(size * size).fill(0) };
            const b = { size, cells: Array(size * size).fill(0) };
            a.cells[0] = 1; b.cells[0] = 1;
            a.cells[1] = 1; b.cells[1] = 0;
            a.cells[2] = 0; b.cells[2] = 1;
            a.cells[3] = row === 0 ? 1 : 0;
            b.cells[4] = row === 1 ? 1 : 0;
            a.cells[5] = row === 2 ? 1 : 0;
            tiles.push(a, b, combine(a, b, op));
          }
        }
      }
    }
    board = { displayMode: 'verified_board', kind: 'matrix', tiles: [...tiles.slice(0, 8), null], columns: 3 };
    prompt = 'Her satırda ilk iki kare aynı kuralla birleşiyor. Son karede hangi desen olmalı?';
    ruleTitle = ['Birleşim', 'Ortakları çıkarma', 'Kesişim'][op];
    summary = ['İki kareden en az birinde dolu olan konum, sonuçta doludur.', 'Yalnızca bir karede dolu olan konum sonuçta kalır; iki karede de dolu olan konum boşalır.', 'Yalnızca iki karede de dolu olan konumlar sonuçta kalır.'][op];
    steps = ['İlk satırdaki kareleri hücre hücre karşılaştır.', summary, 'İkinci satırda aynı kuralı doğrula.', 'Son satırdaki iki kareye bu kuralı uygula.'];
    objective = 'İki örnekten ortak görsel kuralı çıkarma ve yeni bir duruma aktarma.';
    category = 'matrix';
  } else if (type === 'number_pattern') {
    const rule = difficulty <= 2 ? 'add' : rng.pick(['growing', 'alternate'] as const);
    const start = rng.nextInt(1, 15), a = rng.nextInt(2, 7), b = rng.nextInt(1, 4);
    const values = [start];
    for (let i = 0; i < 5; i++) values.push(values.at(-1)! + (rule === 'add' ? a : rule === 'growing' ? a + i * b : i % 2 === 0 ? a : a + b));
    board = { displayMode: 'verified_board', kind: 'numbers', values, rule };
    prompt = rule === 'alternate' ? 'Sayı dizisindeki değişim kuralını bularak sıradaki sayıyı belirleyiniz.' :
             (rule as any) === 'multiply' ? 'Sayı dizisindeki çarpım kuralına göre sıradaki sayı kaçtır?' :
             'Sayı dizisindeki kuralı bularak sıradaki sayıyı belirleyiniz.';
    summary = rule === 'add' ? 'Her adımda ' + a + ' eklenir.' : rule === 'growing' ? 'Artış miktarı ' + a + ' ile başlar ve her adımda ' + b + ' büyür.' : 'Artışlar sırayla ' + a + ' ve ' + (a + b) + ' olarak tekrar eder.';
    ruleTitle = 'Artışları karşılaştır'; steps = ['Yan yana iki sayının farkını bul.', summary, 'Son sayıya sıradaki artışı ekle.'];
    category = 'numerical'; objective = 'Sabit, dönüşümlü ve ikinci dereceden artış örüntülerini ayırt etme.';
  } else if (type === 'operation_machine') {
    const m = rng.nextInt(2, difficulty < 3 ? 3 : 7), b = difficulty <= 2 ? 0 : rng.nextInt(1, 12);
    const xs = rng.pickUnique([1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
    board = { displayMode: 'verified_board', kind: 'machine', examples: xs.slice(0, 3).map(x => [x, m * x + b]), input: xs[3] };
    prompt = 'Makine her sayıyı aynı sayıyla çarpıp aynı miktarı ekliyor. Son çıktı kaçtır?';
    ruleTitle = 'Girdi–çıktı ilişkisi'; summary = 'Girdi ' + m + ' ile çarpılır' + (b ? ', sonuca ' + b + ' eklenir.' : '. Eklenen miktar sıfırdır.');
    steps = ['İki örneğin girdi ve çıktı farklarını karşılaştır.', summary, 'Bu işlemi son girdiye uygula ve diğer örneklerle denetle.'];
    category = 'numerical'; objective = 'Örneklerden doğrusal bir işlem kuralı çıkarma.';
  } else if (type === 'symbol_coding' || type === 'shape_counting') {
    const symbols = ['●', '▲', '■', '◆'];
    if (type === 'symbol_coding') {
      board = { displayMode: 'verified_board', kind: 'symbols', key: symbols.map(symbol => ({ symbol, value: rng.nextInt(1, difficulty * 3 + 3) })), symbols: Array.from({ length: 2 + Math.min(3, difficulty) }, () => rng.pick(symbols)) };
      prompt = 'Anahtardaki değerleri kullan. Aşağıdaki sembollerin toplamı kaçtır?';
      ruleTitle = 'Sembolü sayıya çevir'; summary = 'Her sembol anahtarda karşısındaki sayıyı temsil eder. Tekrar eden semboller de toplama katılır.';
      category = 'coding'; objective = 'Sembol–değer eşlemesini kullanma ve çalışma belleği.';
    } else {
      const target = rng.pick(symbols);
      const items = rng.shuffle([target, ...Array.from({ length: 7 + difficulty * 3 }, () => rng.pick(symbols))]);
      board = { displayMode: 'verified_board', kind: 'count', items, target };
      prompt = 'Izgarada toplam kaç tane ' + target + ' var?';
      ruleTitle = 'Sistemli tarama'; summary = 'Yalnızca hedef sembolü say. Her satırı soldan sağa bir kez tara.';
      category = 'attention'; objective = 'Benzer uyaranlar arasından hedefi seçme ve sistemli tarama.';
    }
    steps = ['Hedef sembolü ve verilen bilgileri dikkatle incele.', summary, 'Bulduğun sonucu ikinci kez kontrol et.'];
  } else {
    const names = rng.pickUnique(['Ada', 'Ece', 'Can', 'Efe', 'Duru', 'Mert', 'Oya', 'Deniz'], difficulty < 4 ? 4 : 5);
    const order = rng.shuffle(names), position = rng.nextInt(1, names.length);
    board = { displayMode: 'verified_board', kind: 'order', names, clues: rng.shuffle(order.slice(1).map((n, i) => [order[i], n] as [string, string])), position };
    prompt = 'İpuçlarına göre soldan ' + position + '. sırada kim vardır?';
    ruleTitle = 'Komşuluk ipuçlarını birleştir'; summary = 'Soldan sağa sıra: ' + order.join(' → ') + '.';
    steps = ['Her ipucundaki iki kişiyi yan yana düşün.', 'Ortak isimleri kullanarak parçaları tek sırada birleştir.', summary];
    category = 'logic'; objective = 'Birden çok sıralama kısıtından tek çözüm üretme.';
  }
  const answer = solveBoard(board);
  const choices: { value: Value; note: string }[] = [{ value: answer, note: 'Gösterilen bütün verilerle uyumludur.' }];
  const add = (value: Value, note: string) => { if (!choices.some(c => same(c.value, value))) choices.push({ value, note }); };
  if ('cells' in answer) {
    if (board.kind === 'matrix') for (const op of [0, 1, 2]) add(combine(board.tiles![6]!, board.tiles![7]!, op), 'Birleştirme kuralı yerine başka bir hücre işlemi uygulanmış.');
    const source = board.tiles!.filter((t): t is Tile => t !== null).at(-1)!;
    add(source, 'Şekil değişmeden bırakılmış.');
    for (const turn of [1, 2, 3]) add(transformTile(source, 'rotate', turn), 'Dönüş açısı veya dönüş yönü hedef kuralla uyuşmuyor.');
    add(transformTile(source, 'mirrorX'), 'Döndürme ile ayna yansıması karıştırılmış.');
    for (let i = 0; choices.length < 4 && i < answer.cells.length; i++) {
      const cells = [...answer.cells]; cells[i] = 1 - cells[i]; add({ size: answer.size, cells }, 'Bir hücrenin dolu–boş durumu yanlış aktarılmış.');
    }
  } else if (typeof answer.textNumber === 'number') {
    for (const offset of rng.shuffle([-1, 1, 2, -2, 3])) if (answer.textNumber + offset >= 0) add({ textNumber: answer.textNumber + offset }, 'Sayma, işlem veya artış takibinde hata var; tüm verileri tekrar kontrol et.');
  } else for (const name of board.names!) add({ textNumber: name }, 'Bu kişi istenen sırada değildir; komşuluk ipuçlarıyla çelişir.');
  if (choices.length < 4) throw new Error('Dört farklı seçenek üretilemedi.');
  let correctOptionId = '';
  const notes: Record<string, string> = {};
  const options = rng.shuffle(choices.slice(0, 4)).map((c, i) => {
    const id = 'ABCD'[i]; if (same(c.value, answer)) correctOptionId = id; notes[id] = c.note;
    return { id, label: id, fingerprint: fingerprint(c.value), visualData: c.value };
  });
  return { id: type + '-v2-d' + difficulty + '-s' + seed, version: 2, type, category, difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4', prompt, options, correctOptionId,
    explanation: { ruleTitle, summary, steps: [...steps, 'Bu kurala uyan seçenek: ' + correctOptionId + '.'] },
    estimatedSeconds: 30 + difficulty * 7, skills: [objective], seed, visualConfig: board, status: 'draft',
    authoring: { engine: ENGINE_VERSION, objective, distractorNotes: notes } };
}
