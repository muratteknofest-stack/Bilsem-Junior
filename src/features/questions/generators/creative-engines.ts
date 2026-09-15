import { BaseQuestion, DifficultyLevel } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { PALETTE } from '../../../lib/svg-primitives';

/**
 * 35. Tangram ve Şekil İnşası (Tangram Puzzle)
 * Öğrencinin parça-bütün, geometri ve zihinsel birleştirme becerilerini ölçer.
 */
export function generateTangramPuzzleQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // Available silhouettes: 'house', 'rocket', 'boat', 'swan', 'arrow', 'crown'
  const silhouettes = [
    { id: 'house', name: 'Ev', pieces: ['large_triangle_1', 'large_triangle_2', 'medium_triangle', 'small_triangle', 'square'], missingPiece: 'square' },
    { id: 'boat', name: 'Yelkenli', pieces: ['large_triangle_1', 'large_triangle_2', 'parallelogram', 'small_triangle_1'], missingPiece: 'parallelogram' },
    { id: 'rocket', name: 'Roket', pieces: ['large_triangle_1', 'large_triangle_2', 'square', 'small_triangle_1', 'small_triangle_2'], missingPiece: 'small_triangle_1' },
    { id: 'arrow', name: 'Büyük Ok', pieces: ['large_triangle_1', 'large_triangle_2', 'parallelogram', 'square'], missingPiece: 'large_triangle_1' },
    { id: 'crown', name: 'Taç', pieces: ['large_triangle_1', 'small_triangle_1', 'small_triangle_2', 'square', 'parallelogram'], missingPiece: 'small_triangle_2' },
  ];

  const target = rng.pick(silhouettes);
  const color = rng.pick([PALETTE.indigo, PALETTE.purple, PALETTE.teal, PALETTE.blue, PALETTE.rose]);

  const pieceNames: Record<string, string> = {
    large_triangle_1: 'Büyük Dik Üçgen',
    large_triangle_2: 'Büyük İkizkenar Üçgen',
    medium_triangle: 'Orta Boy Üçgen',
    small_triangle: 'Küçük Üçgen',
    small_triangle_1: 'Küçük Üçgen (1)',
    small_triangle_2: 'Küçük Üçgen (2)',
    square: 'Kare Parça',
    parallelogram: 'Paralelkenar',
  };

  const allPossiblePieces = ['square', 'large_triangle_1', 'small_triangle_1', 'parallelogram', 'medium_triangle'];
  const correctPiece = target.missingPiece;
  const distractors = rng.shuffle(allPossiblePieces.filter(p => p !== correctPiece)).slice(0, 3);

  const rawOpts = [
    { piece: correctPiece, isCorrect: true },
    { piece: distractors[0], isCorrect: false },
    { piece: distractors[1], isCorrect: false },
    { piece: distractors[2], isCorrect: false },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: pieceNames[opt.piece] || 'Geometrik Parça',
      fingerprint: `tangram-${opt.piece}-${id}`,
      visualData: {
        tangramPiece: opt.piece,
        color,
      },
    };
  });

  return {
    id: `tangram-${seed}`,
    version: 1,
    type: 'tangram_puzzle',
    category: 'visual_perception',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4',
    estimatedSeconds: 35,
    skills: ['Geometrik Ayrıştırma', 'Parça-Bütün', 'Uzamsal Zeka'],
    seed,
    prompt: `Aşağıda tangram parçalarıyla oluşturulan "${target.name}" silüeti verilmiştir. Yapbozu eksiksiz tamamlamak için "?" ile gösterilen boşluğa hangi parça yerleştirilmelidir?`,
    visualConfig: {
      displayMode: 'tangram_puzzle',
      silhouetteId: target.id,
      silhouetteName: target.name,
      pieces: target.pieces,
      missingPiece: target.missingPiece,
      color,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Silüetteki boşluk analiz edildiğinde, doğru parçanın "${pieceNames[correctPiece]}" olduğu net biçimde görülür.`,
      ruleTitle: 'Tangram Parça Tamamlama Mantığı',
      steps: [
        `Hedef şekil olan "${target.name}" silüetindeki mevcut parçaların sınırları ve açıları incelenir.`,
        `Eksik olan bölgenin açıları ve kenar uzunlukları hesaplandığında bir "${pieceNames[correctPiece]}" gerekmektedir.`,
        `Bu nedenle doğru cevap ${correctId} seçeneğidir.`,
      ],
    },
  };
}

/**
 * 36. Labirent ve Rota Kodlama (Maze Path Navigation)
 * Algoritmik düşünme, yön takibi ve sıralı komut çalıştırma becerisini ölçer.
 */
export function generateMazePathQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const gridSize = difficulty <= 2 ? 4 : 5;

  const targets = [
    { id: 'star', symbol: '⭐', label: 'Yıldız' },
    { id: 'diamond', symbol: '💎', label: 'Elmas' },
    { id: 'key', symbol: '🔑', label: 'Altın Anahtar' },
    { id: 'apple', symbol: '🍎', label: 'Elma' },
  ];

  // Starting position at (0, 0)
  let curX = 0;
  let curY = 0;

  const stepCount = difficulty <= 2 ? rng.nextInt(3, 4) : rng.nextInt(4, 6);
  const commands: { dir: 'U' | 'D' | 'L' | 'R'; steps: number; text: string }[] = [];

  for (let s = 0; s < stepCount; s++) {
    const possibleDirs: ('U' | 'D' | 'L' | 'R')[] = [];
    if (curX > 0) possibleDirs.push('L');
    if (curX < gridSize - 1) possibleDirs.push('R');
    if (curY > 0) possibleDirs.push('U');
    if (curY < gridSize - 1) possibleDirs.push('D');

    const chosenDir = rng.pick(possibleDirs);
    let maxSteps = 1;
    if (chosenDir === 'L') maxSteps = curX;
    if (chosenDir === 'R') maxSteps = (gridSize - 1) - curX;
    if (chosenDir === 'U') maxSteps = curY;
    if (chosenDir === 'D') maxSteps = (gridSize - 1) - curY;

    const steps = rng.nextInt(1, Math.min(maxSteps, 2));
    if (chosenDir === 'L') curX -= steps;
    if (chosenDir === 'R') curX += steps;
    if (chosenDir === 'U') curY -= steps;
    if (chosenDir === 'D') curY += steps;

    const dirTexts = {
      U: `${steps} Birim Yukarı ⬆️`,
      D: `${steps} Birim Aşağı ⬇️`,
      L: `${steps} Birim Sola ⬅️`,
      R: `${steps} Birim Sağa ➡️`,
    };

    commands.push({ dir: chosenDir, steps, text: dirTexts[chosenDir] });
  }

  // End position has target 0
  const targetPositions: { x: number; y: number; target: typeof targets[0] }[] = [
    { x: curX, y: curY, target: targets[0] },
  ];

  // Distribute other targets on the grid
  const usedCoords = new Set([`${curX},${curY}`, '0,0']);
  for (let t = 1; t < 4; t++) {
    let rx = rng.nextInt(0, gridSize - 1);
    let ry = rng.nextInt(0, gridSize - 1);
    while (usedCoords.has(`${rx},${ry}`)) {
      rx = rng.nextInt(0, gridSize - 1);
      ry = rng.nextInt(0, gridSize - 1);
    }
    usedCoords.add(`${rx},${ry}`);
    targetPositions.push({ x: rx, y: ry, target: targets[t] });
  }

  const rawOpts = targets.map((t, idx) => ({
    target: t,
    isCorrect: idx === 0,
  }));

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `${opt.target.symbol} ${opt.target.label}`,
      fingerprint: `maze-opt-${opt.target.id}-${id}`,
      visualData: { target: opt.target },
    };
  });

  return {
    id: `maze-${seed}`,
    version: 1,
    type: 'maze_path',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4',
    estimatedSeconds: 40,
    skills: ['Algoritmik Düşünme', 'Yön ve Koordinat Takibi', 'Uzamsal Planlama'],
    seed,
    prompt: 'Roket (🚀) başlangıç noktasından hareket ederek aşağıdaki kodlama komutlarını sırasıyla uygulamıştır. Roket hangi hedefe ulaşır?',
    visualConfig: {
      displayMode: 'maze_path',
      gridSize,
      start: { x: 0, y: 0 },
      commands,
      targetPositions,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Komutlar sırayla takip edildiğinde ulaşılan nihai koordinat (${curX + 1}. sütun, ${curY + 1}. satır) üzerinde ${targets[0].symbol} ${targets[0].label} bulunmaktadır.`,
      ruleTitle: 'Adım Adım Rota Takibi',
      steps: [
        'Başlangıç noktası: (1,1) [Sol üst köşe]',
        ...commands.map((c, i) => `${i + 1}. Adım: ${c.text}`),
        `Sonuç: Rota ${targets[0].label} (${targets[0].symbol}) ile sonlanmaktadır. Doğru seçenek ${correctId}'dir.`,
      ],
    },
  };
}

