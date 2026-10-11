import React, { useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface Props { busy: boolean; onVerify: (password: string) => Promise<void>; onClose: () => void; onLogin: () => void }
export function ParentAccessDialog({ busy, onVerify, onClose, onLogin }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => { previous?.focus(); };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || busy) return;
    if (!password) { setError('Veli şifrenizi girin.'); return; }
    submitting.current = true;
    setError('');
    const entered = password;
    setPassword(''); setVisible(false);
    try { await onVerify(entered); }
    catch (e) { setError(e instanceof Error ? e.message : 'Veli paneli açılamadı.'); }
    finally { submitting.current = false; }
  }
  return <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
    onKeyDown={event => {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key === 'Tab') {
        const controls = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)') || [])];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <form onSubmit={submit} aria-busy={busy} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-bold"><ShieldCheck /> Veli paneline dön</h2>
      <p className="text-sm text-slate-600">Öğrencinin hesap ayarlarını korumak için bağlı veli hesabının şifresini doğrulayın.</p>
      <label htmlFor={`${id}-password`} className="block text-sm font-semibold">Veli şifresi<input id={`${id}-password`} type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base" /></label>
      <button type="button" disabled={busy} aria-pressed={visible} onClick={() => setVisible(v => !v)} className="flex min-h-11 items-center gap-2 text-sm text-indigo-700">{visible ? <EyeOff size={18} /> : <Eye size={18} />}{visible ? 'Şifreyi gizle' : 'Şifreyi göster'}</button>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 flex-1 rounded-xl border px-3 py-2">Öğrenci panelinde kal</button><button type="submit" disabled={busy || !password} className="min-h-11 flex-1 rounded-xl bg-indigo-700 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Doğrulanıyor…' : 'Veli panelini aç'}</button></div>
      <button type="button" disabled={busy} onClick={onLogin} className="min-h-11 text-sm text-indigo-700 underline">Şifremi unuttum · Veli giriş ekranını aç</button>
    </form>
  </div>;
}
