import React, { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../lib/api-client';

async function request(path: string, init?: RequestInit) {
  const response = await authenticatedFetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'İşlem tamamlanamadı.');
  return body;
}
export function FamilyActivation() {
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
  const activate = useCallback(async () => {
    setState('loading');
    try { await request('/api/parent/activate-students', { method: 'POST' }); setState('ready'); }
    catch { setState('error'); }
  }, []);
  useEffect(() => { void activate(); }, [activate]);
  if (state === 'ready') return null;
  return <div role="status" className="mx-auto mb-4 max-w-6xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{state === 'loading' ? 'Öğrenci giriş izni kontrol ediliyor…' : 'Öğrenci giriş izni doğrulanamadı. Yeni kayıtlarda veli e-postası doğrulandıktan sonra etkinleştirme gerekir.'}{state === 'error' && <button className="ml-3 min-h-11 underline" onClick={() => void activate()}>Tekrar dene</button>}</div>;
}
export function AccountCenter() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [deletion, setDeletion] = useState<{ id: string; status: string } | null>(null);
  useEffect(() => {
    let active = true;
    request('/api/account/requests').then(body => {
      if (active) setDeletion(body.requests.find((r: { kind: string }) => r.kind === 'deletion') || null);
    }).catch(() => { if (active) setNotice('Talep geçmişi yüklenemedi. İşlem yaptığınızda bağlantı yeniden denenecek.'); });
    return () => { active = false; };
  }, []);
  async function exportData() {
    setBusy(true); setNotice('');
    try {
      const data = await request('/api/account/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'zekapark-hesap-verilerim.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Hesap ve ilerleme verileriniz indirme için hazırlandı.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Veri indirilemedi.'); }
    finally { setBusy(false); }
  }
  async function deletionRequest() {
    if (!confirmed || busy) return;
    setBusy(true); setNotice('');
    try { const result = await request('/api/account/deletion-request', { method: 'POST', body: JSON.stringify({ confirmed: true }) }); setDeletion({ id: result.id, status: 'open' }); setNotice('Silme talebiniz kaydedildi. Hesabınız henüz silinmedi.'); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Talep kaydedilemedi.'); }
    finally { setBusy(false); }
  }
  return <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-800"><h2 className="text-xl font-bold">Hesabım ve verilerim</h2><p className="text-sm text-slate-600">Kendi hesabınızın ve size bağlı öğrenci profillerinin kayıtlı profil ve ilerleme verilerini indirebilirsiniz.</p>
    <button type="button" disabled={busy} onClick={() => void exportData()} className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-60">Verilerimi indir</button>
    <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Aile hesabı silme talebi</h3><p className="text-sm">Talep incelemeye alınır. Bağlı öğrenci kayıtları, saklama yükümlülükleri ve varsa ücretli hizmetler kontrol edilerek işlem tamamlanır.</p>
      {deletion ? <p className="break-words text-sm">Talep: {deletion.id} · {deletion.status === 'open' ? 'İnceleme bekliyor' : 'İncelemede'}</p> : <><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5" />Aile hesabım ve bağlı öğrenci verileri için silme talebi oluşturmak istiyorum.</label><button type="button" disabled={!confirmed || busy} onClick={() => void deletionRequest()} className="min-h-11 rounded-xl border border-rose-300 px-4 py-2 font-semibold text-rose-800 disabled:opacity-50">Silme talebi oluştur</button></>}
    </div>{notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
