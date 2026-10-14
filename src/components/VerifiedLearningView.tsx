import { useReducedMotion } from 'motion/react';
import { sound } from '../lib/sound';
import { AnswerFeedbackLedger, feedbackDuration, type AnswerFeedback } from '../features/student/answer-feedback';
import { FocusedQuestionScreen } from './FocusedQuestionScreen';
import { LearningRefreshNotice } from './LearningRefreshNotice';
import { ArrowLeft, ArrowRight, Clock3, Gamepad2, Sparkles, Trophy, Tablet, CheckCircle2 } from 'lucide-react';
import './VerifiedLearningView.css';
import React, { useEffect, useRef, useState } from 'react';
import type { BaseQuestion } from '../types';
import { LEARNING_TOPICS, isLearningTopic, topicCategory, type LearningTopic } from '../features/student/learning-topics';
import { COGNITIVE_CATEGORY_LABELS, QUESTION_TYPE_LABELS } from '../types';
import { AVAILABLE_CATEGORIES, isAvailableCategory } from '../features/student/available-categories';
import { LEARNING_EXAMS, type LearningCategory, type LearningMode, type LearningSessionView } from '../features/student/learning-contract';
import { isResponseComplete, isResponseEmpty, type QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { MemoryStudy } from '../features/questions/renderers/MemoryStudy';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { apiUrl } from '../lib/api-client';
import { learningService } from '../services/learning-service';
import { AnswerRequestGate, DeadlineFinishGate, canSubmitLearningAnswer, nextUnansweredIndex, saveAndAdvance } from '../features/student/answer-progression';
import { AnswerHistory, type ReviewedAnswer } from './AnswerHistory';
import { dataService } from '../services/data-service';
import { DEFAULT_ADAPTIVE_COUNT, MAX_LEARNING_QUESTIONS, difficultyChoices, type LearningDifficulty } from '../features/student/learning-selection';
import { isSchoolGrade } from '../features/questions/quality-policy';

const button = 'min-h-11 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-indigo-300';
interface Props { mode: LearningMode; initialCategory?: LearningCategory; initialTopic?: LearningTopic; reviewMistakeId?: string; onNavigateHome: () => void; }
export function VerifiedLearningView({ mode, initialCategory = 'mixed', initialTopic = 'mixed', reviewMistakeId, onNavigateHome }: Props) {
  const reducedMotion = useReducedMotion();
  const feedbackLedger = useRef(new AnswerFeedbackLedger());
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const celebratedResult = useRef('');
  const [category, setCategory] = useState<LearningCategory>(isAvailableCategory(initialCategory) ? initialCategory : 'mixed');
  const [topic, setTopic] = useState<LearningTopic>(isLearningTopic(initialTopic) ? initialTopic : 'mixed');
  const [exam, setExam] = useState('mini');
  const [difficulty, setDifficulty] = useState<LearningDifficulty>('mixed');
  const [questionCount, setQuestionCount] = useState(String(DEFAULT_ADAPTIVE_COUNT));
  const validQuestionCount = /^\d+$/.test(questionCount) && Number(questionCount) >= 1 && Number(questionCount) <= MAX_LEARNING_QUESTIONS;
  const selectedGrade = dataService.getCurrentUser().grade;
  const grade = isSchoolGrade(selectedGrade) ? selectedGrade : 1;
  const [exams, setExams] = useState<Array<{id: string; title: string; count: number; seconds: number}>>([...LEARNING_EXAMS]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/api/public/platform'), { signal: controller.signal, cache: 'no-store' }).then(async res => { if (!res.ok) throw new Error(); return res.json(); }).then(value => { if (Array.isArray(value.exams)) setExams(value.exams); }).catch(() => { if (!controller.signal.aborted) setError('Deneme ayarları yüklenemedi. Başlatıldığında sunucunun güncel ayarları kullanılacak.'); });
    return () => controller.abort();
  }, []);
  const [session, setSession] = useState<LearningSessionView | null>(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [reportStatus, setReportStatus] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const [history, setHistory] = useState<ReviewedAnswer[]>([]);
  const gate = useRef(new AnswerRequestGate());
  const deadlineGate = useRef(new DeadlineFinishGate());
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const title = mode === 'exam' ? 'Denemelerim' : mode === 'adaptive' ? 'Adaptif çalışma' : 'Zeka pratiğim';
  const run = async (action: () => Promise<LearningSessionView>) => {
    try { return await gate.current.run(async () => {
      if (!mounted.current) return null;
      setBusy(true); setError('');
      try { const saved = await action(); if (mounted.current) setSession(saved); return saved; }
      finally { if (mounted.current) setBusy(false); }
    }); }
    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı. Yeniden dene.'); return null; }
  };
  const start = async () => { if (mode === 'adaptive' && !validQuestionCount) return; sound.unlock(); const saved = await run(() => {
    return reviewMistakeId ? learningService.review(reviewMistakeId) : learningService.start(mode, topicCategory(topic, category), exam, difficulty, undefined, topic, Number(questionCount));
  }); if (saved && mounted.current) { const next = mode === 'exam' ? 0 : nextUnansweredIndex(saved); setIndex(next < 0 ? saved.questions.length - 1 : next); } };
  const savePending = async () => {
    if (!session || mode !== 'exam' || session.result || Date.now() >= Date.parse(session.expiresAt)) return true;
    const saved = session.answers[String(index)]?.response ?? null;
    const pending = isResponseEmpty(response) ? null : response;
    if (JSON.stringify(saved) === JSON.stringify(pending)) return true;
    const question = session.questions[index];
    if (pending && !isResponseComplete(question as BaseQuestion, pending)) { setError('Cevabını tamamla veya temizle; sonra başka soruya geçebilirsin.'); return false; }
    const updated = await run(() => learningService.answer(session.id, index, pending));
    return !!updated;
  };
  const finish = async () => { if (session && await savePending()) await run(() => learningService.finish(session.id)); };
  const latestFinish = useRef({ finish, busy });
  useEffect(() => { latestFinish.current = { finish, busy }; });
  const goTo = async (nextIndex: number) => { if (!busy && await savePending()) setIndex(nextIndex); };
  const leave = async () => { if (await savePending()) onNavigateHome(); };
  useEffect(() => {
    const saved = session?.answers[String(index)];
    setResponse(saved ? saved.response as QuestionResponse : null); setHint(false); setReportStatus('');
    heading.current?.focus({preventScroll:true});
  }, [session?.id, index]);
  useEffect(() => {
    if (!session || session.result) return;
    const tick = () => {
      const now = Date.now(), deadline = Date.parse(session.expiresAt);
      setRemaining(Math.max(0, Math.ceil((deadline - now) / 1000)));
      if (deadlineGate.current.take(session.id, deadline, now, latestFinish.current.busy)) void latestFinish.current.finish();
    };
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [session?.id, session?.expiresAt, session?.result]);
  const q = session?.questions[index], answer = session?.answers[String(index)];
  const solution = session?.solutions?.[String(index)] || (answer?.correctOptionId && answer.explanation ? { correctOptionId: answer.correctOptionId, explanation: answer.explanation } : undefined);
  const revealed = answer?.correct !== undefined;
  const submitted = !!session?.result || (mode !== 'exam' && revealed);
  const expired = !!session && !session.result && Date.now() >= Date.parse(session.expiresAt);
  const needsFinish = !!session && !session.result && (expired || nextUnansweredIndex(session) < 0);
  // Existing renderers only consume visible puzzle fields. They never score this DTO.
  const renderQuestion = q ? { ...q, ...(solution || {}) } as BaseQuestion : null;
  const remember = (completed: LearningSessionView) => {
    if (!mounted.current) return;
    const entries = completed.questions.flatMap((question, i) => {
      const answer = completed.answers[String(i)], solution = completed.solutions?.[String(i)];
      return answer && solution ? [{ id: `${completed.id}-${i}`, question: { ...question, ...solution } as BaseQuestion, response: answer.response as QuestionResponse, correct: !!answer.correct }] : [];
    });
    setHistory(previous => [...previous.filter(item => !entries.some(entry => entry.id === item.id)), ...entries]);
  };
  const submit = async (pending = response) => {
    if (!session || !canSubmitLearningAnswer(session, index) || !pending || !isResponseComplete(q as BaseQuestion, pending)) return;
    await run(async () => {
      const advanced = await saveAndAdvance(session, index, pending, learningService, async saved => {
        if (!mounted.current) return;
        setSession(saved); setResponse(saved.answers[String(index)]?.response as QuestionResponse ?? null);
        const confirmed = feedbackLedger.current.take(saved, index);
        if (!confirmed) return;
        setFeedback(confirmed);
        if (confirmed.kind === 'correct') sound.playSuccess();
        else if (confirmed.kind === 'incorrect') sound.playError();
        else sound.playClick();
        await new Promise(resolve => setTimeout(resolve, feedbackDuration(reducedMotion)));
        if (mounted.current) setFeedback(null);
      });
      if (mounted.current) setIndex(advanced.index);
      return advanced.session;
    });
  };
  const changeResponse = (pending: QuestionResponse) => {
    if (busy || !canSubmitLearningAnswer(session, index)) return;
    sound.unlock();
    setResponse(pending);
    if (pending.mode === 'choice' && pending.optionId) void submit(pending);
  };
  const next = async () => {
    if (!session) return;
    if (index < session.questions.length - 1) setIndex(index + 1);
    else await finish();
  };
  const restart = () => { feedbackLedger.current.reset(); setFeedback(null); setSession(null); setResponse(null); setIndex(0); setError(''); };
  const chooseNewDifficulty = async () => {
    if (!session || busy || !await savePending()) return;
    const completed = session.result ? session : await run(() => learningService.finish(session.id));
    if (completed && mounted.current) { remember(completed); restart(); }
  };
  const answeredCount = session ? Object.keys(session.answers).length : 0;
  const isExam = mode === 'exam';
  useEffect(() => {
    if (!session?.result || celebratedResult.current === session.id) return;
    celebratedResult.current = session.id;
    if (session.result.correctAnswers > 0) sound.playLevelUp();
    else sound.playTransition();
  }, [session?.id, session?.result, mode, reviewMistakeId]);
  if(session&&!session.result&&q&&renderQuestion) {
    const canVisit=(i:number)=>i>=0&&i<session.questions.length&&(mode==='exam'||!!session.answers[String(i)]||i===nextUnansweredIndex(session));
    return <FocusedQuestionScreen feedback={feedback} question={renderQuestion} sessionKey={`${session.id}-${index}`} index={index} total={session.questions.length} remaining={remaining} busy={busy} submitted={submitted} expired={expired} response={response} error={error} onChange={changeResponse} onLeave={()=>void leave()} onPrevious={canVisit(index-1)?()=>void goTo(index-1):undefined} onNext={canVisit(index+1)?()=>void goTo(index+1):undefined} onRetry={needsFinish?()=>void finish():response?.mode==='choice'&&response.optionId?()=>void submit():undefined} onRetryLabel={needsFinish?'Sonuçları yükle':'Yeniden gönder'} onReloadResults={()=>void finish()} tools={<>
      <LearningRefreshNotice/>
      <p>Şıkkı seçince cevabın kaydedilir ve sonraki soru açılır. {isExam?'Çözümler deneme bitince gösterilir.':'Önceki soruların çözümlerini buradan inceleyebilirsin.'}</p>
      <nav aria-label="Soru seçimi">{session.questions.map((item,i)=>{const saved=session.answers[String(i)];const label=saved?.correct===undefined?(saved?'Yanıtlandı':'Boş'):(saved.correct?'Doğru':'Yanlış');return <button key={item.id} disabled={busy||!canVisit(i)} aria-current={i===index?'step':undefined} onClick={()=>void goTo(i)} aria-label={`${i+1}. soru, ${label}`}>{i+1} · {label}</button>;})}</nav>
      {response&&response.mode!=='choice'&&<details><summary>Önceki yanıtın</summary><AnswerWorkspace question={renderQuestion} response={response} onChange={changeResponse} submitted/></details>}
      {revealed&&<p role="status">{answer.correct?'Doğru cevap!':'Bu soruyu birlikte inceleyelim.'}</p>}
      {solution&&<VisualExplanationOverlay explanation={solution.explanation} correctOptionId={solution.correctOptionId}/>}
      {!submitted&&!isExam&&<details><summary>İpucu</summary><p>Önce değişen ve aynı kalan özellikleri karşılaştır. Kuralın bütün adımlarda çalıştığını kontrol et.</p></details>}
      <div className="zp-tools-actions">{!reviewMistakeId&&<button disabled={busy} onClick={()=>void chooseNewDifficulty()}>Zorluğu değiştir / yeni çalışma</button>}<button disabled={busy} onClick={()=>void finish()}>{remaining===0?'Sonuçları yeniden yükle':isExam?'Denemeyi bitir':'Çalışmayı bitir'}</button></div>
      <details><summary>Soruyla ilgili sorun bildir</summary>{([['answer','Cevap'],['unclear','Anlatım'],['visual','Görsel'],['level','Seviye']] as const).map(([reason,label])=><button key={reason} disabled={reportBusy} onClick={async()=>{setReportBusy(true);try{await learningService.report(session.id,index,reason);setReportStatus('Bildirimin alındı. Teşekkür ederiz.');}catch(err){setReportStatus(err instanceof Error?err.message:'Bildirim gönderilemedi.');}finally{setReportBusy(false);}}}>{label}</button>)}<p role="status">{reportStatus}</p></details>
      <AnswerHistory items={history}/>
    </>}/>;
  }
  return <main className={`zp-learning ${isExam ? 'zp-exam' : 'zp-game'} mx-auto w-full max-w-6xl space-y-5 px-3 py-6 sm:px-6`}>
    <header className="zp-page-header flex flex-wrap items-center justify-between gap-3">
      <div><p className="zp-eyebrow">ZekaPark · {isExam ? 'Sınav merkezi' : 'Oyun alanı'}</p><h1 className="text-2xl font-extrabold">{session?.title || title}</h1></div>
      <button type="button" disabled={busy} onClick={() => void leave()} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold">Ana sayfaya dön</button>
    </header>
    <div className={isExam ? 'zp-tablet' : 'zp-game-shell'}>
    {isExam && <div className="zp-tablet-camera" aria-hidden="true"><span /></div>}
    <div className="zp-screen">
    <LearningRefreshNotice/>
    <div className="zp-screen-bar"><span>{isExam ? <Tablet size={17} aria-hidden="true" /> : <Gamepad2 size={19} aria-hidden="true" />} {isExam ? 'ZEKA PARK / DENEME' : 'KEŞFET · DÜŞÜN · ÇÖZ'}</span><span>{grade}. SINIF</span></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    <AnswerHistory items={history} />
    {!session ? <section className="zp-setup space-y-5 p-5 sm:p-8">
      <div className="zp-welcome"><div className="zp-welcome-icon" aria-hidden="true">{isExam ? <Tablet size={42} /> : <Sparkles size={42} />}</div><div><p className="zp-eyebrow">{isExam ? 'Kendi hızında, gerçek sınav deneyimi' : 'Küçük adımlar, büyük keşifler'}</p><p className="zp-welcome-title">{isExam ? 'Tabletini hazırla.' : 'Zihnini oyuna davet et!'}</p></div></div>
      <h2 className="text-xl font-bold">{mode === 'exam' ? 'Denemeni seç' : mode === 'adaptive' ? 'Sana uygun sorularla ilerle' : 'Bugün hangi alanda çalışalım?'}</h2>
      <p className="font-semibold text-indigo-700">{grade}. sınıf soruları · Sınıfını öğrenci profilinden değiştirebilirsin.</p>
      <p className="text-slate-600">{mode === 'exam' ? 'Cevaplarını sınav boyunca değiştirebilirsin. Sonuç ve açıklamalar bitirdiğinde gösterilir.' : mode === 'adaptive' ? 'Soru sayını seç. Çalışma geçmişine göre sana uygun bir alan belirlenir; seçtiğin sayıda soruyu tamamlayınca sonuçlarını görürsün.' : 'En fazla beş soruluk bir çalışma seni bekliyor.'} Her yeni başlangıçta sorular karıştırılır; yakın zamanda gördüğün sorular yerine farklı sorulara öncelik verilir.</p>
      {!reviewMistakeId && <label className="block min-w-0 font-semibold"><span>Soru konusu</span><select aria-label="Soru konusu" value={topic} onChange={e => setTopic(e.target.value as LearningTopic)} disabled={busy} className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base"><option value="mixed">Tüm konular · karışık</option>{LEARNING_TOPICS.map(type => <option key={type} value={type}>{QUESTION_TYPE_LABELS[type]}</option>)}</select><span className="mt-1 block text-sm font-normal text-slate-600">{topic === 'mixed' ? '44 konu arasından birini seçerek yalnızca o konuyu çalışabilirsin.' : 'Testte yalnızca seçtiğin konunun yayımlanmış soruları kullanılır. Az soru varsa test mevcut uygun soru sayısıyla açılır.'}</span></label>}
      {mode === 'practice' && topic === 'mixed' && <label className="block font-semibold">Çalışma alanı<select value={category} onChange={e => setCategory(e.target.value as LearningCategory)} disabled={busy} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="mixed">Karışık pratik</option>{AVAILABLE_CATEGORIES.map(c => <option key={c} value={c}>{COGNITIVE_CATEGORY_LABELS[c]}</option>)}</select></label>}
      {topic !== 'mixed' && <p className="rounded-xl bg-indigo-50 p-3 font-semibold text-indigo-900">Seçilen konu: {QUESTION_TYPE_LABELS[topic]} · {grade}. sınıf</p>}
      {!reviewMistakeId && <label className="block font-semibold">Zorluk düzeyi<select value={difficulty} onChange={e => setDifficulty(e.target.value === 'mixed' ? 'mixed' : Number(e.target.value) as LearningDifficulty)} disabled={busy} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="mixed">Karışık zorluk</option>{difficultyChoices(grade).map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select><span className="mt-1 block text-sm font-normal text-slate-600">Yalnızca sınıfına uygun seviyeler gösterilir. Seçimini değiştirirsen yeni bir çalışma başlar.</span></label>}
      {mode === 'adaptive' && !reviewMistakeId && <label className="block font-semibold"><span>Kaç soru çözmek istersin?</span><input aria-label="Soru sayısı" aria-describedby="adaptive-count-help" aria-invalid={!validQuestionCount} type="number" inputMode="numeric" min={1} max={MAX_LEARNING_QUESTIONS} step={1} value={questionCount} onChange={e => setQuestionCount(e.target.value)} disabled={busy} className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base"/><span id="adaptive-count-help" className="mt-1 block text-sm font-normal text-slate-600">1–{MAX_LEARNING_QUESTIONS} arasında bir tam sayı seç. Konu havuzu küçükse test mevcut uygun soru sayısıyla açılır.</span></label>}
      {mode === 'exam' && <fieldset className="flex flex-wrap gap-3"><legend className="mb-2 font-semibold">Deneme süresi</legend>{exams.map(e => <label key={e.id} className={`zp-exam-choice flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 p-4 ${exam === e.id ? 'is-selected' : ''}`}><input type="radio" name="learning-exam" value={e.id} checked={exam === e.id} disabled={busy} onChange={() => setExam(e.id)} />{e.title} · {topic !== 'mixed' ? 'En fazla ' : ''}{e.count} soru · {e.seconds / 60} dakika</label>)}</fieldset>}
      <button type="button" disabled={busy || (mode === 'adaptive' && !validQuestionCount)} onClick={() => void start()} className={button}>{busy ? 'Çalışman hazırlanıyor…' : 'Yeni testi başlat'}</button>
    </section> : <>
      {session.result && <section aria-label="Çalışma sonucu" className="zp-result space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <Trophy size={38} aria-hidden="true" />
        <h2 className="text-xl font-extrabold">Çalışman tamamlandı</h2><p>{session.result.correctAnswers} doğru · {session.result.wrongAnswers} yanlış · {session.result.blankAnswers} boş · %{session.result.scorePercentage} başarı</p><p className="font-bold text-emerald-800">{session.result.xp} XP kazandın</p>
        <p className="text-sm">Sorular arasında geçerek çözüm açıklamalarını inceleyebilirsin.</p><button type="button" disabled={busy} onClick={restart} className={button}>Yeni çalışma</button>
      </section>}
      {q && renderQuestion && <section className="zp-session space-y-5 p-4 sm:p-7">
        <div className="zp-round-header"><div><p className="zp-eyebrow">{COGNITIVE_CATEGORY_LABELS[q.category]}</p><p className="zp-round-title">{isExam ? 'Soru' : 'Sıradaki keşfin'} <span>{index + 1} / {session.questions.length}</span></p><p className="zp-round-detail">{q.targetGrade}. sınıf · Zorluk {q.difficulty}</p></div>{!session.result && <div className={`zp-timer ${remaining <= 60 ? 'zp-timer-low' : ''}`} role="timer" aria-label="Kalan süre"><Clock3 size={21} aria-hidden="true" /><span><small>Kalan süre</small>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span></div>}</div>
        <div className="zp-progress-row"><span><CheckCircle2 size={16} aria-hidden="true" /> {answeredCount} / {session.questions.length} cevaplandı</span><progress aria-label="Çalışma ilerlemesi" max={session.questions.length} value={answeredCount} /></div>
        <nav aria-label="Soru seçimi" className="zp-question-nav flex flex-wrap gap-2">{session.questions.map((item, i) => {
          const saved = session.answers[String(i)];
          const label = saved?.correct === undefined ? saved ? 'Yanıtlandı' : 'Boş' : saved.correct ? 'Doğru' : 'Yanlış';
          return <button key={item.id} type="button" disabled={busy || (mode !== 'exam' && !session.result && !saved && i !== nextUnansweredIndex(session))} aria-current={index === i ? 'step' : undefined} aria-label={`${i + 1}. soru, ${label}`} onClick={() => void goTo(i)} className={`min-h-11 rounded-lg border px-3 disabled:opacity-50 ${index === i ? 'border-indigo-700 bg-indigo-700 text-white' : saved?.correct === false ? 'border-amber-300 bg-amber-50' : saved?.correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300'}`} data-state={saved?.correct === false ? 'incorrect' : saved?.correct ? 'correct' : saved ? 'answered' : 'empty'}><span>{i + 1}</span><small>{label}</small></button>;
        })}</nav>
        <div className="zp-puzzle-card">
        <h2 ref={heading} tabIndex={-1} className="zp-prompt text-lg font-bold focus:outline-none">{q.prompt}</h2>{q.secondaryPrompt && <p>{q.secondaryPrompt}</p>}
        {!submitted && <p className="text-sm text-slate-600">Şıkkı seçince cevabın kaydedilir ve sonraki soru açılır. Önceki soruları yukarıdan inceleyebilirsin.{mode === 'exam' ? ' Doğru cevaplar ve çözümler deneme bitince gösterilir.' : ''}</p>}
        <MemoryStudy key={`${session.id}-${index}`} question={renderQuestion} review={submitted}><QuestionRenderer question={renderQuestion} />
        <fieldset disabled={busy}><legend className="sr-only">Cevabın</legend><AnswerWorkspace preferredMode="choice" key={`${session.id}-${index}`} question={renderQuestion} response={response} onChange={changeResponse} submitted={submitted} /></fieldset></MemoryStudy>
        </div>
        {busy && <p role="status" className="text-sm text-indigo-800">Cevabın kaydediliyor…</p>}
        {!submitted && response && response.mode !== 'choice' && <button type="button" onClick={() => void submit()} disabled={busy || remaining === 0 || !isResponseComplete(q as BaseQuestion, response)} className={button}>Cevabımı kaydet ve ilerle</button>}
        {!submitted && response?.mode === 'choice' && response.optionId && error && <button type="button" disabled={busy} onClick={() => void submit()} className={button}>Cevabımı yeniden gönder</button>}
        {mode === 'exam' && answer && !session.result && <p role="status" className="text-sm text-indigo-800">Cevabın kaydedildi. Başka bir şık seçersen kaydedilip sıradaki boş soruya geçilir.</p>}
        {revealed && <p role="status" className={`font-bold ${answer.correct ? 'text-emerald-700' : 'text-amber-800'}`}>{answer.correct ? `Doğru cevap!${answer.xp ? ` +${answer.xp} XP` : ''}` : 'Bu soruyu birlikte yeniden inceleyelim.'}</p>}
        {solution && <VisualExplanationOverlay explanation={solution.explanation} correctOptionId={solution.correctOptionId} />}
        {!submitted && mode !== 'exam' && <><button type="button" onClick={() => setHint(!hint)} className="min-h-11 font-semibold text-indigo-700 underline">Bir ipucu göster</button>{hint && <p className="rounded-xl bg-amber-50 p-4">Önce değişen ve aynı kalan özellikleri karşılaştır. Bulduğun kuralın bütün adımlarda çalıştığını kontrol et; sonra seçenekleri tek tek dene.</p>}</>}
        {isExam && <div className="zp-exam-navigation"><button type="button" disabled={busy || index === 0} onClick={() => void goTo(index - 1)}><ArrowLeft size={18} aria-hidden="true" /> Önceki soru</button><span>{index + 1} / {session.questions.length}</span><button type="button" disabled={busy || index === session.questions.length - 1} onClick={() => void goTo(index + 1)}>Sonraki soru <ArrowRight size={18} aria-hidden="true" /></button></div>}
        <div className="zp-session-actions flex flex-wrap gap-3">
          {!session.result && !reviewMistakeId && <button type="button" disabled={busy} onClick={() => void chooseNewDifficulty()} className="min-h-11 rounded-xl border border-indigo-300 px-4 py-2 font-semibold text-indigo-800">Zorluğu değiştir / yeni çalışma</button>}
          {!session.result && mode !== 'exam' && revealed && <button type="button" disabled={busy} onClick={() => nextUnansweredIndex(session) >= 0 ? void goTo(nextUnansweredIndex(session)) : void next()} className={button}>{nextUnansweredIndex(session) >= 0 ? 'Çalışmaya devam et' : 'Sonuçları gör'}</button>}
          {!session.result && <button type="button" disabled={busy} onClick={() => void finish()} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 font-semibold">{remaining===0?'Sonuçları yeniden yükle':mode === 'exam' ? 'Denemeyi bitir' : 'Çalışmayı bitir'}</button>}
        </div>
        <details className="border-t border-slate-100 pt-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-600">Soruyla ilgili sorun bildir</summary><div className="flex flex-wrap gap-2">{([['answer', 'Cevap'], ['unclear', 'Anlatım'], ['visual', 'Görsel'], ['level', 'Seviye']] as const).map(([reason, label]) => <button key={reason} type="button" disabled={reportBusy} onClick={async () => { setReportBusy(true); try { await learningService.report(session.id, index, reason); setReportStatus('Bildirimin alındı. Teşekkür ederiz.'); } catch (err) { setReportStatus(err instanceof Error ? err.message : 'Bildirim gönderilemedi.'); } finally { setReportBusy(false); } }} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm">{label}</button>)}</div><p role="status" className="mt-2 text-sm">{reportStatus}</p></details>
      </section>}
    </>}
    </div>
    {isExam && <div className="zp-tablet-home" aria-hidden="true"><span /></div>}
    </div>
  </main>;
}

