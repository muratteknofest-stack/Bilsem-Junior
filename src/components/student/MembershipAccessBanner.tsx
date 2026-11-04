import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { authenticatedFetch } from '../../lib/api-client';
import { FREE_MEMBERSHIP } from '../../lib/membership-plan';
import { isDemoUser } from '../../lib/demo-access';
const schema = z.object({ kind: z.enum(['lifetime', 'full', 'free']) });
export function MembershipAccessBanner({ studentId, onPractice }: { studentId: string; onPractice(): void }) {
  const [status, setStatus] = useState<{ owner: string; kind: 'lifetime' | 'full' | 'free' | 'error' } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isDemoUser(studentId)) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await authenticatedFetch('/api/learning/access', { signal: controller.signal });
        if (!response.ok) throw Error('membership unavailable');
        const data = schema.parse(await response.json());
        if (!controller.signal.aborted) setStatus({ owner: studentId, kind: data.kind });
      } catch { if (!controller.signal.aborted) setStatus({ owner: studentId, kind: 'error' }); }
    })();
    return () => controller.abort();
  }, [studentId, attempt]);
  if (!status || status.owner !== studentId || status.kind === 'full') return null;
  if (status.kind === 'lifetime') return <aside className="bj-next-action" aria-label="Üyelik durumu"><div><strong>✦ Süresiz üyelik</strong><p>Web ve Android’de tüm keşiflerin açık.</p></div></aside>;
  if (status.kind === 'error') return <aside className="bj-next-action"><div><p>Üyelik bilgisi şu anda yüklenemiyor.</p></div><button type="button" onClick={() => setAttempt(value => value + 1)}>Yenile</button></aside>;
  return <aside className="bj-next-action" aria-label="Ücretsiz üyelik"><div><strong>Ücretsiz keşif üyeliği</strong><p>{FREE_MEMBERSHIP.summary}</p><p>{FREE_MEMBERSHIP.premium}</p></div><button type="button" onClick={onPractice}>Ücretsiz kısa pratik</button></aside>;
}
