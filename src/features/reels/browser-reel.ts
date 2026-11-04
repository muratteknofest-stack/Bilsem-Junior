/** Browser-only fallback and full studio engine for manual & automated Reels.
 * Generates solver-verified original questions; records a real 9:16 movie with background music,
 * Bilsem Junior Fox Mascot, dynamic word-by-word subtitles, and circular TV quiz timer.
 * It never accesses storage keys, student information, or Instagram credentials.
 */
import type {
  PerceptualBoard,
  PerceptualMechanic,
  PerceptualValue,
} from '../questions/perceptual-engine';

export type ReelThemeId =
  | 'space_academy'
  | 'neon_quiz'
  | 'playful_pop'
  | 'classic_bilsem';

export type MusicTrackId =
  | 'quiz_show'
  | 'playful_marimba'
  | 'lofi_focus'
  | 'cosmic_synth'
  | 'custom_mp3'
  | 'none';

export type LocalReelRequest = {
  grade: 1 | 2 | 3 | 4;
  difficulty: number;
  mechanic: PerceptualMechanic | 'auto';
  themeId?: ReelThemeId;
  musicTrack?: MusicTrackId;
  musicVolume?: number;
  customAudioBuffer?: AudioBuffer | null;
  showMascot?: boolean;
  showSubtitles?: boolean;
  hideAnswerSpoiler?: boolean;
};

export type LocalReelResult = {
  blob: Blob;
  extension: 'mp4' | 'webm';
  mimeType: string;
  topic: string;
};

export type LocalQuestion = {
  board: PerceptualBoard;
  options: Array<{ id: string; card: PerceptualValue }>;
  correctId: string;
  mechanic: PerceptualMechanic;
  grade: number;
  difficulty: number;
};

const W = 1080,
  H = 1920,
  LENGTH = 19;
const WHITE = '#f7faff',
  GOLD = '#ffd76a';

export const REEL_THEME_SPECS: Record<
  ReelThemeId,
  {
    name: string;
    bgStops: [string, string, string];
    accent: string;
    secondary: string;
    boardBg: string;
    boardStroke: string;
    particle: string;
  }
> = {
  space_academy: {
    name: 'Uzay Akademisi',
    bgStops: ['#090d24', '#1e1b4b', '#0f172a'],
    accent: '#06b6d4',
    secondary: '#f59e0b',
    boardBg: '#1e293b',
    boardStroke: '#38bdf8',
    particle: '#fde047',
  },
  neon_quiz: {
    name: 'Neon Yarışma',
    bgStops: ['#14052b', '#3b0764', '#1a0633'],
    accent: '#f43f5e',
    secondary: '#22d3ee',
    boardBg: '#240a40',
    boardStroke: '#a855f7',
    particle: '#22d3ee',
  },
  playful_pop: {
    name: 'Oyun Odası',
    bgStops: ['#172554', '#1e3a8a', '#1e1b4b'],
    accent: '#fb7185',
    secondary: '#facc15',
    boardBg: '#1e3a8a',
    boardStroke: '#60a5fa',
    particle: '#facc15',
  },
  classic_bilsem: {
    name: 'Klasik Bilsem',
    bgStops: ['#101a46', '#222e73', '#12436e'],
    accent: '#6366f1',
    secondary: '#ffd76a',
    boardBg: '#243b83',
    boardStroke: '#6279c9',
    particle: '#9fe9ff',
  },
};

export const MUSIC_TRACK_SPECS: Record<
  MusicTrackId,
  { name: string; subtitle: string }
> = {
  quiz_show: {
    name: 'Yarışma Ritmi',
    subtitle: 'TV bilgi yarışması temposu',
  },
  playful_marimba: {
    name: 'Neşeli Melodiler',
    subtitle: 'Çocuk dostu marimba',
  },
  lofi_focus: {
    name: 'Lo-Fi Odak',
    subtitle: 'Sakin odaklanma akorları',
  },
  cosmic_synth: {
    name: 'Uzay Sentezi',
    subtitle: 'Bilim ve keşif atmosferi',
  },
  custom_mp3: {
    name: 'Özel MP3 Müzik',
    subtitle: 'Yüklediğiniz ses dosyası',
  },
  none: {
    name: 'Sadece Efektler',
    subtitle: 'Arka plan müziği kapalı',
  },
};

