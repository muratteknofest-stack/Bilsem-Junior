import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

export function generateFigureRotationQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const shape = rng.pick(ASYMMETRIC_SHAPES);
  const color = rng.pick(COLORS_POOL);
  const baseRotation = rng.nextInt(0, 3) * 90;

  // Degrees to rotate
  const rotationAngles = difficulty <= 2 ? [90, 180] : difficulty <= 4 ? [90, 180, 270] : [45, 90, 135, 180, 270];
  const targetRotation = rng.pick(rotationAngles);
  const direction: 'saat yönünde' | 'saat yönünün tersine' = difficulty >= 4 && rng.nextBool() ? 'saat yönünün tersine' : 'saat yönünde';

  const rotationDelta = direction === 'saat yönünde' ? targetRotation : 360 - targetRotation;
  const correctAngle = (baseRotation + rotationDelta) % 360;

  const targetItem: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: baseRotation,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  const correctItem: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: correctAngle,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  // Realistic cognitive distractors
  const distractor1: ShapeItem = {
    // Opposite direction
    kind: shape,
    fill: color,
    rotation: (baseRotation - rotationDelta + 720) % 360,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  const distractor2: ShapeItem = {
    // 90 degrees off
    kind: shape,
    fill: color,
    rotation: (correctAngle + 90) % 360,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  const distractor3: ShapeItem = {
    // Marker swapped or 180 off
    kind: shape,
    fill: color,
    rotation: (correctAngle + 180) % 360,
    marker: 'dot',
    markerPos: 'bottom',
    markerColor: PALETTE.white,
  };

  const allChoices: { item: ShapeItem; isCorrect: boolean }[] = [
    { item: correctItem, isCorrect: true },
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
      c.item.rotation = (c.item.rotation! + 45) % 360;
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
    id: `rot-${seed}-${difficulty}`,
    version: 1,
    type: 'figure_rotation',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: `Yukarıdaki şekil ${direction} ${targetRotation}° döndürüldüğünde hangisi elde edilir?`,
    secondaryPrompt: 'Şeklin ucunu ve üzerindeki beyaz noktayı referans alarak zihninde döndür.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Uzamsal Zihinsel Döndürme',
      summary: `Şekil ${direction} ${targetRotation}° döndürüldüğünde doğru konum ${correctOptionId} seçeneği olmaktadır.`,
      steps: [
        'Şeklin başlangıç yönünü ve üzerindeki belirteci referans noktası olarak seç.',
        `${direction.toUpperCase()} ${targetRotation}° döndürüldüğünde referans noktasının geleceği konumu hesapla.`,
        `Bu pozisyon doğrudan ${correctOptionId} seçeneğiyle eşleşmektedir.`,
      ],
      visualHint: {
        type: 'rotation',
        details: `${targetRotation}° ${direction}`,
      },
    },
    estimatedSeconds: 25 + difficulty * 5,
    skills: ['Zihinsel Döndürme', 'Uzamsal Algı', 'Referans Noktası Takibi'],
    seed,
    visualConfig: {
      displayMode: 'single_target',
      targetItem,
      rotationAngle: targetRotation,
      direction,
    },
  };
}
