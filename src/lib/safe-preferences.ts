// An allowlist prevents any present or future Auth key from being exported.
export const SAFE_PREFERENCE_KEYS = ['zekapark_theme', 'zekapark_sound_enabled'] as const;
export function exportSafePreferences(storage: Pick<Storage, 'getItem'>) {
  const preferences: Record<string, string> = {};
  for (const key of SAFE_PREFERENCE_KEYS) { const value = storage.getItem(key); if (value !== null) preferences[key] = value; }
  return { format: 'zekapark-browser-preferences-v1', preferences };
}
export function downloadSafePreferences() {
  const blob = new Blob([JSON.stringify(exportSafePreferences(localStorage), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'zekapark-tarayici-tercihleri.json'; link.click(); URL.revokeObjectURL(url);
}
