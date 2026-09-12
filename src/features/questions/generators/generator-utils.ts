import { SeededRNG } from '../../../lib/rng';
import { ShapeKind, PALETTE, COLOR_KEYS } from '../../../lib/svg-primitives';

export interface ShapeItem {
  kind: ShapeKind;
  fill: string;
  stroke?: string;
  rotation?: number;
  scale?: number;
  marker?: 'none' | 'dot' | 'plus' | 'star' | 'mini_square' | 'line';
  markerColor?: string;
  markerPos?: 'center' | 'top' | 'right' | 'bottom' | 'left';
}

export const SHAPES_POOL: ShapeKind[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'star',
  'arrow',
  'cross',
  'l_shape',
  'crescent',
  'ring',
  'trapezoid',
  'pacman',
];

export const ASYMMETRIC_SHAPES: ShapeKind[] = [
  'arrow',
  'l_shape',
  'crescent',
  'trapezoid',
  'pacman',
];

export const COLORS_POOL = [
  PALETTE.indigo,
  PALETTE.emerald,
  PALETTE.amber,
  PALETTE.rose,
  PALETTE.cyan,
  PALETTE.purple,
  PALETTE.orange,
  PALETTE.blue,
];

export function randomShape(rng: SeededRNG): ShapeKind {
  return rng.pick(SHAPES_POOL);
}

export function randomColor(rng: SeededRNG): string {
  return rng.pick(COLORS_POOL);
}

export function randomColors(rng: SeededRNG, count: number): string[] {
  return rng.pickUnique(COLORS_POOL, count);
}
