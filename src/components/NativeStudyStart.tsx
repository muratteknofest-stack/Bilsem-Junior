import React from 'react';
import { ArrowRight, BookOpen, Brain, Clock3, Play, Puzzle, RotateCcw, Target, Trophy } from 'lucide-react';
import type { UserProfile } from '../types';
import { dailyMissions } from '../features/student/gamification-model';
import { resumableExam } from '../features/student/study-hub-model';
import './native-study-start.css';
interface Props {
  user: UserProfile;
  unresolved: number;
  savedExam: unknown;
  onPractice: () => void;
  onAdaptive: () => void;
  onExam: () => void;
  onMistakes: () => void;
  onTopics: () => void;
  onGames: () => void;
}
export function NativeStudyStart({ user, unresolved, savedExam, onPractice, onAdaptive, onExam, onMistakes, onTopics, onGames }: Props) {
  const goal = dailyMissions(user)[0];
  const exam = resumableExam(savedExam);
  const actions = [
    { title: 'Adaptif test', caption: 'Sana uygun sorular', icon: Brain, tone: 'violet', onClick: onAdaptive },
    { title: 'Deneme sınavı', caption: 'Süreli çalışma', icon: Clock3, tone: 'blue', onClick: onExam },
    { title: 'Konu testleri', caption: 'Bir alan seç', icon: BookOpen, tone: 'mint', onClick: onTopics },
    { title: 'Hata defteri', caption: unresolved > 0 ? `${unresolved} soru bekliyor` : 'Cevaplarını gözden geçir', icon: RotateCcw, tone: 'peach', onClick: onMistakes },
  ];
  return <section className="zp-native-start" aria-label="Hızlı çalışma alanım">
    <div className="zp-native-goal" aria-label="Bugünkü soru hedefim">
      <span className="zp-native-goal-icon" aria-hidden="true">{goal.completed ? <Trophy size={20}/> : <Target size={20}/>}</span>
      <div><span>{goal.completed ? 'Günlük hedef tamam!' : 'Bugünkü hedefin'}</span><strong>{goal.current} / {goal.target} soru</strong><progress aria-label="Günlük hedef ilerlemesi" value={Math.min(goal.current, goal.target)} max={goal.target}/></div>
      <span className="zp-native-goal-percent">%{goal.progress}</span>
    </div>
    <article className="zp-native-start-card">
      <span className="zp-native-start-eyebrow"><Play size={14} aria-hidden="true"/>{exam ? 'KALDIĞIN YERDEN' : 'KÜÇÜK BİR ADIM'}</span>
      <h2>{exam ? 'Denemen seni bekliyor.' : 'Yeni bir keşfe hazır mısın?'}</h2>
      <p>{exam ? `${exam.total} sorunun ${exam.answered} tanesini yanıtladın. Cevaplarınla devam et.` : 'Farklı konulardan sorularla kendi hızında ilerle.'}</p>
      <button type="button" onClick={exam ? onExam : onPractice}>{exam ? 'Denemeye devam et' : 'Karışık pratiğe başla'}<ArrowRight size={19} aria-hidden="true"/></button>
    </article>
    <div className="zp-native-start-grid">{actions.map(({title, caption, icon: Icon, tone, onClick}) => <button type="button" key={title} data-tone={tone} onClick={onClick}><span className="zp-native-start-icon"><Icon size={23} aria-hidden="true"/></span><strong>{title}</strong><small>{caption}</small></button>)}</div>
    <button type="button" className="zp-native-games-link" onClick={onGames}><Puzzle size={20} aria-hidden="true"/><span>Oyunları keşfet</span><ArrowRight size={17} aria-hidden="true"/></button>
  </section>;
}
