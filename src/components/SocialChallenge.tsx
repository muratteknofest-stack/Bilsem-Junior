import React, { useEffect, useState } from 'react';

const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
type Challenge = { id: string; prompt: string; options: string[]; correctOptionId: string; explanation: string };

export const SocialChallenge: React.FC = () => {
  const id = window.location.pathname.split('/').at(-1) || '';
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}_(morning|evening)$/.test(id)) { setError('Geçersiz soru adresi.'); return; }
    fetch(`${apiBase}/api/social/challenge/${id}`).then(async response => {
      if (!response.ok) throw new Error('Soru henüz yayımlanmadı veya açılamıyor.');
      return response.json();
    }).then(setChallenge).catch(e => setError(e.message));
  }, [id]);
  const choose = (option: string) => {
    if (selected) return;
    setSelected(option);
    void fetch(`${apiBase}/api/social/challenge/${id}/solve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ option }) });
  };
  return <main className="min-h-screen bg-slate-50 text-slate-900 px-4 py-9">
    <div className="mx-auto max-w-xl space-y-5">
      <a href="/" className="text-indigo-700 font-bold">ZEKA PARK</a>
      <h1 className="text-2xl font-bold">Günün görsel sorusu</h1>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4">{error}</p>}
      {challenge && <>
        <p>{challenge.prompt}</p>
        <img src={`${apiBase}/api/social/media/${id}/question.jpg`} alt="Görsel mantık sorusu ve dört cevap seçeneği" className="rounded-2xl border border-slate-200 w-full" />
        <div className="grid grid-cols-4 gap-3">{challenge.options.map(option =>
          <button key={option} disabled={!!selected} onClick={() => choose(option)} className="rounded-xl bg-indigo-700 text-white p-3 font-bold disabled:opacity-60" aria-label={`${option} seçeneği`}>{option}</button>)}</div>
        {selected && <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
          <p className="font-semibold">{selected === challenge.correctOptionId ? 'Doğru cevap!' : `Doğru cevap: ${challenge.correctOptionId}`}</p>
          <p>{challenge.explanation}</p><img src={`${apiBase}/api/social/media/${id}/answer.jpg`} alt="Doğru yanıtın işaretlendiği çözüm kartı" className="w-full rounded-xl" />
        </div>}
        <a href="/" className="block rounded-xl bg-slate-900 text-white text-center p-4">Zekapark'taki diğer soruları keşfet</a>
        <p className="text-xs text-slate-500">Bağımsız hazırlık etkinliğidir; MEB ile bağlantılı değildir.</p>
      </>}
    </div>
  </main>;
};
