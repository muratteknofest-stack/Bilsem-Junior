import React, { useId, type ReactNode } from 'react';
import { ArrowRight, BookOpen, Check, CircleDashed, Clock3, Home, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import type { LearningResult } from '../../features/student/learning-contract';
import type { LearningReviewFilter } from '../../features/student/learning-review';

export function LearningResultPanel({ result, busy, story, filter, onReview, onNew, onHome, onContinue, children }: {
  result: LearningResult; busy: boolean; story: boolean; filter: LearningReviewFilter;
  onReview: (filter: LearningReviewFilter) => void; onNew: () => void; onHome: () => void; onContinue?: () => void; children?: ReactNode;
}) {
  const titleId = useId();
  const stats = [
    { key: 'correct', label: 'Doğru', value: result.correctAnswers, Icon: Check },
    { key: 'incorrect', label: 'Yanlış', value: result.wrongAnswers, Icon: RotateCcw },
    { key: 'blank', label: 'Boş', value: result.blankAnswers, Icon: CircleDashed },
  ] as const;
  const minutes = Math.floor(result.totalTimeSeconds / 60), seconds = result.totalTimeSeconds % 60;
  return <section className="bj-learning-result" aria-label="Çalışma sonucu" aria-labelledby={titleId}>
    <div className="bj-result-hero">
      <div className="bj-result-medal" aria-hidden="true"><span className="bj-result-orbit" /><span className="bj-result-orbit" /><Trophy size={54} strokeWidth={1.8} /><i>✦</i><i>✧</i></div>
      <div><p className="bj-result-kicker">BİR KEŞİF DAHA TAMAMLANDI</p><h2 id={titleId}>Çalışman tamamlandı</h2><p>{result.blankAnswers === 0 ? 'Düşündün, denedin ve yeni şeyler keşfettin.' : 'Kaydettiğin cevaplar burada. Kalan soruları birlikte inceleyebilirsin.'}</p></div>
    </div>
    <div className="bj-result-score"><span><Target size={19} aria-hidden="true" /><b>%{result.scorePercentage}</b><small>başarı</small></span><span><Sparkles size={18} aria-hidden="true" /><b>+{result.xp}</b><small>XP kazandın</small></span><span><Clock3 size={18} aria-hidden="true" /><b>{minutes}:{String(seconds).padStart(2,'0')}</b><small>süre</small></span></div>
    <div className="bj-result-stats">{stats.map(({ key, label, value, Icon }) => <div key={key} data-tone={key}><span><Icon size={19} aria-hidden="true" /></span><strong>{value}</strong><small>{label}</small></div>)}</div>
    <div className="bj-result-balance" role="img" aria-label={`${result.totalQuestions} soruda ${result.correctAnswers} doğru, ${result.wrongAnswers} yanlış, ${result.blankAnswers} boş`}>{stats.map(item => <span key={item.key} data-tone={item.key} style={{ flexGrow: item.value }} />)}</div>
    {children}
    <div className="bj-result-actions">
      {onContinue && <button type="button" className="bj-result-primary" disabled={busy} onClick={onContinue}>Sıradaki keşfe geç <ArrowRight size={19} aria-hidden="true" /></button>}
      <button type="button" className={onContinue ? 'bj-result-secondary' : 'bj-result-primary'} disabled={busy} onClick={onNew}><RotateCcw size={18} aria-hidden="true" />{story ? 'Yeni sorularla tekrar oyna' : 'Yeni çalışma'}</button>
      <button type="button" className="bj-result-secondary" disabled={busy} onClick={onHome}><Home size={18} aria-hidden="true" />{story ? 'Maceraya dön' : 'Ana sayfaya dön'}</button>
    </div>
    <div className="bj-result-review">
      <div><BookOpen size={22} aria-hidden="true" /><div><h3>Birlikte inceleyelim</h3><p>Bir grubu seç, soruların çözümlerine bak.</p></div></div>
      <nav aria-label="Çözüm inceleme filtresi">{([{ key: 'all', label: 'Tümü', value: result.totalQuestions }, ...stats.map(({ key, label, value }) => ({ key, label: key === 'incorrect' ? 'Yanlışlar' : key === 'blank' ? 'Boşlar' : 'Doğrular', value }))] as const).map(item => <button type="button" key={item.key} aria-pressed={filter === item.key} disabled={busy || item.value === 0} onClick={() => onReview(item.key)}>{item.label}<span>{item.value}</span></button>)}</nav>
    </div>
  </section>;
}
