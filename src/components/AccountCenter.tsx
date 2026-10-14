import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Loader2, 
  ShieldAlert 
} from 'lucide-react';
import { authenticatedFetch } from '../lib/api-client';
import { auth, supabase } from '../lib/supabase';

async function request(path: string, init?: RequestInit) {
  const response = await authenticatedFetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'İşlem tamamlanamadı.');
  return body;
}

export function FamilyActivation() {
  const [isActivating, setIsActivating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  const parentEmail = auth.currentUser?.email;
  const isVerified = Boolean(auth.currentUser?.emailVerified);

  // If already verified or successfully activated, do not show or trigger anything
  if (isVerified || activatedSuccess) return null;

  const handleActivate = async () => {
    setIsActivating(true);
    setErrorNotice('');
    setResendNotice('');
    try {
      await supabase.auth.refreshSession().catch(() => undefined);
      const res = await request('/api/parent/activate-students', { method: 'POST' });
      if (res && typeof res.activated === 'number') {
        setActivatedSuccess(true);
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'E-posta henüz doğrulanmamış veya işlem tamamlanamadı. Lütfen gelen kutunuzdaki onay bağlantısını tıklayın.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleResend = async () => {
    if (!parentEmail || isResending) return;
    setIsResending(true);
    setResendNotice('');
    setErrorNotice('');
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
      setErrorNotice(err?.message || 'E-posta gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div role="status" className="mx-auto mb-6 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-sm text-sm text-amber-950 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5">📩</span>
          <div>
            <p className="font-semibold text-amber-900">
              Öğrenci Giriş İzni Onay Bekliyor
            </p>
            <p className="mt-1 text-amber-800 text-xs sm:text-sm">
              Öğrencinizin giriş yapabilmesi için veli e-posta adresinize ({parentEmail || 'kayıtlı adresiniz'}) gönderilen onay linkine tıklamalısınız.
            </p>
            {resendNotice && (
              <p className="mt-2 text-xs font-medium text-emerald-800 bg-emerald-100/90 p-2 rounded-lg border border-emerald-200">
                {resendNotice}
              </p>
            )}
            {errorNotice && (
              <p className="mt-2 text-xs font-medium text-rose-800 bg-rose-100/90 p-2 rounded-lg border border-rose-200">
                {errorNotice}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isActivating}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 transition disabled:opacity-50"
          >
            {isResending ? 'Gönderiliyor…' : 'E-postayı Tekrar Gönder'}
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={isActivating || isResending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-800 hover:bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {isActivating ? 'Doğrulanıyor…' : 'Onayladım, Etkinleştir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccountCenter() {
  const [confirmed, setConfirmed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletion, setDeletion] = useState<{ id: string; status: string; created_at?: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [historyError,setHistoryError]=useState(false);
  const [refreshHistory,setRefreshHistory]=useState(0);

  useEffect(() => {
    let active = true;
    setIsLoadingRequests(true);setHistoryError(false);
    request('/api/account/requests')
      .then(body => {
        if (!active) return;
        const found = body?.requests?.find((r: { kind: string }) => r.kind === 'deletion') || null;
        setDeletion(found);
      })
      .catch(() => {
        if(active)setHistoryError(true);
      })
      .finally(() => {
        if (active) setIsLoadingRequests(false);
      });
    return () => { active = false; };
  }, [refreshHistory]);

  async function exportData() {
    setIsExporting(true);
    setNotice(null);
    try {
      const data = await request('/api/account/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zekapark-hesap-verilerim.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ type: 'success', message: 'Hesap ve ilerleme verileriniz JSON dosyası olarak indirildi.' });
    } catch (e) {
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Veriler indirilemedi.' });
    } finally {
      setIsExporting(false);
    }
  }

  async function deletionRequest() {
    if (!confirmed || isDeleting) return;
    setIsDeleting(true);
    setNotice(null);
    try {
      const result = await request('/api/account/deletion-request', {
        method: 'POST',
        body: JSON.stringify({ confirmed: true }),
      });
      setDeletion({ id: result.id, status: 'open' });
      setConfirmed(false);
      setNotice({
        type: 'success',
        message: 'Aile hesabı silme talebiniz başarıyla kaydedildi. Talebiniz inceleme sırasına alınmıştır.',
      });
    } catch (e) {
      setNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Talep kaydedilemedi. Lütfen daha sonra tekrar deneyin.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <section className="mb-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Hesabım ve Verilerim</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Kendi profilinizin ve bağlı öğrencinizin kayıtlı etkinlik, soru çözümü ve ilerleme verilerini yönetin.
        </p>
      </div>

      {notice && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-xl p-3.5 text-sm ${
            notice.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="flex-1">{notice.message}</span>
        </div>
      )}

      {/* Data Export Box */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-zinc-200">Veri Taşınabilirliği (KVKK / GDPR)</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
          Kayıtlı öğrenci profilleri, deneme sınavı sonuçları ve öğrenme verilerinizi JSON formatında cihazınıza indirebilirsiniz.
        </p>
        <button
          type="button"
          disabled={isExporting}
          onClick={() => void exportData()}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Veriler Hazırlanıyor…</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Verilerimi İndir (.json)</span>
            </>
          )}
        </button>
      </div>

      {/* Family Account Deletion Request Box */}
      <div className="border-t border-slate-200 pt-5 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-slate-900 dark:text-zinc-100">
          <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <h3 className="font-bold text-base">Aile Hesabı Silme Talebi</h3>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
          Aile hesabı silme talebi oluşturulduğunda bağlı tüm öğrenci hesapları, çalışma geçmişi ve veli kaydı incelemeye alınır.
        </p>

        <div className="mt-4">
          {isLoadingRequests ? (
            <div className="flex items-center gap-2.5 py-3 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Talep durumu kontrol ediliyor…</span>
            </div>
          ) : historyError ? <div role="alert" className="space-y-2 text-sm text-rose-800 dark:text-rose-300"><p>Silme talebinizin durumu yüklenemedi. Yeniden deneyin; yeni bir talep oluşturulmadı.</p><button type="button" onClick={()=>setRefreshHistory(v=>v+1)} className="min-h-11 rounded-lg border border-rose-300 px-3 py-2">Talep durumunu yeniden yükle</button></div> : deletion ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Aktif Silme Talebi Mevcut
                  </span>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  {deletion.status === 'open' ? 'İnceleme Bekliyor' : 'İncelemede'}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs text-slate-700 dark:text-zinc-300">
                <span className="font-medium text-slate-500 dark:text-zinc-400">Talep Kodu:</span>
                <code className="font-mono bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700 font-bold">
                  {deletion.id}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyId(deletion.id)}
                  title="Talep numarasını kopyala"
                  className="inline-flex items-center gap-1 rounded-md p-1 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-amber-800/90 dark:text-amber-400/80">
                Talebiniz kayıt altındadır. Yasal saklama ve hizmet kontrolleri tamamlandıktan sonra hesap silme işlemi gerçekleştirilecektir.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200/70 p-3 hover:bg-slate-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-rose-600 focus:ring-rose-500 dark:border-zinc-700 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                  Aile hesabım ve bağlı tüm öğrenci verilerinin (soru geçmişi, puanlar, kalkanlar) kalıcı olarak silinmesi için talep oluşturmak istiyorum.
                </span>
              </label>

              <button
                type="button"
                disabled={!confirmed || isDeleting}
                onClick={() => void deletionRequest()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50/60 hover:bg-rose-100/80 px-4 py-2 text-xs font-bold text-rose-800 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 shadow-2xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Talep Kaydediliyor…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Silme Talebi Oluştur</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
