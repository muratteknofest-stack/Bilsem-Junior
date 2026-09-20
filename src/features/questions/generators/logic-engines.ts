import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, COLORS_POOL } from './generator-utils';

// 11 Direction / Path (Yön ve Rota Takibi)
export function generateDirectionPathQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const symbols = ['star', 'circle', 'diamond', 'triangle', 'clover', 'heart', 'cross', 'pacman', 'ring'] as const;
  
  // 3x3 Grid from (0,0) to (2,2)
  // Start at (0,0)
  let curX = 0;
  let curY = 0;
  const stepList: string[] = [];

  const possibleMoves = [
    { dx: 1, dy: 0, text: 'Sağa (→)' },
    { dx: 0, dy: 1, text: 'Aşağıya (↓)' },
    { dx: 2, dy: 0, text: '2 Adım Sağa (→)' },
    { dx: 0, dy: 2, text: '2 Adım Aşağıya (↓)' },
  ];

  // Generate 2 or 3 valid moves
  const numMoves = difficulty >= 3 ? 3 : 2;
  const moves: {dx: number, dy: number, text: string}[] = [];
  
  const hasNetMovement = (mvs: {dx: number, dy: number}[]) => {
    let nx = 0, ny = 0;
    for (const m of mvs) { nx += m.dx; ny += m.dy; }
    return nx !== 0 || ny !== 0;
  };

  for (let m = 0; m < numMoves; m++) {
    const validMoves = [
      { dx: 1, dy: 0, text: '1 Adım Sağa (→)' },
      { dx: -1, dy: 0, text: '1 Adım Sola (←)' },
      { dx: 0, dy: 1, text: '1 Adım Aşağıya (↓)' },
      { dx: 0, dy: -1, text: '1 Adım Yukarıya (↑)' },
    ].filter((mv) => curX + mv.dx >= 0 && curX + mv.dx <= 2 && curY + mv.dy >= 0 && curY + mv.dy <= 2);

    if (validMoves.length > 0) {
      let chosen = rng.pick(validMoves);
      if (m === numMoves - 1 && !hasNetMovement([...moves, chosen])) {
        const otherMoves = validMoves.filter(v => v !== chosen);
        if (otherMoves.length > 0) {
          chosen = rng.pick(otherMoves);
        }
      }
      curX += chosen.dx;
      curY += chosen.dy;
      stepList.push(chosen.text);
      moves.push(chosen);
    }
  }

  // If didn't move, default move
  if (!hasNetMovement(moves)) {
    curX = 1;
    curY = 1;
    stepList.length = 0;
    stepList.push('1 Adım Sağa (→)', '1 Adım Aşağıya (↓)');
  }

  const targetIdx = curY * 3 + curX;
  const targetSymbol = symbols[targetIdx];
  const altSymbols = rng.shuffle(symbols.filter((s) => s !== targetSymbol)).slice(0, 3);

  const choices = [
    { kind: targetSymbol, isCorrect: true },
    { kind: altSymbols[0], isCorrect: false },
    { kind: altSymbols[1], isCorrect: false },
    { kind: altSymbols[2], isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    const data: ShapeItem = {
      kind: c.kind as any,
      fill: PALETTE.indigo,
      rotation: 0,
      marker: 'none',
    };
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: `path_${c.kind}`,
      visualData: data,
    };
  });

  return {
    id: `dir-${seed}-${difficulty}`,
    version: 1,
    type: 'direction_path',
    category: 'spatial',
    difficulty,
    ageGroup: 'all',
    prompt: 'Başlangıç noktasından (sol üst) verilen adımları sırayla takip ettiğinde hangi sembole ulaşırsın?',
    secondaryPrompt: `Adımlar: ${stepList.join(' ➔ ')}`,
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Yön ve Koordinat Takibi',
      summary: `Sol üst başlangıç noktasından belirtilen adımlar takip edildiğinde ${targetSymbol} sembolüne (${correctOptionId}) ulaşılır.`,
      steps: [
        'Başlangıç konumunu (sol üst hücre) belirle.',
        ...stepList.map((s, idx) => `${idx + 1}. Adım: ${s}`),
        `Ulaşılan hedef sembol: ${correctOptionId}`,
      ],
    },
    estimatedSeconds: 25 + difficulty * 5,
    skills: ['Yön Kavramı', 'Uzamsal Haritalama', 'Yönerge Takibi'],
    seed,
    visualConfig: {
      displayMode: 'grid_path',
      steps: stepList,
      gridSymbols: symbols,
      targetSymbol,
    },
  };
}

