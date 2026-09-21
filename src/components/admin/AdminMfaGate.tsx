import React, { useState } from 'react';
import {
  multiFactor,
  TotpMultiFactorGenerator,
  type TotpSecret,
  type User,
} from 'firebase/auth';
import { AlertTriangle, CheckCircle2, Copy, ShieldCheck } from 'lucide-react';

interface AdminMfaGateProps {
  user: User;
  onEnrollmentComplete: () => Promise<void>;
  children: React.ReactNode;
}

export const AdminMfaGate: React.FC<AdminMfaGateProps> = ({ user, onEnrollmentComplete, children }) => {
  const enrolled = multiFactor(user).enrolledFactors.length > 0;
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (enrolled) return <>{children}</>;

  const beginEnrollment = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await multiFactor(user).getSession();
      setSecret(await TotpMultiFactorGenerator.generateSecret(session));
    } catch (cause) {
      console.warn('Admin MFA enrollment could not start:', cause);
      setError('MFA kurulumu başlatılamadı. Yakın zamanda yeniden giriş yapıp tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  const finishEnrollment = async () => {
    if (!secret || !/^\d{6}$/.test(code)) {
      setError('Authenticator uygulamasındaki 6 haneli kodu girin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, 'ZekaPark Yönetici TOTP');
      await onEnrollmentComplete();
    } catch (cause) {
      console.warn('Admin MFA enrollment failed:', cause);
      setError('Kod doğrulanamadı. Yeni kodu girip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  const totpUri = secret?.generateQrCodeUrl(user.email || user.uid, 'ZekaPark');

  return (
    <section className="mx-auto my-10 w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><ShieldCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Yönetici MFA kurulumu zorunlu</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Yönetim paneli açılmadan önce hesabı bir TOTP authenticator uygulamasına bağlayın.
          </p>
        </div>
      </div>

      {!secret ? (
        <button type="button" disabled={busy} onClick={beginEnrollment} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          {busy ? 'Hazırlanıyor…' : 'Authenticator kurulumunu başlat'}
        </button>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Kurulum anahtarı</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-white p-2 text-sm font-bold text-slate-900">{secret.secretKey}</code>
              <button type="button" aria-label="Anahtarı kopyala" onClick={() => navigator.clipboard.writeText(secret.secretKey)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><Copy className="h-4 w-4" /></button>
            </div>
            {totpUri && <p className="mt-3 break-all text-[10px] text-slate-500">{totpUri}</p>}
          </div>
          <label className="block text-sm font-bold text-slate-700">
            6 haneli doğrulama kodu
            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 tracking-[0.35em] focus:border-indigo-500 focus:outline-none" placeholder="000000" />
          </label>
          <button type="button" disabled={busy} onClick={finishEnrollment} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{busy ? 'Doğrulanıyor…' : 'MFA’yı etkinleştir'}</span>
          </button>
        </div>
      )}

      {error && <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    </section>
  );
};
