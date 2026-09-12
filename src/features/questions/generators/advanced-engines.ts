import { BaseQuestion, DifficultyLevel } from '../../../types';
import { SeededRNG } from '../../../lib/rng';
import { PALETTE } from '../../../lib/svg-primitives';

// 29. İşlem Makinesi (Operation Machine)
export function generateOperationMachineQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // Rules: 
  // diff 1-3: Simple addition/subtraction
  // diff 4-6: Multiplication/Division or multiple ops
  let ruleType = rng.nextInt(0, 1);
  if (difficulty >= 4) {
    ruleType = rng.nextInt(0, 3);
  }

  let opStr = '';
  let opFn: (x: number) => number;

  const a = rng.nextInt(2, Math.min(difficulty * 2 + 1, 9));
  
  if (ruleType === 0) { // Addition
    opFn = (x) => x + a;
    opStr = `+ ${a}`;
  } else if (ruleType === 1) { // Subtraction
    opFn = (x) => x - a;
    opStr = `- ${a}`;
  } else if (ruleType === 2) { // Multiplication
    opFn = (x) => x * a;
    opStr = `x ${a}`;
  } else { // Mixed or Division
    if (rng.next() > 0.5) {
      opFn = (x) => x * 2 + a;
      opStr = `x 2 + ${a}`;
    } else {
      opFn = (x) => x * 3 - a;
      opStr = `x 3 - ${a}`;
    }
  }

  // Generate 3 pairs
  const pairs = [];
  const startVals = rng.pickUnique([2,3,4,5,6,7,8,9,10,12,15], 3);
  
  // ensure no negative results for simplicity
  for(let i=0; i<3; i++) {
    let inVal = startVals[i];
    if (ruleType === 1 && inVal <= a) {
      inVal = a + rng.nextInt(1, 5); // ensure positive output
    }
    pairs.push({ in: inVal, out: opFn(inVal) });
  }

  const targetIn = pairs[2].in;
  const targetOut = pairs[2].out;
  pairs[2].out = '?'; // Hide the last one

  const distractors = [];
  while(distractors.length < 3) {
    const fake = targetOut + rng.nextInt(-5, 5);
    if (fake !== targetOut && fake > 0 && !distractors.includes(fake)) {
      distractors.push(fake);
    }
  }

  const opts = [
    { val: targetOut, isCorrect: true },
    { val: distractors[0], isCorrect: false },
    { val: distractors[1], isCorrect: false },
    { val: distractors[2], isCorrect: false }
  ];
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  
  const options = shuffledOpts.map((o, i) => {
    const id = ['A','B','C','D'][i];
    if (o.isCorrect) correctId = id;
    return {
      id,
      label: o.val.toString(),
      fingerprint: `op-${id}`,
      visualData: { textNumber: o.val }
    };
  });

  return {
    id: `opm-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'operation_machine',
    category: 'numerical',
    difficulty,
    prompt: 'İşlem makinesine giren sayılar belirli bir kurala göre değişerek dışarı çıkmaktadır. Buna göre "?" yerine hangi sayı gelmelidir?',
    visualConfig: {
      displayMode: 'operation_machine',
      pairs
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Giren sayılar ile çıkan sayılar arasındaki matematiksel ilişkiyi (artış/azalış miktarı veya katı) bulun.',
      ruleTitle: 'Kural Keşfi',
      steps: [
        `Birinci sayı ${pairs[0].in} girmiş, ${pairs[0].out} çıkmış.`,
        `İkinci sayı ${pairs[1].in} girmiş, ${pairs[1].out} çıkmış.`,
        `Kuralın "${opStr}" olduğu görülmektedir. Buna göre ${targetIn} giren sayı ${targetOut} olarak çıkmalıdır.`
      ]
    }
  };
}

// 30. Üstten Görünüş (Top View)
export function generateTopViewQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const gridSize = difficulty > 3 ? 4 : 3;
  const cubes: {x: number, y: number, z: number}[] = [];
  
  const grid: number[][] = [];
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[x][y] = 0;
    }
  }
  
  const maxH = Math.min(difficulty + 1, 5);
  const numStacks = rng.nextInt(4, gridSize * gridSize - 1);
  
  for(let i=0; i<numStacks; i++) {
     const cx = rng.nextInt(0, gridSize-1);
     const cy = rng.nextInt(0, gridSize-1);
     const h = rng.nextInt(1, maxH);
     grid[cx][cy] = Math.max(grid[cx][cy], h);
  }
  
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const h = grid[x][y];
      for(let z=0; z<h; z++) {
        cubes.push({x, y, z});
      }
    }
  }

  // Generate target 2D grid
  const targetGrid: number[][] = [];
  for (let y = 0; y < gridSize; y++) {
    targetGrid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      targetGrid[y][x] = grid[x][y] > 0 ? 1 : 0;
    }
  }

  const generateFakeGrid = () => {
    const fake = JSON.parse(JSON.stringify(targetGrid));
    const tx = rng.nextInt(0, gridSize-1);
    const ty = rng.nextInt(0, gridSize-1);
    fake[ty][tx] = fake[ty][tx] === 1 ? 0 : 1;
    return fake;
  };

  const distractors = [generateFakeGrid(), generateFakeGrid(), generateFakeGrid()];

  const opts = [
    { grid: targetGrid, isCorrect: true },
    { grid: distractors[0], isCorrect: false },
    { grid: distractors[1], isCorrect: false },
    { grid: distractors[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  
  const options = shuffledOpts.map((o, i) => {
    const id = ['A','B','C','D'][i];
    if (o.isCorrect) correctId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `tv-${id}`,
      visualData: { grid2D: o.grid }
    };
  });

  return {
    id: `tv-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'top_view',
    category: 'spatial',
    difficulty,
    prompt: 'Yukarıdaki 3 boyutlu küp yapısına tam üstten (kuşbakışı) bakıldığında nasıl bir şekil görünür?',
    visualConfig: {
      displayMode: 'cube_stack',
      cubes: cubes
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Kuşbakışı bakıldığında yüksekliklerin önemi kalmaz, sadece hangi karelerin dolu (küp olan) veya boş (küp olmayan) olduğu görünür.',
      ruleTitle: 'Perspektif & İzdüşüm',
      steps: [
        'Zemin düzlemindeki boşluklara dikkat edin.',
        'Bir veya daha fazla küp üst üste binmiş olsa bile, üstten sadece dolu bir kare olarak görünür.',
        'Doğru seçenek yapının 2 boyutlu izdüşümüdür.'
      ]
    }
  };
}

