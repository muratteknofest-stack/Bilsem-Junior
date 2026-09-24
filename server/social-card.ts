import type { BaseQuestion } from '../src/types';
import type { Board, Tile } from '../src/features/questions/professional-engine';

const safe = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

function lines(value: string, limit: number, max: number): string[] {
  const words = value.trim().split(/\s+/);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    if (word.length > limit || result.length >= max) throw new Error('Kart metni güvenli alana sığmıyor.');
    if (`${line} ${word}`.trim().length > limit) { result.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) result.push(line);
  if (result.length > max) throw new Error('Kart metni güvenli alana sığmıyor.');
  return result;
}

function textBlock(value: string, x: number, y: number, size: number, width: number, max: number, color = '#17233b') {
  return lines(value, width, max).map((line, index) => `<text x="${x}" y="${y + index * size * 1.35}" font-size="${size}" fill="${color}">${safe(line)}</text>`).join('');
}

function tile(value: Tile | null, x: number, y: number, box: number) {
  const frame = `<rect x="${x}" y="${y}" width="${box}" height="${box}" rx="18" fill="#fff" stroke="#cad5e5" stroke-width="3"/>`;
  if (!value) return frame + `<text x="${x + box / 2}" y="${y + box * .68}" font-size="84" fill="#485d9b" text-anchor="middle">?</text>`;
  const margin = 22, cell = (box - 2 * margin) / value.size;
  return frame + value.cells.map((filled, idx) => `<rect x="${x + margin + idx % value.size * cell + 3}" y="${y + margin + Math.floor(idx / value.size) * cell + 3}" width="${cell - 6}" height="${cell - 6}" rx="5" fill="${filled ? '#334eaf' : '#eaf0f7'}"/>`).join('');
}

function boardGraphic(board: Board): string {
  if (board.tiles) {
    const columns = board.columns === 2 ? 2 : board.tiles.length === 9 ? 3 : Math.min(4, board.tiles.length);
    const box = columns === 3 ? 142 : 176, gap = 17;
    const width = columns * box + (columns - 1) * gap;
    return board.tiles.map((t, i) => tile(t, (1080 - width) / 2 + i % columns * (box + gap), 370 + Math.floor(i / columns) * (box + gap), box)).join('');
  }
  if (board.kind === 'numbers' && board.values) {
    return board.values.map((n, i) => `<rect x="${105 + i * (860 / (board.values!.length + 1))}" y="465" width="96" height="120" rx="20" fill="#e8edfa"/><text x="${153 + i * (860 / (board.values!.length + 1))}" y="548" font-size="46" text-anchor="middle" fill="#273c90">${safe(n)}</text>`).join('') + `<text x="925" y="548" font-size="54" fill="#273c90">?</text>`;
  }
  throw new Error('Bu soru tipinin sosyal kart çizimi henüz desteklenmiyor.');
}

export function supportsSocialCard(question: BaseQuestion): boolean {
  const board = question.visualConfig as Board | null;
  return board?.displayMode === 'verified_board' &&
    ((Array.isArray(board.tiles) && [2, 4, 9].includes(board.tiles.length)) ||
      (board.kind === 'numbers' && Array.isArray(board.values) && board.values.length <= 7));
}

export function renderSocialCard(question: BaseQuestion, kind: 'question' | 'answer'): string {
  if (!supportsSocialCard(question)) throw new Error('Görsel soru kartı desteklenmiyor.');
  const board = question.visualConfig as Board;
  const opts = question.options;
  const optionTiles = opts.every(o => o.visualData && 'cells' in o.visualData && 'size' in o.visualData);
  const optionNumbers = opts.every(o => o.visualData && 'textNumber' in o.visualData);
  if (!optionTiles && !optionNumbers) throw new Error('Seçenek görselleri desteklenmiyor.');
  const cards = opts.map((option, idx) => {
    const x = 78 + idx % 2 * 472, y = 850 + Math.floor(idx / 2) * 190;
    const isCorrect = kind === 'answer' && option.id === question.correctOptionId;
    const visual = optionTiles ? tile(option.visualData as Tile, x + 145, y + 12, 140) :
      `<text x="${x + 205}" y="${y + 108}" font-size="65" text-anchor="middle" fill="#253b84">${safe((option.visualData as { textNumber: number | string }).textNumber)}</text>`;
    return `<rect x="${x}" y="${y}" width="454" height="164" rx="24" fill="${isCorrect ? '#d7f5e5' : '#f1f4fa'}" stroke="${isCorrect ? '#1a9761' : '#d6deeb'}" stroke-width="4"/>
      <text x="${x + 65}" y="${y + 105}" font-size="50" font-weight="700" fill="#263c86">${safe(option.label || option.id)}</text>${visual}`;
  }).join('');
  const header = kind === 'answer' ? 'Çözüm zamanı' : 'Günün görsel sorusu';
  const footer = kind === 'answer' ? textBlock(question.explanation.summary, 82, 1240, 27, 65, 2) :
    `<text x="82" y="1240" font-size="30" fill="#425c86">Cevabını düşün, sonra çözüm kartına geç.</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <rect width="1080" height="1350" fill="#f8fafc"/><rect x="0" y="0" width="1080" height="18" fill="#344eae"/>
    <g font-family="DejaVu Sans, sans-serif"><text x="82" y="99" font-size="42" font-weight="700" fill="#273c90">ZEKA PARK</text>
    <text x="82" y="158" font-size="30" fill="#586d8b">${header}</text>
    ${textBlock(question.prompt, 82, 229, 37, 44, 3)}
    ${boardGraphic(board)}${cards}${footer}
    <text x="82" y="1315" font-size="20" fill="#64748b">Bağımsız bir hazırlık etkinliğidir • MEB ile bağlantılı değildir.</text></g></svg>`;
}
