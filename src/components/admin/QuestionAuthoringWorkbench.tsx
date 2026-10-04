import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, FileDown, FolderOpen, LoaderCircle, Plus, RefreshCw, Save, Search, ShieldCheck, Square, WandSparkles, X } from 'lucide-react';
import type { BaseQuestion, DifficultyLevel, QuestionType } from '../../types';
import { QUESTION_TYPE_LABELS, COGNITIVE_CATEGORY_LABELS } from '../../types';
import { ALL_QUESTION_TYPES, generateQuestionByType } from '../../features/questions/generators';
import { GRADE_CONFIGS } from '../../features/questions/grade-config';
import { VERIFIED_TYPES } from '../../features/questions/professional-engine';
import { auditQuestion, questionVisualKey, questionContentKey } from '../../features/questions/quality';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import { loadQuestionLibrary, parseQuestionImport, saveEditorialQuestion, StoredQuestion } from '../../services/question-publishing-service';
import { questionBankService } from '../../services/question-bank-service';

type Grade = 1 | 2 | 3 | 4;
type Section = 'compose' | 'library';
const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const statusLabel = { draft: 'Taslak', review: 'İncelemede', published: 'Yayında', archived: 'Arşiv' };
const checks = [
  'Yönerge sınıf düzeyine uygun, açık ve ipucu vermiyor.',
  'Görselleri ve dört seçeneği inceledim; tek doğru cevap var.',
  'Çözüm adımları ve çeldiricilerin gerekçeleri doğru.',
];

