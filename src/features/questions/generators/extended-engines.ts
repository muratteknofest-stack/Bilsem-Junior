import { BaseQuestion, DifficultyLevel, VisualOption } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { generateVisualFingerprint } from '../fingerprint';
import { PALETTE } from '../../../lib/svg-primitives';
import { ShapeItem, SHAPES_POOL, COLORS_POOL } from './generator-utils';

// 19. Şekil Denklemleri (Shape Equations)
export function generateShapeEquationQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // Create 3 basic shapes representing numbers
  const shapes = rng.pickUnique(SHAPES_POOL, 3);
  const color = rng.pick(COLORS_POOL);
  
  // Assign random values based on difficulty
  const maxVal = difficulty * 3 + 5;
  const valA = rng.nextInt(2, maxVal);
  const valB = rng.nextInt(2, maxVal);
  const valC = rng.nextInt(2, maxVal);
  
  // Eq 1: A + B = X
  // Eq 2: A + C = Y
  // Eq 3: B + C = ?
  const eq1Ans = valA + valB;
  const eq2Ans = valA + valC;
  const targetAns = valB + valC;
  
  const optionsVal = [targetAns];
  while (optionsVal.length < 4) {
    const wrong = targetAns + rng.nextInt(-5, 5);
    if (!optionsVal.includes(wrong) && wrong > 0) {
      optionsVal.push(wrong);
    }
  }
  
  const shuffledOptions = rng.shuffle(optionsVal);
  
  const choices: VisualOption[] = shuffledOptions.map((v, i) => ({
    id: ['A','B','C','D'][i],
    label: v.toString(),
    fingerprint: `seq-opt-${i}`,
    visualData: { textNumber: v }
  }));
  
  const correctOpt = choices.find(c => parseInt(c.label) === targetAns)?.id || 'A';
  
  return {
    id: `seq-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'shape_equation',
    category: 'numerical',
    difficulty,
    prompt: 'Mantık kurallarını kullanarak soru işaretinin yerine hangi sayının gelmesi gerektiğini bulunuz.',
    visualConfig: {
      displayMode: 'shape_equation',
      equations: [
        { left: [{ shape: shapes[0], fill: color }, { shape: shapes[1], fill: color }], right: eq1Ans, op: '+' },
        { left: [{ shape: shapes[0], fill: color }, { shape: shapes[2], fill: color }], right: eq2Ans, op: '+' },
        { left: [{ shape: shapes[1], fill: color }, { shape: shapes[2], fill: color }], right: '?', op: '+' }
      ]
    },
    options: choices,
    correctOptionId: correctOpt,
    explanation: {
      summary: 'Her şeklin sabit bir sayısal değeri vardır.',
      ruleTitle: 'Denklem Çözümü',
      steps: [
        `Birinci denkleme göre, birinci şekil ve ikinci şeklin toplamı ${eq1Ans}.`,
        `İkinci denkleme göre, birinci şekil ve üçüncü şeklin toplamı ${eq2Ans}.`,
        `Şekillerin değerleri hesaplandığında, istenen toplam ${targetAns} olarak bulunur.`
      ]
    }
  };
}

// 20. Görsel Sudoku (Latin Karesi)
export function generateLatinSquareQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const size = difficulty > 3 ? 4 : 3;
  const shapes = rng.pickUnique(SHAPES_POOL, size);
  const color = rng.pick(COLORS_POOL);
  
  // Generate a valid size x size latin square
  let grid: ShapeItem[][] = [];
  
  // Simple cyclic shift for basic latin square
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      row.push({
        kind: shapes[(i + j) % size],
        fill: color
      });
    }
    grid.push(row);
  }
  
  // Shuffle rows and cols to randomize
  grid = rng.shuffle(grid);
  for (let i = 0; i < size; i++) {
    let col = grid.map(r => r[i]);
    col = rng.shuffle(col);
    // Not a full shuffle for cols to maintain property easily, just shift cols
  }
  
  // Create a cyclic shift
  const shift = rng.nextInt(1, size-1);
  const finalGrid = grid.map(row => {
    return [...row.slice(shift), ...row.slice(0, shift)];
  });
  
  // Pick one cell to hide
  const hideRow = rng.nextInt(0, size-1);
  const hideCol = rng.nextInt(0, size-1);
  
  const targetShape = finalGrid[hideRow][hideCol];
  
  // Generate options
  const altShapes = shapes.filter(s => s !== targetShape.kind).slice(0, 3);
  // ensure we have 4 options
  while(altShapes.length < 3) {
    const s = randomShape(rng);
    if (!altShapes.includes(s) && s !== targetShape.kind) altShapes.push(s);
  }
  
  const opts = [
    { kind: targetShape.kind, isCorrect: true },
    { kind: altShapes[0], isCorrect: false },
    { kind: altShapes[1], isCorrect: false },
    { kind: altShapes[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctOptId = 'A';
  
  const options = shuffledOpts.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctOptId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `ls-${id}`,
      visualData: { kind: opt.kind, fill: color }
    };
  });
  
  // Flatten grid for rendering, marking hidden cell with isHidden
  const renderGrid = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === hideRow && c === hideCol) {
        renderGrid.push({ isHidden: true });
      } else {
        renderGrid.push(finalGrid[r][c]);
      }
    }
  }

  return {
    id: `ls-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'latin_square',
    category: 'logic',
    difficulty,
    prompt: 'Her satır ve her sütunda her şekil sadece bir kez bulunmalıdır. Soru işaretli yere hangi şekil gelmelidir?',
    visualConfig: {
      displayMode: size === 3 ? 'matrix_3x3' : 'shape_grid',
      gridSize: size,
      grid: renderGrid
    },
    options,
    correctOptionId: correctOptId,
    explanation: {
      summary: 'Sudoku mantığıyla her satır ve sütunda şekillerin benzersiz olması gerekir.',
      ruleTitle: 'Latin Karesi Kuralı',
      steps: [
        'Eksik şeklin bulunduğu satır ve sütuna bakın.',
        'Satır ve sütundaki diğer şekilleri inceleyerek hangi şeklin eksik olduğunu bulun.',
        'Doğru cevap eksik olan şekildir.'
      ]
    }
  };
}