// 12 Visual Memory (Görsel Bellek)
export function generateVisualMemoryQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const shapes = rng.pickUnique(SHAPES_POOL, 3);
  const colors = rng.pickUnique(COLORS_POOL, 3);

  const memoryItems: ShapeItem[] = shapes.map((s, i) => ({
    kind: s,
    fill: colors[i],
    rotation: 0,
    marker: 'none',
  }));

  // Ask: "Aşağıdaki seçeneklerden hangisi az önce gösterilen şekillerden biridir?" or missing item
  const targetItem = memoryItems[0];
  const d1Fill = colors[0] === PALETTE.dark ? PALETTE.teal : PALETTE.dark;
  const distractor1: ShapeItem = { kind: shapes[0], fill: d1Fill, rotation: 0, marker: 'none' };
  const distractor2: ShapeItem = { kind: rng.pick(SHAPES_POOL.filter((s) => !shapes.includes(s))), fill: colors[0], rotation: 0, marker: 'none' };
  const distractor3: ShapeItem = { kind: shapes[1], fill: colors[0], rotation: 0, marker: 'none' };

  const choices = [
    { item: targetItem, isCorrect: true },
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
    id: `mem-${seed}-${difficulty}`,
    version: 1,
    type: 'visual_memory',
    category: 'memory',
    difficulty,
    ageGroup: 'all',
    prompt: 'Üstteki grupta yer alan şekil ve renk eşleşmelerinden hangisi seçeneklerde DOĞRU olarak verilmiştir?',
    secondaryPrompt: 'Şekil ve renk eşleştirmesini dikkatle hatırla.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Kısa Süreli Görsel Bellek',
      summary: `İlk gösterilen gruptaki eşleşmeyle tam uyumlu olan seçenek ${correctOptionId} dir.`,
      steps: [
        'Üstteki şekil grubunu renkleriyle birlikte zihninde kodla.',
        'Seçenekleri kontrol et: renk ve biçim aynı anda doğru olmalı.',
        `Doğru eşleşme: ${correctOptionId}`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 4,
    skills: ['Görsel Hafıza', 'Renk ve Şekil Kodlama', 'Detay Hatırlama'],
    seed,
    visualConfig: {
      displayMode: 'memory_board',
      memoryItems,
    },
  };
}

// 13 Symbol Coding (Sembol Şifreleme)
export function generateSymbolCodingQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // Geometric symbol mapped to number or letter:
  // e.g. Triangle = 3, Square = 4, Star = 5
  // Target: [Star, Square, Triangle] -> Code: 5 4 3
  const mapping = [
    { shape: 'circle' as const, code: '1', fill: PALETTE.rose },
    { shape: 'triangle' as const, code: '3', fill: PALETTE.emerald },
    { shape: 'square' as const, code: '4', fill: PALETTE.indigo },
    { shape: 'star' as const, code: '5', fill: PALETTE.amber },
  ];

  const seq = rng.pickUnique(mapping, 3);
  const correctCode = seq.map((s) => s.code).join(' - ');

  const distractor1 = [seq[1].code, seq[0].code, seq[2].code].join(' - ');
  const distractor2 = [seq[0].code, seq[2].code, seq[1].code].join(' - ');
  const distractor3 = [seq[2].code, seq[1].code, seq[0].code].join(' - ');

  const choices = [
    { code: correctCode, isCorrect: true },
    { code: distractor1, isCorrect: false },
    { code: distractor2, isCorrect: false },
    { code: distractor3, isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: `code_${c.code}`,
      visualData: {
        textNumber: c.code,
        badgeColor: PALETTE.slate,
      },
    };
  });

  return {
    id: `cod-${seed}-${difficulty}`,
    version: 1,
    type: 'symbol_coding',
    category: 'logic',
    difficulty,
    ageGroup: 'all',
    prompt: 'Verilen şifre tablosuna göre bu 3 sembolün sayısal şifresi hangisidir?',
    secondaryPrompt: 'Her sembolün altındaki sayıyı sırasıyla yaz.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Sembolik Şifre Çözme',
      summary: `Sembollerin tablo karşılığı sırasıyla yan yana getirildiğinde şifre ${correctCode} (${correctOptionId}) olur.`,
      steps: [
        'Şifre anahtarındaki her şeklin sayı değerini bul.',
        'Soru alanındaki şekil sırasını takip et.',
        `Sonuç şifre: ${correctCode}`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Sembolik Eşleme', 'Şifreleme Mantığı', 'Sıralı İşlem'],
    seed,
    visualConfig: {
      displayMode: 'symbol_code_table',
      mapping,
      targetSequence: seq,
    },
  };
}