/**
 * 37. Mantık Tablosu ve Çıkarım (Logic Grid Puzzle)
 * Koşullu düşünme, eleme yöntemi ve mantıksal çıkarım becerilerini ölçer.
 */
export function generateLogicGridQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  const scenarioSets = [
    {
      names: ['Ali', 'Burak', 'Can', 'Deniz'],
      items: ['Kırmızı Bisiklet', 'Mavi Bisiklet', 'Yeşil Bisiklet', 'Sarı Bisiklet'],
      itemType: 'bisiklete',
    },
    {
      names: ['Ece', 'Selin', 'Defne', 'Zeynep'],
      items: ['Piyano', 'Gitar', 'Keman', 'Flüt'],
      itemType: 'enstrümana',
    },
    {
      names: ['Mert', 'Kaan', 'Arda', 'Barış'],
      items: ['Satranç Kulübü', 'Robotik Kulübü', 'Resim Kulübü', 'Yüzme Kulübü'],
      itemType: 'kulübe',
    },
  ];

  const scenario = rng.pick(scenarioSets);
  const n = difficulty <= 2 ? 3 : 4;
  const names = scenario.names.slice(0, n);
  const items = scenario.items.slice(0, n);

  // Match: names[i] -> items[i]
  const matched = rng.shuffle(items);

  // Generate clues
  const clues: string[] = [];
  clues.push(`${names[0]} kesinlikle ${matched[0]} sahibidir / katılmaktadır.`);
  clues.push(`${names[1]}, ${matched[1]} veya ${matched[2]} ile ilgilenmemektedir.`);
  if (n === 4) {
    clues.push(`${names[2]}, ${matched[0]} ve ${matched[3]} sahibi değildir.`);
  }

  const askedPersonIdx = rng.nextInt(1, n - 1);
  const askedPerson = names[askedPersonIdx];
  const correctItem = matched[askedPersonIdx];

  const distractors = matched.filter(item => item !== correctItem);
  const rawOpts = [
    { item: correctItem, isCorrect: true },
    { item: distractors[0], isCorrect: false },
    { item: distractors[1], isCorrect: false },
    ...(n === 4 && distractors[2] ? [{ item: distractors[2], isCorrect: false }] : [{ item: 'Hiçbiri', isCorrect: false }]),
  ];

  const shuffled = rng.shuffle(rawOpts.slice(0, 4));
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: opt.item,
      fingerprint: `logic-opt-${id}`,
      visualData: { text: opt.item },
    };
  });

  return {
    id: `logicgrid-${seed}`,
    version: 1,
    type: 'logic_grid',
    category: 'logic',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4',
    estimatedSeconds: 45,
    skills: ['Mantıksal Çıkarım', 'Eleme Yöntemi', 'Koşullu Akıl Yürütme'],
    seed,
    prompt: `Verilen ipuçlarına göre ${askedPerson} hangi ${scenario.itemType} sahiptir?`,
    visualConfig: {
      displayMode: 'logic_grid',
      scenarioTitle: `${names.join(', ')} ve İpuçları`,
      clues,
      names,
      items: matched,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `İpuçları tablo şeklinde eşleştirilip elendiğinde ${askedPerson} kişisinin "${correctItem}" ile eşleştiği kanıtlanır.`,
      ruleTitle: 'Mantıksal Eleme Adımları',
      steps: [
        `1. İpucu: ${clues[0]}`,
        `2. İpucu: ${clues[1]}`,
        `Elenen seçenekler dışarıda bırakıldığında geriye kalan kesin eşleşme ${askedPerson} = ${correctItem} olur.`,
        `Doğru yanıt ${correctId} seçeneğidir.`,
      ],
    },
  };
}

