import React, { useId, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Gamepad2, Brain, Box, Eye, Hash, BookOpen, Grid3X3, Lightbulb, Code2, Shapes, Rocket, Search, Shuffle, Sparkles, Star, Target, X } from 'lucide-react';
import { COGNITIVE_CATEGORY_LABELS, QUESTION_TYPE_LABELS } from '../../types';
import { AVAILABLE_CATEGORIES } from '../../features/student/available-categories';
import { LEARNING_TOPICS, topicCategory, type LearningTopic } from '../../features/student/learning-topics';
import { difficultyChoices, MAX_LEARNING_QUESTIONS, type LearningDifficulty } from '../../features/student/learning-selection';
import type { LearningCategory, LearningMode } from '../../features/student/learning-contract';
import type { SchoolGrade } from '../../features/questions/quality-policy';
import { sound } from '../../lib/sound';
import { StudentExperienceControls } from './StudentExperienceControls';

interface Props {
  mode: LearningMode; grade: SchoolGrade; review: boolean; busy: boolean;
  topic: LearningTopic; onTopic: (value: LearningTopic) => void;
  category: LearningCategory; onCategory: (value: LearningCategory) => void;
  difficulty: LearningDifficulty; onDifficulty: (value: LearningDifficulty) => void;
  questionCount: string; onCount: (value: string) => void; validCount: boolean;
  exam: string; onExam: (value: string) => void;
  exams: Array<{ id: string; title: string; count: number; seconds: number }>;
  onStart: () => void;
}
const categoryIcons = { visual_perception: Shapes, pattern: Shapes, matrix: Grid3X3, spatial: Box, logic: Lightbulb, attention: Eye, memory: Brain, numerical: Hash, verbal: BookOpen, coding: Code2 };
function TopicGlyph({ topic }: { topic: Exclude<LearningTopic, 'mixed'> }) {
  const Icon = categoryIcons[topicCategory(topic, 'mixed') as keyof typeof categoryIcons];
  return <Icon size={24} aria-hidden="true" />;
}
function tap(step = 0) { sound.unlock(); sound.playMapStep(step); }

