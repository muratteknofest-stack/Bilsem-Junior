import { createHash } from 'node:crypto';
export class PasswordPolicyError extends Error {
  constructor(readonly code: 'PASSWORD_COMPROMISED' | 'PASSWORD_CHECK_UNAVAILABLE') {
    super(code === 'PASSWORD_COMPROMISED' ? 'Bu parola bilinen veri sızıntılarında yer alıyor. Başka hizmetlerde kullanmadığınız farklı bir parola seçin.' : 'Parola güvenliği şu anda kontrol edilemiyor. İşlem yapılmadı; biraz sonra yeniden deneyin.');
    this.name = 'PasswordPolicyError';
  }
  get status() { return this.code === 'PASSWORD_COMPROMISED' ? 422 : 503; }
}
const MAX_BYTES = 600_000;
/** Server-only k-anonymity: send five SHA-1 prefix characters, never the password or full hash. */
export function createPasswordChecker(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expires: number; suffixes: Map<string, number> }>();
  const pending = new Map<string, Promise<Map<string, number>>>();
  async function readRange(prefix: string) {
    const cached = cache.get(prefix);
    if (cached && cached.expires > now()) return cached.suffixes;
    const inflight = pending.get(prefix);
    if (inflight) return inflight;
    if (pending.size >= 128) throw new Error('Range concurrency exceeded');
    const task = (async () => {
      const response = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true', Accept: 'text/plain', 'User-Agent': 'ZekaPark-Password-Security' },
        redirect: 'error', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok || !response.body) throw new Error('Range unavailable');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let bytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > MAX_BYTES) throw new Error('Range too large');
          chunks.push(part.value);
        }
      } finally { await reader.cancel().catch(() => undefined); }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
      const suffixes = new Map<string, number>();
      for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        const match = line.match(/^([A-Fa-f0-9]{35}):(\d{1,12})$/);
        if (!match) throw new Error('Invalid range');
        const suffix = match[1].toUpperCase();
        suffixes.set(suffix, Math.max(suffixes.get(suffix) || 0, Number(match[2])));
      }
      if (!suffixes.size) throw new Error('Empty range');
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(prefix, { expires: now() + 3_600_000, suffixes });
      return suffixes;
    })();
    pending.set(prefix, task);
    try { return await task; } finally { pending.delete(prefix); }
  }
  return async (password: string) => {
    const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    let suffixes: Map<string, number>;
    try { suffixes = await readRange(hash.slice(0, 5)); }
    catch { throw new PasswordPolicyError('PASSWORD_CHECK_UNAVAILABLE'); }
    if ((suffixes.get(hash.slice(5)) || 0) > 0) throw new PasswordPolicyError('PASSWORD_COMPROMISED');
  };
}
export const assertPasswordNotCompromised = createPasswordChecker();
