export interface StatelessJobProgress {
  completed: number;
  total: number;
  approved: number;
  rejected: number;
  failed: number;
}

export interface StatelessJobRecord<TConfig = any, TResult = any> {
  jobId: string;
  adminId: string;
  config: TConfig;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: StatelessJobProgress;
  results: TResult[];
  createdAt: number;
  completedAt?: number;
  retryCount?: number;
}

export function hydrateStatelessJobRecord<TConfig extends { count?: number }, TResult = any>(
  jobId: string,
  raw: Record<string, any> | undefined | null,
  now = Date.now(),
): StatelessJobRecord<TConfig, TResult> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const total = Number(raw.progress?.total ?? raw.config?.count ?? 0);
  const completed = Math.min(Number(raw.progress?.completed ?? 0), total);
  const isDone = total > 0 && completed >= total;
  return {
    jobId: String(raw.jobId || jobId),
    adminId: String(raw.adminId || ''),
    config: raw.config as TConfig,
    status: isDone ? 'completed' : (raw.status || 'queued'),
    progress: {
      completed,
      total,
      approved: Number(raw.progress?.approved ?? 0),
      rejected: Number(raw.progress?.rejected ?? 0),
      failed: Number(raw.progress?.failed ?? 0),
    },
    results: Array.isArray(raw.results) ? raw.results : [],
    createdAt: Number(raw.createdAt || now),
    completedAt: isDone ? Number(raw.completedAt || now) : raw.completedAt,
    retryCount: Number(raw.retryCount || 0),
  };
}
