import React, { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../lib/api-client';
import { auth, supabase } from '../lib/supabase';

async function request(path: string, init?: RequestInit) {
  const response = await authenticatedFetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'İşlem tamamlanamadı.');
  return body;
}

export function FamilyActivation() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  const parentEmail = auth.currentUser?.email;

  const activate = useCallback(async () => {
    setState('loading');
    try {
      await supabase.auth.refreshSession().catch(() => undefined);
      await request('/api/parent/activate-students', { method: 'POST' });
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  const handleResend = async () => {
    if (!parentEmail || isResending) return;
    setIsResending(true);
    setResendNotice('');
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parentEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama bağlantısı gönderilemedi.');
      setResendNotice('Doğrulama e-postası tekrar gönderildi. Lütfen gelen kutunuzu ve spam klasörünü kontrol edin.');
    } catch (err: any) {
      setResendNotice(err?.message || 'E-posta gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => { void activate(); }, [activate]);
  if (state === 'ready') return null;

  return (
    <div role="status" className="mx-auto mb-6 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-sm text-sm text-amber-950 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5">📩</span>
          <div>
            <p className="font-semibold text-amber-900">
              {state === 'loading' ? 'Öğrenci giriş izni kontrol ediliyor…' : 'Öğrenci Giriş İzni Onay Bekliyor'}
            </p>
            <p className="mt-1 text-amber-800 text-xs sm:text-sm">
              {state === 'loading'
                ? 'Lütfen bekleyin…'
                : `Öğrencinizin giriş yapabilmesi için veli e-posta adresinize (${parentEmail || 'kayıtlı adresiniz'}) gönderilen onay linkine tıklamalısınız.`}
            </p>
            {resendNotice && (
              <p className="mt-2 text-xs font-medium text-emerald-800 bg-emerald-100/90 p-2 rounded-lg border border-emerald-200">
                {resendNotice}
              </p>
            )}
          </div>
        </div>

        {state === 'error' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 transition disabled:opacity-50"
            >
              {isResending ? 'Gönderiliyor…' : 'E-postayı Tekrar Gönder'}
            </button>
            <button
              type="button"
              onClick={() => void activate()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-800 hover:bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
            >
              Onayladım, Tekrar Dene
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