/**
 * 38. Katlama ve Delik Açma (Hole Punch & Paper Folding)
 * Kağıt katlama simetrisi ve zihinsel açılım becerilerini ölçer.
 */
export function generatePunchFoldingQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  // Folding types: 'horizontal_half', 'vertical_half', 'quarter_fold'
  const foldType = difficulty <= 2 ? 'horizontal_half' : 'quarter_fold';

  const punchPositions = ['center', 'top_left', 'top_right', 'bottom_right', 'corner_cut'];
  const punch = rng.pick(punchPositions);

  const rawOpts = [
    { idTag: 'correct', unfoldedHoles: foldType === 'horizontal_half' ? 2 : 4, punchType: punch, isCorrect: true },
    { idTag: 'wrong_count', unfoldedHoles: foldType === 'horizontal_half' ? 1 : 2, punchType: punch, isCorrect: false },
    { idTag: 'wrong_pos', unfoldedHoles: foldType === 'horizontal_half' ? 2 : 4, punchType: 'opposite', isCorrect: false },
    { idTag: 'wrong_all', unfoldedHoles: foldType === 'horizontal_half' ? 4 : 8, punchType: punch, isCorrect: false },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `Açılmış Şekil ${id}`,
      fingerprint: `punch-${opt.idTag}-${id}`,
      visualData: {
        punchOpt: opt,
        foldType,
      },
    };
  });

  return {
    id: `punch-${seed}`,
    version: 1,
    type: 'punch_folding',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4',
    estimatedSeconds: 40,
    skills: ['Zihinsel Katlama', 'Ayna Simetrisi', 'Uzamsal Dönüşüm'],
    seed,
    prompt: 'Kare bir kağıt ok yönlerinde katlanmış ve ardından işaretli noktadan delinmiştir. Kağıt tamamen açıldığında deliklerin görünümü nasıl olur?',
    visualConfig: {
      displayMode: 'punch_folding',
      foldType,
      punchPosition: punch,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Kağıt katlanıp delindikten sonra her katlama çizgisi bir ayna ekseni oluşturur. Toplam delik sayısı ${foldType === 'horizontal_half' ? '2' : '4'} adet olmalıdır.`,
      ruleTitle: 'Katlama ve Simetri Kuralı',
      steps: [
        `Kağıt ${foldType === 'horizontal_half' ? 'ortadan ikiye' : 'iki kez katlanarak 4 kata'} dönüştürülmüştür.`,
        'Açıldığında deliklerin simetrik yansımaları katlama eksenlerinin her iki tarafında yer alır.',
        `Doğru simetriye ve delik dağılımına sahip seçenek ${correctId}'dir.`,
      ],
    },
  };
}

