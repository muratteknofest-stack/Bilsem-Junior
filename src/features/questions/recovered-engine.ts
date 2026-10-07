import type { BaseQuestion, DifficultyLevel, QuestionType, CognitiveCategory } from '../../types';
import { SeededRNG } from '../../lib/rng';
import { RECOVERED_TYPES, solveBoard, type Board, type Tile } from './professional-engine';
import { generateVisualFingerprint as fingerprint } from './fingerprint';

/** Versioned replacement for legacy drafts. Never alters an old published template. */
export function generateRecoveredQuestion(type: QuestionType, seed: number, difficulty: DifficultyLevel): BaseQuestion {
  if (!RECOVERED_TYPES.includes(type) || !Number.isSafeInteger(seed) || seed < 1 || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 6) throw new Error('Soru parametreleri geçersiz.');
  const rng = new SeededRNG(seed), size = difficulty < 4 ? 3 : 4;
  let board: Board, prompt: string, steps: string[], category: CognitiveCategory;
  const tile = (): Tile => ({ size, cells: Array.from({ length: size * size }, () => Number(rng.nextBool())) });
  if (type === 'symmetry_completion') {
    const left = tile();
    left.cells = left.cells.map((v, i) => i % size < Math.ceil(size / 2) ? v : 0);
    // A visible off-axis anchor guarantees that there is something to complete.
    left.cells[0] = 1; left.cells[size] = 0;
    board = { displayMode: 'verified_board', kind: 'symmetry', tiles: [left], columns: 1 };
    prompt = 'Soldaki deseni dikey kesikli çizgiye göre tamamla. Tamamlanmış desen hangisidir?';
    steps = ['Soldaki dolu ve boş hücrelerin yerlerini incele.', 'Her hücrenin eksene eşit uzaklıktaki sağ eşini aynı şekilde doldur; sol tarafı değiştirme.'];
    category = 'spatial';
  } else if (type === 'shape_combination') {
    const a = tile(), b = tile();
    // Include a shared cell, an exclusive cell on each layer and an empty cell.
    a.cells.splice(0, 4, 1, 1, 0, 0); b.cells.splice(0, 4, 1, 0, 1, 0);
    board = { displayMode: 'verified_board', kind: 'overlay', tiles: [a, b, null], columns: 3 };
    prompt = 'İki deseni döndürmeden üst üste koy. En az birinde dolu olan hücre sonuçta doludur. Hangi desen oluşur?';
    steps = ['Aynı konumdaki hücreleri karşılaştır.', 'İkisinde de boşsa boş bırak; birinde veya ikisinde doluysa doldur.'];
    category = 'visual_perception';
  } else if (type === 'number_pyramid') {
    const base = Array.from({ length: difficulty <= 2 ? 3 : difficulty <= 4 ? 4 : 5 }, () => rng.nextInt(1, difficulty <= 2 ? 4 : 9));
    board = { displayMode: 'verified_board', kind: 'pyramid', base };
    prompt = 'Her kutu hemen altındaki iki komşu kutunun toplamıdır. En üstteki kutuya hangi sayı gelir?';
    steps = [];
    let row = [...base];
    while (row.length > 1) { steps.push(row.slice(1).map((v, i) => `${row[i]} + ${v} = ${row[i] + v}`).join('; ') + '.'); row = row.slice(1).map((v, i) => v + row[i]); }
    category = 'numerical';
  } else {
    const gridSize = difficulty <= 3 ? 3 : difficulty <= 4 ? 4 : 5;
    const start: [number, number] = [rng.nextInt(0, gridSize - 1), rng.nextInt(0, gridSize - 1)];
    const moves: NonNullable<Board['moves']> = [];
    let [r, c] = start;
    for (let i = 0; i < difficulty + 2; i++) {
      const allowed = (['up', 'down', 'left', 'right'] as const).filter(m => m === 'up' ? r > 0 : m === 'down' ? r < gridSize - 1 : m === 'left' ? c > 0 : c < gridSize - 1);
      const move = rng.pick(allowed); moves.push(move);
      if (move === 'up') r--; else if (move === 'down') r++; else if (move === 'left') c--; else c++;
    }
    board = { displayMode: 'verified_board', kind: 'path', gridSize, start, moves };
    prompt = 'Başlangıç hücresinden okları soldan sağa izle. Her ok bir hücre ilerletir. Hangi hücreye ulaşırsın?';
    const labels = { up: 'yukarı', down: 'aşağı', left: 'sola', right: 'sağa' };
    steps = [`Başlangıç: ${start[0] + 1}. satır, ${start[1] + 1}. sütun.`, moves.map((m, i) => `${i + 1}. adım: ${labels[m]}`).join('; ') + '.', `Bitiş: ${r + 1}. satır, ${c + 1}. sütun.`];
    category = 'spatial';
  }
  const answer = solveBoard(board), choices = [answer];
  const add = (v: typeof answer) => { if (!choices.some(c => fingerprint(c) === fingerprint(v))) choices.push(v); };
  if ('cells' in answer) {
    // Visible one-cell errors, never metadata-only differences.
    const positions = rng.shuffle(answer.cells.map((_, i) => i).filter(i => board.kind !== 'symmetry' || i % size >= Math.ceil(size / 2)));
    for (const pos of positions) { const cells = [...answer.cells]; cells[pos] = 1 - cells[pos]; add({ size, cells }); if (choices.length === 4) break; }
  } else if (typeof answer.textNumber === 'number') {
    for (const offset of rng.shuffle([-2, -1, 1, 2, 3])) { add({ textNumber: answer.textNumber + offset }); if (choices.length === 4) break; }
  } else {
    for (const pos of rng.shuffle(Array.from({ length: board.gridSize! ** 2 }, (_, i) => i))) {
      add({ textNumber: `${Math.floor(pos / board.gridSize!) + 1}. satır, ${pos % board.gridSize! + 1}. sütun` }); if (choices.length === 4) break;
    }
  }
  if (choices.length !== 4) throw new Error('Dört farklı seçenek üretilemedi.');
  let correctOptionId = '';
  const notes: Record<string, string> = {};
  const options = rng.shuffle(choices).map((value, i) => {
    const id = 'ABCD'[i], correct = fingerprint(value) === fingerprint(answer);
    if (correct) correctOptionId = id;
    notes[id] = correct ? 'Verilen kuralla hesaplanan tek sonuç.' : board.kind === 'pyramid' ? 'Komşu kutuların toplamlarından sapıyor.' : board.kind === 'path' ? 'Okların sırasıyla izlenmesi bu hücrede bitmiyor.' : 'En az bir hücre verilen kurala uymuyor.';
    return { id, label: id, visualData: value, fingerprint: fingerprint(value) };
  });
  return { id: `${type}-v4-d${difficulty}-s${seed}`, version: 4, type, category, seed, difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4', prompt, options, correctOptionId,
    explanation: { ruleTitle: 'Verilen bilgilerden adım adım çözüm', summary: steps.join(' '), steps: [...steps, `Bu kurala uyan seçenek: ${correctOptionId}.`] },
    visualConfig: board, skills: [type], estimatedSeconds: 30 + difficulty * 10, status: 'draft',
    authoring: { engine: 'verified-4', objective: prompt, distractorNotes: notes } };
}