// 31. Şekil Birleştirme (Shape Combination)
export function generateShapeCombinationQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // We'll provide two halves of a shape (like a split circle or split square)
  const baseShape = rng.pick(['circle', 'square', 'triangle', 'hexagon', 'star']);
  
  const targetColor = rng.pick(Object.values(PALETTE));
  
  // distractors will be other complete shapes
  const allShapes = ['circle', 'square', 'triangle', 'hexagon', 'star'];
  const distractorShapes = rng.shuffle(allShapes.filter(s => s !== baseShape)).slice(0, 3);
  
  const opts = [
    { kind: baseShape, isCorrect: true },
    { kind: distractorShapes[0], isCorrect: false },
    { kind: distractorShapes[1], isCorrect: false },
    { kind: distractorShapes[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  
  const options = shuffledOpts.map((o, i) => {
    const id = ['A','B','C','D'][i];
    if (o.isCorrect) correctId = id;
    return {
      id,
      label: `Seçenek ${id}`,
      fingerprint: `sc-${id}`,
      visualData: { kind: o.kind, fill: targetColor }
    };
  });

  return {
    id: `sc-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'shape_combination',
    category: 'visual_perception',
    difficulty,
    prompt: 'Yukarıdaki parçalar uygun şekilde birleştirildiğinde aşağıdaki şekillerden hangisi elde edilir?',
    visualConfig: {
      displayMode: 'shape_pieces',
      targetShape: baseShape,
      color: targetColor
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Parçaların düz ve kıvrımlı kenarlarını zihninizde bir araya getirin.',
      ruleTitle: 'Parça - Bütün İlişkisi',
      steps: [
        'Parçaların dış hatlarını ve köşe açılarını inceleyin.',
        'Parçaları bir puzzle gibi zihninizde kaydırıp birleştirdiğinizde doğru şekli bulursunuz.'
      ]
    }
  };
}

// 32. Sözel Analoji (Verbal Analogy)
const VERBAL_ANALOGIES = [
  { p1: 'Kuş', p2: 'Yuva', q1: 'Arı', q2: 'Kovan', dist: ['Bal', 'Ağaç', 'Çiçek'] },
  { p1: 'Kitap', p2: 'Sayfa', q1: 'Ev', q2: 'Oda', dist: ['Kapı', 'Çatı', 'Pencere'] },
  { p1: 'Güneş', p2: 'Gündüz', q1: 'Ay', q2: 'Gece', dist: ['Yıldız', 'Karanlık', 'Gökyüzü'] },
  { p1: 'Doktor', p2: 'Hastane', q1: 'Öğretmen', q2: 'Okul', dist: ['Öğrenci', 'Sınıf', 'Kitap'] },
  { p1: 'Göz', p2: 'Görmek', q1: 'Kulak', q2: 'Duymak', dist: ['Ses', 'Burun', 'Dinlemek'] },
  { p1: 'Tohum', p2: 'Ağaç', q1: 'Yumurta', q2: 'Kuş', dist: ['Tavuk', 'Yuva', 'Civciv'] },
  { p1: 'Kış', p2: 'Kar', q1: 'Sonbahar', q2: 'Yaprak', dist: ['Rüzgar', 'Soğuk', 'Yağmur'] },
  { p1: 'Gemi', p2: 'Kaptan', q1: 'Uçak', q2: 'Pilot', dist: ['Hostes', 'Yolcu', 'Havaalanı'] },
];

export function generateVerbalAnalogyQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  const data = rng.pick(VERBAL_ANALOGIES);
  
  const opts = [
    { label: data.q2, isCorrect: true },
    { label: data.dist[0], isCorrect: false },
    { label: data.dist[1], isCorrect: false },
    { label: data.dist[2], isCorrect: false },
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  
  const options = shuffledOpts.map((o, i) => {
    const id = ['A','B','C','D'][i];
    if (o.isCorrect) correctId = id;
    return {
      id,
      label: o.label,
      fingerprint: `va-${id}`,
      visualData: { textOnly: o.label }
    };
  });

  return {
    id: `va-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 20,
    skills: [],
    seed,
    type: 'verbal_analogy',
    category: 'logic',
    difficulty,
    prompt: `Aşağıdaki kelimeler arasında bir ilişki vardır. Aynı ilişkiye göre soru işaretli yere ne gelmelidir?`,
    visualConfig: {
      displayMode: 'verbal_analogy',
      pairs: [
        { w1: data.p1, w2: data.p2 },
        { w1: data.q1, w2: '?' }
      ]
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'İlk iki kelime arasındaki ilişkinin aynısı, üçüncü ve dördüncü kelime arasında da olmalıdır.',
      ruleTitle: 'Sözel İlişki Kurma',
      steps: [
        `${data.p1} ve ${data.p2} arasındaki ilişkiyi tanımlayın.`,
        `Bu ilişkinin aynısını ${data.q1} kelimesi için uyguladığınızda cevap ${data.q2} olur.`
      ]
    }
  };
}

// 33. Sayı Piramidi (Number Pyramid)
export function generateNumberPyramidQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  // 3-level pyramid
  //   A
  //  B C
  // D E F
  const D = rng.nextInt(1, 10);
  const E = rng.nextInt(1, 10);
  const F = rng.nextInt(1, 10);
  
  const B = D + E;
  const C = E + F;
  
  const A = B + C;
  
  // We will hide one element.
  const hiddenIdx = rng.nextInt(0, 5); // 0=A, 1=B, 2=C, 3=D, 4=E, 5=F
  const vals = [A, B, C, D, E, F];
  const target = vals[hiddenIdx];
  vals[hiddenIdx] = -1; // -1 means '?'
  
  const distractors = [];
  while (distractors.length < 3) {
    const fake = target + rng.nextInt(-4, 4);
    if (fake !== target && fake > 0 && !distractors.includes(fake)) {
      distractors.push(fake);
    }
  }

  const opts = [
    { val: target, isCorrect: true },
    { val: distractors[0], isCorrect: false },
    { val: distractors[1], isCorrect: false },
    { val: distractors[2], isCorrect: false }
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  
  const options = shuffledOpts.map((o, i) => {
    const id = ['A','B','C','D'][i];
    if (o.isCorrect) correctId = id;
    return {
      id,
      label: o.val.toString(),
      fingerprint: `py-${id}`,
      visualData: { textNumber: o.val }
    };
  });

  return {
    id: `py-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 30,
    skills: [],
    seed,
    type: 'number_pyramid',
    category: 'numerical',
    difficulty,
    prompt: 'Sayı piramidinde yan yana duran iki kutudaki sayıların toplamı, üstlerindeki kutuya yazılmaktadır. Buna göre "?" olan kutuya hangi sayı gelmelidir?',
    visualConfig: {
      displayMode: 'number_pyramid',
      pyramid: vals
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Alttaki iki sayının toplamı üstlerindeki sayıya eşittir.',
      ruleTitle: 'Sayısal İlişki',
      steps: [
        'Piramitteki herhangi bir yan yana duran iki sayıyı toplayın.',
        'Elde ettiğiniz toplamın, tam üstlerinde birleşen kutudaki sayıya eşit olduğunu göreceksiniz.',
        'Eksik olan sayıyı bulmak için bu toplama kuralını tersten veya düzden uygulayın.'
      ]
    }
  };
}

// 34. Hikayeli Mantık (Story Logic)
export function generateStoryLogicQuestion(seed: number, difficulty: DifficultyLevel): BaseQuestion {
  const rng = new SeededRNG(seed);
  
  const templates = [
    {
      q: 'Ali, Ayşe\'den daha uzundur. Ayşe ise Can\'dan daha uzundur. Buna göre en kısa boylu kimdir?',
      ans: 'Can',
      dist: ['Ali', 'Ayşe', 'Bilinemez']
    },
    {
      q: 'Bir koşu yarışında Mert, Zeynep\'i geçmiştir. Zeynep ise Burak\'tan daha önce yarışı bitirmiştir. Yarışı kim birinci bitirmiştir?',
      ans: 'Mert',
      dist: ['Zeynep', 'Burak', 'Bilinemez']
    },
    {
      q: 'Kırmızı kitap, Mavi kitaptan daha kalındır. Yeşil kitap, Kırmızı kitaptan daha kalındır. En kalın kitap hangisidir?',
      ans: 'Yeşil kitap',
      dist: ['Kırmızı kitap', 'Mavi kitap', 'Bilinemez']
    },
    {
      q: 'Ahmet 3. kattadır. Elif, Ahmet\'in iki kat üstündedir. Mehmet ise Elif\'in bir kat altındadır. Mehmet kaçıncı kattadır?',
      ans: '4. kat',
      dist: ['2. kat', '3. kat', '5. kat']
    },
  ];
  
  const data = rng.pick(templates);

  const opts = [
    { label: data.ans, isCorrect: true },
    { label: data.dist[0], isCorrect: false },
    { label: data.dist[1], isCorrect: false },
    { label: data.dist[2], isCorrect: false },
  ];
  
  const shuffledOpts = rng.shuffle(opts);
  let correctId = 'A';
  
  const options = shuffledOpts.map((o, i) => {
    const id = ['A','B','C','D'][i];
    if (o.isCorrect) correctId = id;
    return {
      id,
      label: o.label,
      fingerprint: `sl-${id}`,
      visualData: { textOnly: o.label }
    };
  });

  return {
    id: `sl-${seed}`,
    version: 1,
    ageGroup: 'all',
    estimatedSeconds: 40,
    skills: [],
    seed,
    type: 'story_logic',
    category: 'logic',
    difficulty,
    prompt: data.q,
    visualConfig: {
      displayMode: 'text_only'
    },
    options,
    correctOptionId: correctId,
    explanation: {
      summary: 'Verilen ipuçlarını sırayla değerlendirin ve bir sıralama oluşturun.',
      ruleTitle: 'Mantıksal Çıkarım',
      steps: [
        'Cümlelerdeki koşulları küçük parçalara bölün.',
        'Oluşturduğunuz sıralama zincirine göre sorulan cevabı kolayca bulabilirsiniz.'
      ]
    }
  };
}