/**
 * 39. Detay Fark Etme ve Eksik Sembol (Detail Detection)
 * Görsel dikkat, ince farkları yakalama ve mikroskopik detay analizini ölçer.
 */
export function generateDetailDetectionQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  const shapes = ['star', 'gear', 'flower', 'shield', 'compass'];
  const baseShape = rng.pick(shapes);

  const colors = [PALETTE.indigo, PALETTE.purple, PALETTE.blue, PALETTE.teal];
  const mainColor = rng.pick(colors);

  // Detail variation: 'missing_dot', 'extra_line', 'rotated_center', 'inverted_leaf'
  const variations = ['Eksik İç Nokta', 'Fazla Kenar Çizgisi', 'Farklı Merkez Açısı', 'Ters Dönmüş Detay'];
  const correctVariation = variations[0];

  const rawOpts = [
    { label: 'Orijinal Şekil', isDifferent: false, diffDesc: 'Kusursuz Orijinal' },
    { label: 'Hafif Farklı (A)', isDifferent: false, diffDesc: 'Doğru Detay' },
    { label: 'Kusurlu / Farklı Şekil', isDifferent: true, diffDesc: correctVariation },
    { label: 'Hafif Farklı (B)', isDifferent: false, diffDesc: 'Doğru Detay' },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isDifferent) correctId = id;
    return {
      id,
      label: `Şekil ${id}`,
      fingerprint: `detail-${id}-${opt.isDifferent}`,
      visualData: {
        baseShape,
        isDifferent: opt.isDifferent,
        color: mainColor,
      },
    };
  });

  return {
    id: `detail-${seed}`,
    version: 1,
    type: 'detail_detection',
    category: 'attention',
    difficulty,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: ['Görsel Dikkat', 'Detay Ayrıştırma', 'Mikro Karşılaştırma'],
    seed,
    prompt: 'Aşağıdaki seçeneklerde verilen şekillerden biri diğerlerinden ince bir detay (iç nokta veya çizgi eksikliği) ile ayrılmaktadır. Farklı olan hangisidir?',
    visualConfig: {
      displayMode: 'detail_detection',
      baseShape,
      color: mainColor,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Tüm şekiller dikkatle incelendiğinde ${correctId} seçeneğinde yer alan şeklin iç detayının (${correctVariation}) diğerlerinden farklı olduğu görülür.`,
      ruleTitle: 'İnce Detay Karşılaştırma',
      steps: [
        'Şekillerin köşe sayıları, iç sembolleri ve simetri çizgileri tek tek karşılaştırılır.',
        `${correctId} seçeneğinde bir iç elemanın eksik veya farklı konumda olduğu saptanır.`,
        `Bu nedenle farklı olan seçenek ${correctId}'dir.`,
      ],
    },
  };
}

