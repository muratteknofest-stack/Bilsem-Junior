import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Play, Search } from 'lucide-react';
import { QUESTION_TYPE_LABELS, type QuestionType } from '../../types';
import { ALL_QUESTION_TYPES } from '../../features/questions/generators';
import { STUDENT_TYPES } from '../../features/questions/professional-engine';
import { runEngineDiagnostics, type EngineDiagnostic } from '../../features/questions/engine-diagnostics';

const labels = { passed: 'Kontroller geçti', review: 'Kanıtlayıcı eksik', failed: 'Hata bulundu', untested: 'Test edilmedi' };
const colors = { passed: 'bg-emerald-50 text-emerald-800', review: 'bg-amber-50 text-amber-800', failed: 'bg-rose-50 text-rose-800', untested: 'bg-slate-100 text-slate-600' };
export function AdminStressTest({ onInspectType }: { onInspectType?: (type: QuestionType) => void }) {
  const [rounds, setRounds] = useState(1), [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [records, setRecords] = useState<EngineDiagnostic[] | null>(null);
  const [query, setQuery] = useState(''), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = async () => {
    if (controller.current) return;
    const current = new AbortController(); controller.current = current;
    setRunning(true); setError(''); setRecords(null); setProgress({ done: 0, total: ALL_QUESTION_TYPES.length * 6 * rounds });
    try {
      const result = await runEngineDiagnostics(rounds, (done, total) => setProgress({ done, total }), current.signal);
      if (result) setRecords(result);
    } catch (e) {
      if (!current.signal.aborted) setError(e instanceof Error ? e.message : 'Tanı tamamlanamadı.');
    } finally {
      if (!current.signal.aborted) { setRunning(false); controller.current = null; }
    }
  };
  const samples = records?.flatMap(r => r.samples) || [];
  const filtered = records?.filter(r => `${QUESTION_TYPE_LABELS[r.type]} ${r.type}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))) || [];
  return <div className="space-y-5">
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Cpu size={20} /> Soru motoru kalite laboratuvarı</h2>
      <p className="text-sm text-slate-600">{ALL_QUESTION_TYPES.length} türün her biri, 6 zorluk seviyesinde denenir. {STUDENT_TYPES.length} tür bağımsız çözücülerle destekleniyor. Diğer türler öğrenciye açılmadan önce inceleme gerektiriyor.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">Kapsam <select value={rounds} disabled={running} onChange={e => setRounds(Number(e.target.value))} className="ml-2 rounded-lg border p-2">{[1, 3, 10].map(n => <option key={n} value={n}>{n} tur · {ALL_QUESTION_TYPES.length * 6 * n} soru</option>)}</select></label>
        <button type="button" disabled={running} onClick={run} className="flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Play size={16} />{running ? 'Test ediliyor…' : 'Testi başlat'}</button>
      </div>
      {running && <div role="status" aria-live="polite" className="text-sm text-purple-800">{progress.done} / {progress.total} soru denetlendi<progress className="mt-2 w-full" value={progress.done} max={progress.total} /></div>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
    </div>
    {records && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        ['Denetlenen örnek', samples.length], ['Kontroller geçti', samples.filter(s => s.status === 'passed').length],
        ['Hata bulundu', samples.filter(s => s.status === 'failed').length], ['Kanıtlayıcı eksik', samples.filter(s => s.status === 'review').length],
      ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-600">{label}</p><strong className="text-2xl text-slate-900">{value}</strong></div>)}</div>
      <p className="text-xs text-slate-600">Sonuçlar yalnızca denenen örnekleri kapsar. Yapısal hatalar ile bağımsız doğrulaması eksik taslaklar ayrı sayılır; ikisi de öğrenci havuzuna alınmaz.</p>
      <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2"><Search size={16} /><input aria-label="Soru türü ara" placeholder="Soru türü ara…" value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" /></label>
      <div className="space-y-3">{filtered.map(rec => <article key={rec.type} className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3"><div><h3 className="font-bold text-sm text-slate-900">{QUESTION_TYPE_LABELS[rec.type]}</h3><p className="text-xs text-slate-500">{rec.type}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${colors[rec.status]}`}>{rec.status === 'passed' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{labels[rec.status]}</span></div>
        <p className="text-xs text-slate-600">{rec.samples.length} örnek · {rec.passed} geçti · {rec.failed} hata · {rec.review} inceleme · ortalama {rec.avgMs.toFixed(1)} ms</p>
        {rec.samples.some(s => s.status !== 'passed') && <details className="rounded-lg bg-slate-50 p-3 text-xs"><summary className="cursor-pointer font-bold text-slate-800">Hata nedenleri ve yeniden üretme bilgileri</summary><ul className="mt-3 space-y-3">{rec.samples.filter(s => s.status !== 'passed').map(s => <li key={`${s.seed}-${s.difficulty}`}><strong>Tohum {s.seed} · Zorluk {s.difficulty} · {labels[s.status]}</strong><ul className="mt-1 list-disc pl-4 text-slate-600">{s.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul></li>)}</ul></details>}
        {onInspectType && <button type="button" onClick={() => onInspectType(rec.type)} className="text-xs font-bold text-purple-700 underline">Türü stüdyoda incele</button>}
      </article>)}</div>
    </>}
    {!records && !running && <p className="p-5 text-sm text-slate-500">Henüz test sonucu yok. Başlatınca tüm türler ve zorluk seviyeleri taranır.</p>}
  </div>;
}
