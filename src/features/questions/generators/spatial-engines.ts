import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, ASYMMETRIC_SHAPES, COLORS_POOL } from './generator-utils';

// 06 Symmetry Completion (Simetri Tamamlama)
export function generateSymmetryCompletionQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const shape = rng.pick(['star', 'diamond', 'triangle', 'pentagon', 'hexagon', 'clover'] as const);
  const color = rng.pick(COLORS_POOL);

  const correctPiece: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: 0,
    marker: 'dot',
    markerPos: 'right',
    markerColor: PALETTE.white,
  };

  const distractor1: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: 180,
    marker: 'dot',
    markerPos: 'left',
    markerColor: PALETTE.white,
  };

  const distractor2: ShapeItem = {
    kind: shape,
    fill: PALETTE.rose,
    rotation: 0,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  const distractor3: ShapeItem = {
    kind: 'square',
    fill: color,
    rotation: 0,
    marker: 'none',
  };

  const choices = [
    { item: correctPiece, isCorrect: true },
    { item: distractor1, isCorrect: false },
    { item: distractor2, isCorrect: false },
    { item: distractor3, isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: generateVisualFingerprint(c.item),
      visualData: c.item,
    };
  });

  return {
    id: `sym-${seed}-${difficulty}`,
    version: 1,
    type: 'symmetry_completion',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Kesikli çizginin solundaki şekli tam bir simetriye tamamlamak için sağ tarafa hangisi gelmelidir?',
    secondaryPrompt: 'Sol parçanın tam ayna görüntüsünü aramalısın.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Dikey Simetri Tamamlama',
      summary: `Sol parçayı tam bir bütüne tamamlayan simetrik sağ parça ${correctOptionId} seçeneğidir.`,
      steps: [
        'Sol yarıdaki geometrik çıkıntıları ve detayları incele.',
        'Kesikli çizgiye göre sağa doğru aynalanmış parçayı bul.',
        `Doğru simetrik parça ${correctOptionId} dir.`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Simetri Algısı', 'Parça Tamamlama', 'Uzamsal Muhakeme'],
    seed,
    visualConfig: {
      displayMode: 'symmetry_half',
      halfShape: shape,
      color,
    },
  };
}

// 07 Figure Completion (Parça-Bütün)
export function generateFigureCompletionQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const mainShape = rng.pick(['square', 'circle', 'hexagon', 'diamond'] as const);
  const color = rng.pick(COLORS_POOL);
  const missingCorner: ('top_right' | 'bottom_right' | 'top_left' | 'bottom_left') = rng.pick([
    'top_right',
    'bottom_right',
    'top_left',
    'bottom_left',
  ]);

  const correctPiece: ShapeItem = {
    kind: 'triangle',
    fill: color,
    rotation: missingCorner === 'top_right' ? 90 : missingCorner === 'bottom_right' ? 180 : 0,
    marker: 'dot',
    markerPos: 'center',
    markerColor: PALETTE.white,
  };

  const distractor1: ShapeItem = {
    kind: 'triangle',
    fill: color,
    rotation: (correctPiece.rotation! + 90) % 360,
    marker: 'dot',
    markerPos: 'center',
    markerColor: PALETTE.white,
  };

  const distractor2: ShapeItem = {
    kind: 'square',
    fill: color,
    rotation: 0,
    marker: 'none',
  };

  const distractor3: ShapeItem = {
    kind: 'triangle',
    fill: PALETTE.amber,
    rotation: correctPiece.rotation,
    marker: 'plus',
    markerPos: 'center',
    markerColor: PALETTE.white,
  };

  const choices = [
    { item: correctPiece, isCorrect: true },
    { item: distractor1, isCorrect: false },
    { item: distractor2, isCorrect: false },
    { item: distractor3, isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: generateVisualFingerprint(c.item),
      visualData: c.item,
    };
  });

  return {
    id: `fc-${seed}-${difficulty}`,
    version: 1,
    type: 'figure_completion',
    category: 'visual_perception',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Büyük şekildeki eksik parçanın (boşluğun) yerine tam oturacak parça hangisidir?',
    secondaryPrompt: 'Köşe açısına ve şeklin yönüne dikkat et.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Eksik Parçayı Bulma',
      summary: `Boşluğun geometrik açısına ve yönüne tam olarak uyan parça ${correctOptionId} seçeneğidir.`,
      steps: [
        'Büyük şekildeki kesik alanın sınırlarını ve yönünü incele.',
        'Seçeneklerdeki parçayı zihninde döndürerek boşluğa yerleştir.',
        `Tam oturan parça ${correctOptionId} dir.`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Bütün-Parça İlişkisi', 'Şekil Eşleştirme', 'Geometrik Uyumluluk'],
    seed,
    visualConfig: {
      displayMode: 'missing_corner',
      mainShape,
      color,
      missingCorner,
    },
  };
}