/**
 * 40. Ağırlık Sıralama ve Kütle Dengesi (Weight Comparison)
 * Eşit kollu teraziler, geçişlilik özelliği ve orantısal akıl yürütmeyi ölçer.
 */
export function generateWeightComparisonQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  const objects = [
    { id: 'cube', name: 'Mavi Küp 🟦', weight: 3 },
    { id: 'sphere', name: 'Kırmızı Küre 🔴', weight: 2 },
    { id: 'pyramid', name: 'Sarı Piramit 🔺', weight: 1 },
    { id: 'cylinder', name: 'Yeşil Silindir 🟩', weight: 4 },
  ];

  // Scale 1: 1 Cylinder = 2 Spheres (4 = 4)
  // Scale 2: 1 Cube = 1 Sphere + 1 Pyramid (3 = 2 + 1)
  // Question: En ağır cisim hangisidir? veya 1 Cylinder kaç Piramite eşittir?
  const questionModes = ['heaviest', 'lightest', 'equivalence'];
  const qMode = rng.pick(questionModes);

  let prompt = '';
  let correctId = 'A';
  let rawOpts: { label: string; isCorrect: boolean }[] = [];

  if (qMode === 'heaviest') {
    prompt = 'Yukarıdaki dengede duran terazilere göre kütlesi EN AĞIR olan cisim hangisidir?';
    rawOpts = [
      { label: 'Yeşil Silindir (🟩)', isCorrect: true },
      { label: 'Mavi Küp (🟦)', isCorrect: false },
      { label: 'Kırmızı Küre (🔴)', isCorrect: false },
      { label: 'Sarı Piramit (🔺)', isCorrect: false },
    ];
  } else if (qMode === 'lightest') {
    prompt = 'Yukarıdaki dengede duran terazilere göre kütlesi EN HAFİF olan cisim hangisidir?';
    rawOpts = [
      { label: 'Sarı Piramit (🔺)', isCorrect: true },
      { label: 'Kırmızı Küre (🔴)', isCorrect: false },
      { label: 'Mavi Küp (🟦)', isCorrect: false },
      { label: 'Yeşil Silindir (🟩)', isCorrect: false },
    ];
  } else {
    prompt = 'Terazilerdeki denge durumuna göre 1 Yeşil Silindir (🟩) kaç adet Sarı Piramit (🔺) ile dengelenir?';
    rawOpts = [
      { label: '4 adet 🔺', isCorrect: true },
      { label: '3 adet 🔺', isCorrect: false },
      { label: '2 adet 🔺', isCorrect: false },
      { label: '5 adet 🔺', isCorrect: false },
    ];
  }

  const shuffled = rng.shuffle(rawOpts);
  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: opt.label,
      fingerprint: `weight-${id}`,
      visualData: { label: opt.label },
    };
  });

  return {
    id: `weight-${seed}`,
    version: 1,
    type: 'weight_comparison',
    category: 'numerical',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4',
    estimatedSeconds: 40,
    skills: ['Matematiksel Mantık', 'Eşitlik & Denge', 'Geçişlilik Özelliği'],
    seed,
    prompt,
    visualConfig: {
      displayMode: 'weight_comparison',
      scales: [
        { left: ['🟩'], right: ['🔴', '🔴'], balanced: true },
        { left: ['🟦'], right: ['🔴', '🔺'], balanced: true },
        { left: ['🔴'], right: ['🔺', '🔺'], balanced: true },
      ],
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Terazilerdeki nesneler birbirinin cinsinden yazıldığında: 1 🔺 = 1 birim, 1 🔴 = 2 birim, 1 🟦 = 3 birim, 1 🟩 = 4 birim olduğu bulunur.',
      ruleTitle: 'Kütle Denge Çözümü',
      steps: [
        '1 🔴 = 2 🔺 eşitliğinden hareketle en küçük birim 🔺 kabul edilir.',
        '1 🟦 = 1 🔴 + 1 🔺 = 3 🔺 eder.',
        '1 🟩 = 2 🔴 = 4 🔺 eder.',
        `Buna göre aranan sonuç ${correctId} seçeneğidir.`,
      ],
    },
  };
}

