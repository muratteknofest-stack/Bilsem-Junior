import React from 'react';
import { CheckCircle2, Lightbulb, Sparkles, Star } from 'lucide-react';
import type { AnswerFeedback } from '../../features/student/answer-feedback';

export function LearningAnswerFeedback({ feedback, adventureEffect }: { feedback: AnswerFeedback; adventureEffect?:'burst'|'orbit'|'leaves' }) {
  const correct = feedback.kind === 'correct', incorrect = feedback.kind === 'incorrect';
  return <div key={feedback.id} className="zp-feedback" data-kind={feedback.kind} data-adventure-effect={correct?adventureEffect:undefined} role="status" aria-live="polite" aria-atomic="true">
    <div className="zp-feedback-particles" aria-hidden="true">{Array.from({ length: correct ? 14 : 5 }, (_, i) => <span key={i} style={{ left: `${8 + (i % 7) * 14}%`, top: `${18 + Math.floor(i / 7) * 12}%`, animationDelay: `${(i % 4) * 30}ms` }}>{correct ? '✦' : '●'}</span>)}</div>
    <div className="zp-feedback-card">
      <div className="zp-feedback-icon" aria-hidden="true">{correct ? <Star size={46} fill="currentColor" /> : incorrect ? <Lightbulb size={44} /> : <CheckCircle2 size={44} />}</div>
      <strong>{correct ? 'Harika!' : incorrect ? 'Öğrenmeye devam!' : 'Cevabın kaydedildi!'}</strong>
      <p>{correct ? 'Doğru cevap!' : incorrect ? 'Bu cevap doğru değildi. Bir sonraki soruda yeniden keşfet!' : 'Sıradaki soruya geçiyoruz.'}</p>
      {correct && <div className="zp-feedback-rewards">{feedback.xp > 0 && <span><Sparkles size={15} aria-hidden="true" />+{feedback.xp} XP</span>}{feedback.streak > 1 && <span>{feedback.streak} doğru üst üste!</span>}</div>}
    </div>
  </div>;
}
