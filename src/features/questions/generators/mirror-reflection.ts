import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

export function generateMirrorReflectionQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const shape = rng.pick(ASYMMETRIC_SHAPES);
  const color = rng.pick(COLORS_POOL);
  const mirrorAxis: 'dikey' | 'yatay' = difficulty >= 3 && rng.nextBool() ? 'yatay' : 'dikey';

  const baseItem: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: rng.nextInt(0, 3) * 90,
    marker: 'dot',
    markerPos: 'right',
    markerColor: PALETTE.white,
  };

  // Mirrored transformation
  // In 2D SVG: horizontal mirror (reflection across vertical line) flips X coordinates.
  // In terms of rotation/marker:
  const correctItem: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: mirrorAxis === 'dikey' ? (360 - (baseItem.rotation || 0)) % 360 : (180 - (baseItem.rotation || 0) + 360) % 360,
    marker: 'dot',
    markerPos: mirrorAxis === 'dikey' ? 'left' : 'right',
    markerColor: PALETTE.white,
  };

  // Distractors
  const distractor1: ShapeItem = {
    // Exact same (not mirrored)
    ...baseItem,
  };

  const distractor2: ShapeItem = {
    // 180 rotated instead of mirrored
    kind: shape,
    fill: color,
    rotation: ((baseItem.rotation || 0) + 180) % 360,
    marker: 'dot',
    markerPos: 'left',
    markerColor: PALETTE.white,
  };

  const distractor3: ShapeItem = {
    // Mirrored on the WRONG axis
    kind: shape,
    fill: color,
    rotation: mirrorAxis === 'dikey' ? (180 - (baseItem.rotation || 0) + 360) % 360 : (360 - (baseItem.rotation || 0)) % 360,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  const allChoices: { item: ShapeItem; isCorrect: boolean }[] = [
    { item: correctItem, isCorrect: true },
    { item: distractor1, isCorrect: false },
    { item: distractor2, isCorrect: false },
    { item: distractor3, isCorrect: false },
  ];

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
    id: `mir-${seed}-${difficulty}`,
    version: 1,
    type: 'mirror_reflection',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: `Şeklin ${mirrorAxis} ayna çizgisine göre yansıması (simetrisi) aşağıdakilerden hangisidir?`,
    secondaryPrompt: 'Aynaya yakın olan kısımların yansımada da aynaya yakın kalacağını unutma.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: `${mirrorAxis.toUpperCase()} Ayna Yansıması Kuralı`,
      summary: `Ayna simetrisinde şeklin sağ ve sol tarafları yer değiştirir. Doğru yansıma ${correctOptionId} seçeneğidir.`,
      steps: [
        `Ayna çizgisini (${mirrorAxis}) referans al.`,
        'Şeklin uç noktaları ve belirteç aynaya olan mesafesini koruyarak simetrik eksene yansır.',
        `Bu yansımaya tam uyan seçenek ${correctOptionId} dir.`,
      ],
      visualHint: {
        type: 'diff',
        details: `${mirrorAxis} simetri ekseni`,
      },
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Ayna Simetrisi', 'Ters Çevirme', 'Uzamsal Algı'],
    seed,
    visualConfig: {
      displayMode: 'mirror_target',
      baseItem,
      mirrorAxis,
    },
  };
}