export function LearningSetupPanel(props: Props) {
  const { mode, grade, review, busy, topic, onTopic, category, onCategory, difficulty, onDifficulty, questionCount, onCount, validCount, exam, onExam, exams, onStart } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const topicButton = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LearningCategory>('mixed');
  const countHelp = useId();
  const maxQuestions = mode === 'practice' ? 5 : MAX_LEARNING_QUESTIONS;
  const topicHeading = useId();
  const topicTitle = topic !== 'mixed' ? QUESTION_TYPE_LABELS[topic] : category === 'mixed' ? 'Sürpriz karışım' : COGNITIVE_CATEGORY_LABELS[category];
  const visibleTopics = LEARNING_TOPICS.filter(type => (filter === 'mixed' || topicCategory(type, 'mixed') === filter) && QUESTION_TYPE_LABELS[type].toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR')));
  const closeTopics = () => { dialog.current?.close(); topicButton.current?.focus({ preventScroll: true }); };
  const chooseTopic = (value: LearningTopic) => { tap(2); if(value==='mixed')onCategory('mixed'); onTopic(value); closeTopics(); };
  return <section className="zp-launchpad" aria-label="Çalışma tercihleri">
    <div className="zp-launch-intro">
      <div className="zp-launch-toy" aria-hidden="true"><Gamepad2 size={38} /><Star className="zp-launch-star" size={17} /></div>
      <div><p className="zp-launch-kicker">HAZIR MISIN, KAŞİF?</p><h2>{mode === 'exam' ? 'Denemeni seç' : mode === 'adaptive' ? 'Sana uygun sorularla ilerle' : 'Bugün hangi alanda çalışalım?'}</h2><p>{grade}. sınıf · {mode === 'practice' ? 'Kısa bir zihin molası' : 'Rotanı seç, kendi hızında keşfet.'}</p></div>
    </div>
    <div className="zp-launch-options">
      {!review && <fieldset className="zp-launch-group" disabled={busy}>
        <legend><span>1</span> Keşif rotan</legend>
        <button ref={topicButton} type="button" className="zp-topic-launch zp-toy-button" aria-label="Konu seç" data-current-topic={topic} onClick={() => { tap(); setQuery(''); setFilter('mixed'); dialog.current?.showModal(); }}>
          <span className="zp-choice-glyph" aria-hidden="true">{topic === 'mixed' ? <Shuffle size={23} /> : <TopicGlyph topic={topic} />}</span><span><strong>{topicTitle}</strong><small>{topic === 'mixed' ? category === 'mixed' ? 'Tüm alanlardan dengeli sorular' : 'Seçtiğin alandan farklı sorular' : COGNITIVE_CATEGORY_LABELS[topicCategory(topic, 'mixed') as Exclude<LearningCategory, 'mixed'>]}</small></span><ChevronRight size={20} aria-hidden="true" />
        </button>
        {mode === 'practice' && topic === 'mixed' && <label className="zp-launch-category">Çalışma alanı<select aria-label="Çalışma alanı" value={category} onChange={event => { tap(1); onCategory(event.target.value as LearningCategory); }}><option value="mixed">Tüm alanlar</option>{AVAILABLE_CATEGORIES.map(value => <option key={value} value={value}>{COGNITIVE_CATEGORY_LABELS[value]}</option>)}</select></label>}
      </fieldset>}
      {!review && <fieldset className="zp-launch-group" disabled={busy}>
        <legend><span>2</span> Meydan okuma düzeyin</legend>
        <div className="zp-level-choices" role="group" aria-label="Zorluk düzeyi">
          <button type="button" className="zp-toy-button" aria-pressed={difficulty === 'mixed'} onClick={() => { tap(1); onDifficulty('mixed'); }}><Sparkles size={18} aria-hidden="true" /><strong>Karışık</strong></button>
          {difficultyChoices(grade).map(level => <button key={level.value} type="button" className="zp-toy-button" aria-label={level.label} aria-pressed={difficulty === level.value} onClick={() => { tap(level.value); onDifficulty(level.value); }}><span className="zp-level-number" aria-hidden="true">{level.value}</span><strong>{level.label.split(' · ')[1]}</strong></button>)}
        </div>
      </fieldset>}
      {(mode === 'adaptive' || mode === 'practice') && !review && <fieldset className="zp-launch-group" disabled={busy}>
        <legend><span>3</span> Bugünkü hedefin</legend>
        <div className="zp-count-choices">
          {(mode === 'practice' ? [1, 3, 5] : [5, 10, 20]).map((count, index) => <button key={count} type="button" className="zp-toy-button" aria-label={`${count} soru seç`} aria-pressed={questionCount === String(count)} onClick={() => { tap(index + 2); onCount(String(count)); }}><strong>{count}</strong><small>{['Mini tur', 'Keşif turu', 'Uzun tur'][index]}</small></button>)}
          <label className="zp-custom-count">Özel<input aria-label="Soru sayısı" aria-describedby={countHelp} aria-invalid={!validCount} type="number" inputMode="numeric" min={1} max={maxQuestions} step={1} value={questionCount} onChange={event => onCount(event.target.value)} /></label>
        </div>
        <p id={countHelp} className={validCount ? 'zp-launch-hint' : 'zp-launch-hint is-invalid'}>{validCount ? `1–${maxQuestions} soru seçebilirsin. Hedefin korunur; farklı sorular konu ve zorluk dengesiyle hazırlanır. Aynı soru test içinde tekrarlanmaz.` : `1–${maxQuestions} arasında bir tam sayı yaz.`}</p>
      </fieldset>}
      {mode === 'exam' && <fieldset className="zp-launch-group" disabled={busy}><legend><span>3</span> Deneme süresi</legend><div className="zp-launch-exams">{exams.map(item => <label key={item.id} className={`zp-toy-button ${exam === item.id ? 'is-selected' : ''}`}><input type="radio" name="learning-exam" value={item.id} checked={exam === item.id} onChange={() => { tap(3); onExam(item.id); }} /><strong>{item.title}</strong><small>{item.count} soru · {item.seconds / 60} dk.</small></label>)}</div></fieldset>}
    </div>
    <div className="zp-launch-footer">
      {mode==='practice'&&!review&&<p role="status" className="zp-launch-hint">Bu tur: {questionCount} soru · Farklı örneklerle pekiştir.</p>}
      <button type="button" className="zp-launch-start zp-toy-button" aria-label="Yeni testi başlat" disabled={busy || (mode !== 'exam' && !validCount)} onClick={() => { sound.unlock(); sound.playTransition(); onStart(); }}><Rocket size={23} aria-hidden="true" /><span>{busy ? 'Çalışman hazırlanıyor…' : review ? 'Birlikte tekrar bakalım' : 'Haydi, başlayalım!'}</span><ArrowRight size={19} aria-hidden="true" /></button>
      <div className="zp-launch-bottom"><span><Target size={14} aria-hidden="true" /> Her turda farklı sorular</span><StudentExperienceControls variant="playful" /></div>
      <details className="zp-launch-info"><summary>Çalışmam nasıl hazırlanıyor?</summary><p>Sürpriz karışım tüm çalışma alanlarından sorular içerir. Sorular sınıfına, seçtiğin konuya ve zorluğa uygun hazırlanır; cevapları ve çözümleri kontrol edilir. Önce farklı soru tarzlarına yer verilir. Uzun testlerde veya tek konuda aynı beceriyi farklı örneklerle pekiştirebilirsin; aynı soru test içinde tekrar edilmez. Adaptif çalışmada geçmiş cevaplarına göre zorluk dengelenir. Seçtiğin soru sayısı kendiliğinden azaltılmaz. Sınıfını öğrenci profilinden değiştirebilirsin.</p></details>
    </div>
    <dialog ref={dialog} className="zp-topic-dialog" aria-labelledby={topicHeading} onCancel={() => topicButton.current?.focus({ preventScroll: true })}>
      <div className="zp-topic-dialog-heading"><div><p className="zp-launch-kicker">{grade}. SINIF · 44 KEŞİF</p><h3 id={topicHeading}>Bugün ne keşfedelim?</h3></div><button type="button" aria-label="Konu seçimini kapat" onClick={closeTopics}><X size={22} aria-hidden="true" /></button></div>
      <label className="zp-topic-search"><Search size={18} aria-hidden="true" /><input aria-label="Konu ara" type="search" placeholder="Örneğin: katlama, örüntü…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="zp-topic-filter">Alan<select aria-label="Konu alanı" value={filter} onChange={event => setFilter(event.target.value as LearningCategory)}><option value="mixed">Tüm alanlar</option>{AVAILABLE_CATEGORIES.map(value => <option key={value} value={value}>{COGNITIVE_CATEGORY_LABELS[value]}</option>)}</select></label>
      <div className="zp-topic-grid" role="group" aria-label="Soru konuları">
        {!query.trim() && filter === 'mixed' && <button type="button" className="zp-toy-button" data-topic="mixed" aria-pressed={topic === 'mixed'&&category === 'mixed'} onClick={() => chooseTopic('mixed')}><Shuffle size={24} aria-hidden="true" /><strong>Sürpriz karışım</strong><small>Hepsinden biraz</small>{topic === 'mixed'&&category === 'mixed' && <Check size={16} aria-hidden="true" />}</button>}
        {visibleTopics.map((value, index) => <button key={value} type="button" className="zp-toy-button" data-topic={value} data-tone={index % 4} aria-pressed={topic === value} onClick={() => chooseTopic(value)}><TopicGlyph topic={value} /><strong>{QUESTION_TYPE_LABELS[value]}</strong><small>{COGNITIVE_CATEGORY_LABELS[topicCategory(value, 'mixed') as Exclude<LearningCategory, 'mixed'>]}</small>{topic === value && <Check size={16} aria-hidden="true" />}</button>)}
      </div>
      {visibleTopics.length === 0 && <p role="status">Bu aramada konu bulunamadı. Başka bir kelime dene.</p>}
    </dialog>
  </section>;
}

