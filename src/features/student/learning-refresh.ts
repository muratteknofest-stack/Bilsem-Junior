export type LearningRefreshStatus = 'idle' | 'refreshing' | 'error';

/** One background refresh at a time; rapid answers coalesce into one follow-up. */
export class LearningRefreshQueue {
  private pending: string | null = null;
  private running = false;
  private owner: string | null = null;
  private status: LearningRefreshStatus = 'idle';
  private listeners = new Set<() => void>();
  constructor(private currentUserId: () => string | undefined,
    private refresh: (userId: string, isCurrent: () => boolean) => Promise<void>) {}

  getStatus = () => this.owner === this.currentUserId() ? this.status : 'idle';
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private setStatus(userId: string, status: LearningRefreshStatus) {
    if (this.currentUserId() !== userId) return;
    this.owner = userId; this.status = status;
    this.listeners.forEach(listener => listener());
  }
  schedule(userId = this.currentUserId()) {
    if (!userId || userId !== this.currentUserId()) return;
    this.pending = userId;
    this.setStatus(userId, 'refreshing');
    if (!this.running) void this.drain();
  }
  private async drain() {
    this.running = true;
    try {
      while (this.pending) {
        const userId = this.pending;
        this.pending = null;
        const isCurrent = () => this.currentUserId() === userId;
        if (!isCurrent()) continue;
        try {
          await this.refresh(userId, isCurrent);
          if (!this.pending) this.setStatus(userId, 'idle');
        } catch {
          if (!this.pending) this.setStatus(userId, 'error');
        }
      }
    } finally { this.running = false; }
  }
}
