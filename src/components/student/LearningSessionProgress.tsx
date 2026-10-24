import React from 'react';
import { Flame, ShieldCheck, Sparkles } from 'lucide-react';
import type { SessionProgress } from '../../features/student/session-progress';

export function LearningSessionProgress({ progress, total, exam = false }: {
  progress: SessionProgress; total: number; exam?: boolean;
}) {
  const answered = Math.max(0, Math.min(progress.answered, total));
  return <div className="zp-focus-journey" aria-label="Çalışma ilerlemesi">
    <div className="zp-journey-label"><strong>{exam ? 'Deneme rotan' : 'Keşif rotan'}</strong><span>{answered} / {total} tamamlandı</span></div>
    <div className="zp-journey-track" role="progressbar" aria-label="Soru ilerlemesi"
      aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-valuetext={`${total} sorudan ${answered} tanesi cevaplandı`}>
      <span className="zp-journey-fill" style={{ width: `${total > 0 ? answered / total * 100 : 0}%` }} />
    </div>
    <div className="zp-journey-rewards">
      {exam ? <span className="zp-journey-exam"><ShieldCheck size={15} aria-hidden="true" /><span>Deneme</span></span> : <>
        {progress.streak > 1 && <span className="zp-journey-streak" aria-label={`${progress.streak} doğru üst üste`}><Flame size={15} aria-hidden="true" />{progress.streak}</span>}
        <span className="zp-journey-xp" aria-label={`${progress.xp} deneyim puanı`}><Sparkles size={14} aria-hidden="true" />{progress.xp} XP</span>
      </>}
    </div>
  </div>;
}
