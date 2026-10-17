import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

export function generateMatrix2x2Question(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const ruleType = rng.nextInt(1, 3); // 1: rotation, 2: marker addition/position, 3: color shift

  const color1 = rng.pick(COLORS_POOL);
  const color2 = rng.pick(COLORS_POOL.filter((c) => c !== color1));

  let cell00: ShapeItem; // Top-Left
  let cell01: ShapeItem; // Top-Right
  let cell10: ShapeItem; // Bottom-Left
  let cell11: ShapeItem; // Bottom-Right (Correct)

  let distractor1: ShapeItem;
  let distractor2: ShapeItem;
  let distractor3: ShapeItem;

  let ruleTitle = '';
  let ruleDesc = '';

  if (ruleType === 1) {
    // Rotation rule: Top-Left rotates 90° -> Top-Right. Bottom-Left rotates 90° -> Bottom-Right.
    const shapeTop = rng.pick(ASYMMETRIC_SHAPES);
    const shapeBot = rng.pick(ASYMMETRIC_SHAPES.filter((s) => s !== shapeTop));

    ruleTitle = 'Satır Boyunca 90° Saat Yönü Dönüşü';
    ruleDesc = 'Her satırda soldaki şekil sağa geçerken saat yönünde 90° dönmektedir.';

    cell00 = { kind: shapeTop, fill: color1, rotation: 0, marker: 'none' };
    cell01 = { kind: shapeTop, fill: color1, rotation: 90, marker: 'none' };
    cell10 = { kind: shapeBot, fill: color2, rotation: 0, marker: 'none' };
    cell11 = { kind: shapeBot, fill: color2, rotation: 90, marker: 'none' };

    distractor1 = { kind: shapeBot, fill: color2, rotation: 180, marker: 'none' }; // 180° rotated
    distractor2 = { kind: shapeBot, fill: color2, rotation: 270, marker: 'none' }; // 270° rotated
    distractor3 = { kind: shapeTop, fill: color2, rotation: 90, marker: 'none' };  // wrong base shape
  } else if (ruleType === 2) {
    // Marker rule: Left cell has no marker -> Right cell gets a white dot
    const shapeTop = rng.pick(SHAPES_POOL);
    const shapeBot = rng.pick(SHAPES_POOL.filter((s) => s !== shapeTop));

    ruleTitle = 'İç İşaretleyici Belirme Kuralı';
    ruleDesc = 'Soldaki boş şeklin içine sağ hücrede beyaz bir merkez belirteci eklenmektedir.';

    cell00 = { kind: shapeTop, fill: color1, rotation: 0, marker: 'none' };
    cell01 = { kind: shapeTop, fill: color1, rotation: 0, marker: 'dot', markerPos: 'center', markerColor: PALETTE.white };
    cell10 = { kind: shapeBot, fill: color2, rotation: 0, marker: 'none' };
    cell11 = { kind: shapeBot, fill: color2, rotation: 0, marker: 'dot', markerPos: 'center', markerColor: PALETTE.white };

    distractor1 = { kind: shapeBot, fill: color2, rotation: 0, marker: 'none' }; // unchanged
    distractor2 = { kind: shapeBot, fill: color2, rotation: 0, marker: 'plus', markerPos: 'center', markerColor: PALETTE.white }; // wrong marker
    distractor3 = { kind: shapeTop, fill: color2, rotation: 0, marker: 'dot', markerPos: 'center', markerColor: PALETTE.white }; // wrong shape
  } else {
    // Color shift rule: Top row shares shape, color changes from color1 to color2
    const shapeTop = rng.pick(SHAPES_POOL);
    const shapeBot = rng.pick(SHAPES_POOL.filter((s) => s !== shapeTop));

    ruleTitle = 'Renk Dönüşümü Kuralı';
    ruleDesc = 'Birinci satırdaki renk değişimi kuralı ikinci satırda da aynen uygulanır.';

    cell00 = { kind: shapeTop, fill: color1, rotation: 0, marker: 'none' };
    cell01 = { kind: shapeTop, fill: color2, rotation: 0, marker: 'none' };
    cell10 = { kind: shapeBot, fill: color1, rotation: 0, marker: 'none' };
    cell11 = { kind: shapeBot, fill: color2, rotation: 0, marker: 'none' };

    distractor1 = { kind: shapeBot, fill: color1, rotation: 0, marker: 'none' }; // did not change color
    distractor2 = { kind: shapeTop, fill: color2, rotation: 0, marker: 'none' }; // top shape with new color
    distractor3 = { kind: shapeBot, fill: PALETTE.dark, rotation: 0, marker: 'none' }; // unrelated color
  }

  const allChoices: { item: ShapeItem; isCorrect: boolean }[] = [
    { item: cell11, isCorrect: true },
    { item: distractor1, isCorrect: false },
    { item: distractor2, isCorrect: false },
    { item: distractor3, isCorrect: false },
  ];

  // Guarantee unique fingerprints
  const uniqueChoices: { item: ShapeItem; isCorrect: boolean }[] = [];
  const seenFps = new Set<string>();

  for (const c of allChoices) {
    let fp = generateVisualFingerprint(c.item);
    if (seenFps.has(fp) && !c.isCorrect) {
      c.item.rotation = (c.item.rotation || 0) + 45;
      fp = generateVisualFingerprint(c.item);
    }
    seenFps.add(fp);
    uniqueChoices.push(c);
  }

  const shuffledChoices = rng.shuffle(uniqueChoices);
  const optionLetters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffledChoices.map((choice, idx) => {
    const id = optionLetters[idx];
    if (choice.isCorrect) correctOptionId = id;
    return {
      id,
      label: id,
      fingerprint: generateVisualFingerprint(choice.item),
      visualData: choice.item,
    };
  });

  return {
    id: `mat2-${seed}-${difficulty}`,
    version: 1,
    type: 'matrix_2x2',
    category: 'matrix',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Matristeki satır ve sütun ilişkisine göre soru işareti (?) yerine hangi şekil gelmelidir?',
    secondaryPrompt: 'Üst satırdaki değişimi alt satıra uygulayarak cevabı bul.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle,
      summary: ruleDesc,
      steps: [
        'İlk satırdaki iki şekil arasındaki değişimi incele.',
        ruleDesc,
        `İkinci satırdaki şekle bu kural uygulandığında sonuç ${correctOptionId} seçeneği olur.`,
      ],
      visualHint: {
        type: 'matrix_cell',
        details: ruleDesc,
      },
    },
    estimatedSeconds: 25 + difficulty * 5,
    skills: ['Matris Muhakemesi', 'İlişki Kurma', 'Kural Transferi'],
    seed,
    visualConfig: {
      displayMode: 'matrix_2x2',
      grid: [
        [cell00, cell01],
        [cell10, null], // null represents the missing '?' cell
      ],
    },
  };
}