// 14 Classification (Sınıflandırma)
export function generateClassificationQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // Group 1 has attribute X (e.g. rounded curves: circle, crescent, ring, clover)
  // Group 2 has polygon straight lines (triangle, square, diamond, pentagon)
  // Which shape belongs to Group 1?
  const curvedShapes = ['circle', 'crescent', 'ring', 'clover'] as const;
  const straightShapes = ['square', 'triangle', 'diamond', 'pentagon', 'hexagon'] as const;

  const target = rng.pick(curvedShapes);
  const straightPicks = rng.pickUnique(straightShapes, 3);

  const choices = [
    { shape: target, isCorrect: true },
    { shape: straightPicks[0], isCorrect: false },
    { shape: straightPicks[1], isCorrect: false },
    { shape: straightPicks[2], isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    const data: ShapeItem = {
      kind: c.shape as any,
      fill: PALETTE.teal,
      rotation: 0,
      marker: 'none',
    };
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: generateVisualFingerprint(data),
      visualData: data,
    };
  });

  return {
    id: `cls-${seed}-${difficulty}`,
    version: 1,
    type: 'classification',
    category: 'logic',
    difficulty,
    ageGroup: 'all',
    prompt: 'Kutudaki örnek şekiller grubuna (yuvarlak / eğrisel hatlı) seçeneklerden hangisi DAHİL EDİLEBİLİR?',
    secondaryPrompt: 'Örneklerin ortak geometrik niteliğini keşfet.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Geometrik Nitelik Sınıflandırması',
      summary: `Kutudaki tüm şekiller eğrisel/yuvarlak hatlıdır. Bu sınıfa dahil edilebilecek tek seçenek ${correctOptionId} dir.`,
      steps: [
        'Kutudaki şekillerin ortak geometrik özelliğini belirle (köşesiz / eğrisel).',
        'Seçenekleri bu kurala göre ele.',
        `Uygun olan seçenek: ${correctOptionId}`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Kavramsal Sınıflama', 'Geometrik Özellik Analizi', 'Soyutlama'],
    seed,
    visualConfig: {
      displayMode: 'group_classification',
      groupShapes: ['circle', 'crescent', 'ring'],
      groupAttribute: 'Eğrisel / Yuvarlak Hatlı Şekiller',
    },
  };
}

