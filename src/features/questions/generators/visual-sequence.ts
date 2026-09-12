import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

export function generateVisualSequenceQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const ruleType = rng.nextInt(1, 3); // 1: Rotation sequence, 2: Marker cycle, 3: Alternating shape/color

  const sequenceLength = difficulty <= 2 ? 3 : 4;
  const sequenceItems: ShapeItem[] = [];
  let nextItem: ShapeItem;
  let distractorItems: ShapeItem[] = [];

  let ruleTitle = '';
  let ruleDesc = '';

  const color1 = rng.pick(COLORS_POOL);
  const color2 = rng.pick(COLORS_POOL.filter((c) => c !== color1));

  if (ruleType === 1) {
    // Rotation sequence
    const shape = rng.pick(ASYMMETRIC_SHAPES);
    const step = difficulty >= 4 ? 45 : 90;
    const startAngle = rng.nextInt(0, 3) * 90;

    ruleTitle = `${step}° Saat Yönünde Dönme Kuralı`;
    ruleDesc = `Her adımda şekil saat yönünde ${step}° dönmektedir.`;

    for (let i = 0; i < sequenceLength; i++) {
      sequenceItems.push({
        kind: shape,
        fill: color1,
        rotation: (startAngle + i * step) % 360,
        marker: 'none',
      });
    }

    const nextAngle = (startAngle + sequenceLength * step) % 360;
    nextItem = {
      kind: shape,
      fill: color1,
      rotation: nextAngle,
      marker: 'none',
    };

    // Distractors
    distractorItems = [
      { kind: shape, fill: color1, rotation: (nextAngle + 180) % 360, marker: 'none' }, // 180 opposite
      { kind: shape, fill: color1, rotation: (nextAngle - step + 360) % 360, marker: 'none' }, // repeated previous
      { kind: shape, fill: color2, rotation: nextAngle, marker: 'none' }, // correct rotation but wrong color
    ];
  } else if (ruleType === 2) {
    // Marker cycle: top -> right -> bottom -> left
    const shape = rng.pick(SHAPES_POOL.filter((s) => s !== 'arrow'));
    const positions: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
    const startIdx = rng.nextInt(0, 3);

    ruleTitle = 'İşaretleyici Saat Yönü Hareketi';
    ruleDesc = 'İçteki beyaz nokta saat yönünde bir sonraki kenara geçmektedir.';

    for (let i = 0; i < sequenceLength; i++) {
      sequenceItems.push({
        kind: shape,
        fill: color1,
        rotation: 0,
        marker: 'dot',
        markerPos: positions[(startIdx + i) % 4],
        markerColor: PALETTE.white,
      });
    }

    const nextPos = positions[(startIdx + sequenceLength) % 4];
    nextItem = {
      kind: shape,
      fill: color1,
      rotation: 0,
      marker: 'dot',
      markerPos: nextPos,
      markerColor: PALETTE.white,
    };

    // Distractors
    const wrongPos1 = positions[(startIdx + sequenceLength + 2) % 4];
    const wrongPos2 = positions[(startIdx + sequenceLength + 1) % 4];
    distractorItems = [
      { kind: shape, fill: color1, rotation: 0, marker: 'dot', markerPos: wrongPos1, markerColor: PALETTE.white },
      { kind: shape, fill: color1, rotation: 0, marker: 'dot', markerPos: wrongPos2, markerColor: PALETTE.white },
      { kind: shape, fill: color2, rotation: 0, marker: 'dot', markerPos: nextPos, markerColor: PALETTE.white },
    ];
  } else {
    // Alternating shapes / colors
    const shape1 = rng.pick(SHAPES_POOL);
    const shape2 = rng.pick(SHAPES_POOL.filter((s) => s !== shape1));

    ruleTitle = 'Ardışık Şekil ve Renk Değişimi';
    ruleDesc = 'Şekiller ve renkler sırayla değişerek bir örüntü oluşturmaktadır.';

    for (let i = 0; i < sequenceLength; i++) {
      const isEven = i % 2 === 0;
      sequenceItems.push({
        kind: isEven ? shape1 : shape2,
        fill: isEven ? color1 : color2,
        rotation: 0,
        marker: 'none',
      });
    }

    const nextIsEven = sequenceLength % 2 === 0;
    nextItem = {
      kind: nextIsEven ? shape1 : shape2,
      fill: nextIsEven ? color1 : color2,
      rotation: 0,
      marker: 'none',
    };

    distractorItems = [
      { kind: nextIsEven ? shape2 : shape1, fill: nextIsEven ? color2 : color1, rotation: 0, marker: 'none' },
      { kind: nextIsEven ? shape1 : shape2, fill: nextIsEven ? color2 : color1, rotation: 0, marker: 'none' },
      { kind: nextIsEven ? shape2 : shape1, fill: nextIsEven ? color1 : color2, rotation: 0, marker: 'none' },
    ];
  }

  // Combine correct item and distractors, shuffle deterministically
  const allChoices: { item: ShapeItem; isCorrect: boolean }[] = [
    { item: nextItem, isCorrect: true },
    ...distractorItems.map((item) => ({ item, isCorrect: false })),
  ];

  const shuffledChoices = rng.shuffle(allChoices);
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
    id: `seq-${seed}-${difficulty}`,
    version: 1,
    type: 'visual_sequence',
    category: 'pattern',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Örüntü kuralına göre soru işareti (?) yerine hangi şekil gelmelidir?',
    secondaryPrompt: 'Adımlar arasındaki değişimi ve sıralamayı takip et.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle,
      summary: ruleDesc,
      steps: [
        'Dizideki şekillerin sırasıyla yön, renk ve konum değişimlerini incele.',
        ruleDesc,
        `Bu kurala göre soru işareti yerine ${correctOptionId} seçeneği gelmelidir.`,
      ],
      visualHint: {
        type: 'arrow',
        details: ruleDesc,
      },
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Örüntü Takibi', 'Döngü Algılama', 'Sıralı Mantık'],
    seed,
    visualConfig: {
      displayMode: 'sequence',
      sequenceItems,
      missingIndex: sequenceLength,
    },
  };
}
