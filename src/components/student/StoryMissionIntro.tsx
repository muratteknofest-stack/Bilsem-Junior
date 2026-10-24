import { ArrowRight, BookOpen, Check, Compass, LoaderCircle, Sparkles, Star } from 'lucide-react';
import type { StoryStage } from '../../features/student/story-adventure';
import { difficultyChoices, type LearningDifficulty } from '../../features/student/learning-selection';
import type { SchoolGrade } from '../../features/questions/quality-policy';
import './story-mission-intro.css';

interface Props {
  stage: StoryStage;
  grade: SchoolGrade;
  questionCount: number;
  difficulty: LearningDifficulty;
  onDifficulty: (value: LearningDifficulty) => void;
  onCount: (value: number) => void;
  busy: boolean;
  onStart: () => void;
}

/** A small, self-contained welcome scene; the session owner controls starting and errors. */
export function StoryMissionIntro({ stage, grade, questionCount, difficulty, onDifficulty, onCount, busy, onStart }: Props) {
  return <section className="bj-story-setup bj-mission" aria-label="Hikâye görevi" aria-busy={busy}>
    <div className="bj-mission-scene" aria-hidden="true">
      <div className="bj-mission-cloud bj-mission-cloud-one" />
      <div className="bj-mission-cloud bj-mission-cloud-two" />
      <span className="bj-mission-spark bj-mission-spark-one"><Star fill="currentColor" /></span>
      <span className="bj-mission-spark bj-mission-spark-two"><Sparkles /></span>
      <span className="bj-mission-spark bj-mission-spark-three"><Star fill="currentColor" /></span>
      <span className="bj-mission-greeting">Birlikte keşfedelim! <Sparkles size={14}/></span>
      <div className="bj-mission-island"><i /><i /><i /></div>
      <div className="bj-mission-sprout bj-mission-sprout-one"><i /><i /></div>
      <div className="bj-mission-sprout bj-mission-sprout-two"><i /><i /></div>
      <img className="bj-mission-fox" src="/brand/junior-fox-mission.svg" width="320" height="320" alt="" decoding="async" />
      <span className="bj-mission-orbit"><Compass size={22}/></span>
      <span className="bj-mission-scene-label"><BookOpen size={13}/> JUNIOR İLE HİKÂYE MACERASI</span>
    </div>
    <div className="bj-mission-card">
      <div className="bj-mission-eyebrow"><span><span className="bj-mission-dot"/> HİKÂYE MODU</span><span>{grade}. SINIF</span></div>
      <h2>{stage.title}</h2>
      {stage.narrative && <p className="bj-mission-narrative">{stage.narrative}</p>}
      <div className="bj-mission-goal"><span><Compass size={20} aria-hidden="true"/></span><p><strong>Senin görevin</strong>{stage.task}</p></div>
      <fieldset className="bj-mission-options" disabled={busy}>
        <legend>Maceranı ayarla</legend>
        <label>Zorluk düzeyi<select aria-label="Macera zorluğu" value={difficulty} onChange={event => onDifficulty(event.target.value === 'mixed' ? 'mixed' : Number(event.target.value) as LearningDifficulty)}>
          <option value="mixed">Karışık · Bana uygun</option>
          {difficultyChoices(grade).map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
        </select></label>
        <label>Soru sayısı<select aria-label="Macera soru sayısı" value={questionCount} onChange={event => onCount(Number(event.target.value))}>
          {[5,10,15,20,30,40,50].map(count => <option key={count} value={count}>{count} soru</option>)}
        </select></label>
      </fieldset>
      <div className="bj-mission-rewards" aria-label="Macera adımları">
        <span><BookOpen size={19} aria-hidden="true"/><strong>{questionCount} soru</strong><small>Keşfet ve çöz</small></span>
        <span><Star size={19} aria-hidden="true"/><strong>Yıldız kazan</strong><small>Her cevap bir adım</small></span>
        <span><Check size={19} aria-hidden="true"/><strong>Birlikte incele</strong><small>Cevaplarını öğren</small></span>
      </div>
      <button type="button" className="bj-mission-start" disabled={busy} onClick={onStart}>
        {busy ? <LoaderCircle className="bj-mission-loader" size={23} aria-hidden="true"/> : <Sparkles size={23} aria-hidden="true"/>}
        <span>{busy ? 'Görev hazırlanıyor…' : 'Maceraya başla'}</span>
        {!busy && <ArrowRight size={23} aria-hidden="true"/>}
      </button>
      <p className="bj-mission-footnote" role="status">{busy ? `${questionCount} soruluk maceran hazırlanıyor…` : 'Kendi hızında ilerle. Junior yanında!'} </p>
    </div>
  </section>;
}