// 08 Spatial Relationship / Top View (Uzamsal İlişki / Üstten Bakış)
export function generateSpatialRelationshipQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const colors = rng.pickUnique(COLORS_POOL, 3);

  // Concentric layered shapes seen from 3D stack -> 2D top view
  // Bottom layer: large circle/square, middle: diamond/star, top: small circle with dot
  const stack = [
    { kind: 'square' as const, fill: colors[0], size: 80 },
    { kind: 'circle' as const, fill: colors[1], size: 50 },
    { kind: 'star' as const, fill: colors[2], size: 28 },
  ];

  const correctView = { stack };
  const distractor1 = {
    stack: [
      { kind: 'circle' as const, fill: colors[1], size: 80 },
      { kind: 'square' as const, fill: colors[0], size: 50 },
      { kind: 'star' as const, fill: colors[2], size: 28 },
    ],
  };
  const distractor2 = {
    stack: [
      { kind: 'square' as const, fill: colors[0], size: 80 },
      { kind: 'star' as const, fill: colors[2], size: 50 },
      { kind: 'circle' as const, fill: colors[1], size: 28 },
    ],
  };
  const distractor3 = {
    stack: [
      { kind: 'square' as const, fill: colors[2], size: 80 },
      { kind: 'circle' as const, fill: colors[0], size: 50 },
      { kind: 'star' as const, fill: colors[1], size: 28 },
    ],
  };

  const choices = [
    { item: correctView, isCorrect: true },
    { item: distractor1, isCorrect: false },
    { item: distractor2, isCorrect: false },
    { item: distractor3, isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: generateVisualFingerprint(c.item),
      visualData: c.item,
    };
  });

  return {
    id: `sr-${seed}-${difficulty}`,
    version: 1,
    type: 'spatial_relationship',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Üst üste dizilmiş bu şekillere tam ÜSTTEN bakıldığında hangi görüntü oluşur?',
    secondaryPrompt: 'En alttaki şeklin en dışta, en üstteki şeklin en içte görüneceğini hatırla.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: '3 Boyutlu Katman ve Üstten Bakış',
      summary: `En alttaki büyük şekil en dış çerçeveyi, en tepedeki şekil ise merkezdeki en iç katmanı oluşturur. Doğru üstten görünüm ${correctOptionId} dir.`,
      steps: [
        'Katmanların alttan üste sıralamasını belirle.',
        'Üstten bakışta en büyük alt katman dış sınır, tepe katman merkezde görünür.',
        `Renk ve şekil sırasını doğru yansıtan seçenek ${correctOptionId} seçeneğidir.`,
      ],
    },
    estimatedSeconds: 25 + difficulty * 5,
    skills: ['Uzamsal Bakış Açısı', 'Katman Algısı', 'Zihinsel Modelleme'],
    seed,
    visualConfig: {
      displayMode: '3d_stack',
      stack,
    },
  };
}

