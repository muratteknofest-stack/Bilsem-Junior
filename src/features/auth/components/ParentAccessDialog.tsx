import React, { useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

interface Props { busy: boolean; onVerify: (password: string) => Promise<void>; onClose: () => void; onLogin: () => void }
export function ParentAccessDialog({ busy, onVerify, onClose, onLogin }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    passwordInputRef.current?.focus();
    return () => { previous?.focus(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || busy) return;
    if (!password.trim()) {
      setError('Veli şifrenizi girin.');
      passwordInputRef.current?.focus();
      return;
    }
    submitting.current = true;
    setError('');
    const entered = password;
    try {
      await onVerify(entered);
      setPassword('');
      setVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veli paneli açılamadı.');
      passwordInputRef.current?.focus();
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      onKeyDown={event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key === 'Tab') {
          const controls = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)') || [])];
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}
    >
      <form onSubmit={submit} aria-busy={busy} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-100">
        <div className="flex items-center gap-3 text-indigo-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 id={`${id}-title`} className="text-lg font-bold text-slate-900">Veli paneline dön</h2>
            <p className="text-xs text-slate-500">Güvenli aile koruması</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">Öğrencinin hesap ayarlarını ve verilerini korumak için bağlı veli hesabının şifresini doğrulayın.</p>
        <label htmlFor={`${id}-password`} className="block text-sm font-semibold text-slate-700">
          Veli şifresi
          <div className="relative mt-1.5">
            <input
              ref={passwordInputRef}
              id={`${id}-password`}
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={128}
              disabled={busy}
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2.5 pr-11 text-base text-slate-900 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={busy}
              aria-pressed={visible}
              onClick={() => setVisible(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
              title={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Öğrenci panelinde kal
          </button>
          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Doğrulanıyor…</span>
              </>
            ) : (
              'Veli panelini aç'
            )}
          </button>
        </div>
        <div className="text-center pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onLogin}
            className="text-xs text-indigo-700 hover:text-indigo-800 hover:underline font-medium inline-block py-1"
          >
            Şifremi unuttum · Veli giriş ekranını aç
          </button>
        </div>
      </form>
    </div>
  );
}