// 21. Gölge Eşleştirme (Shadow Matching)
export function generateShadowMatchingQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const baseShape = rng.pick(SHAPES_POOL);
  const overlapShape = rng.pick(SHAPES_POOL);
  
  const targetStack = [
    { kind: baseShape, fill: PALETTE.dark, size: 70 },
    { kind: overlapShape, fill: PALETTE.dark, size: 40, rotation: rng.pick([0, 45, 90]) }
  ];
  
  // create distractors with slight changes
  const distractors = [
    [
      { kind: baseShape, fill: PALETTE.dark, size: 70 },
      { kind: rng.pick(SHAPES_POOL), fill: PALETTE.dark, size: 40, rotation: 0 }
    ],
    [
      { kind: rng.pick(SHAPES_POOL), fill: PALETTE.dark, size: 70 },
      { kind: overlapShape, fill: PALETTE.dark, size: 40, rotation: 0 }
    ],
    [
      { kind: baseShape, fill: PALETTE.dark, size: 70 },
      { kind: overlapShape, fill: PALETTE.dark, size: 60, rotation: 45 }
    ]
  ];
  
  const opts = [
    { stack: targetStack, isCorrect: true },
    { stack: distractors[0], isCorrect: false },
    { stack: distractors[1], isCorrect: false },
    { stack: distractors[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctOptId = 'A';
  
  const options = shuffledOpts.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctOptId = id;
    
    // Instead of rendering as dark shadows in options, render them in color to find the shadow, OR target is color, options are shadow
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `sm-${id}`,
      visualData: { stack: opt.stack }
    };
  });
  
  // Make the target colorful
  const colorTarget = [
    { ...targetStack[0], fill: rng.pick(COLORS_POOL) },
    { ...targetStack[1], fill: rng.pick(COLORS_POOL) }
  ];

  return {
    id: `sm-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'shadow_matching',
    category: 'visual_perception',
    difficulty,
    prompt: 'Yukarıdaki renkli cismin tam gölgesi (silüeti) aşağıdakilerden hangisidir?',
    visualConfig: {
      displayMode: 'stack_target',
      stack: colorTarget
    },
    options,
    correctOptionId: correctOptId,
    explanation: {
      summary: 'Cismin dış hatlarını ve üst üste binen parçaların konturlarını inceleyin.',
      ruleTitle: 'Silüet Eşleştirme',
      steps: [
        'Renkli şeklin genel ana hatlarına odaklanın.',
        'İç detaylar gölgede görünmeyecektir, sadece dış konturlar kalacaktır.',
        'Seçenekleri şeklin genel dış hatları ile eşleştirerek doğru gölgeyi bulun.'
      ]
    }
  };
}

// 22. Terazi Dengesi (Balance Scale)
export function generateBalanceScaleQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const shapes = rng.pickUnique(SHAPES_POOL, 3);
  const color = rng.pick(COLORS_POOL);
  
  const A = shapes[0];
  const B = shapes[1];
  const C = shapes[2];
  
  // Scale 1: 1 A = 2 B
  // Scale 2: 1 B = 3 C
  // Scale 3 (Target): 1 A = ? C (Answer: 6 C) OR Target: 1 A = ? (Options: combination of B and C)
  
  // Keep it visual
  const targetStack = [
    { kind: A, fill: color, size: 50 },
  ];
  
  const correctAns = [
    { kind: B, fill: color, size: 50 },
    { kind: B, fill: color, size: 50 }
  ];
  
  const distractors = [
    [
      { kind: B, fill: color, size: 50 },
      { kind: C, fill: color, size: 50 }
    ],
    [
      { kind: C, fill: color, size: 50 },
      { kind: C, fill: color, size: 50 }
    ],
    [
      { kind: A, fill: color, size: 50 },
      { kind: C, fill: color, size: 50 }
    ]
  ];
  
  const opts = [
    { stack: correctAns, isCorrect: true },
    { stack: distractors[0], isCorrect: false },
    { stack: distractors[1], isCorrect: false },
    { stack: distractors[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctOptId = 'A';
  
  const options = shuffledOpts.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctOptId = id;
    
    // We map arrays to a stack
    const mappedStack = opt.stack.map((item, idx) => ({ ...item, size: 40, cx: 30 + idx * 40 }));
    
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `bs-${id}`,
      visualData: { stack: mappedStack }
    };
  });

  return {
    id: `bs-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'balance_scale',
    category: 'logic',
    difficulty,
    prompt: 'Teraziler dengededir. Buna göre soru işareti olan yere hangi ağırlıklar gelmelidir?',
    visualConfig: {
      displayMode: 'balance_scale',
      scales: [
        { left: [{ kind: A, fill: color }], right: [{ kind: B, fill: color }, { kind: B, fill: color }] },
        { left: [{ kind: B, fill: color }], right: [{ kind: C, fill: color }, { kind: C, fill: color }] },
        { left: [{ kind: A, fill: color }], right: '?' }
      ]
    },
    options,
    correctOptionId: correctOptId,
    explanation: {
      summary: 'Her terazi kefesindeki şekillerin değerleri birbirine eşittir.',
      ruleTitle: 'Eşitlik ve Denklem',
      steps: [
        'Birinci teraziden şekillerin birbirine göre ağırlık oranını bulun.',
        'İkinci terazideki oranı birinciyle birleştirin.',
        'Bulunan oranlara göre son teraziyi dengeleyin.'
      ]
    }
  };
}

