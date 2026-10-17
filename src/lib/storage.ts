/**
 * Safe Storage Wrapper
 * Gracefully handles browser localStorage, private mode exceptions, and non-browser runtimes.
 */

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (memoryStore.has(key)) return memoryStore.get(key)!;
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore security or private browsing errors
    }
    return memoryStore.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(key, value);
        memoryStore.delete(key);
        return;
      }
    } catch {
      // Ignore quota or private browsing errors
    }
    memoryStore.set(key, value);
  },

  isVolatile: (key: string): boolean => memoryStore.has(key),

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    memoryStore.delete(key);
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
    memoryStore.clear();
  },
};

