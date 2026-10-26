export interface CachedRead<T> {
  get: () => Promise<T>;
  clear: () => void;
}

/** One bounded slot per app instance; never keyed by user input or credentials.
 * Expired success is never served after a failed refresh. Failures briefly back off.
 */
export function createCachedRead<T>(load: () => Promise<T>, ttlMs: number, errorTtlMs = 1000,
  now: () => number = () => performance.now()): CachedRead<T> {
  let value: { result: T; until: number } | undefined;
  let failure: { error: unknown; until: number } | undefined;
  let pending: Promise<T> | undefined;
  let revision = 0;
  return {
    async get() {
      const time = now();
      if (value && time < value.until) return value.result;
      if (failure && time < failure.until) throw failure.error;
      if (pending) return pending;
      const startedRevision = revision;
      const request = Promise.resolve().then(load).then(result => {
        if (startedRevision === revision) { value = { result, until: now() + ttlMs }; failure = undefined; }
        return result;
      }, error => {
        if (startedRevision === revision) { value = undefined; failure = { error, until: now() + errorTtlMs }; }
        throw error;
      });
      pending = request;
      try { return await request; }
      finally { if (pending === request) pending = undefined; }
    },
    clear() { revision++; value = undefined; failure = undefined; pending = undefined; },
  };
}