// 15 Visual Attention (Görsel Dikkat)
export function generateVisualAttentionQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // Target shape with subtle detail: shape + marker + specific color
  // Find the EXACT identical clone among distractors with tiny differences
  const shape = rng.pick(SHAPES_POOL);
  const color = rng.pick(COLORS_POOL);

  const targetItem: ShapeItem = {
    kind: shape,
    fill: color,
    rotation: 0,
    marker: 'dot',
    markerPos: 'top',
    markerColor: PALETTE.white,
  };

  const correctItem: ShapeItem = { ...targetItem };

  const distractor1: ShapeItem = {
    ...targetItem,
    markerPos: 'right', // wrong marker pos
  };
  const distractor2: ShapeItem = {
    ...targetItem,
    marker: 'plus', // wrong marker kind
  };
  const distractor3: ShapeItem = {
    ...targetItem,
    rotation: 45, // rotated
  };

  const choices = [
    { item: correctItem, isCorrect: true },
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
    id: `att-${seed}-${difficulty}`,
    version: 1,
    type: 'visual_attention',
    category: 'attention',
    difficulty,
    ageGroup: 'all',
    prompt: 'Referans kutusundaki şeklin BİREBİR AYNISI olan seçenek hangisidir?',
    secondaryPrompt: 'İç işaretleyicinin konumuna ve şeklin dönüş açısına dikkat et.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Detaylı Görsel Dikkat ve Eşleştirme',
      summary: `Referans şekille noktası, dönüş açısı ve rengiyle tamamen aynı olan seçenek ${correctOptionId} dir.`,
      steps: [
        'Referans şeklin tüm ayrıntılarını (şekil, renk, iç nokta konumu) tespit et.',
        'Seçeneklerdeki küçük farkları eleyerek tam eşi bul.',
        `Doğru eşleşme: ${correctOptionId}`,
      ],
    },
    estimatedSeconds: 15 + difficulty * 5,
    skills: ['Görsel Ayrıntı Taraması', 'Birebir Eşleme', 'Hata Fark Etme'],
    seed,
    visualConfig: {
      displayMode: 'reference_match',
      referenceItem: targetItem,
    },
  };
}

// 16 Number Pattern (Sayısal Örüntü)
export function generateNumberPatternQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // Numbers on vertices or progression:
  // e.g. A sequence of 4 numbers: 3 -> 6 -> 12 -> [?] (+3 or *2)
  const step = rng.nextInt(2, 5);
  const start = rng.nextInt(2, 10);
  const isMultiplicative = difficulty >= 4 && step <= 3 && rng.nextBool();

  const numbers: number[] = [];
  let curr = start;
  for (let i = 0; i < 4; i++) {
    numbers.push(curr);
    curr = isMultiplicative ? curr * step : curr + step;
  }

  const correctNumber = numbers[3];
  const displayNumbers = [numbers[0], numbers[1], numbers[2], '?'];

  const distractor1 = isMultiplicative ? numbers[2] + step : correctNumber + 2;
  const distractor2 = correctNumber - 1;
  const distractor3 = correctNumber + step;

  const choices = [
    { num: correctNumber, isCorrect: true },
    { num: distractor1, isCorrect: false },
    { num: distractor2, isCorrect: false },
    { num: distractor3, isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: `num_${c.num}`,
      visualData: {
        textNumber: String(c.num),
        badgeColor: PALETTE.emerald,
      },
    };
  });

  return {
    id: `num-${seed}-${difficulty}`,
    version: 1,
    type: 'number_pattern',
    category: 'numerical',
    difficulty,
    ageGroup: 'all',
    prompt: 'Dizideki sayısal örüntüye göre soru işareti (?) yerine hangi sayı gelmelidir?',
    secondaryPrompt: `Sayılar arasındaki artış kuralını bul: ${numbers[0]} → ${numbers[1]} → ${numbers[2]} → ?`,
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Sayısal Artış Kuralı',
      summary: `Sayılar her adımda ${isMultiplicative ? `önceki sayının ${step} katı alınarak` : `${step} artarak`} ilerlemektedir. Soru işareti yerine ${correctNumber} (${correctOptionId}) gelmelidir.`,
      steps: [
        `1. Terim: ${numbers[0]}`,
        `2. Terim: ${numbers[1]} (Kural: ${isMultiplicative ? `x${step}` : `+${step}`})`,
        `3. Terim: ${numbers[2]}`,
        `4. Terim (?): ${numbers[2]} ${isMultiplicative ? `x ${step}` : `+ ${step}`} = ${correctNumber}`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Sayısal Örüntü', 'Aritmetik Muhakeme', 'Ardışık Kural'],
    seed,
    visualConfig: {
      displayMode: 'number_sequence_cards',
      displayNumbers,
    },
  };
}

