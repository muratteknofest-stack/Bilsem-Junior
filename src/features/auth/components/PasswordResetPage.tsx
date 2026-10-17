import { NewPasswordFields } from './NewPasswordFields';
import React, { useEffect, useState } from 'react';
import { auth, isPasswordRecoveryReady, onPasswordRecovery, sendPasswordResetEmail, updateRecoveredPassword } from '../../../lib/supabase';
import { forgotPasswordSchema, passwordResetSchema, formatZodError } from '../../../lib/validations';
import { passwordResetRequestError } from '../auth-error-messages';

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'done';

export const PasswordResetPage: React.FC = () => {
  const [state, setState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onPasswordRecovery(() => {
      // The Auth client has consumed the token; keep it out of browser history.
      window.history.replaceState({}, '', '/reset-password');
      if (mounted) setState('ready');
    });
    void isPasswordRecoveryReady().then(ready => {
      window.history.replaceState({}, '', '/reset-password');
      if (mounted) setState(current => current === 'checking' ? (ready ? 'ready' : 'invalid') : current);
    }).catch(() => {
      window.history.replaceState({}, '', '/reset-password');
      if (mounted) setState(current => current === 'checking' ? 'invalid' : current);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const requestLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) { setError(formatZodError(parsed.error).firstMessage); return; }
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, parsed.data.email.toLowerCase());
      setRequestSent(true);
    } catch (err) {
      setError(passwordResetRequestError(err as { code?: string; message?: string; status?: number }));
    } finally { setSubmitting(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || state !== 'ready') return;
    const parsed = passwordResetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(formatZodError(parsed.error).firstMessage);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateRecoveredPassword(parsed.data.password);
      setPassword('');
      setConfirmPassword('');
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre değiştirilemedi. Yeni bağlantı isteyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">BİLSEM Junior şifre yenileme</h1>
        {state === 'checking' && <p className="mt-4 text-sm text-slate-600">Bağlantı doğrulanıyor…</p>}
        {state === 'invalid' && (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm text-rose-700">
              Bu bağlantı kullanılmış veya süresi dolmuş olabilir. Aşağıdan yeni bir sıfırlama bağlantısı isteyin.
            </p>
            {requestSent ? (
              <p role="status" className="text-sm text-emerald-800">Bu adrese bağlı hesap varsa yeni bağlantı gönderilir. Gelen kutusu ve spam klasörünü kontrol edin; yalnızca en son e-postadaki bağlantıyı kullanın.</p>
            ) : (
              <form onSubmit={requestLink} className="space-y-3">
                <label htmlFor="recovery-email" className="block text-sm font-semibold text-slate-700">Kayıtlı veli veya yönetici e-posta adresi</label>
                <input id="recovery-email" type="email" autoComplete="email" required value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
                  {submitting ? 'Gönderiliyor…' : 'Yeni sıfırlama bağlantısı gönder'}
                </button>
                <p className="text-xs text-slate-600">Öğrenci koduyla giriş yapanların şifresini velileri, veli panelinden yeniler.</p>
              </form>
            )}
            <a href="/" className="inline-block text-sm font-semibold text-indigo-700 underline">Ana sayfaya dön</a>
          </div>
        )}
        {state === 'done' && (
          <div className="mt-4 space-y-4">
            <p role="status" className="text-sm text-emerald-800">
              Şifreniz yenilendi ve oturum kapatıldı. Yeni şifrenizle giriş yapabilirsiniz.
            </p>
            <a href="/" className="inline-block text-sm font-semibold text-indigo-700 underline">Ana sayfaya dön</a>
          </div>
        )}
        {state === 'ready' && (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <p className="text-sm text-slate-600">Yeni şifrenizi belirleyin. En az 8 karakter, bir harf ve bir rakam kullanın.</p>
            <NewPasswordFields label="Yeni şifre" value={password} confirmation={confirmPassword} onChange={setPassword} onConfirmation={setConfirmPassword} disabled={submitting} />
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
              {submitting ? 'Kaydediliyor…' : 'Şifreyi yenile'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};


