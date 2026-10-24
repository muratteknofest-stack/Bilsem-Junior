import React from 'react';
import type { QuestionDiversityError } from '../../features/questions/test-diversity';

export function DiversityRecoveryNotice({error,busy,onMixed,onShorter,shorterCount,mixedCount=5}: {
  error:QuestionDiversityError;busy:boolean;onMixed:()=>void;onShorter?:()=>void;shorterCount?:number;mixedCount?:number;
}) {
  return <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
    <h2 className="font-bold">Bu seçim için daha fazla soru gerekiyor</h2>
    <p>{error.message}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={onMixed} className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white">Tüm alanlardan {mixedCount} soruluk test seç</button>
      {onShorter&&shorterCount!==undefined&&<button type="button" disabled={busy} onClick={onShorter} className="min-h-11 rounded-xl border border-indigo-300 px-4 py-2 font-bold">{shorterCount} soruluk hedef seç</button>}
    </div>
    <p className="text-sm">Seçimini yaptıktan sonra testi başlatabilirsin. Testin uzunluğu kendiliğinden değiştirilmez.</p>
  </section>;
}
