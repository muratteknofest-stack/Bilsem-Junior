import type { WordwallActivity } from './wordwall-model';

export interface GradeWorldConfig {
  grade: 1 | 2 | 3 | 4;
  worldName: string;
  worldSubtitle: string;
  biomeEmoji: string;
  badgeText: string;
  skyGradient: string;
  pathColor: string;
  nodeAccent: string;
  nodeShadow: string;
  mascotGreeting: string;
  mascotTips: string[];
}

export const GRADE_WORLDS: Record<1 | 2 | 3 | 4, GradeWorldConfig> = {
  1: {
    grade: 1,
    worldName: '1. Sınıf · Merak Adası',
    worldSubtitle: 'Renkli şekiller, gölgeler ve ilk örüntü hazineleri!',
    biomeEmoji: '🏝️',
    badgeText: 'Başlangıç Keşif Adası',
    skyGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 48%, #fef3c7 100%)',
    pathColor: '#10b981',
    nodeAccent: '#059669',
    nodeShadow: '#065f46',
    mascotGreeting: 'Merak Adası’na hoş geldin küçük kaşif! Parlayan 3B duraklara dokunarak ilk zeka hazinelerini topla!',
    mascotTips: [
      'Renk ve şekil sorularında önce en büyük parçaya odaklan! 🔍',
      'Gölge eşleştirme duraklarında şeklin köşelerini saymak işini çok kolaylaştırır! ⭐',
      'Her tamamladığın durak seni bir sonraki hazine sandığına yaklaştırır! 🏆'
    ]
  },
  2: {
    grade: 2,
    worldName: '2. Sınıf · Örüntü Krallığı',
    worldSubtitle: 'Mantık ormanı, matris kaleleri ve sayı köprüleri!',
    biomeEmoji: '🏰',
    badgeText: 'Mantık & Örüntü Krallığı',
    skyGradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #fae8ff 100%)',
    pathColor: '#6366f1',
    nodeAccent: '#4f46e5',
    nodeShadow: '#312e81',
    mascotGreeting: 'Örüntü Krallığı’ndayız! Buradaki her 3B kulede gizli bir kural var. Sıradaki durağa tıklayıp şifreyi çözelim!',
    mascotTips: [
      'Örüntü duraklarında şekillerin saat yönünde nasıl döndüğüne dikkat et! 🧭',
      'Matris tablolarında hem soldan sağa hem yukarıdan aşağıya kontrol yap! 🧩',
      'Zorlandığında tam ekran modunu açarak detayları daha net görebilirsin! ✨'
    ]
  },
  3: {
    grade: 3,
    worldName: '3. Sınıf · Uzamsal Vadi',
    worldSubtitle: 'Küp kanyonları, kağıt katlama tepeleri ve şifre laboratuvarı!',
    biomeEmoji: '🌋',
    badgeText: '3B Uzamsal Keşif Vadisi',
    skyGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fce7f3 100%)',
    pathColor: '#f97316',
    nodeAccent: '#ea580c',
    nodeShadow: '#9a3412',
    mascotGreeting: 'Uzamsal Vadi’ye ulaştın! Küpleri zihninde döndürmeye ve katlanan kağıtların sırrını çözmeye hazır mısın?',
    mascotTips: [
      'Kağıt katlama sorularında son katlanan yeri ilk önce zihninde geri aç! 📄',
      'Küp sayma duraklarında altta kalan görünmez küpleri unutma! 🧊',
      'Şifreli sayı testlerinde harflerin tekrar ettiği basamakları yakala! 🔐'
    ]
  },
  4: {
    grade: 4,
    worldName: '4. Sınıf · BİLSEM Zirvesi',
    worldSubtitle: 'Şampiyonlar galaksisi, ileri matrisler ve bilge yıldız durakları!',
    biomeEmoji: '🌌',
    badgeText: 'Şampiyonlar Galaksisi',
    skyGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 48%, #fef9c3 100%)',
    pathColor: '#8b5cf6',
    nodeAccent: '#7c3aed',
    nodeShadow: '#4c1d95',
    mascotGreeting: 'BİLSEM Zirvesi’ne hoş geldin şampiyon! Zeki seninle gurur duyuyor. Parlayan galaksi duraklarını sırayla fethet!',
    mascotTips: [
      'Şekil sınıflandırma sorularında ortak özelliği bozan tek detayı bul! 🚀',
      'Karmaşık matrislerde satır ve sütunlardaki eleman sayısını karşılaştır! 🦉',
      'Her durağı tamamladığında 3 yıldız kazanarak galaksi tacını parlat! 👑'
    ]
  }
};

export interface MapNodePoint {
  index: number;
  xPercent: number;
  yPercent: number;
  row: number;
  col: number;
}

export type MapStopStatus = 'completed' | 'current' | 'unlocked';

