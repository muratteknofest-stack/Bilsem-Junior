import React from 'react';
import type { UserProfile } from '../types';
import { StudentGameBanner } from './student/StudentGameArt';
import { DailyChallenge } from './DailyChallenge';
interface LeaderboardViewProps {currentUser?:UserProfile|null;onNavigateHome:()=>void;onStartPractice:()=>void;}
export function LeaderboardView({currentUser,onNavigateHome,onStartPractice}:LeaderboardViewProps){
  const liveStudent=currentUser?.role==='student'&&!currentUser.id.startsWith('demo');
  return <div className="bj-game-page bj-game-growth mx-auto w-full max-w-4xl space-y-6 px-4 py-8 pb-28">
    <button type="button" onClick={onNavigateHome} className="min-h-11 text-sm font-semibold text-indigo-700">← Öğrenci paneline dön</button>
    <StudentGameBanner headingLevel={1} kind="rocket" tone="violet" title="Günlük görevler ve gelişim" description="Küçük keşiflerini düzenli bir alışkanlığa dönüştür. Kendi rekorunu kendin yaz."/>
    {liveStudent?<DailyChallenge key={currentUser.id}/>:<section className="bj-game-panel rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Günlük görevler öğrenci hesabında</h2><p className="mt-2 text-slate-600">Veli tarafından etkinleştirilen öğrenci hesabıyla günlük görev puanlarını biriktirebilirsin. Demoda örnek alıştırmaları deneyebilirsin.</p></section>}
    <section className="bj-game-panel rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold text-slate-900">Kişisel çalışma kaydın</h2><dl className="mt-5 grid grid-cols-2 gap-4"><div><dt className="text-sm text-slate-500">Toplam çalışma XP'si</dt><dd className="mt-1 text-2xl font-bold text-indigo-700">{currentUser?.xp||0}</dd></div><div><dt className="text-sm text-slate-500">Kayıtlı soru sayısı</dt><dd className="mt-1 text-2xl font-bold text-indigo-700">{currentUser?.totalQuestionsSolved||0}</dd></div></dl><p className="mt-4 text-sm leading-6 text-slate-500">Bu sayaçlar kişisel alıştırmalarını özetler. Günlük görev puanını veya kullanıcılar arası bir sıralamayı belirlemez.</p><button type="button" onClick={onStartPractice} className="mt-4 min-h-11 rounded-xl border border-indigo-200 px-4 py-2 font-semibold text-indigo-700">Alıştırmaya devam et</button></section>
  </div>;
}
