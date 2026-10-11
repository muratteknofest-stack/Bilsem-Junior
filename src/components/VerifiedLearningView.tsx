import React, { useEffect, useState } from 'react';
import type { BaseQuestion } from '../types';
import { COGNITIVE_CATEGORY_LABELS } from '../types';
import { AVAILABLE_CATEGORIES, isAvailableCategory } from '../features/student/available-categories';
import { LEARNING_EXAMS, type LearningCategory, type LearningMode, type LearningSessionView } from '../features/student/learning-contract';
import { isResponseComplete, isResponseEmpty, type QuestionResponse } from '../features/questions/answer-interactions';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { MemoryStudy } from '../features/questions/renderers/MemoryStudy';
import { AnswerWorkspace } from '../features/questions/renderers/AnswerWorkspace';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { learningService } from '../services/learning-service';

const button = 'min-h-11 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-indigo-300';
interface Props { mode: LearningMode; initialCategory?: LearningCategory; reviewMistakeId?: string; onNavigateHome: () => void; }
export function VerifiedLearningView({ mode, initialCategory = 'mixed', reviewMistakeId, onNavigateHome }: Props) {
  const [category, setCategory] = useState<LearningCategory>(isAvailableCategory(initialCategory) ? initialCategory : 'mixed');
  const [exam, setExam] = useState('mini');
  const [session, setSession] = useState<LearningSessionView | null>(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [reportStatus, setReportStatus] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const title = mode === 'exam' ? 'Denemelerim' : mode === 'adaptive' ? 'Adaptif çalışma' : 'Zeka pratiğim';
  const run = async (action: () => Promise<LearningSessionView>) => {
    setBusy(true); setError('');
    try { const saved = await action(); setSession(saved); return saved; }
    catch (err) { setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı. Yeniden dene.'); return null; }
    finally { setBusy(false); }
  };
  const start = async () => { const saved = await run(() => reviewMistakeId ? learningService.review(reviewMistakeId) : learningService.start(mode, category, exam)); if (saved) { const next = mode === 'exam' ? 0 : saved.questions.findIndex((_, i) => !saved.answers[String(i)]); setIndex(next < 0 ? saved.questions.length - 1 : next); } };
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
  const goTo = async (nextIndex: number) => { if (await savePending()) setIndex(nextIndex); };
  const leave = async () => { if (await savePending()) onNavigateHome(); };
  useEffect(() => {
    const saved = session?.answers[String(index)];
    setResponse(saved ? saved.response as QuestionResponse : null); setHint(false); setReportStatus('');
  }, [session?.id, index]);
  useEffect(() => {
    if (!session || session.result) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [session?.id, session?.expiresAt, session?.result]);
  // Expiry is enforced independently by the server. A failed auto-finish stays retryable.
  useEffect(() => { if (session && !session.result && remaining === 0 && Date.now() >= Date.parse(session.expiresAt) && !busy && !error) void finish(); }, [remaining, session?.id, session?.result, busy, error]);
  const q = session?.questions[index], answer = session?.answers[String(index)];
  const solution = session?.solutions?.[String(index)] || (answer?.correctOptionId && answer.explanation ? { correctOptionId: answer.correctOptionId, explanation: answer.explanation } : undefined);
  const revealed = answer?.correct !== undefined;
  const submitted = !!session?.result || (mode !== 'exam' && revealed);
  // Existing renderers only consume visible puzzle fields. They never score this DTO.
  const renderQuestion = q ? { ...q, ...(solution || {}) } as BaseQuestion : null;
  const submit = async () => { if (session) { const saved = await run(() => learningService.answer(session.id, index, isResponseEmpty(response) ? null : response)); if (saved) setResponse(saved.answers[String(index)]?.response as QuestionResponse || null); } };
  const next = async () => {
    if (!session) return;
    if (index < session.questions.length - 1) setIndex(index + 1);
    else await finish();
  };
  const restart = () => { setSession(null); setResponse(null); setIndex(0); setError(''); };
  return <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-bold text-indigo-600">ZekaPark</p><h1 className="text-2xl font-extrabold">{session?.title || title}</h1></div>
      <button type="button" disabled={busy} onClick={() => void leave()} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold">Ana sayfaya dön</button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {!session ? <section className="space-y-5 rounded-3xl border border-indigo-100 bg-white p-5 sm:p-8">
      <h2 className="text-xl font-bold">{mode === 'exam' ? 'Denemeni seç' : mode === 'adaptive' ? 'Sana uygun sorularla ilerle' : 'Bugün hangi alanda çalışalım?'}</h2>
      <p className="text-slate-600">{mode === 'exam' ? 'Cevaplarını sınav boyunca değiştirebilirsin. Sonuç ve açıklamalar bitirdiğinde gösterilir. Devam eden denemen varsa kaldığın yerden açılır.' : mode === 'adaptive' ? 'Çalışma geçmişine göre tekrar edebileceğin bir alan seçilir. Her sorudan sonra açıklamasını inceleyebilirsin.' : 'Beş soruluk bir çalışma seni bekliyor. Yarım kalan çalışman varsa önce ona devam edebilirsin.'}</p>
      {mode === 'practice' && <label className="block font-semibold">Çalışma alanı<select value={category} onChange={e => setCategory(e.target.value as LearningCategory)} disabled={busy} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="mixed">Karışık pratik</option>{AVAILABLE_CATEGORIES.map(c => <option key={c} value={c}>{COGNITIVE_CATEGORY_LABELS[c]}</option>)}</select></label>}
      {mode === 'exam' && <fieldset className="flex flex-wrap gap-3"><legend className="mb-2 font-semibold">Deneme süresi</legend>{LEARNING_EXAMS.map(e => <label key={e.id} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 p-4"><input type="radio" name="learning-exam" value={e.id} checked={exam === e.id} disabled={busy} onChange={() => setExam(e.id)} />{e.title} · {e.count} soru · {e.seconds / 60} dakika</label>)}</fieldset>}
      <button type="button" disabled={busy} onClick={() => void start()} className={button}>{busy ? 'Çalışman hazırlanıyor…' : 'Başla / devam et'}</button>
    </section> : <>
      {session.result && <section aria-label="Çalışma sonucu" className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-xl font-extrabold">Çalışman tamamlandı</h2><p>{session.result.correctAnswers} doğru · {session.result.wrongAnswers} yanlış · {session.result.blankAnswers} boş · %{session.result.scorePercentage} başarı</p><p className="font-bold text-emerald-800">{session.result.xp} XP kazandın</p>
        <p className="text-sm">Sorular arasında geçerek çözüm açıklamalarını inceleyebilirsin.</p><button type="button" onClick={restart} className={button}>{mode === 'adaptive' ? 'Sıradaki soruya geç' : 'Yeni çalışma'}</button>
      </section>}
      {q && renderQuestion && <section className="space-y-5 rounded-3xl border border-indigo-100 bg-white p-4 sm:p-7">
        <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><span>Soru {index + 1} / {session.questions.length} · {COGNITIVE_CATEGORY_LABELS[q.category]}</span>{!session.result && <span aria-label="Kalan süre">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}</div>
        {mode === 'exam' || session.result ? <nav aria-label="Soru seçimi" className="flex flex-wrap gap-2">{session.questions.map((item, i) => <button key={item.id} type="button" disabled={busy} aria-current={index === i ? 'step' : undefined} aria-label={`${i + 1}. soru${session.answers[String(i)] ? ', yanıtlandı' : ', boş'}`} onClick={() => void goTo(i)} className={`min-h-10 min-w-10 rounded-lg border px-3 ${index === i ? 'border-indigo-700 bg-indigo-700 text-white' : session.answers[String(i)] ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300'}`}>{i + 1}</button>)}</nav> : null}
        <h2 className="text-lg font-bold">{q.prompt}</h2>{q.secondaryPrompt && <p>{q.secondaryPrompt}</p>}
        <MemoryStudy key={`${session.id}-${index}`} question={renderQuestion} review={submitted}><QuestionRenderer question={renderQuestion} />
        <fieldset disabled={busy}><legend className="sr-only">Cevabın</legend><AnswerWorkspace key={`${session.id}-${index}`} question={renderQuestion} response={response} onChange={setResponse} submitted={submitted} /></fieldset></MemoryStudy>
        {!submitted && <button type="button" onClick={() => void submit()} disabled={busy || remaining === 0 || (!isResponseComplete(q as BaseQuestion, response) && !(mode === 'exam' && answer && isResponseEmpty(response)))} className={button}>{busy ? 'Kaydediliyor…' : mode === 'exam' ? 'Cevabımı kaydet' : 'Cevabımı kontrol et'}</button>}
        {mode === 'exam' && answer && !session.result && <p role="status" className="text-sm text-indigo-800">Cevabın kaydedildi. Değiştirdiğinde yeniden kaydet.</p>}
        {revealed && <p role="status" className={`font-bold ${answer.correct ? 'text-emerald-700' : 'text-amber-800'}`}>{answer.correct ? `Doğru cevap!${answer.xp ? ` +${answer.xp} XP` : ''}` : 'Bu soruyu birlikte yeniden inceleyelim.'}</p>}
        {solution && <VisualExplanationOverlay explanation={solution.explanation} correctOptionId={solution.correctOptionId} />}
        {!submitted && mode !== 'exam' && <><button type="button" onClick={() => setHint(!hint)} className="min-h-11 font-semibold text-indigo-700 underline">Bir ipucu göster</button>{hint && <p className="rounded-xl bg-amber-50 p-4">Önce değişen ve aynı kalan özellikleri karşılaştır. Bulduğun kuralın bütün adımlarda çalıştığını kontrol et; sonra seçenekleri tek tek dene.</p>}</>}
        <div className="flex flex-wrap gap-3">
          {!session.result && mode !== 'exam' && revealed && <button type="button" disabled={busy} onClick={() => void next()} className={button}>{index + 1 < session.questions.length ? 'Sonraki soru' : 'Çalışmayı bitir'}</button>}
          {!session.result && <button type="button" disabled={busy} onClick={() => void finish()} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 font-semibold">{mode === 'exam' ? 'Denemeyi bitir' : 'Çalışmayı bitir'}</button>}
        </div>
        <details className="border-t border-slate-100 pt-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-600">Soruyla ilgili sorun bildir</summary><div className="flex flex-wrap gap-2">{([['answer', 'Cevap'], ['unclear', 'Anlatım'], ['visual', 'Görsel'], ['level', 'Seviye']] as const).map(([reason, label]) => <button key={reason} type="button" disabled={reportBusy} onClick={async () => { setReportBusy(true); try { await learningService.report(session.id, index, reason); setReportStatus('Bildirimin alındı. Teşekkür ederiz.'); } catch (err) { setReportStatus(err instanceof Error ? err.message : 'Bildirim gönderilemedi.'); } finally { setReportBusy(false); } }} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm">{label}</button>)}</div><p role="status" className="mt-2 text-sm">{reportStatus}</p></details>
      </section>}
    </>}
  </main>;
}
