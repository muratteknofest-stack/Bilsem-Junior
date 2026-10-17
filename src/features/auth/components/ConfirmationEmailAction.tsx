import React, { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { resendFamilyConfirmation } from '../../../services/family-registration-service';

export function ConfirmationEmailAction({ email, initialSent = false }: { email: string; initialSent?: boolean }) {
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [deadline, setDeadline] = useState(() => initialSent ? Date.now() + 60000 : 0);
  const [now, setNow] = useState(Date.now);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= deadline) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function resend() {
    if (sending.current || Date.now() < deadline) return;
    sending.current = true; setBusy(true); setError(''); setNotice('');
    setNow(Date.now()); setDeadline(Date.now() + 60000);
    try { setNotice(await resendFamilyConfirmation(email)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'E-posta gönderilemedi. Bir süre sonra tekrar deneyin.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return <div className="space-y-3">
    <button type="button" disabled={busy || remaining > 0} onClick={resend} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-3 font-semibold text-indigo-700 disabled:opacity-60"><Mail size={18} aria-hidden="true" />{busy ? 'E-posta isteniyor…' : remaining > 0 ? `Yeniden gönder (${remaining} sn)` : 'Doğrulama e-postasını yeniden gönder'}</button>
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>;
}