function randomShape(rng: SeededRNG) {
  return rng.pick(SHAPES_POOL);
}

// 23. Dişli Çarklar (Gear Rotation)
export function generateGearRotationQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // Create a sequence of 3 or 4 gears
  // G1 turns CW -> G2 turns CCW -> G3 turns CW
  // We'll ask about the last gear's direction.
  const numGears = difficulty > 3 ? 4 : 3;
  const startDir = rng.pick(['clockwise', 'counter_clockwise']);
  
  let targetDir = startDir;
  for (let i = 1; i < numGears; i++) {
    targetDir = targetDir === 'clockwise' ? 'counter_clockwise' : 'clockwise';
  }
  
  const rawOptions = [
    { text: 'Saat Yönünde (Sağa ↻)', isCorrect: targetDir === 'clockwise' },
    { text: 'Ters Yönde (Sola ↺)', isCorrect: targetDir === 'counter_clockwise' },
    { text: 'Dönmez (Kilitlenir ⛔)', isCorrect: false },
    { text: 'İki Yöne Birden ⇄', isCorrect: false },
  ];

  const shuffled = rng.shuffle(rawOptions);
  let correctOptId = 'A';
  const options = shuffled.map((opt, idx) => {
    const id = ['A', 'B', 'C', 'D'][idx];
    if (opt.isCorrect) correctOptId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `gr-${opt.text}`,
      visualData: { textNumber: opt.text },
    };
  });
  
  const gearsConfig = [];
  for(let i=0; i<numGears; i++) {
    gearsConfig.push({
      id: i+1,
      color: rng.pickUnique(COLORS_POOL, numGears)[i],
      size: rng.pick([40, 50, 60]),
      startDir: i === 0 ? startDir : '?'
    });
  }

  return {
    id: `gr-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: ['Uzamsal Rotasyon', 'Mekanik Akıl Yürütme', 'Neden-Sonuç İlişkisi'],
    seed,
    type: 'gear_rotation',
    category: 'spatial',
    difficulty,
    prompt: `1. dişli ${startDir === 'clockwise' ? 'saat yönünde (sağa)' : 'saat yönünün tersine (sola)'} dönmektedir. ${numGears}. (son) dişli hangi yöne döner?`,
    visualConfig: {
      displayMode: 'gear_system',
      gears: gearsConfig
    },
    options,
    correctOptionId: correctOptId,
    explanation: {
      summary: 'Birbirine temas eden dişliler zıt yönlere döner.',
      ruleTitle: 'Mekanik Hareket ve Dişli Kuralı',
      steps: [
        `1. dişli ${startDir === 'clockwise' ? 'saat yönüne' : 'saat yönünün tersine'} dönmektedir.`,
        'Her bir dişli temas ettiği komşu dişliyi ters yöne çevirir (1. Dişli -> 2. Dişli zıt -> 3. Dişli zıt...).',
        `Sonuç olarak ${numGears}. dişli ${targetDir === 'clockwise' ? 'Saat Yönünde (Sağa ↻)' : 'Ters Yönde (Sola ↺)'} döner.`
      ]
    }
  };
}

// 24. Kağıt Katlama (Paper Folding)
export function generatePaperFoldingQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // We represent a paper as a square grid (2x2 for simplicity).
  // Step 1: Fold half (left to right) -> leaves right half.
  // Step 2: Cut a hole in the remaining piece.
  // Unfold: Where are the holes?
  // We'll visually just show steps: [Square] -> [Half Square] -> [Half Square with hole]
  const holePos = rng.pick(['center', 'top_left', 'bottom_right']);
  
  // Generate visual steps
  const steps = [
    { type: 'paper_full' },
    { type: 'paper_folded_half' },
    { type: `paper_folded_hole_${holePos}` }
  ];
  
  const targetPattern = `unfolded_hole_${holePos}`;
  const distractors = ['unfolded_hole_center', 'unfolded_hole_top_left', 'unfolded_hole_bottom_right', 'unfolded_hole_corner'].filter(x => x !== targetPattern);
  
  const opts = [
    { pattern: targetPattern, isCorrect: true },
    { pattern: distractors[0], isCorrect: false },
    { pattern: distractors[1], isCorrect: false },
    { pattern: distractors[2], isCorrect: false }
  ];
  
  const shuffled = rng.shuffle(opts);
  let correctId = 'A';
  const options = shuffled.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `pf-${id}`,
      visualData: { paperPattern: opt.pattern }
    };
  });

  return {
    id: `pf-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'paper_folding',
    category: 'spatial',
    difficulty,
    prompt: 'Kare şeklindeki bir kağıt ok yönünde katlanıp üzerinde bir delik açılıyor. Kağıt tekrar açıldığında nasıl görünür?',
    visualConfig: {
      displayMode: 'paper_folding',
      steps
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Kağıt açıldığında kesik simetrik olarak diğer yarıya da yansır.',
      ruleTitle: 'Katlama ve Simetri',
      steps: [
        'Kağıdın son halindeki deliğin konumuna bakın.',
        'Katlama çizgisini bir ayna gibi düşünün.',
        'Deliği katlama çizgisine göre aynalayarak tam açılmış kağıttaki delik yerlerini bulun.'
      ]
    }
  };
}

