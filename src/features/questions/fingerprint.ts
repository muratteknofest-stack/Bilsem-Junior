/**
 * Generates canonical fingerprints for visual options to ensure no duplicate choices
 */
export function generateVisualFingerprint(data: any): string {
  if (!data) return 'empty';
  if (typeof data === 'string') return data;
  if (typeof data === 'number' || typeof data === 'boolean') return String(data);

  if (Array.isArray(data)) {
    return `[${data.map(generateVisualFingerprint).join(',')}]`;
  }

  if (typeof data === 'object') {
    // Sort keys deterministically
    const keys = Object.keys(data).sort();
    return `{${keys.map((k) => `${k}:${generateVisualFingerprint(data[k])}`).join(';')}}`;
  }

  return String(data);
}