// 17 Logical Sequence (Mantık Akışı)
export function generateLogicalSequenceQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // Stages of growth or liquid filling:
  // E.g. Container filled: 25% -> 50% -> 75% -> [100%]
  const levels = [25, 50, 75];
  const correctLevel = 100;

  const offsets = difficulty <= 2
    ? [20, 40, 60]   // Kolay: bariz farklar
    : difficulty <= 4
    ? [10, 25, 40]   // Orta: kademeli yakınlık
    : [5, 12, 20];   // Zor: yakın ama yine de benzersiz

  // The correct value is already the upper boundary (100). Adding an offset
  // and clamping used to turn several distractors into the same 95% image.
  // Subtracting distinct offsets guarantees four distinct visual answers.
  const distractorFills = rng.shuffle(offsets).map(offset => correctLevel - offset);

  const correctChoice = { fillPercent: correctLevel, color: PALETTE.cyan };
  const d1 = { fillPercent: distractorFills[0], color: PALETTE.cyan };
  const d2 = { fillPercent: distractorFills[1], color: PALETTE.cyan };
  const d3 = { fillPercent: distractorFills[2], color: PALETTE.cyan };

  const choices = [
    { item: correctChoice, isCorrect: true },
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
      fingerprint: `fill_${c.item.fillPercent}`,
      visualData: c.item,
    };
  });

  return {
    id: `log-${seed}-${difficulty}`,
    version: 1,
    type: 'logical_sequence',
    category: 'logic',
    difficulty,
    ageGroup: 'all',
    prompt: 'Kapların doluluk akış mantığına göre soru işareti (?) yerine hangi kap gelmelidir?',
    secondaryPrompt: 'Her adımda eklenen sıvı miktarına dikkat et.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle: 'Mantıksal Akış ve Miktar İlerlemesi',
      summary: `Her adımda kaba %25 daha sıvı eklenmektedir. Son adımda kap tamamen (%100) dolar (${correctOptionId}).`,
      steps: [
        'Kaplardaki doluluk oranlarını incele: %25, %50, %75.',
        'Her adımda eşit miktarda artış gerçekleşiyor.',
        `Sıradaki kap tamamen dolu olmalıdır: ${correctOptionId}`,
      ],
    },
    estimatedSeconds: 20 + difficulty * 5,
    skills: ['Neden-Sonuç İlişkisi', 'Aşamalı Mantık', 'Miktar Değerlendirmesi'],
    seed,
    visualConfig: {
      displayMode: 'liquid_levels',
      levels,
    },
  };
}

