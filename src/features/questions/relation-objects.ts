/** Generated photographic cutouts: identities, never measurements or answer keys. */
export const RELATION_OBJECTS = {
  apple: { label: 'elma', src: '/question-objects/v1/apple.webp' },
  pear: { label: 'armut', src: '/question-objects/v1/pear.webp' },
  orange: { label: 'portakal', src: '/question-objects/v1/orange.webp' },
} as const;
export type RelationObject = keyof typeof RELATION_OBJECTS;
export const RELATION_OBJECT_IDS = Object.keys(RELATION_OBJECTS) as RelationObject[];
export function isRelationObject(value: unknown): value is RelationObject {
  return typeof value === 'string' && Object.hasOwn(RELATION_OBJECTS, value);
}