// 09 Visual Analogy (Görsel Analoji A : B :: C : ?)
export function generateVisualAnalogyQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const ruleType = rng.nextInt(1, 3); // 1: Inversion/Rotation, 2: Fill color swap, 3: Inner shape extraction

  const colorA = rng.pick(COLORS_POOL);
  const colorB = rng.pick(COLORS_POOL.filter((c) => c !== colorA));

  let shapeA: ShapeItem;
  let shapeB: ShapeItem;
  let shapeC: ShapeItem;
  let shapeD: ShapeItem; // Correct
  let d1: ShapeItem;
  let d2: ShapeItem;
  let d3: ShapeItem;

  let ruleDesc = '';

  if (ruleType === 1) {
    // 90 deg rotation or inversion
    const base1 = rng.pick(ASYMMETRIC_SHAPES);
    const base2 = rng.pick(ASYMMETRIC_SHAPES.filter((s) => s !== base1));

    ruleDesc = 'Birinci şekildeki 90° dönüş kuralı üçüncü şekle de uygulanır.';
    shapeA = { kind: base1, fill: colorA, rotation: 0, marker: 'none' };
    shapeB = { kind: base1, fill: colorA, rotation: 90, marker: 'none' };
    shapeC = { kind: base2, fill: colorB, rotation: 0, marker: 'none' };
    shapeD = { kind: base2, fill: colorB, rotation: 90, marker: 'none' };

    d1 = { kind: base2, fill: colorB, rotation: 180, marker: 'none' };
    d2 = { kind: base2, fill: colorB, rotation: 270, marker: 'none' };
    d3 = { kind: base1, fill: colorB, rotation: 90, marker: 'none' };
  } else if (ruleType === 2) {
    // Inner marker addition
    const base1 = rng.pick(SHAPES_POOL);
    const base2 = rng.pick(SHAPES_POOL.filter((s) => s !== base1));

    ruleDesc = 'İlk şeklin içine beyaz bir yıldız belirteci eklenmektedir.';
    shapeA = { kind: base1, fill: colorA, rotation: 0, marker: 'none' };
    shapeB = { kind: base1, fill: colorA, rotation: 0, marker: 'star', markerPos: 'center', markerColor: PALETTE.white };
    shapeC = { kind: base2, fill: colorB, rotation: 0, marker: 'none' };
    shapeD = { kind: base2, fill: colorB, rotation: 0, marker: 'star', markerPos: 'center', markerColor: PALETTE.white };

    d1 = { kind: base2, fill: colorB, rotation: 0, marker: 'dot', markerPos: 'center', markerColor: PALETTE.white };
    d2 = { kind: base2, fill: colorB, rotation: 0, marker: 'none' };
    d3 = { kind: base1, fill: colorB, rotation: 0, marker: 'star', markerPos: 'center', markerColor: PALETTE.white };
  } else {
    // Color inverted
    const base1 = rng.pick(SHAPES_POOL);
    const base2 = rng.pick(SHAPES_POOL.filter((s) => s !== base1));

    ruleDesc = 'İlk şekildeki renk ikinci şekilde turuncuya dönüşmektedir.';
    shapeA = { kind: base1, fill: colorA, rotation: 0, marker: 'none' };
    shapeB = { kind: base1, fill: PALETTE.orange, rotation: 0, marker: 'none' };
    shapeC = { kind: base2, fill: colorB, rotation: 0, marker: 'none' };
    shapeD = { kind: base2, fill: PALETTE.orange, rotation: 0, marker: 'none' };

    d1 = { kind: base2, fill: colorB, rotation: 0, marker: 'none' };
    d2 = { kind: base2, fill: PALETTE.emerald, rotation: 0, marker: 'none' };
    d3 = { kind: base1, fill: PALETTE.orange, rotation: 0, marker: 'none' };
  }

  const choices = [
    { item: shapeD, isCorrect: true },
    { item: d1, isCorrect: false },
    { item: d2, isCorrect: false },
    { item: d3, isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: generateVisualFingerprint(c.item),
      visualData: c.item,
    };
  });

  return {
    id: `ana-${seed}-${difficulty}`,
    version: 1,
    type: 'visual_analogy',
    category: 'logic',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: '1. Şekil 2. Şekle dönüşüyorsa, 3. Şekil soru işareti (?) yerine hangisine dönüşmelidir?',
    secondaryPrompt: 'A ile B arasındaki ilişkiyi çöz ve aynısını C ile D arasına uygula.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Görsel Analoji (Benzeşim)',
      summary: ruleDesc,
      steps: [
        'A ile B şekilleri arasındaki dönüşüm kuralını belirle.',
        ruleDesc,
        `Bu dönüşüm C şekline uygulandığında doğru seçenek ${correctOptionId} olur.`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Analojik Muhakeme', 'Dönüşüm Eşleme', 'Mantıksal Çıkarım'],
    seed,
    visualConfig: {
      displayMode: 'analogy_pairs',
      pairA: shapeA,
      pairB: shapeB,
      pairC: shapeC,
    },
  };
}

// 10 Shape Counting (Şekil / Blok Sayma)
export function generateShapeCountingQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const targetCount = rng.nextInt(difficulty <= 2 ? 4 : 6, difficulty <= 2 ? 8 : 14);
  const shape = rng.pick(['star', 'triangle', 'circle', 'square'] as const);
  const color = rng.pick(COLORS_POOL);

  // Distractor counts
  const distractorCounts = [targetCount - 1, targetCount + 1, targetCount + 2];
  const countChoices = rng.shuffle([targetCount, ...distractorCounts]);

  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = countChoices.map((cnt, i) => {
    if (cnt === targetCount) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: `count_${cnt}`,
      visualData: {
        textNumber: cnt,
        badgeColor: PALETTE.indigo,
      },
    };
  });

  // Generate coordinates for the items inside a 100x100 box
  const itemsCoords: { x: number; y: number }[] = [];
  for (let i = 0; i < targetCount; i++) {
    itemsCoords.push({
      x: rng.nextInt(15, 85),
      y: rng.nextInt(15, 85),
    });
  }

  return {
    id: `cnt-${seed}-${difficulty}`,
    version: 1,
    type: 'shape_counting',
    category: 'attention',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : difficulty <= 4 ? '3-4' : 'all',
    prompt: 'Kare alanın içinde toplam kaç adet şekil bulunmaktadır?',
    secondaryPrompt: 'Şekilleri tek tek ve dikkatle sayarak doğrula.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Sistematik Sayma ve Dikkat',
      summary: `Alanın içerisinde tam olarak ${targetCount} adet şekil bulunmaktadır. Doğru cevap ${correctOptionId} (${targetCount}) seçeneğidir.`,
      steps: [
        'Şekilleri soldan sağa veya yukarıdan aşağıya düzenli bir sıra ile say.',
        `Toplam sayılan miktar: ${targetCount} adet.`,
        `Cevap: ${correctOptionId}`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 4,
    skills: ['Sayısal Sayma', 'Görsel Tarama', 'Odaklanma'],
    seed,
    visualConfig: {
      displayMode: 'scatter_counting',
      shape,
      color,
      count: targetCount,
      coords: itemsCoords,
    },
  };
}