// 18 3x3 Matrix (3x3 İleri Düzey Matris)
export function generateMatrix3x3Question(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const SHAPE_POOLS = [
    ['circle', 'square', 'triangle'],
    ['hexagon', 'star', 'diamond'],
    ['pentagon', 'arrow', 'cross'],
    ['heart', 'crescent', 'oval'],
  ] as const;
  
  const shapePool = SHAPE_POOLS[rng.nextInt(0, SHAPE_POOLS.length - 1)];
  const colorPool = rng.shuffle([PALETTE.indigo, PALETTE.emerald, PALETTE.rose, PALETTE.amber, PALETTE.cyan]).slice(0, 3);
  
  // Base shape latin square
  const shapeGrid = [
    [shapePool[0], shapePool[1], shapePool[2]],
    [shapePool[1], shapePool[2], shapePool[0]],
    [shapePool[2], shapePool[0], shapePool[1]],
  ];

  // Base color latin square
  const colorGrid = [
    [colorPool[0], colorPool[1], colorPool[2]],
    [colorPool[2], colorPool[0], colorPool[1]],
    [colorPool[1], colorPool[2], colorPool[0]],
  ];

  const isComplex = difficulty >= 4;
  
  // Select target attributes
  const targetShape = shapeGrid[2][2];
  const targetColor = isComplex ? colorGrid[2][2] : PALETTE.indigo;
  const targetRotation = isComplex ? (difficulty === 6 ? 180 : 90) : 0;

  const finalCellGrid = shapeGrid.map((row, rowIndex) => row.map((kind, colIndex) => (
    rowIndex === 2 && colIndex === 2
      ? null
      : {
          kind,
          fill: isComplex ? colorGrid[rowIndex][colIndex] : PALETTE.indigo,
          rotation: isComplex ? targetRotation : 0,
        }
  )));

  // Build distractors (Smart Partial-Truth Distractors)
  let distractors: { kind: string, fill: string, rotation: number }[] = [];
  
  if (isComplex) {
    // D1: Correct Shape, Wrong Color
    distractors.push({ kind: targetShape, fill: colorGrid[2][1], rotation: targetRotation });
    // D2: Wrong Shape, Correct Color
    distractors.push({ kind: shapeGrid[2][1], fill: targetColor, rotation: targetRotation });
    // D3: Correct Shape, Correct Color, Wrong Rotation (if high diff)
    if (difficulty >= 5) {
      distractors.push({ kind: targetShape, fill: targetColor, rotation: targetRotation === 90 ? 270 : 90 });
    } else {
      distractors.push({ kind: shapeGrid[2][0], fill: colorGrid[2][0], rotation: targetRotation });
    }
  } else {
    // Simple Distractors (only shape changes)
    const wrongShapes = rng.shuffle(SHAPES_POOL.filter(s => s !== targetShape)).slice(0, 3);
    distractors = wrongShapes.map(s => ({ kind: s, fill: targetColor, rotation: 0 }));
  }

  const choices = [
    { item: { kind: targetShape, fill: targetColor, rotation: targetRotation }, isCorrect: true },
    { item: distractors[0], isCorrect: false },
    { item: distractors[1], isCorrect: false },
    { item: distractors[2], isCorrect: false },
  ];

  const shuffled = rng.shuffle(choices);
  const letters = ['A', 'B', 'C', 'D'];
  let correctOptionId = 'A';

  const options: VisualOption[] = shuffled.map((c, i) => {
    if (c.isCorrect) correctOptionId = letters[i];
    const data: ShapeItem = {
      kind: c.item.kind as any,
      fill: c.item.fill,
      rotation: c.item.rotation,
      marker: 'none',
    };
    return {
      id: letters[i],
      label: letters[i],
      fingerprint: `m3_${c.item.kind}_${c.item.fill}_${c.item.rotation}`,
      visualData: data,
    };
  });

  const ruleTitle = isComplex 
    ? 'Çok Boyutlu Latin Karesi (Şekil ve Renk)'
    : '3x3 Latin Karesi (Şekil)';
    
  const explanationSteps = ['Her satırda 3 farklı geometrik şekil bulunmaktadır.'];
  if (isComplex) {
    explanationSteps.push('Aynı zamanda her satırda 3 farklı renk belirli bir düzende dizilmiştir.');
    if (difficulty >= 5) explanationSteps.push('Şekillerin dönüş açılarına (rotasyon) dikkat edin.');
    explanationSteps.push(`Eksik olan kombinasyon: ${targetShape} şekli ve belirtilen renktir.`);
  } else {
    explanationSteps.push('Üçüncü satırda eksik olan tek şekli bulmalısın.');
  }
  explanationSteps.push(`Cevap: ${correctOptionId}`);

  return {
    id: `mat3-${seed}-${difficulty}`,
    version: 2,
    type: 'matrix_3x3',
    category: 'matrix',
    difficulty,
    ageGroup: '3-4',
    prompt: isComplex 
      ? '3x3 Matris kuralına göre soru işareti (?) yerine hangisi gelmelidir? Şekil, renk ve yön kurallarına aynı anda dikkat edin.'
      : '3x3 Matris kuralına göre (her satır ve sütunda her şekil bir kez) soru işareti (?) yerine hangisi gelmelidir?',
    secondaryPrompt: isComplex ? 'Birden fazla kural (şekil sırası, renk sırası) gizli.' : 'Sudoku mantığı gibi her sırada her şekil tam bir kez bulunmalıdır.',
    options,
    correctOptionId,
    explanation: {
      ruleTitle,
      summary: `Son satır ve sütunda eksik olan eşleşme ${correctOptionId} seçeneğindedir.`,
      steps: explanationSteps,
    },
    estimatedSeconds: 30 + difficulty * 5,
    skills: ['İleri Düzey Matris', 'Çift Boyutlu Muhakeme', 'Kombinatorik Düşünme'],
    seed,
    visualConfig: {
      displayMode: 'matrix_3x3',
      rows: 3,
      cols: 3,
      grid: finalCellGrid,
    },
  };
}
