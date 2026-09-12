/**
 * Safe Storage Wrapper
 * Gracefully handles browser localStorage, private mode exceptions, and non-browser runtimes.
 */

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
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
        return;
      }
    } catch {
      // Ignore quota or private browsing errors
    }
    memoryStore.set(key, value);
  },

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
