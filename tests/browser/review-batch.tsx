import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QuestionReviewBatchPanel } from '../../src/components/admin/QuestionReviewBatchPanel';
import '../../src/index.css';
// Layout-only fixture: no AI calls, authentication or database writes.
function ReviewLayoutFixture() {
  const [stopped, setStopped] = useState(false);
  return <main className="min-h-screen bg-slate-950 p-3"><QuestionReviewBatchPanel
    running={!stopped} onStop={() => setStopped(true)}
    progress={{ total: 20, currentId: stopped ? null : 'pilot-professional-question-with-an-extremely-long-identifier-for-mobile-wrapping-0123456789', stopped,
      items: [
        { id: 'pilot-1', revision: 2, outcome: 'passed', message: 'AI denetimi geçti; editör kararı bekliyor.' },
        { id: 'pilot-2', revision: 2, outcome: 'needs-changes', message: 'Denetim raporu kaydedildi; düzeltme gerekli.' },
        { id: 'pilot-3', revision: 1, outcome: 'failed', message: 'Sonuç doğrulanamadı; kuyruğu yenileyin.' },
      ] }} /></main>;
}
createRoot(document.getElementById('root')!).render(<ReviewLayoutFixture/>);