/**
 * 41. 3B Perspektif ve Çok Yönlü Görünüş (Multiview Perspective)
 * İzometrik 3 boyutlu blokların önden, sağdan veya üstten 2B izdüşümlerini buldurur.
 */
export function generateMultiviewPerspectiveQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  const views: ('front' | 'right' | 'top')[] = ['front', 'right', 'top'];
  const targetView = rng.pick(views);

  const viewLabels = {
    front: 'ÖNDEN GÖRÜNÜŞÜ (➡️)',
    right: 'SAĞ YANDAN GÖRÜNÜŞÜ (⬅️)',
    top: 'ÜSTTEN GÖRÜNÜŞÜ (⬇️)',
  };

  // Block grid configuration (3x3 footprint)
  const blocks = [
    { x: 0, y: 0, z: 2 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 1, z: 1 },
    { x: 1, y: 1, z: 3 },
    { x: 2, y: 1, z: 1 },
  ];

  const rawOpts = [
    { idTag: 'correct', isCorrect: true, matrix: [[1, 3, 1], [0, 0, 0]] },
    { idTag: 'distractor_1', isCorrect: false, matrix: [[3, 1, 1], [0, 0, 0]] },
    { idTag: 'distractor_2', isCorrect: false, matrix: [[1, 1, 3], [0, 0, 0]] },
    { idTag: 'distractor_3', isCorrect: false, matrix: [[2, 2, 1], [0, 0, 0]] },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `Görünüş ${id}`,
      fingerprint: `perspective-${opt.idTag}-${id}`,
      visualData: {
        viewOption: opt,
        targetView,
      },
    };
  });

  return {
    id: `perspective-${seed}`,
    version: 1,
    type: 'multiview_perspective',
    category: 'spatial',
    difficulty,
    ageGroup: difficulty <= 2 ? '1-2' : '3-4',
    estimatedSeconds: 45,
    skills: ['3B Uzamsal Düşünme', 'Ortografik İzdüşüm', 'Perspektif Analizi'],
    seed,
    prompt: `Verilen 3 boyutlu yapının ${viewLabels[targetView]} hangi seçenekte doğru olarak gösterilmiştir?`,
    visualConfig: {
      displayMode: 'multiview_perspective',
      blocks,
      targetView,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Yapıya belirtilen yönden bakıldığında en yüksek blokların oluşturduğu silüet incelenir.`,
      ruleTitle: 'İzdüşüm ve Yükseklik Kuralı',
      steps: [
        `${viewLabels[targetView]} bakış doğrultusundaki her sütunun maksimum kat yüksekliği hesaplanır.`,
        `Görünür yükseklik profili doğru eşleştirildiğinde cevap ${correctId} olur.`,
      ],
    },
  };
}

/**
 * 42. Raven İleri Mantık Matrisi (Raven Progressive Matrix)
 * Üst üste bindirme, kesişim silme (XOR) veya parça öteleme kurallarını ölçer.
 */
export function generateRavenMatrixQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  // Matrix rules: 'xor_overlay', 'line_addition', 'dot_shift'
  const rules = ['xor_overlay', 'line_addition', 'dot_shift'];
  const chosenRule = rng.pick(rules);

  const rawOpts = [
    { idTag: 'correct', isCorrect: true, label: 'Doğru Kural Şekli' },
    { idTag: 'wrong_rotation', isCorrect: false, label: 'Ters Çevrilmiş' },
    { idTag: 'wrong_addition', isCorrect: false, label: 'Eksik Çizgili' },
    { idTag: 'wrong_invert', isCorrect: false, label: 'Ters Renk' },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `raven-${opt.idTag}-${id}`,
      visualData: {
        ravenRule: chosenRule,
        optId: opt.idTag,
      },
    };
  });

  return {
    id: `raven-${seed}`,
    version: 1,
    type: 'raven_matrix',
    category: 'matrix',
    difficulty,
    ageGroup: '3-4',
    estimatedSeconds: 50,
    skills: ['Soyut Mantık', 'Raven Matris Kuralı', 'Örüntü ve Dönüşüm'],
    seed,
    prompt: 'Matristeki şekiller satır boyunca belirli bir mantıksal kurala (üst üste bindirme veya ortak parçaları çıkarma) göre ilerlemektedir. "?" yerine hangi şekil gelmelidir?',
    visualConfig: {
      displayMode: 'raven_matrix',
      rule: chosenRule,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Satırdaki 1. ve 2. şekiller üst üste bindiğinde ortak olan çizgiler silinmekte (XOR), farklı çizgiler birleşmektedir.',
      ruleTitle: 'Raven Mantık Matrisi Çözümü',
      steps: [
        'Satır bazında 1. kutu ile 2. kutu karşılaştırılır.',
        'Ortak çizgiler elenip birleşim alındığında 3. kutu elde edilir.',
        `3. satıra aynı kural uygulandığında doğru seçenek ${correctId} olur.`,
      ],
    },
  };
}

/**
 * 43. Şifreli Anagram ve Kelime Mantığı (Word Scramble Logic)
 * Sözel akıl yürütme, harf frekansı ve anlamlı kelime örüntülerini ölçer.
 */
export function generateWordScrambleLogicQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  const wordSets = [
    { scrambled: 'K A L E M', target: 'M E L A K', rule: 'Ters Çevirme', category: 'Kırtasiye' },
    { scrambled: 'K İ T A P', target: 'P A T İ K', rule: 'Yer Değiştirme', category: 'Eğitim' },
    { scrambled: 'D E N İ Z', target: 'Z İ N E D', rule: 'Ters Çevirme', category: 'Doğa' },
    { scrambled: 'G Ü N E Ş', target: 'Ş E N Ü G', rule: 'Ters Çevirme', category: 'Uzay' },
  ];

  const pair = rng.pick(wordSets);
  const rawOpts = [
    { word: pair.target, isCorrect: true },
    { word: pair.scrambled.split(' ').reverse().slice(1).join(' ') + ' X', isCorrect: false },
    { word: pair.target.replace('A', 'E'), isCorrect: false },
    { word: 'K A L P T', isCorrect: false },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: opt.word,
      fingerprint: `anagram-${id}`,
      visualData: { word: opt.word },
    };
  });

  return {
    id: `anagram-${seed}`,
    version: 1,
    type: 'word_scramble_logic',
    category: 'logic',
    difficulty,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: ['Sözel Muhakeme', 'Harf Örüntüsü', 'Anagram Çözümleme'],
    seed,
    prompt: `Verilen harf şifreleme kuralına göre "${pair.scrambled}" ifadesinin şifreli karşılığı hangisidir?`,
    visualConfig: {
      displayMode: 'word_scramble_logic',
      original: pair.scrambled,
      category: pair.category,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Harflerin baştan sona doğru yer değiştirme kuralı (${pair.rule}) uygulandığında doğru sözcük elde edilir.`,
      ruleTitle: 'Şifreli Harf Çözümü',
      steps: [
        `Verilen sözcük: ${pair.scrambled}`,
        `Kural: Harfler sondan başa sıralanmıştır.`,
        `Elde edilen şifreli sonuç: ${pair.target} (Seçenek ${correctId}).`,
      ],
    },
  };
}