const titles: Record<PerceptualMechanic, string> = {
  'analogy-grid': 'GÖRSEL ANALOJİ',
  'paired-analogy': 'ŞEKİL İLİŞKİLERİ',
  'matrix-attributes': 'RAVEN MATRİS',
  'feature-classification': 'SINIFLANDIRMA',
  'attribute-sequence': 'GÖRSEL ÖRÜNTÜ',
  'interleaved-sequence': 'KARMA ÖRÜNTÜ',
};

const FOX_ICON_URL = '/assets/aistudio/B_LSEM_Junior_tilki_ikonu_e352f23b.png';
let foxMascotImg: HTMLImageElement | null = null;
let foxMascotLoaded = false;

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  foxMascotImg = new Image();
  foxMascotImg.crossOrigin = 'anonymous';
  foxMascotImg.onload = () => {
    foxMascotLoaded = true;
  };
  foxMascotImg.src = FOX_ICON_URL;
}

export async function selectLocalReelQuestion(
  request: LocalReelRequest
): Promise<LocalQuestion> {
  const [perceptual, quality, solver] = await Promise.all([
    import('../questions/perceptual-engine'),
    import('../questions/quality'),
    import('../questions/universal-solver'),
  ]);
  const mechanisms = perceptual.PERCEPTUAL_MECHANICS.filter(
    (m) =>
      (request.mechanic === 'auto' || m === request.mechanic) &&
      perceptual.perceptualAllowed(m, request.grade, request.difficulty)
  );
  if (!mechanisms.length)
    throw Error('Bu sınıf ve seviyede seçilen soru türü desteklenmiyor.');
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  for (let attempt = 0; attempt < 96; attempt++) {
    const mechanic = mechanisms[attempt % mechanisms.length];
    const seed =
      ((random[0] % 2000000000) + 104729 * attempt) % 2000000000 + 1;
    try {
      const q = perceptual.generatePerceptualQuestion(
        mechanic,
        seed,
        request.difficulty as 1 | 2 | 3 | 4,
        request.grade
      );
      const audit = quality.auditQuestion(q);
      const proof = solver.solveQuestion(q);
      if (
        audit.errors.length ||
        audit.reviewRequired.length ||
        !audit.solverVerified ||
        !proof.canSolve ||
        !proof.isMatch ||
        proof.ambiguityDetected ||
        proof.expectedAnswerId !== q.correctOptionId ||
        q.options.length !== 4
      )
        continue;
      const board = perceptual.validatePerceptualBoard(q.visualConfig);
      const options = q.options.map((option) => ({
        id: option.id,
        card: perceptual.perceptualValueSchema.parse(option.visualData),
      }));
      if (
        options.filter((option) => option.id === q.correctOptionId).length !== 1
      )
        continue;
      return {
        board,
        options,
        correctId: q.correctOptionId,
        mechanic,
        grade: request.grade,
        difficulty: request.difficulty,
      };
    } catch {
      // A failed proof never becomes a published or downloaded question.
    }
  }
  throw Error(
    'Bu ayarlarda doğrulanmış soru bulunamadı. Farklı soru türü veya zorluk seçin.'
  );
}

function rectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string = WHITE
) {
  ctx.font = `900 ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function symbol(
  ctx: CanvasRenderingContext2D,
  shape: PerceptualValue['shape'],
  x: number,
  y: number,
  size: number,
  rotation: number,
  filled: boolean,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.lineWidth = Math.max(4, size * 0.11);
  ctx.strokeStyle = color;
  ctx.fillStyle = filled ? color : '#ffffff';
  ctx.beginPath();
  if (shape === 'arrow') {
    ctx.moveTo(0, -size * 0.44);
    ctx.lineTo(size * 0.38, -size * 0.04);
    ctx.lineTo(size * 0.16, -size * 0.04);
    ctx.lineTo(size * 0.16, size * 0.44);
    ctx.lineTo(-size * 0.16, size * 0.44);
    ctx.lineTo(-size * 0.16, -size * 0.04);
    ctx.lineTo(-size * 0.38, -size * 0.04);
  } else if (shape === 'flag') {
    ctx.moveTo(-size * 0.3, -size * 0.44);
    ctx.lineTo(size * 0.4, -size * 0.26);
    ctx.lineTo(size * 0.1, size * 0.12);
    ctx.lineTo(-size * 0.3, size * 0.03);
    ctx.moveTo(-size * 0.3, -size * 0.44);
    ctx.lineTo(-size * 0.3, size * 0.45);
  } else if (shape === 'key') {
    ctx.arc(-size * 0.12, -size * 0.15, size * 0.22, 0, Math.PI * 2);
    ctx.moveTo(size * 0.04, size * 0.02);
    ctx.lineTo(size * 0.39, size * 0.4);
    ctx.moveTo(size * 0.27, size * 0.27);
    ctx.lineTo(size * 0.13, size * 0.37);
  } else {
    ctx.ellipse(0, -size * 0.08, size * 0.33, size * 0.39, -0.2, 0, Math.PI * 2);
    ctx.moveTo(-size * 0.24, size * 0.4);
    ctx.lineTo(size * 0.14, -size * 0.24);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function card(
  ctx: CanvasRenderingContext2D,
  v: PerceptualValue | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  rectangle(ctx, x, y, w, h, 22, '#fafcff', '#b8c9f5');
  if (!v) {
    label(ctx, '?', x + w / 2, y + h / 2, Math.min(110, h * 0.55), '#6761da');
    return;
  }
  const palette: Record<PerceptualValue['shape'], string> = {
    arrow: '#5465ea',
    flag: '#dd52a2',
    key: '#00a6b0',
    leaf: '#8b56de',
  };
  const cols = v.count <= 3 ? v.count : v.count === 4 ? 2 : 3;
  const rows = Math.ceil(v.count / cols);
  const tile = Math.max(20, Math.min(84, (w - 38) / cols, (h - 24) / rows));
  const cellX = Math.min((w - 22) / cols, tile + 8);
  const cellY = Math.min((h - 16) / rows, tile + 8);
  for (let i = 0; i < v.count; i++) {
    const px = x + w / 2 + ((i % cols) - (cols - 1) / 2) * cellX;
    const py = y + h / 2 + (Math.floor(i / cols) - (rows - 1) / 2) * cellY;
    symbol(
      ctx,
      v.shape,
      px,
      py,
      tile * 0.82,
      v.rotation,
      v.filled,
      palette[v.shape]
    );
  }
}

function drawDynamicSubtitles(
  ctx: CanvasRenderingContext2D,
  text: string,
  progress01: number,
  centerX: number,
  centerY: number,
  accent: string
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const activeIdx = Math.min(
    words.length - 1,
    Math.max(0, Math.floor(progress01 * words.length))
  );
  const chunkSize = 5;
  const chunkIdx = Math.floor(activeIdx / chunkSize);
  const chunk = words.slice(chunkIdx * chunkSize, (chunkIdx + 1) * chunkSize);
  const localActive = activeIdx - chunkIdx * chunkSize;

  ctx.save();
  ctx.font = '800 32px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  const spaceW = 14;
  const widths = chunk.map((w) => ctx.measureText(w).width);
  const totalW =
    widths.reduce((a, b) => a + b, 0) + Math.max(0, chunk.length - 1) * spaceW;

  rectangle(
    ctx,
    centerX - (totalW + 52) / 2,
    centerY - 32,
    totalW + 52,
    64,
    20,
    'rgba(15, 23, 42, 0.85)',
    'rgba(255, 255, 255, 0.22)'
  );

  let cx = centerX - totalW / 2;
  chunk.forEach((word, i) => {
    const w = widths[i];
    if (i === localActive) {
      rectangle(ctx, cx - 7, centerY - 22, w + 14, 44, 10, accent);
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = i < localActive ? '#e2e8f0' : '#94a3b8';
    }
    ctx.textAlign = 'left';
    ctx.fillText(word, cx, centerY + 1);
    cx += w + spaceW;
  });
  ctx.restore();
}

export function renderPreviewReelFrame(
  ctx: CanvasRenderingContext2D,
  q: LocalQuestion,
  second: number,
  options?: {
    themeId?: ReelThemeId;
    showMascot?: boolean;
    showSubtitles?: boolean;
    hideAnswerSpoiler?: boolean;
  }
) {
  const theme = REEL_THEME_SPECS[options?.themeId || 'space_academy'];
  const showMascot = options?.showMascot ?? true;
  const showSubtitles = options?.showSubtitles ?? true;
  const hideAnswerSpoiler = options?.hideAnswerSpoiler ?? true;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, theme.bgStops[0]);
  bg.addColorStop(0.55, theme.bgStops[1]);
  bg.addColorStop(1, theme.bgStops[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Floating animated stars & particles
  for (let i = 0; i < 28; i++) {
    const x = ((i * 213 + 39) % W) + Math.sin(second * 2 + i) * 14;
    const rawY = (i * 149 + 126 - second * (22 + (i % 5) * 6)) % H;
    const y = rawY < 0 ? rawY + H : rawY;
    ctx.fillStyle = theme.particle;
    ctx.globalAlpha = 0.2 + (Math.sin(second * 3 + i) + 1) * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, 2.5 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Top Header Bar with Bilsem Junior Fox Mascot & Live Sound Wave Equalizer
  rectangle(ctx, 55, 65, 970, 128, 36, 'rgba(255,255,255,0.1)', theme.accent);

  if (showMascot) {
    ctx.save();
    const bob = Math.sin(second * 4.2) * 4;
    const pulse = 1 + Math.sin(second * 8) * 0.035;
    ctx.translate(128, 129 + bob);
    ctx.scale(pulse, pulse);

    if (foxMascotLoaded && foxMascotImg) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-42, -42, 84, 84, 20);
      ctx.clip();
      ctx.drawImage(foxMascotImg, -42, -42, 84, 84);
      ctx.restore();
      rectangle(ctx, -42, -42, 84, 84, 20, 'transparent', GOLD);
    } else {
      rectangle(ctx, -38, -38, 76, 76, 18, '#4f46e5', GOLD);
      label(ctx, '🦊', 0, 2, 42);
    }
    ctx.restore();

    // Live Equalizer Bars
    for (let b = 0; b < 6; b++) {
      const amp = 12 + Math.abs(Math.sin(second * 10 + b * 1.1)) * 28;
      rectangle(
        ctx,
        182 + b * 11,
        129 - amp / 2,
        6,
        amp,
        3,
        b % 2 === 0 ? theme.accent : GOLD
      );
    }
  }

  label(ctx, '✦ BİLSEM JUNIOR ✦', showMascot ? 600 : W / 2, 114, 46);
  label(
    ctx,
    `${q.grade}. SINIF  •  ${q.difficulty}. SEVİYE  •  ${titles[q.mechanic]}`,
    showMascot ? 600 : W / 2,
    160,
    24,
    theme.particle
  );

  label(
    ctx,
    q.mechanic === 'feature-classification'
      ? 'ORTAK ÖZELLİĞİ BUL!'
      : 'SORU İŞARETİ YERİNE HANGİSİ GELMELİ?',
    W / 2,
    244,
    34,
    GOLD
  );

  // Main Question Stage
  rectangle(ctx, 56, 290, 968, 710, 40, theme.boardBg, theme.boardStroke);
  const cards = q.board.cards;
  const total = cards.length;
  const cols =
    total === 9 || total === 3
      ? 3
      : q.mechanic === 'paired-analogy'
      ? 2
      : q.mechanic === 'attribute-sequence' ||
        q.mechanic === 'interleaved-sequence'
      ? 4
      : 2;
  const rows = Math.ceil(total / cols);
  const gap = 17,
    bw = 860,
    bh = rows === 1 ? 245 : rows === 2 ? 498 : 610;
  const cw = (bw - (cols - 1) * gap) / cols,
    ch = (bh - (rows - 1) * gap) / rows;
  const x0 = (W - bw) / 2,
    y0 = 335 + (rows === 1 ? 165 : rows === 2 ? 53 : 0);
  cards.forEach((v, i) =>
    card(
      ctx,
      v,
      x0 + (i % cols) * (cw + gap),
      y0 + Math.floor(i / cols) * (ch + gap),
      cw,
      ch
    )
  );

  // Options A, B, C, D with Spring Entrance
  rectangle(ctx, 56, 1028, 968, 344, 35, 'rgba(255,255,255,0.08)');
  for (let i = 0; i < q.options.length; i++) {
    const item = q.options[i],
      x = 76 + (i % 2) * 476,
      y = 1048 + Math.floor(i / 2) * 152;
    const revealCorrect =
      !hideAnswerSpoiler && second >= 13 && item.id === q.correctId;
    rectangle(
      ctx,
      x,
      y,
      452,
      132,
      22,
      revealCorrect ? '#ccffe1' : '#e7ecff',
      revealCorrect ? '#2db77e' : theme.accent
    );
    rectangle(
      ctx,
      x + 12,
      y + 16,
      68,
      100,
      15,
      revealCorrect ? '#178d5d' : '#314b99'
    );
    label(ctx, 'ABCD'[i], x + 46, y + 66, 40);
    card(ctx, item.card, x + 92, y + 9, 348, 114);
  }

  // Karaoke Dynamic Subtitles
  if (showSubtitles) {
    if (second < 3.5) {
      drawDynamicSubtitles(
        ctx,
        'BİLSEM Junior zeka sorusuna dikkatli bak! Doğru şıkkı bulabilir misin?',
        second / 3.5,
        W / 2,
        1428,
        theme.accent
      );
    } else if (second < 13) {
      drawDynamicSubtitles(
        ctx,
        'Düşünme süren işliyor! Deseni takip et ve cevabını hazırla!',
        (second - 3.5) / 9.5,
        W / 2,
        1428,
        '#d97706'
      );
    } else {
      drawDynamicSubtitles(
        ctx,
        hideAnswerSpoiler
          ? 'Süre doldu! A, B, C veya D şıkkından senin cevabın hangisi? Yorumlara yaz!'
          : 'Süre doldu! Doğru cevabı kaç saniyede buldun? Yorumlara yaz!',
        (second - 13) / 6,
        W / 2,
        1428,
        '#10b981'
      );
    }
  }

  // Bottom Phase Card & TV Quiz Circular Countdown Ring
  rectangle(
    ctx,
    56,
    1490,
    968,
    250,
    32,
    'rgba(15, 23, 42, 0.72)',
    theme.secondary
  );

  if (second < 2.5) {
    label(ctx, 'HAZIR MISIN? ŞİMDİ DÜŞÜN!', W / 2, 1585, 42, GOLD);
    label(
      ctx,
      'Birazdan yarışma sayacı başlayacak...',
      W / 2,
      1655,
      30,
      WHITE
    );
  } else if (second < 13) {
    const rem = Math.max(0, 13 - second);
    const secInt = Math.max(1, Math.ceil(rem));
    const progress = Math.max(0, Math.min(1, rem / 10.5));

    label(ctx, 'CEVAP İÇİN ' + secInt + ' SANİYE', 430, 1575, 42, GOLD);
    rectangle(ctx, 100, 1635, 650, 36, 18, '#364d8e');
    rectangle(
      ctx,
      100,
      1635,
      Math.max(32, 650 * progress),
      36,
      18,
      secInt <= 3 ? '#ef4444' : theme.accent
    );

    // Circular Countdown Ring on Right
    const rcx = 885,
      rcy = 1615,
      rr = 74;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(rcx, rcy, rr, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secInt <= 3 ? '#ef4444' : GOLD;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(
      rcx,
      rcy,
      rr,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * progress
    );
    ctx.stroke();
    label(ctx, String(secInt), rcx, rcy + 2, 56, WHITE);
    ctx.restore();
  } else {
    if (hideAnswerSpoiler) {
      label(
        ctx,
        'SENİN CEVABIN HANGİSİ? (A, B, C, D)',
        W / 2,
        1575,
        42,
        GOLD
      );
      label(
        ctx,
        'Cevabını hemen yorumlara yaz, bakalım kimler bildi! 👇',
        W / 2,
        1655,
        31,
        WHITE
      );
    } else {
      const index = q.options.findIndex((o) => o.id === q.correctId);
      label(ctx, 'DOĞRU CEVAP: ' + 'ABCD'[index], W / 2, 1575, 50, '#43eaa0');
      label(ctx, 'Kaç saniyede buldun? Yorumlara yaz!', W / 2, 1655, 32, WHITE);
    }
  }

  label(
    ctx,
    '@bilsemjunior  •  Daha fazlası Bilsem Junior uygulamasında',
    W / 2,
    1825,
    27,
    '#d8edff'
  );
}

export function scheduleReelMusic(
  audioContext: AudioContext,
  destination: AudioNode,
  track: MusicTrackId,
  durationSec: number,
  volume = 0.25,
  customBuffer?: AudioBuffer | null
) {
  if (track === 'none' || volume <= 0) return;
  const master = audioContext.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(destination);

  if (track === 'custom_mp3' && customBuffer) {
    const src = audioContext.createBufferSource();
    src.buffer = customBuffer;
    src.loop = true;
    src.connect(master);
    src.start(audioContext.currentTime);
    src.stop(audioContext.currentTime + durationSec);
    return;
  }

  const note = (
    when: number,
    freq: number,
    len: number,
    type: OscillatorType,
    amp: number
  ) => {
    const o = audioContext.createOscillator();
    const g = audioContext.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(amp, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + len);
    o.connect(g);
    g.connect(master);
    o.start(when);
    o.stop(when + len + 0.02);
  };

  const start = audioContext.currentTime + 0.04;
  if (track === 'playful_marimba') {
    const scale = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 783.99];
    const step = 0.25;
    for (let i = 0; i < Math.ceil(durationSec / step); i++) {
      note(start + i * step, scale[i % scale.length], step * 0.75, 'sine', 0.22);
    }
  } else if (track === 'lofi_focus') {
    const chords = [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ];
    const step = 1.6;
    for (let i = 0; i < Math.ceil(durationSec / step); i++) {
      chords[i % chords.length].forEach((f) =>
        note(start + i * step, f, step * 0.9, 'triangle', 0.1)
      );
    }
  } else if (track === 'cosmic_synth') {
    const arp = [220, 329.63, 440, 493.88, 659.25, 493.88, 440, 329.63];
    const step = 0.22;
    for (let i = 0; i < Math.ceil(durationSec / step); i++) {
      note(start + i * step, arp[i % arp.length], step * 0.85, 'sine', 0.16);
    }
  } else {
    // quiz_show default
    const bass = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const lead = [440, 523.25, 659.25, 587.33, 440, 659.25, 587.33, 523.25];
    const step = 0.24;
    for (let i = 0; i < Math.ceil(durationSec / step); i++) {
      note(start + i * step, bass[i % bass.length], step * 0.8, 'triangle', 0.18);
      if (i % 2 === 0) {
        note(start + i * step, lead[i % lead.length], step * 0.65, 'sine', 0.12);
      }
    }
  }
}

function recordingFormat(): { mimeType: string; extension: 'mp4' | 'webm' } {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function'
  )
    throw Error(
      'Bu tarayıcı video kaydını desteklemiyor. Güncel Chrome veya Edge kullanın.'
    );
  const formats: Array<{ mimeType: string; extension: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  const supported = formats.find((format) =>
    MediaRecorder.isTypeSupported(format.mimeType)
  );
  if (!supported)
    throw Error('Tarayıcı video kaydetme biçimlerini desteklemiyor.');
  return supported;
}

/** Recording happens in this tab, not on a GitHub or external video server.
 * The browser must remain open for the full 19s.
 */
export async function createBrowserReel(
  request: LocalReelRequest,
  onProgress: (percent: number) => void,
  preselectedQuestion?: LocalQuestion
): Promise<LocalReelResult> {
  const format = recordingFormat();
  onProgress(2);
  const audioContext = new AudioContext();
  void audioContext.resume().catch(() => {});
  try {
    const q = preselectedQuestion || (await selectLocalReelQuestion(request));
    onProgress(9);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw Error('Telefon bu video boyutunda çizim oluşturamıyor.');
    renderPreviewReelFrame(ctx, q, 0, request);
    const stream = canvas.captureStream(24);
    const audioDestination = audioContext.createMediaStreamDestination();
    const sound = audioContext.createGain();
    sound.gain.value = 0.2;
    sound.connect(audioDestination);
    audioDestination.stream
      .getAudioTracks()
      .forEach((track) => stream.addTrack(track));
    try {
      // Schedule background music track
      scheduleReelMusic(
        audioContext,
        audioDestination,
        request.musicTrack || 'quiz_show',
        LENGTH,
        ((request.musicVolume ?? 35) / 100) * 0.45,
        request.customAudioBuffer
      );

      const tone = (when: number, frequency: number, length: number) => {
        const o = audioContext.createOscillator(),
          gain = audioContext.createGain();
        o.type = 'sine';
        o.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.2, when + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
        o.connect(gain);
        gain.connect(sound);
        o.start(when);
        o.stop(when + length + 0.02);
      };
      for (let i = 0; i < 13; i++)
        tone(audioContext.currentTime + i, i === 0 ? 523 : 880, i === 0 ? 0.3 : 0.1);
      tone(audioContext.currentTime + 13, 523, 0.35);
      tone(audioContext.currentTime + 13.22, 659, 0.35);
      tone(audioContext.currentTime + 13.44, 784, 0.4);

      const recorder = new MediaRecorder(stream, {
        mimeType: format.mimeType,
        videoBitsPerSecond: 3_500_000,
      });
      const chunks: BlobPart[] = [];
      const recorded = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onerror = () =>
          reject(Error('Tarayıcı video kodlamasını tamamlayamadı.'));
        recorder.onstop = () => {
          const blob = new Blob(chunks, {
            type: recorder.mimeType || format.mimeType,
          });
          blob.size > 12000
            ? resolve(blob)
            : reject(Error('Video dosyası boş çıktı. Başka bir tarayıcı deneyin.'));
        };
      });
      recorder.start(1000);
      const started = performance.now();
      let lastProgress = 10;
      await new Promise<void>((resolve, reject) => {
        const tick = () => {
          if (recorder.state === 'inactive') {
            reject(Error('Video kaydı tarayıcı tarafından durduruldu.'));
            return;
          }
          const elapsed = (performance.now() - started) / 1000;
          renderPreviewReelFrame(
            ctx,
            q,
            Math.min(LENGTH - 0.001, elapsed),
            request
          );
          const progress = Math.min(99, Math.round(10 + (elapsed / LENGTH) * 89));
          if (progress !== lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
          if (elapsed >= LENGTH) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      recorder.stop();
      const blob = await recorded;
      onProgress(100);
      return {
        blob,
        extension: format.extension,
        mimeType: blob.type,
        topic: titles[q.mechanic],
      };
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }
  } finally {
    await audioContext.close().catch(() => {});
  }
}
