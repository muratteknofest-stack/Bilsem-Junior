import React from 'react';
import type { ReviewBatchProgress } from '../../lib/question-review-batch';

export function QuestionReviewBatchPanel({ progress, running, onStop }: {
  progress: ReviewBatchProgress | null; running: boolean; onStop: () => void;
}) {
  if (!progress) return null;
  const passed = progress.items.filter(item => item.outcome === 'passed').length;
  const changes = progress.items.filter(item => item.outcome === 'needs-changes').length;
  const failed = progress.items.filter(item => item.outcome === 'failed').length;
  return <section aria-label="Toplu AI inceleme ilerlemesi" aria-busy={running} className="min-w-0 space-y-3 rounded-xl border border-indigo-700 bg-slate-900 p-4 text-sm text-slate-200">
    <p role="status" aria-live="polite">{progress.items.length} / {progress.total} sonuç · {passed} AI denetimini geçti · {changes} düzeltme gerekli · {failed} doğrulanamadı</p>
    <progress className="w-full" aria-label="Tamamlanan soru denetimleri" value={progress.items.length} max={progress.total}/>
    {progress.currentId && <p className="break-all">İnceleniyor: {progress.currentId}</p>}
    {running && <button type="button" onClick={onStop} className="min-h-11 rounded-lg bg-amber-800 px-3 py-2">Bu sorudan sonra durdur</button>}
    {progress.stopped && <p>İşlem durdu. Kaydedilen raporlar korundu. Yeniden denemeden önce kuyruğu yenileyip soruları seçin.</p>}
    <p>AI denetiminden geçen sorular editör kararı için bekler. Bu işlem soru yayımlamaz.</p>
    {!!progress.items.length && <details><summary className="cursor-pointer">Soru bazında sonuçlar</summary><ul className="mt-2 space-y-2">{progress.items.map(item => <li key={item.id} className="break-words"><span className="break-all">{item.id}</span>: {item.message}</li>)}</ul></details>}
  </section>;
}