/**
 * 44. Zihinsel Kutu ve Açılım Eşleme (Spatial Origami Box)
 * 3B kutu açılımları ve karşılıklı yüzlerin zihinsel eşleştirilmesini ölçer.
 */
export function generateSpatialOrigamiQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);

  const symbols = ['⭐', '🌙', '☀️', '🔷', '🔶', '❤️'];
  const faceSymbols = rng.shuffle(symbols);

  // Opposite faces in a standard t-net: (0, 4), (1, 3), (2, 5)
  const targetFace = faceSymbols[1];
  const oppositeFace = faceSymbols[3];

  const rawOpts = [
    { symbol: oppositeFace, isCorrect: true, label: `Sembol ${oppositeFace}` },
    { symbol: faceSymbols[0], isCorrect: false, label: `Sembol ${faceSymbols[0]}` },
    { symbol: faceSymbols[2], isCorrect: false, label: `Sembol ${faceSymbols[2]}` },
    { symbol: faceSymbols[4], isCorrect: false, label: `Sembol ${faceSymbols[4]}` },
  ];

  const shuffled = rng.shuffle(rawOpts);
  let correctId = 'A';

  const options = shuffled.map((opt, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    if (opt.isCorrect) correctId = id;
    return {
      id,
      label: opt.symbol,
      fingerprint: `origami-${id}`,
      visualData: { symbol: opt.symbol },
    };
  });

  return {
    id: `origami-${seed}`,
    version: 1,
    type: 'spatial_origami',
    category: 'spatial',
    difficulty,
    ageGroup: '3-4',
    estimatedSeconds: 40,
    skills: ['Küp Açılımı', 'Zihinsel Katlama', 'Karşılıklı Yüz Kuralı'],
    seed,
    prompt: `Aşağıda verilen küp açılımı katlanarak kapalı bir küp haline getirildiğinde "${targetFace}" sembolünün tam KARŞISINDAKİ yüzde hangi sembol yer alır?`,
    visualConfig: {
      displayMode: 'spatial_origami',
      faces: faceSymbols,
      targetFace,
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: `Küp açılımlarında arada 1 kare boşluk bırakan yüzler küp kapatıldığında birbirinin tam karşısına gelir.`,
      ruleTitle: 'Karşılıklı Yüz Kuralı',
      steps: [
        'Açılımda aynı doğrultuda yer alan yüzlerde her zaman 1 atlayarak karşılıklı yüz bulunur.',
        `"${targetFace}" sembolünün 1 kare uzağında "${oppositeFace}" sembolü yer almaktadır.`,
        `Bu nedenle karşılıklı gelen sembol ${oppositeFace} olup doğru seçenek ${correctId}'dir.`,
      ],
    },
  };
}
