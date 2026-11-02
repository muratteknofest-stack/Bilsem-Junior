import React, { useId } from 'react';
import { ArrowRight, Clock3, RotateCcw } from 'lucide-react';
import type { LearningResumeCandidate } from '../../features/student/learning-resume';

export function LearningResumeCard({ candidate, busy, onResume }: {
  candidate: LearningResumeCandidate; busy: boolean; onResume: () => void;
}) {
  const titleId = useId();
  const expired = Date.now() >= Date.parse(candidate.expiresAt);
  return <section className="bj-resume-card" aria-labelledby={titleId}>
    <span className="bj-resume-icon" aria-hidden="true"><RotateCcw size={26} /></span>
    <div className="bj-resume-copy"><p>KALDIĞIN YERDEN</p><h2 id={titleId}>{candidate.mode === 'exam' ? 'Denemen seni bekliyor' : 'Keşfine devam et'}</h2>
      <p>{candidate.count} soruluk çalışmandaki kayıtlı cevaplarını açabilirsin.</p>
      <small><Clock3 size={14} aria-hidden="true" />{expired ? 'Süre tamamlandı. Kayıtlı cevaplarınla sonuçlarını aç.' : 'Süre işlemeye devam eder; yeniden başladığında uzamaz.'}</small>
    </div>
    <button type="button" disabled={busy} onClick={onResume}>{busy ? 'Çalışman açılıyor…' : expired ? 'Kayıtlı sonuçları aç' : candidate.mode === 'exam' ? 'Denemeye devam et' : 'Çalışmaya devam et'}<ArrowRight size={18} aria-hidden="true" /></button>
  </section>;
}
