import React, { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';

type Draft = {
  id: string; slot: 'morning' | 'evening'; state: string; source: string; caption: string;
  qualityScore: number; question: { prompt: string; explanation: { summary: string } };
};

async function request(url: string, init?: RequestInit) {
  const response = await authenticatedFetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'İşlem tamamlanamadı.');
  return data;
}

function Card({ draft, kind }: { draft: Draft; kind: 'question' | 'answer' }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    authenticatedFetch(`/api/admin/social-content/${draft.id}/${kind}.jpg`)
      .then(async response => { if (!response.ok) throw new Error('Görsel hazırlanamadı.'); return response.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); if (!cancelled) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl); })
      .catch(() => { if (!cancelled) setUrl(''); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [draft.id, kind]);
  return <div className="min-w-0"><div className="mb-2 text-xs text-slate-400">{kind === 'question' ? 'Soru kartı' : 'Çözüm kartı'}</div>
    {url ? <a href={url} download={`zekapark-${draft.id}-${kind}.jpg`} title="Görseli indir"><img src={url} alt={kind === 'question' ? draft.question.prompt : draft.question.explanation.summary} className="w-full rounded-xl border border-slate-700" /></a>
      : <div className="rounded-xl border border-slate-700 p-6">Görsel hazırlanıyor veya desteklenmiyor.</div>}
  </div>;
}

export const AdminSocialContent: React.FC = () => {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<(Draft | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [platforms, setPlatforms] = useState({ instagram: false, facebook: false });
  const [qwen, setQwen] = useState<{ status: 'configured' | 'incomplete' | 'absent'; model: string | null }>({ status: 'absent', model: null });
  const [publications, setPublications] = useState<Array<{ contentId: string; platform: string; state: string; errorCode?: string }>>([]);
  const [metrics, setMetrics] = useState<Array<{ views?: number; solves?: number } | null>>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const refresh = useCallback(async () => {
    try { const data = await request('/api/admin/social-content'); setDate(data.date); setSlots(data.slots); setPlatforms(data.platforms); setQwen(data.qwen); setPublications(data.publications); setMetrics(data.metrics); setAutoApprove(data.settings?.autoApprove === true); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'İçerik yüklenemedi.'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const act = async (endpoint: string, body: object) => {
    setBusy(true); setError('');
    try { await request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'İşlem başarısız.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5">
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <h2 className="text-xl font-bold">Sosyal soru içerikleri</h2>
      <p className="text-sm text-slate-400 mt-2">{date} • Her gün sabah ve akşam için ayrı taslak. İncelemeden otomatik paylaşım yapılmaz.</p>
      <p className="text-sm text-slate-400 mt-2">Instagram: {platforms.instagram ? 'Yapılandırıldı' : 'Hesap bağlantısı gerekli'} · Facebook: {platforms.facebook ? 'Yapılandırıldı' : 'Sayfa bağlantısı gerekli'}</p>
      <p className="text-sm text-slate-400 mt-2">Qwen: {qwen.status === 'configured' ? `${qwen.model} etkin` : qwen.status === 'incomplete' ? 'Yapılandırma eksik' : 'Ayarlı değil; doğrulanmış soru havuzu kullanılır'}</p>
      <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={autoApprove} disabled={busy}
        onChange={e => act('/api/admin/social-content/settings', { autoApprove: e.target.checked })} />
        Doğrulanmış soruları zamanlayıcıda otomatik onayla ve bağlı platformlarda paylaş</label>
      <p className="text-xs text-slate-400 mt-1">Varsayılan kapalıdır. Açıldığında yeni taslaklar yönetici incelemesi beklemeden yayın saatinde gönderilir.</p>
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
    </div>
    {(['morning', 'evening'] as const).map((slot, idx) => {
      const draft = slots[idx];
      return <article key={slot} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{slot === 'morning' ? 'Sabah' : 'Akşam'} • {draft?.state ?? 'Taslak yok'}</h3>
          {!draft && <button disabled={busy} onClick={() => act('/api/admin/social-content/draft', { slot })} className="rounded-lg bg-indigo-600 px-4 py-2 disabled:opacity-50">Taslak oluştur</button>}</div>
        {draft && <>
          <div className="text-sm text-slate-300">Doğrulama eşiği: {draft.qualityScore}/100 • Kaynak: {draft.source === 'qwen_verified' ? 'Qwen + bağımsız çözücü' : draft.source === 'question_bank' ? 'Soru havuzu' : 'Doğrulanmış motor'} • Soruyu ve çözümü görsel olarak kontrol edin.</div>
          <div className="text-sm text-slate-400">Ziyaret: {metrics[idx]?.views ?? 0} • Çözülen soru: {metrics[idx]?.solves ?? 0}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl"><Card draft={draft} kind="question"/><Card draft={draft} kind="answer"/></div>
          <label className="block text-sm">Gönderi açıklaması<textarea value={captions[draft.id] ?? draft.caption} onChange={e => setCaptions(old => ({ ...old, [draft.id]: e.target.value }))} maxLength={1800} rows={3} className="mt-2 block w-full rounded-xl bg-slate-800 border border-slate-600 p-3" /></label>
          {draft.state === 'awaiting_approval' && <div className="flex gap-3">
            <button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 disabled:opacity-50" onClick={() => act(`/api/admin/social-content/${draft.id}/review`, { action: 'approve', caption: captions[draft.id] ?? draft.caption })}>Onayla</button>
            <button disabled={busy} className="rounded-lg bg-slate-700 px-4 py-2 disabled:opacity-50" onClick={() => act(`/api/admin/social-content/${draft.id}/review`, { action: 'reject' })}>Reddet</button>
          </div>}
          {draft.state === 'approved' && <p className="text-amber-200 text-sm">Onaylandı. Bağlı platformlara zamanlanan görev çalıştığında gönderilir.</p>}
          {publications.filter(p => p.contentId === draft.id).map(p => <p key={p.platform} className="text-sm text-slate-300">{p.platform}: {p.state}{p.errorCode ? ` (${p.errorCode})` : ''}</p>)}
        </>}
      </article>;
    })}
  </section>;
};