function exportPackage(questions: BaseQuestion[]) {
  const blob = new Blob([JSON.stringify({ format: 'zekapark-editorial-v2', exportedAt: new Date().toISOString(), questions }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'zekapark-soru-paketi.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function QuestionAuthoringWorkbench({ initialSection = 'compose', initialCount = 1, initialType = 'matrix_2x2', onPendingChanges }: {
  initialSection?: Section; initialCount?: number; initialType?: QuestionType; onPendingChanges?: (pending: boolean) => void;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [grade, setGrade] = useState<Grade>(2);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3);
  const [type, setType] = useState<QuestionType | 'mixed'>(initialType);
  const [count, setCount] = useState(initialCount);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000) + 1);
  const [batch, setBatch] = useState<BaseQuestion[]>([]);
  const [library, setLibrary] = useState<StoredQuestion[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, skipped: 0 });
  const [notice, setNotice] = useState('');
  const [cloudError, setCloudError] = useState('');
  const [active, setActive] = useState<BaseQuestion | null>(null);
  const [savedKey, setSavedKey] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [review, setReview] = useState<boolean[]>([false, false, false]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const cancelled = useRef(false);
  const alive = useRef(true);
  const importRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true); setCloudError('');
    try {
      const items = await loadQuestionLibrary();
      if (alive.current) { setLibrary(items); setCloudReady(true); }
    } catch {
      if (alive.current) {
        setCloudReady(false);
        setCloudError('Firebase kütüphanesine erişilemedi. Yönetici yetkisi ve bağlantı kontrol edilmeli. Ekrandaki taslaklar henüz buluta kaydedilmedi; JSON olarak indirebilirsiniz.');
      }
    } finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; cancelled.current = true; }; }, []);
  const allKnown = useMemo(() => [...library, ...batch], [library, batch]);
  const report = useMemo(() => active ? auditQuestion(active, allKnown.filter(q => q.id !== active.id)) : null, [active, allKnown]);
  const dirty = active && questionContentKey(active) !== savedKey;
  const pending = Boolean(dirty) || batch.some(q => !library.some(saved => saved.id === q.id && questionContentKey(saved) === questionContentKey(q)));
  useEffect(() => {
    onPendingChanges?.(pending);
    const warn = (e: BeforeUnloadEvent) => { if (pending) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending, onPendingChanges]);
  const results = (section === 'library' ? library : batch).filter(q =>
    (status === 'all' || (q.status || 'draft') === status) &&
    (q.prompt + QUESTION_TYPE_LABELS[q.type] + q.id).toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));

  function openQuestion(q: BaseQuestion) {
    if (dirty && !window.confirm('Kaydedilmemiş düzenlemeler var. Bu düzenlemelerden vazgeçip diğer soruyu açmak istiyor musunuz?')) return;
    setActive(JSON.parse(JSON.stringify(q))); setSavedKey(questionContentKey(q));
    setAnswer(null); setReveal(false); setReview([false, false, false]); setNotice('');
  }
  function edit(updates: Partial<BaseQuestion>) {
    if (!active) return;
    setActive({ ...active, ...updates }); setReview([false, false, false]); setReveal(false); setAnswer(null);
  }
  async function generate() {
    if (running) return;
    if (!Number.isInteger(count) || count < 1 || count > 60 || !Number.isSafeInteger(seed) || seed < 1 || seed > 2_000_000_000) {
      setNotice('Adet 1–60, varyasyon numarası 1–2.000.000.000 arasında tam sayı olmalı.'); return;
    }
    if (dirty && !window.confirm('Kaydedilmemiş düzenlemeler var. Yeni üretime geçilsin mi?')) return;
    cancelled.current = false; setRunning(true); setProgress({ done: 0, skipped: 0 }); setNotice('');
    const known = new Set([...library, ...batch].map(questionVisualKey));
    const accepted: BaseQuestion[] = [];
    let skipped = 0;
    const gradeTypes = VERIFIED_TYPES.filter(t => GRADE_CONFIGS[grade].recommendedTypes.includes(t));
    const pool = type === 'mixed' ? (gradeTypes.length ? gradeTypes : VERIFIED_TYPES) : [type];
    try {
      for (let attempt = 0; accepted.length < count && attempt < count * 12 && !cancelled.current; attempt++) {
        try {
          const chosen = pool[accepted.length % pool.length];
          const q = generateQuestionByType(chosen, seed + attempt * 997, difficulty);
          q.targetGrade = grade; q.targetGrades = [grade]; q.ageGroup = grade <= 2 ? '1-2' : '3-4'; q.status = 'draft'; q.isCustom = true;
          const audit = auditQuestion(q); const key = questionVisualKey(q);
          if (audit.errors.length || known.has(key)) skipped++;
          else { known.add(key); accepted.push(q); }
        } catch { skipped++; }
        if (attempt % 4 === 0) {
          if (alive.current) setProgress({ done: accepted.length, skipped });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      if (!alive.current) return;
      setBatch(previous => [...accepted, ...previous]); setSection('compose'); setStatus('all'); setSearch('');
      setProgress({ done: accepted.length, skipped });
      if (accepted[0]) { setActive(accepted[0]); setSavedKey(questionContentKey(accepted[0])); setReview([false, false, false]); setReveal(false); setAnswer(null); }
      setNotice(accepted.length + ' taslak hazır. ' + skipped + ' geçersiz veya tekrarlı aday elendi.' + (cancelled.current ? ' Üretim durduruldu.' : '') + ' Buluta kaydetmek için Kaydet düğmesini kullanın.');
    } finally { if (alive.current) setRunning(false); }
  }
  async function save(nextStatus: NonNullable<BaseQuestion['status']>) {
    if (!active || !report || report.errors.length || !cloudReady) return;
    setSaving(true); setNotice('');
    try {
      const revision = library.find(q => q.id === active.id)?.revision || 0;
      const stored = await saveEditorialQuestion(active, nextStatus, revision, review.every(Boolean));
      if (!alive.current) return;
      setLibrary(prev => [stored, ...prev.filter(q => q.id !== stored.id)]);
      setBatch(prev => prev.map(q => q.id === stored.id ? stored : q));
      setActive(stored); setSavedKey(questionContentKey(stored)); setReview([false, false, false]);
      setNotice(nextStatus === 'published' ? 'Soru Firebase’e kaydedildi ve öğrenci havuzunda yayımlandı.' : 'Firebase’e kaydedildi · ' + statusLabel[nextStatus]);
    } catch (err) {
      if (alive.current) setNotice('Kaydedilemedi. Taslak ekranda korunuyor. ' + (err instanceof Error && !err.message.startsWith('Firebase') ? err.message : 'Yönetici yetkisini ve bağlantıyı kontrol edin.'));
    } finally { if (alive.current) setSaving(false); }
  }
  async function saveBatch() {
    if (!cloudReady || saving) return;
    const items = batch.map(q => active?.id === q.id ? active : q).filter(q =>
      !library.some(saved => saved.id === q.id && questionContentKey(saved) === questionContentKey(q)));
    setSaving(true);
    let savedCount = 0;
    try {
      for (const q of items) {
        const audit = auditQuestion(q, allKnown.filter(other => other.id !== q.id));
        if (audit.errors.length) throw new Error(audit.errors.join(' '));
        const stored = await saveEditorialQuestion(q, 'draft', library.find(saved => saved.id === q.id)?.revision || 0, false);
        savedCount++;
        if (!alive.current) return;
        setLibrary(prev => [stored, ...prev.filter(saved => saved.id !== q.id)]);
        setBatch(prev => prev.map(item => item.id === q.id ? stored : item));
        if (active?.id === q.id) { setActive(stored); setSavedKey(questionContentKey(stored)); setReview([false, false, false]); }
        setNotice(savedCount + ' / ' + items.length + ' taslak Firebase’e kaydedildi.');
      }
      setNotice(savedCount + ' taslak Firebase’e kaydedildi. Hiçbiri otomatik yayımlanmadı.');
    } catch {
      if (alive.current) setNotice(savedCount + ' taslak kaydedildi; kalanlar kaydedilemedi. Kalan içerik ekranda korunuyor. Yetki ve bağlantıyı kontrol edin.');
    } finally { if (alive.current) setSaving(false); }
  }
  async function importFile(file: File) {
    try {
      if (file.size > 3_000_000) throw new Error('Dosya 3 MB sınırını aşıyor.');
      const imported = parseQuestionImport(await file.text(), allKnown);
      setBatch(prev => [...imported, ...prev]); setSection('compose');
      setNotice(imported.length + ' farklı soru kontrol edilerek taslaklara alındı. Henüz yayımlanmadı.');
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Dosya okunamadı.'); }
  }

  return <div className="space-y-5 text-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold text-indigo-300 mb-1">ZekaPark · Editoryal çalışma alanı</p><h2 className="text-2xl sm:text-3xl font-bold text-white">Soru Atölyesi</h2><p className="mt-2 text-sm text-slate-300 max-w-2xl">Özgün varyasyon üret, öğrenci görünümünde çöz, denetle ve yayımla. Sorular resmî sınav kopyası değildir.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={button + ' bg-slate-800 text-white hover:bg-slate-700'} onClick={() => importRef.current?.click()}><FolderOpen size={16} />JSON içe aktar</button>
        <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
        <button className={button + ' bg-slate-800 text-white hover:bg-slate-700'} onClick={() => exportPackage(active ? [active] : results)} disabled={!active && !results.length}><FileDown size={16} />JSON indir</button>
      </div>
    </header>
    <nav aria-label="Soru atölyesi bölümleri" className="flex flex-wrap gap-2">
      <button className={button + (section === 'compose' ? ' bg-indigo-600 text-white' : ' bg-slate-800 text-slate-200')} onClick={() => setSection('compose')}><WandSparkles size={17} />Üretim ve taslaklar {batch.length > 0 && '(' + batch.length + ')'}</button>
      {!!batch.length && (
        <>
          <button
            className={button + ' bg-emerald-600 text-white hover:bg-emerald-500'}
            onClick={() => {
              const count = questionBankService.addBulkQuestions(batch);
              setNotice(`${count} taslak başarıyla Soru Havuzu'na aktarıldı!`);
            }}
          >
            <Save size={16} />
            Havuza Aktar ({batch.length})
          </button>
          <button
            className={button + ' border border-slate-600 text-slate-100'}
            disabled={saving || running || !cloudReady}
            onClick={() => void saveBatch()}
          >
            <Save size={16} />
            Buluta Kaydet
          </button>
        </>
      )}
    </nav>
    {cloudError && <div role="alert" className="rounded-xl bg-amber-50 border border-amber-300 p-4 text-sm text-amber-950 flex flex-wrap gap-3 items-center"><p className="flex-1 min-w-48">{cloudError}</p><button onClick={() => void refresh()} disabled={loading} className={button + ' border border-amber-400'}><RefreshCw size={16} />Tekrar dene</button></div>}
    {notice && <p role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">{notice}</p>}
    {section === 'compose' && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <label className="text-sm text-slate-300 space-y-2"><span>Hedef sınıf</span><select className={field} value={grade} disabled={running} onChange={e => { const g = Number(e.target.value) as Grade; setGrade(g); setDifficulty(GRADE_CONFIGS[g].defaultDifficulty); }}>{[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}. sınıf</option>)}</select></label>
        <label className="col-span-2 xl:col-span-2 text-sm text-slate-300 space-y-2"><span>Soru ailesi</span><select className={field} value={type} disabled={running} onChange={e => setType(e.target.value as QuestionType | 'mixed')}>
          <option value="mixed">Karma · otomatik çözümlenebilen türler</option><optgroup label="Bağımsız cevap doğrulamalı · 11 tür">{VERIFIED_TYPES.map(t => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}</optgroup>
          <optgroup label="Diğer türler · eğitmen denetimi gerekli">{ALL_QUESTION_TYPES.filter(t => !VERIFIED_TYPES.includes(t)).map(t => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}</optgroup>
        </select></label>
        <label className="text-sm text-slate-300 space-y-2"><span>Zorluk</span><select className={field} value={difficulty} disabled={running} onChange={e => setDifficulty(Number(e.target.value) as DifficultyLevel)}>{[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{d} / 6</option>)}</select></label>
        <label className="text-sm text-slate-300 space-y-2"><span>Adet</span><input className={field} type="number" min={1} max={60} value={count} disabled={running} onChange={e => setCount(Number(e.target.value))} /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-300 space-y-2 flex-1 min-w-44 max-w-xs"><span>Varyasyon numarası · aynı sayı aynı içeriği üretir</span><input className={field} type="number" min={1} max={2000000000} value={seed} disabled={running} onChange={e => setSeed(Number(e.target.value))} /></label>
        <button className={button + ' border border-slate-600 text-slate-100'} disabled={running} onClick={() => setSeed(Math.floor(Math.random() * 1_000_000) + 1)}><RefreshCw size={16} />Yeni varyasyon</button>
        <button className={button + ' bg-indigo-600 text-white hover:bg-indigo-500'} disabled={running} onClick={() => void generate()}>{running ? <LoaderCircle size={18} className="animate-spin" /> : <WandSparkles size={18} />} {running ? progress.done + ' / ' + count : 'Taslak üret'}</button>
        {running && <button className={button + ' bg-slate-700 text-white'} onClick={() => { cancelled.current = true; }}><Square size={14} />Durdur</button>}
      </div>
      <p className="mt-4 text-sm text-slate-400">Dört farklı seçenek · içerik tabanlı tekrar kontrolü · taslak olarak başlar · yayımlamak için eğitmen onayı gerekir</p>
    </section>}
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-5">
      <aside className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 self-start">
        <div className="flex items-center justify-between"><h3 className="font-bold">{section === 'library' ? 'Kaydedilmiş sorular' : 'Üretilen taslaklar'}</h3><button aria-label="Kütüphaneyi yenile" onClick={() => void refresh()} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button></div>
        <label className="relative block"><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input aria-label="Sorularda ara" className={field + ' pl-9'} placeholder="Yönerge veya soru türü ara" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <select aria-label="Duruma göre filtrele" className={field} value={status} onChange={e => setStatus(e.target.value)}><option value="all">Tüm durumlar</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <div className="space-y-2 max-h-[680px] overflow-y-auto">
          {results.map((q, i) => <button key={q.id} disabled={saving} onClick={() => openQuestion(q)} className={'w-full text-left p-3 rounded-xl border ' + (active?.id === q.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50')}>
            <div className="text-xs text-slate-500 flex justify-between gap-2"><span>{String(i + 1).padStart(2, '0')} · {q.targetGrade || '—'}. sınıf</span><span>{statusLabel[q.status || 'draft']}</span></div>
            <p className="text-sm font-semibold mt-1">{QUESTION_TYPE_LABELS[q.type]}</p><p className="text-sm text-slate-600 line-clamp-2 mt-1">{q.prompt}</p>
          </button>)}
          {!results.length && <p className="text-sm text-slate-500 p-4">{loading ? 'Kütüphane yükleniyor…' : section === 'library' ? 'Henüz kaydedilmiş bir soru yok veya filtreye uymuyor.' : 'Soru ailesini seçip taslak üretin. İçerik öğrenciye otomatik yayımlanmaz.'}</p>}
        </div>
        {section === 'library' && <button className={button + ' text-slate-600 border w-full'} onClick={() => {
          const legacy = questionBankService.getAll().filter(q => q.isCustom && auditQuestion(q).errors.length === 0);
          const known = new Set(allKnown.map(questionVisualKey));
          const items = legacy.filter(q => { const k = questionVisualKey(q); if (known.has(k)) return false; known.add(k); return true; }).map(q => ({ ...q, id: crypto.randomUUID(), status: 'draft' as const }));
          setBatch(prev => [...items, ...prev]); setSection('compose'); setNotice(items.length + ' eski cihaz taslağı inceleme için alındı. Firebase’e kaydetmeden bulutta görünmez.');
        }}>Bu cihazdaki eski taslakları al</button>}
      </aside>
      {active && report ? <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap justify-between gap-3 items-center"><div><p className="text-xs text-slate-500">{active.targetGrade}. sınıf · {COGNITIVE_CATEGORY_LABELS[active.category]} · Zorluk {active.difficulty}/6</p><h3 className="text-lg font-bold mt-1">Öğrenci önizlemesi</h3></div><span className={'px-3 py-1 rounded-full text-sm ' + (report.solverVerified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>{report.solverVerified ? 'Cevap yeniden hesaplandı' : 'Manuel çözüm kontrolü'}</span></div>
        <p className="text-lg font-semibold leading-relaxed">{active.prompt}</p>
        {active.secondaryPrompt && <p className="text-sm text-slate-600">{active.secondaryPrompt}</p>}
        <QuestionRenderer question={active} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{active.options.map(o => <OptionRenderer key={o.id} option={o} questionType={active.type} isSelected={answer === o.id} onSelect={() => setAnswer(o.id)} showCorrect={reveal} isCorrectOption={active.correctOptionId === o.id} />)}</div>
        <button className={button + ' border border-indigo-200 text-indigo-700 bg-indigo-50'} onClick={() => setReveal(!reveal)}>{reveal ? 'Çözümü gizle' : 'Cevabı ve çözümü göster'}<ArrowRight size={16} /></button>
        {reveal && <section className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3"><h4 className="font-bold">{active.explanation.ruleTitle} · Cevap {active.correctOptionId}</h4><p className="text-sm leading-6">{active.explanation.summary}</p><ol className="list-decimal pl-5 text-sm space-y-2">{active.explanation.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {active.authoring && <div className="border-t pt-3 space-y-2">{active.options.map(o => <p className="text-sm" key={o.id}><strong>{o.id}:</strong> {active.authoring?.distractorNotes[o.id]}</p>)}</div>}
        </section>}
        <details className="rounded-xl border border-slate-200 p-4"><summary className="font-semibold cursor-pointer">Yönerge ve çözümü düzenle {dirty && '· kaydedilmemiş değişiklik'}</summary><div className="mt-4 space-y-4">
          <label className="block text-sm space-y-2"><span>Yönerge</span><textarea className={field} rows={3} maxLength={700} value={active.prompt} disabled={saving} onChange={e => edit({ prompt: e.target.value })} /></label>
          <label className="block text-sm space-y-2"><span>İkincil yönerge</span><input className={field} value={active.secondaryPrompt || ''} disabled={saving} onChange={e => edit({ secondaryPrompt: e.target.value })} /></label>
          <label className="block text-sm space-y-2"><span>Çözüm açıklaması</span><textarea className={field} rows={3} value={active.explanation.summary} disabled={saving} onChange={e => edit({ explanation: { ...active.explanation, summary: e.target.value } })} /></label>
          <label className="block text-sm space-y-2"><span>Çözüm adımları · her satır bir adım</span><textarea className={field} rows={5} value={active.explanation.steps.join('\n')} disabled={saving} onChange={e => edit({ explanation: { ...active.explanation, steps: e.target.value.split('\n') } })} /></label>
          <div className="grid grid-cols-2 gap-4"><label className="text-sm space-y-2"><span>Doğru cevap</span><select className={field} value={active.correctOptionId} disabled={saving} onChange={e => edit({ correctOptionId: e.target.value })}>{active.options.map(o => <option key={o.id}>{o.id}</option>)}</select></label><label className="text-sm space-y-2"><span>Tahmini süre (sn)</span><input className={field} type="number" min={10} max={600} value={active.estimatedSeconds} disabled={saving} onChange={e => edit({ estimatedSeconds: Number(e.target.value) })} /></label></div>
        </div></details>
        <section className="rounded-xl border border-slate-200 p-4 space-y-3">
          <h4 className="font-bold flex gap-2 items-center"><ShieldCheck size={18} />Yayımlama öncesi denetim</h4>
          {active.authoring && <p className="text-sm text-slate-600">Ölçülen beceri: {active.authoring.objective}</p>}
          {report.errors.length ? <ul className="list-disc pl-5 text-sm text-rose-800 space-y-1">{report.errors.map((e, i) => <li key={i}>{e}</li>)}</ul> : <p className="text-sm text-emerald-800 flex gap-2"><CheckCircle2 size={16} />Yapı, seçenek benzersizliği ve tekrar denetimi geçti.</p>}
          {report.warnings.map((w, i) => <p key={i} className="text-sm text-amber-900">{w}</p>)}
          <fieldset className="space-y-3 border-t pt-3" disabled={saving}><legend className="text-sm font-semibold pt-3">Eğitmen incelemesi</legend>{checks.map((label, i) => <label key={label} className="flex items-start gap-3 text-sm leading-6 cursor-pointer"><input className="mt-1 w-4 h-4 accent-indigo-600" type="checkbox" checked={review[i]} onChange={e => setReview(previous => previous.map((v, n) => n === i ? e.target.checked : v))} />{label}</label>)}</fieldset>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className={button + ' bg-emerald-600 text-white hover:bg-emerald-500'} disabled={saving || !active} onClick={() => {
              questionBankService.createCustomQuestion(active);
              setNotice('Soru yerel havuza başarıyla eklendi!');
            }}><Save size={16} />Havuza Ekle</button>
            <button className={button + ' bg-slate-900 text-white'} disabled={saving || !cloudReady || !!report.errors.length} onClick={() => void save('draft')}><Save size={16} />Taslağı kaydet</button>
            <button className={button + ' border text-slate-700'} disabled={saving || !cloudReady || !!report.errors.length} onClick={() => void save('review')}>İncelemeye al</button>
            <button className={button + ' bg-indigo-600 text-white hover:bg-indigo-700'} disabled={saving || !cloudReady || !!report.errors.length || !review.every(Boolean)} onClick={() => void save('published')}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Onayla ve yayımla</button>
            {library.some(q => q.id === active.id) && <button className={button + ' border text-slate-600'} disabled={saving || !cloudReady || !!report.errors.length} onClick={() => void save('archived')}>Arşivle</button>}
          </div>
          <p className="text-xs text-slate-500">Düzenlenen bir soruyu taslak olarak kaydetmek yayından kaldırır. Arşivlenen sorular öğrenci havuzuna alınmaz. Üretim ücretli bir AI çağrısı kullanmaz.</p>
        </section>
      </article> : <div className="min-h-80 rounded-2xl border border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-300 gap-3 p-6 text-center"><WandSparkles size={32} /><h3 className="text-xl font-semibold text-white">İlk sorunu birlikte kontrol edelim</h3><p className="text-sm max-w-md">Bir taslak üretin veya kütüphaneden soru seçin. Burada öğrenci görünümü, çözüm ve yayımlama kontrolleri açılır.</p></div>}
    </div>
  </div>;
}
