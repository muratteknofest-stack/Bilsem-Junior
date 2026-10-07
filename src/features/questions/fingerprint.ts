/** Canonical content identity. Delimiters and primitive types cannot collide. */
export function generateVisualFingerprint(data: unknown): string {
  const canonical = (value: unknown, key = ''): unknown => {
    if (key === 'textNumber' && typeof value === 'string') {
      const text = value.normalize('NFKC').trim();
      if (text !== '' && Number.isFinite(Number(text))) return Number(text);
      return text;
    }
    if (Array.isArray(value)) return value.map(item => canonical(item));
    if (value && typeof value === 'object') return Object.fromEntries(
      Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined)
        .map(k => [k, canonical((value as Record<string, unknown>)[k], k)]));
    return value;
  };
  return JSON.stringify(canonical(data)) ?? 'undefined';
}
