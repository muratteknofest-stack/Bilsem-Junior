import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { strongPasswordSchema } from '../../../lib/validations';
import { suggestPassword } from '../../../lib/password-creation';

interface Props {
  label: string;
  value: string;
  confirmation: string;
  onChange: (value: string) => void;
  onConfirmation: (value: string) => void;
  disabled?: boolean;
  error?: string;
  confirmationError?: string;
}
/** Reused by registration, parent-managed passwords and email recovery. Never stores credentials. */
export function NewPasswordFields({ label, value, confirmation, onChange, onConfirmation, disabled = false, error, confirmationError }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const rules = [
    { text: '8–128 karakter', passed: value.length >= 8 && value.length <= 128 },
    { text: 'En az bir harf', passed: /[A-Za-zğüşıöçĞÜŞİÖÇ]/.test(value) },
    { text: 'En az bir rakam', passed: /\d/.test(value) },
  ];
  const mismatch = !!confirmation && value !== confirmation;
  const invalid = !!value && !strongPasswordSchema.safeParse(value).success;
  const field = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="sr-only">{label} oluşturma</legend>
    <label htmlFor={`${id}-new`} className="block text-sm font-semibold">{label}
      <input id={`${id}-new`} type={visible ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" value={value} onChange={e => onChange(e.target.value)} aria-invalid={invalid || Boolean(error)} aria-describedby={`${id}-rules${error ? ` ${id}-error` : ''}`} className={field} />
    </label>
    {error && <p id={`${id}-error`} className="text-sm text-rose-700">{error}</p>}
    <ul id={`${id}-rules`} aria-label={`${label} kuralları`} className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {rules.map(rule => <li key={rule.text} className={rule.passed ? 'text-emerald-700' : 'text-slate-600'}>{rule.passed ? '✓' : '○'} {rule.text}</li>)}
    </ul>
    <label htmlFor={`${id}-again`} className="block text-sm font-semibold">{label} tekrar
      <input id={`${id}-again`} type={visible ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => onConfirmation(e.target.value)} aria-invalid={mismatch || Boolean(confirmationError)} aria-describedby={`${id}-match${confirmationError ? ` ${id}-confirmation-error` : ''}`} className={field} />
    </label>
    {confirmationError && <p id={`${id}-confirmation-error`} className="text-sm text-rose-700">{confirmationError}</p>}
    <p id={`${id}-match`} role="status" className={`text-xs ${mismatch ? 'text-rose-700' : 'text-emerald-700'}`}>{confirmation ? mismatch ? 'Şifreler eşleşmiyor.' : 'Şifreler eşleşiyor.' : 'Yazım hatalarını önlemek için şifrenizi tekrar girin.'}</p>
    <button type="button" aria-pressed={visible} onClick={() => setVisible(v => !v)} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700">{visible ? <EyeOff size={18} /> : <Eye size={18} />}{label}: {visible ? 'Gizle' : 'Göster'}</button>
    <button type="button" onClick={() => { const generated = suggestPassword(); onChange(generated); onConfirmation(generated); setVisible(true); }} className="min-h-11 text-sm font-semibold text-indigo-700 underline">{label} için güçlü şifre öner</button>
    <p className="text-xs text-slate-600">Başka hesaplarda kullanmadığınız bir şifre seçin. Önerilen şifre bu cihazda oluşturulur; bir parola yöneticisinde saklayabilirsiniz.</p>
  </fieldset>;
}
