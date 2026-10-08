import React, { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';
interface Ticket { id: string; kind: string; status: string; actor_id: string; created_at: string; resolution: string; payload: { reason?: string; scope?: string; question?: { id?: string; type?: string; prompt?: string }; audit?: { errors?: string[]; reviewRequired?: string[] } }; }
const reasons: Record<string,string> = { answer: 'Cevap/çözüm', unclear: 'Yönerge', visual: 'Görsel', level: 'Sınıf düzeyi' };
export function AdminSupportQueue() {
  const [status, setStatus] = useState('open');
  const [items, setItems] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const r = await authenticatedFetch('/api/admin/support-requests?status=' + status); const b = await r.json(); if (!r.ok) throw new Error(b.error); setItems(b.requests); }
    catch { setError('Bildirimler yüklenemedi. Bağlantı ve yönetici yetkisini kontrol edin.'); }
    finally { setBusy(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  async function review(item: Ticket, next: string) {
    setBusy(true); setError('');
    try { const r = await authenticatedFetch('/api/admin/support-requests/' + item.id, { method: 'POST', body: JSON.stringify({ status: next, resolution: notes[item.id] ?? item.resolution }) }); const b = await r.json(); if (!r.ok) throw new Error(b.error); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5"><h2 className="text-2xl font-bold">Soru ve hesap bildirimleri</h2><p className="text-sm text-slate-300">Soru bildirimi, bildirim anındaki içeriği ve sunucu denetimini saklar. İncelemeyi kapatmak soruyu değiştirmez; gerekli düzeltmeyi Soru Atölyesi’nde yapın.</p>
    <div className="flex flex-wrap gap-3"><select aria-label="Bildirim durumu" className="rounded-xl border border-slate-600 bg-slate-900 p-3" value={status} disabled={busy} onChange={e => setStatus(e.target.value)}><option value="open">Yeni</option><option value="reviewing">İncelemede</option><option value="resolved">Çözüldü</option><option value="dismissed">Kapatıldı</option></select><button disabled={busy} onClick={() => void load()} className="rounded-xl border border-slate-600 px-4 py-2">Yenile</button></div>
    {error && <p role="alert" className="rounded-xl bg-rose-950 p-4 text-rose-200">{error}</p>}
    {!busy && !items.length && !error && <p>Bu durumda bildirim bulunmuyor.</p>}
    {items.map(item => <article key={item.id} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4"><h3 className="font-bold">{item.kind === 'deletion' ? 'Hesap silme talebi' : 'Soru: ' + (reasons[item.payload.reason || ''] || 'İnceleme')}</h3><p className="break-words text-xs text-slate-400">{item.id} · {new Date(item.created_at).toLocaleString('tr-TR')}</p>
      {item.kind === 'deletion' ? <p className="text-sm text-amber-200">Hesap sahibi: {item.actor_id}. Bu ekran yalnızca inceleme kaydı tutar; veri silme işlemi gerçekleştirmez. Hesap silme prosedürünü izleyin.</p> : <><p className="text-sm">{item.payload.question?.prompt}</p><p className="text-xs text-slate-300">{item.payload.question?.id} · {item.payload.question?.type}</p><ul className="list-disc pl-5 text-sm text-amber-200">{[...(item.payload.audit?.errors || []), ...(item.payload.audit?.reviewRequired || [])].map((e,i) => <li key={i}>{e}</li>)}</ul><details><summary className="cursor-pointer py-2 text-sm">Soru snapshot'ı ve denetim</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-xs">{JSON.stringify(item.payload, null, 2)}</pre></details></>}
      <label className="block text-sm">İnceleme notu<textarea minLength={10} maxLength={2000} value={notes[item.id] ?? item.resolution} onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 p-3" /></label><div className="flex flex-wrap gap-2">{(item.kind === 'deletion' ? ['reviewing'] : ['reviewing','resolved','dismissed']).map(next => <button key={next} disabled={busy || (notes[item.id] ?? item.resolution).trim().length < 10} className="min-h-11 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40" onClick={() => void review(item,next)}>{next === 'reviewing' ? 'İncelemeye al' : next === 'resolved' ? 'Çözüldü olarak işaretle' : 'Kapat'}</button>)}</div>
    </article>)}
  </section>;
}