// 25. Venn Şeması (Venn Diagram)
export function generateVennDiagramQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const shapes = rng.pickUnique(SHAPES_POOL, 3);
  const color1 = PALETTE.blue;
  const color2 = PALETTE.rose;
  
  // Rule: Blue circle = shapes with corners (Square, Triangle)
  // Rose circle = shapes with curves (Circle, Pacman)
  // This is too hard to hardcode universally, let's just do a visual logic puzzle:
  // "Hangi şekil hem mavi hem de kırmızı çemberin içindedir (Kesişim)?"
  const inBlue = [shapes[0], shapes[1]];
  const inRose = [shapes[1], shapes[2]];
  const target = shapes[1]; // intersection
  
  const opts = [
    { kind: target, isCorrect: true },
    { kind: shapes[0], isCorrect: false },
    { kind: shapes[2], isCorrect: false },
    { kind: randomShape(rng), isCorrect: false }
  ];
  
  const shuffled = rng.shuffle(opts);
  let correctId = 'A';
  const options = shuffled.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `vd-${id}`,
      visualData: { kind: opt.kind, fill: PALETTE.indigo }
    };
  });

  return {
    id: `vd-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'venn_diagram',
    category: 'logic',
    difficulty,
    prompt: 'Mavi küme ve kırmızı kümenin ortak (kesişim) alanında hangi şekil bulunmalıdır?',
    visualConfig: {
      displayMode: 'venn_diagram',
      leftSet: { color: color1, items: inBlue },
      rightSet: { color: color2, items: inRose },
      intersection: target
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Kesişim bölgesi, her iki kümenin de özelliklerini taşıyan (veya her iki alanda da yer alan) elemanları içerir.',
      ruleTitle: 'Kesişim (Venn Şeması)',
      steps: [
        'Mavi çemberin içindeki şekilleri inceleyin.',
        'Kırmızı çemberin içindeki şekilleri inceleyin.',
        'Ortada her ikisine de dahil olan şekil ortak elemandır.'
      ]
    }
  };
}

// 26. Küp Sayma (Cube Counting)
export function generateCubeCountingQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  // grid max 3x3
  const gridSize = difficulty > 3 ? 4 : 3;
  const cubes: {x: number, y: number, z: number}[] = [];
  
  // Create a base layer
  const grid: number[][] = [];
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[x][y] = 0;
    }
  }
  
  // Randomly add blocks. Max height = difficulty
  const maxH = Math.min(difficulty + 1, 5);
  const numStacks = rng.nextInt(3, gridSize * gridSize - 1);
  
  for(let i=0; i<numStacks; i++) {
     const cx = rng.nextInt(0, gridSize-1);
     const cy = rng.nextInt(0, gridSize-1);
     const h = rng.nextInt(1, maxH);
     grid[cx][cy] = Math.max(grid[cx][cy], h);
  }
  
  let totalCubes = 0;
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const h = grid[x][y];
      for(let z=0; z<h; z++) {
        cubes.push({x, y, z});
        totalCubes++;
      }
    }
  }
  
  const optionsVal = [totalCubes];
  while(optionsVal.length < 4) {
     const w = totalCubes + rng.nextInt(-3, 3);
     if(w > 0 && !optionsVal.includes(w)) {
       optionsVal.push(w);
     }
  }
  
  const shuffled = rng.shuffle(optionsVal);
  let correctId = 'A';
  const options = shuffled.map((v, i) => {
    const id = ['A','B','C','D'][i];
    if (v === totalCubes) correctId = id;
    return {
      id,
      label: v.toString(),
      fingerprint: `cc-${id}`,
      visualData: { textNumber: v }
    };
  });
  
  return {
    id: `cc-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'cube_counting',
    category: 'attention',
    difficulty,
    prompt: 'Yukarıdaki yapıda toplam kaç adet küp bulunmaktadır?',
    visualConfig: {
      displayMode: 'cube_stack',
      cubes: cubes
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Görünmeyen (altta kalan) küpleri de saymayı unutmayın.',
      ruleTitle: 'Küp Sayma',
      steps: [
        'Her bir sütundaki küp sayısını ayrı ayrı hesaplayın.',
        'Üstteki küplerin havada duramayacağını, altlarında onları destekleyen küpler olduğunu unutmayın.',
        `Yapıda toplam ${totalCubes} adet küp vardır.`
      ]
    }
  };
}

