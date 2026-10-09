export type ProgressPatch = Record<string, string | null>;
type Entry = { value: string | null; version: string };
export type OutboxSnapshot = Record<string, Entry>;
interface Storage { isVolatile?(key: string): boolean; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
/** Each account owns its own durable queue. Acknowledgements never remove later edits. */
export class ProgressOutbox {
  constructor(private storage: Storage, private allowedKeys: readonly string[]) {}
  private key(userId: string) { return 'zp:progress-outbox:v1:' + userId; }
  isVolatile(userId: string) { return this.storage.isVolatile?.(this.key(userId)) || false; }
  read(userId: string): OutboxSnapshot {
    try {
      const parsed = JSON.parse(this.storage.getItem(this.key(userId)) || '{}');
      return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => {
        const entry = value as Entry | null;
        return this.allowedKeys.includes(key) && entry && typeof entry.version === 'string' && (entry.value === null || typeof entry.value === 'string');
      })) as OutboxSnapshot;
    } catch { return {}; }
  }
  enqueue(userId: string, key: string, value: string | null) {
    if (!this.allowedKeys.includes(key)) throw new Error('Bilinmeyen ilerleme alanı.');
    const data = this.read(userId);
    data[key] = { value, version: crypto.randomUUID() };
    this.storage.setItem(this.key(userId), JSON.stringify(data));
  }
  acknowledge(userId: string, sent: OutboxSnapshot) {
    const data = this.read(userId);
    for (const [key, entry] of Object.entries(sent)) if (data[key]?.version === entry.version) delete data[key];
    if (Object.keys(data).length) this.storage.setItem(this.key(userId), JSON.stringify(data));
    else this.storage.removeItem(this.key(userId));
  }
  patch(userId: string): ProgressPatch { return ProgressOutbox.toPatch(this.read(userId)); }
  static toPatch(snapshot: OutboxSnapshot): ProgressPatch {
    return Object.fromEntries(Object.entries(snapshot).map(([key, entry]) => [key, entry.value]));
  }
}
