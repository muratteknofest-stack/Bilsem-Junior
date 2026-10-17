import type { BaseQuestion } from '../../types';

/** One drawing per identity. Text, answer controls and quality checks share this list. */
export const VISUAL_SYMBOLS = {
  '●': { label: 'daire', color: '#355cce', path: 'M32 8a22 22 0 1 0 0 44a22 22 0 1 0 0-44Z' },
  '▲': { label: 'üçgen', color: '#ad4d16', path: 'M32 7 57 51H7Z' },
  '■': { label: 'kare', color: '#7247be', path: 'M12 9H52Q55 9 55 12V52Q55 55 52 55H12Q9 55 9 52V12Q9 9 12 9Z' },
  '◆': { label: 'eşkenar dörtgen', color: '#087b78', path: 'M32 5 59 32 32 59 5 32Z' },
  '★': { label: 'yıldız', color: '#a16b09', path: 'M32 5 39 23 59 24 44 37 49 57 32 46 15 57 20 37 5 24 25 23Z' },
  '⬟': { label: 'beşgen', color: '#b04467', path: 'M32 5 58 24 48 55H16L6 24Z' },
  '⬢': { label: 'altıgen', color: '#207537', path: 'M18 8H46L60 32 46 56H18L4 32Z' },
  '✚': { label: 'artı', color: '#35648e', path: 'M24 7H40V24H57V40H40V57H24V40H7V24H24Z' },
  '♥': { label: 'kalp', color: '#b83b58', path: 'M32 55 9 32C-1 15 20-1 32 16C44-1 65 15 55 32Z' },
  '☾': { label: 'hilal', color: '#6745ad', path: 'M47 8A25 25 0 1 0 47 56C24 53 16 18 47 8Z' },
  '❧': { label: 'yaprak', color: '#287245', path: 'M9 54C1 23 21 8 56 8C56 43 41 62 9 54ZM9 54 43 21' },
  'ϟ': { label: 'şimşek', color: '#aa6111', path: 'M35 5 12 35H29L24 59 53 25H36L44 5Z' },
} as const;

export type VisualSymbol = keyof typeof VISUAL_SYMBOLS;
export const VISUAL_SYMBOL_IDS = Object.keys(VISUAL_SYMBOLS) as VisualSymbol[];
export function isVisualSymbol(symbol: string): symbol is VisualSymbol {
  return Object.hasOwn(VISUAL_SYMBOLS, symbol);
}
export function symbolLabel(symbol: string): string {
  return isVisualSymbol(symbol) ? VISUAL_SYMBOLS[symbol].label : symbol;
}

// Every tile motif is invariant under quarter turns and both mirrors. Only
// occupied positions participate in a rule, never a glyph's facing direction.
export const TILE_MOTIFS = {
  square: { label: 'kare', path: 'M14 7H50Q57 7 57 14V50Q57 57 50 57H14Q7 57 7 50V14Q7 7 14 7Z' },
  circle: { label: 'daire', path: VISUAL_SYMBOLS['●'].path },
  diamond: { label: 'eşkenar dörtgen', path: VISUAL_SYMBOLS['◆'].path },
  octagon: { label: 'sekizgen', path: 'M21 6H43L58 21V43L43 58H21L6 43V21Z' },
  flower: { label: 'dört yapraklı çiçek', path: 'M32 20C13-9-9 13 20 32C-9 51 13 73 32 44C51 73 73 51 44 32C73 13 51-9 32 20Z' },
  sparkle: { label: 'dört uçlu yıldız', path: 'M32 5 40 24 59 32 40 40 32 59 24 40 5 32 24 24Z' },
} as const;
export type TileMotif = keyof typeof TILE_MOTIFS;
export type VisualTheme = { motif: TileMotif; color: string; light: string; dark: string; tint: string };
const MOTIFS = Object.keys(TILE_MOTIFS) as TileMotif[];
const PALETTES = [
  { color: '#4a54b9', light: '#9dacf1', dark: '#303982', tint: '#eef0ff' },
  { color: '#117768', light: '#60cbb1', dark: '#095044', tint: '#eaf7f2' },
  { color: '#a24b28', light: '#eeab79', dark: '#74321c', tint: '#fff2e9' },
  { color: '#8051a6', light: '#c1a0e7', dark: '#58356f', tint: '#f6efff' },
  { color: '#246caa', light: '#84bce8', dark: '#174973', tint: '#edf6ff' },
] as const;
export const DEFAULT_VISUAL_THEME: VisualTheme = { motif: 'square', ...PALETTES[0] };

/** Stable across previews/options; deliberately ignores answers and option order. */
export function questionVisualTheme(question?: Pick<BaseQuestion, 'id' | 'seed'>): VisualTheme {
  if (!question) return DEFAULT_VISUAL_THEME;
  let hash = 2166136261;
  for (const char of `${question.id}:${question.seed}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  // Mix higher bits too: duplicated seed digits in IDs must not restrict motifs
  // to only odd or even indexes.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  const n = (hash ^ (hash >>> 13)) >>> 0;
  return { motif: MOTIFS[n % MOTIFS.length], ...PALETTES[Math.floor(n / MOTIFS.length) % PALETTES.length] };
}