// 27. Küp Açılımı (Dice Unfold)
export function generateDiceUnfoldQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const shapes = rng.pickUnique(SHAPES_POOL, 6);
  
  const targetIndex = rng.nextInt(0, 5);
  // Opposite mapping for cross net: 
  // 0-4, 1-3, 2-5
  const oppositeMap: Record<number, number> = {
    0: 4, 1: 3, 2: 5, 3: 1, 4: 0, 5: 2
  };
  
  const oppIndex = oppositeMap[targetIndex];
  
  const targetShape = shapes[targetIndex];
  const oppShape = shapes[oppIndex];
  
  const distractors = shapes.filter(s => s !== oppShape && s !== targetShape).slice(0, 3);
  
  const opts = [
    { kind: oppShape, isCorrect: true },
    { kind: distractors[0], isCorrect: false },
    { kind: distractors[1], isCorrect: false },
    { kind: distractors[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  const options = shuffledOpts.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `du-${id}`,
      visualData: { kind: opt.kind, fill: PALETTE.indigo }
    };
  });

  return {
    id: `du-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'dice_unfold',
    category: 'spatial',
    difficulty,
    prompt: 'Yukarıdaki küp açılımı kapatılarak bir küp yapıldığında, HEDEF ile belirtilen yüzeyin karşısına (tam arkasına) hangi şekil gelir?',
    visualConfig: {
      displayMode: 'dice_net',
      netFaces: shapes,
      targetIndex: targetIndex,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Küp kapatıldığında birbirine temas etmeyen, aralarında 1 kare boşluk olan yüzeyler karşılıklı gelir.',
      ruleTitle: 'Küp Açılımı',
      steps: [
        'Küp açılımında yatay ve dikey düzlemde bir atlayarak sayın.',
        'Hedef şeklin bulunduğu kareden düz bir çizgide bir kare atladığınızda karşısına gelen şekli bulursunuz.'
      ]
    }
  };
}

// 28. Şifreli Sözcükler (Cryptogram)
export function generateCryptogramQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const letters = ['K', 'A', 'L', 'E', 'M', 'R', 'T', 'S'];
  const subset = rng.pickUnique(letters, 5);
  
  const digits = ['1','2','3','4','5','6','7','8','9'];
  const mappedDigits = rng.pickUnique(digits, 5);
  
  const map: Record<string, string> = {};
  subset.forEach((l, i) => map[l] = mappedDigits[i]);
  
  const generateWord = (len: number) => {
    let w = '';
    for(let i=0; i<len; i++) w += rng.pick(subset);
    return w;
  };
  
  const word1 = generateWord(4);
  const word2 = generateWord(4);
  const word3 = generateWord(4);
  const targetWord = generateWord(4);
  
  const getCode = (w: string) => w.split('').map(c => map[c]).join('');
  
  const code1 = getCode(word1);
  const code2 = getCode(word2);
  const code3 = getCode(word3);
  const targetCode = getCode(targetWord);
  
  const distractors: string[] = [];
  while(distractors.length < 3) {
    const arr = targetCode.split('');
    const a = rng.nextInt(0, 3);
    const b = rng.nextInt(0, 3);
    const temp = arr[a]; arr[a] = arr[b]; arr[b] = temp;
    
    let fakeCode = '';
    for(let i=0; i<4; i++) fakeCode += rng.pick(mappedDigits);
    
    const possibleFake = rng.pick([arr.join(''), fakeCode]);
    
    if (possibleFake !== targetCode && !distractors.includes(possibleFake)) {
      distractors.push(possibleFake);
    }
  }
  
  const opts = [
    { code: targetCode, isCorrect: true },
    { code: distractors[0], isCorrect: false },
    { code: distractors[1], isCorrect: false },
    { code: distractors[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  const options = shuffledOpts.map((opt, i) => {
    const id = ['A','B','C','D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: opt.code,
      fingerprint: `crypto-${id}`,
      visualData: { textNumber: opt.code }
    };
  });

  return {
    id: `crypto-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'cryptogram',
    category: 'logic',
    difficulty,
    prompt: 'Yukarıdaki harfler ve rakamlar arasında belirli bir şifreleme kuralı vardır. Buna göre soru işaretli yere hangi şifre gelmelidir?',
    visualConfig: {
      displayMode: 'cryptogram',
      pairs: [
        { word: word1, code: code1 },
        { word: word2, code: code2 },
        { word: word3, code: code3 },
        { word: targetWord, code: '?' }
      ]
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Her bir harf sabit bir rakamla eşleştirilmiştir.',
      ruleTitle: 'Şifre Çözme',
      steps: [
        'Verilen kelimelerdeki aynı harflerin hangi rakamlara denk geldiğini bulun.',
        'Örneğin, tekrar eden harflere ve rakamlara dikkat edin.',
        `Elde ettiğiniz şifre anahtarıyla ${targetWord} kelimesinin karşılığını bulun.`
      ]
    }
  };
}
