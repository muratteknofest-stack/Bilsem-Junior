import type { CognitiveCategory } from '../../types';

// Only categories with a verified, independently solved student engine.
export const AVAILABLE_CATEGORIES = ['visual_perception', 'pattern', 'matrix', 'spatial', 'logic', 'attention', 'numerical', 'coding'] as const satisfies readonly CognitiveCategory[];
export function isAvailableCategory(value: unknown): value is typeof AVAILABLE_CATEGORIES[number] {
  return typeof value === 'string' && (AVAILABLE_CATEGORIES as readonly string[]).includes(value);
}
