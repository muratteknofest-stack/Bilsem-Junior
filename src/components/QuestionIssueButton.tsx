import React, { useState } from 'react';
import type { BaseQuestion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../lib/api-client';

export function QuestionIssueButton({ question }: { question: BaseQuestion }) {
  const { userProfile } = useAuth();
  const [reason, setReason] = useState('answer');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!userProfile || userProfile.id.startsWith('demo_')) return null;
  async function send() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await authenticatedFetch('/api/questions/report', { method: 'POST', body: JSON.stringify({ question, reason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Bildirim kaydedilemedi.');
      setMessage('Bildirimin kaydedildi. İnceleme numarası: ' + body.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Bağlantı kurulamadı. Tekrar deneyebilirsin.'); }
    finally { setBusy(false); }
  }
  return <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
    <summary className="min-h-11 cursor-pointer content-center font-semibold">Soruda bir sorun mu var?</summary>
    <div className="mt-3 space-y-3"><p>Sorunun bir kopyası inceleme için kaydedilir. Bildirim puanını değiştirmez.</p>
      <label className="block">Ne fark ettin?<select aria-label="Soru bildirim nedeni" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 p-2" value={reason} onChange={e => setReason(e.target.value)} disabled={busy}><option value="answer">Cevap veya çözüm hatalı görünüyor</option><option value="unclear">Soruyu anlayamadım</option><option value="visual">Görsel görünmüyor veya belirsiz</option><option value="level">Sınıfıma uygun görünmüyor</option></select></label>
      <button type="button" className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={busy || message.startsWith('Bildirimin kaydedildi')} onClick={() => void send()}>{busy ? 'Kaydediliyor…' : 'İncelemeye gönder'}</button>
      {message && <p role="status" className="break-words">{message}</p>}
    </div>
  </details>;
}
