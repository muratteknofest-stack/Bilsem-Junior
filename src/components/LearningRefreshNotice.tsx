import React, { useSyncExternalStore } from 'react';
import { learningRefresh } from '../services/learning-service';

export function LearningRefreshNotice() {
  const status = useSyncExternalStore(learningRefresh.subscribe, learningRefresh.getStatus, () => 'idle');
  if (status !== 'error') return null;
  return <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
    Cevabın sunucuda kaydedildi. Gelişim ve rozet bilgilerin şu anda yenilenemedi.
    <button type="button" className="ml-2 min-h-11 font-semibold underline" onClick={() => learningRefresh.schedule()}>Bilgileri yenile</button>
  </p>;
}
