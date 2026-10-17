import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { authenticatedFetch } from '../../lib/api-client';
import { isDemoUser } from '../../lib/demo-access';

const accessSchema = z.object({ active: z.boolean(), expiresAt: z.string().datetime().nullable(), freeDailyQuestions: z.literal(3) });
type AccessState = { studentId: string; active: boolean; expiresAt: string | null; loading: boolean; error: string };
export function useLearningAccess(studentId?: string) {
  const [state, setState] = useState<AccessState | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!studentId || isDemoUser(studentId)) return;
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      setState({ studentId, active: false, expiresAt: null, loading: true, error: '' });
      try {
        const response = await authenticatedFetch('/api/learning/access', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Üyelik durumu doğrulanamadı. Yeniden dene; ücretsiz soruların açık.');
        const access = accessSchema.parse(await response.json());
        if (!controller.signal.aborted) setState({ studentId, ...access, loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setState({ studentId, active: false, expiresAt: null, loading: false,
          error: error instanceof Error && !(error instanceof z.ZodError) ? error.message : 'Üyelik bilgisi doğrulanamadı. Yeniden dene.' });
      } finally { pending = false; }
    };
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => { controller.abort(); window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible); };
  }, [studentId, revision]);
  const current = state?.studentId === studentId ? state : null;
  useEffect(() => {
    if (!current?.active || !current.expiresAt) return;
    const remaining = Date.parse(current.expiresAt) - Date.now();
    const timer = window.setTimeout(refresh, Math.max(0, Math.min(remaining, 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [current?.active, current?.expiresAt, refresh]);
  return { active: Boolean(current?.active && current.expiresAt && Date.parse(current.expiresAt) > Date.now()),
    loading: Boolean(studentId && !isDemoUser(studentId) && (!current || current.loading)), error: current?.error || '', refresh };
}
