/** Connectivity is a hint; only the server can confirm a saved answer or payment. */
export function connectionAvailable() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function subscribeConnection(changed: () => void) {
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  return () => {
    window.removeEventListener('online', changed);
    window.removeEventListener('offline', changed);
  };
}