export interface MapStopItem {
  activity: WordwallActivity;
  stepNumber: number;
  status: MapStopStatus;
  stars: 0 | 3;
  point: MapNodePoint;
  biomeIcon: string;
}

const STOP_ICONS = ['🌟', '🧩', '🚀', '🔮', '🎯', '🏰', '⚡', '🎨', '🧭', '💎', '🦉', '👑'];

export function getGradeWorld(grade: number | 'all'): GradeWorldConfig {
  if (grade === 1 || grade === 2 || grade === 3 || grade === 4) {
    return GRADE_WORLDS[grade];
  }
  return {
    ...GRADE_WORLDS[4],
    worldName: 'Tüm Sınıflar · Büyük ZekaPark Kıta Haritası',
    worldSubtitle: '1. sınıftan 4. sınıfa tüm BİLSEM zeka durakları tek haritada!',
    biomeEmoji: '🗺️',
    badgeText: 'Birleşik Macera Kıtası'
  };
}

/**
 * Generates winding snake/S-curve coordinates for up to 12 stops per map region.
 */
export function getMapNodeCoordinates(count: number, columns = 4): MapNodePoint[] {
  const safeCount = Math.max(0, Math.min(count, 24));
  if (safeCount === 0) return [];
  const totalRows = Math.ceil(safeCount / columns);
  const points: MapNodePoint[] = [];

  for (let i = 0; i < safeCount; i++) {
    const row = Math.floor(i / columns);
    const rawCol = i % columns;
    // Snake direction: even rows go left-to-right, odd rows go right-to-left
    const col = row % 2 === 0 ? rawCol : columns - 1 - rawCol;

    const xPadding = 13;
    const xSpan = 100 - xPadding * 2;
    const xPercent = columns <= 1
      ? 50
      : Math.round((xPadding + (col / (columns - 1)) * xSpan) * 10) / 10;

    const yPadding = totalRows <= 1 ? 50 : 18;
    const ySpan = 100 - yPadding * 2;
    const waveOffset = (col % 2 === 0 ? -3.5 : 3.5);
    const baseY = totalRows <= 1
      ? 50
      : yPadding + (row / (totalRows - 1)) * ySpan;
    const yPercent = Math.round(Math.max(10, Math.min(90, baseY + waveOffset)) * 10) / 10;

    points.push({ index: i, xPercent, yPercent, row, col });
  }

  return points;
}

export function buildMapSvgPath(points: MapNodePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].xPercent} ${points[0].yPercent}`;
  }
  let d = `M ${points[0].xPercent} ${points[0].yPercent}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = Math.round(((prev.xPercent + curr.xPercent) / 2) * 10) / 10;
    const midY = Math.round(((prev.yPercent + curr.yPercent) / 2) * 10) / 10;
    if (prev.row === curr.row) {
      d += ` Q ${midX} ${prev.yPercent}, ${curr.xPercent} ${curr.yPercent}`;
    } else {
      const turnX = prev.xPercent > 50 ? Math.min(95, prev.xPercent + 6) : Math.max(5, prev.xPercent - 6);
      d += ` Q ${turnX} ${midY}, ${curr.xPercent} ${curr.yPercent}`;
    }
  }
  return d;
}

export function buildMapStops(
  visibleActivities: WordwallActivity[],
  completedIds: ReadonlySet<string>,
  pageOffset = 0
): MapStopItem[] {
  const points = getMapNodeCoordinates(visibleActivities.length, 4);
  let foundCurrent = false;

  return visibleActivities.map((activity, idx) => {
    const isCompleted = completedIds.has(activity.id);
    let status: MapStopStatus = 'unlocked';
    if (isCompleted) {
      status = 'completed';
    } else if (!foundCurrent) {
      status = 'current';
      foundCurrent = true;
    }

    return {
      activity,
      stepNumber: pageOffset + idx + 1,
      status,
      stars: isCompleted ? 3 : 0,
      point: points[idx],
      biomeIcon: STOP_ICONS[(pageOffset + idx) % STOP_ICONS.length]
    };
  });
}

// The old v1 key had no owner. Never attribute its progress to a signed-in child.
function completionStorageKey(ownerId?: string): string {
  return `zekapark-wordwall-completed-v2:${ownerId ? `user:${encodeURIComponent(ownerId)}` : 'guest'}`;
}

export function loadCompletedWordwallIds(ownerId?: string): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(completionStorageKey(ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function saveCompletedWordwallIds(ids: string[], ownerId?: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(completionStorageKey(ownerId), JSON.stringify(Array.from(new Set(ids))));
  } catch {}
}

export function toggleWordwallCompleted(currentIds: string[], id: string): { nextIds: string[]; completed: boolean } {
  const set = new Set(currentIds);
  if (set.has(id)) {
    set.delete(id);
    return { nextIds: Array.from(set), completed: false };
  }
  set.add(id);
  return { nextIds: Array.from(set), completed: true };
}
