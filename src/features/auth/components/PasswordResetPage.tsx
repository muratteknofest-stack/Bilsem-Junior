import React, { useEffect, useState } from 'react';
import { onPasswordRecovery, updateRecoveredPassword } from '../../../lib/supabase';
import { passwordResetSchema, formatZodError } from '../../../lib/validations';

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'done';

export const PasswordResetPage: React.FC = () => {
  const [state, setState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onPasswordRecovery(() => {
      // The Auth client has consumed the token; keep it out of browser history.
      window.history.replaceState({}, '', '/reset-password');
      setState('ready');
    });
    const timeout = window.setTimeout(() => {
      setState(current => current === 'checking' ? 'invalid' : current);
    }, 5000);
    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

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
        <h1 className="text-xl font-bold text-slate-900">ZekaPark şifre yenileme</h1>
        {state === 'checking' && <p className="mt-4 text-sm text-slate-600">Bağlantı doğrulanıyor…</p>}
        {state === 'invalid' && (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm text-rose-700">
              Bağlantı geçersiz veya süresi dolmuş. Giriş ekranından yeni bir sıfırlama bağlantısı isteyin.
            </p>
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
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700">Yeni şifre</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8}
                value={password} onChange={event => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" required />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700">Yeni şifreyi tekrar girin</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={8}
                value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" required />
            </div>
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
