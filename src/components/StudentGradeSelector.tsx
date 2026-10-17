import React, { useEffect, useId, useRef, useState } from 'react';
import type { UserProfile } from '../types';
import { isSchoolGrade } from '../features/questions/quality-policy';
import { learningService } from '../services/learning-service';

export function StudentGradeSelector({ user, onSaved }: { user: UserProfile; onSaved: (user: UserProfile) => void }) {
  const id = useId();
  const [grade, setGrade] = useState(user.grade || 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  useEffect(() => { setGrade(user.grade || 1); setError(''); }, [user.id, user.grade]);
  async function save() {
    if (pending.current || !isSchoolGrade(grade)) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try { const profile = await learningService.changeGrade(grade); onSaved(profile); setMessage(`${grade}. sınıf kaydedildi. Yeni çalışmaların bu sınıftan gelecek.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sınıf kaydedilemedi. Tekrar dene.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section aria-label="Profilimdeki sınıf" className="mt-4 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
    <label htmlFor={id} className="block text-sm font-bold">Sınıf düzeyim</label>
    <div className="flex flex-wrap gap-2"><select id={id} value={grade} disabled={busy} onChange={e => { setGrade(Number(e.target.value)); setMessage(''); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{[1,2,3,4].map(g => <option key={g} value={g}>{g}. sınıf</option>)}</select>
      <button type="button" disabled={busy || grade === user.grade} onClick={() => void save()} className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Kaydediliyor…' : 'Sınıfımı kaydet'}</button></div>
    <p className="text-xs text-slate-600 dark:text-slate-300">Sorular seçtiğin sınıfa göre hazırlanır. Sınıf değişince açık çalışman sona erer; önceki cevapların ve puanların korunur.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <p role="status" className="text-sm text-indigo-700 dark:text-indigo-200">{message}</p>
  </section>;
}
