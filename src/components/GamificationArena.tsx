import React from 'react';
import { ArrowRight, Check, Flame, Info, Swords, Target, Trophy, Zap } from 'lucide-react';
import type { UserProfile } from '../types';
import { dailyMissions, weeklyDuel, weeklyLeague } from '../features/student/gamification-model';

interface Props {
  view?: 'all' | 'race' | 'missions';
  user: UserProfile;
  thisWeekQuestions: number;
  lastWeekQuestions: number;
  onPractice: () => void;
  onOpenChallenges: () => void;
}

export function GamificationArena({ user, thisWeekQuestions, lastWeekQuestions, onPractice, onOpenChallenges, view = 'all' }: Props) {
  const missions = dailyMissions(user);
  const completed = missions.filter(mission => mission.completed).length;
  const duel = weeklyDuel(thisWeekQuestions, lastWeekQuestions);
  const league = weeklyLeague(duel.current);

  return (
    <section aria-labelledby={view === 'missions' ? undefined : 'arena-title'} aria-label={view === 'missions' ? 'Günlük görevler' : undefined} className="zp-arena grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {view !== 'missions' && <div className="zp-arena-duel relative min-w-0 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-7">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-white/10" />
        <div className="relative">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-200">
            <Swords size={16} /> Haftanın meydan okuması
          </p>
          <h2 id="arena-title" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            {duel.hasPreviousWeek ? 'Geçen haftaki kendini geç!' : 'İlk haftalık rekorunu kır!'}
          </h2>
          <p className="mt-2 text-sm text-violet-100">
            {duel.won ? 'Hedefe ulaştın! Daha fazla soru çözerek rekorunu yükseltebilirsin.' :
              duel.hasPreviousWeek ? `Geçen hafta ${duel.previous} soru çözdün. Öne geçmek için ${duel.remaining} soru kaldı.` :
                `İlk hedefin ${duel.target} soru. ${duel.remaining} soru daha çözerek tamamlayabilirsin.`}
          </p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div className="zp-arena-total flex flex-wrap items-end gap-2 min-w-0">
              <strong className="text-4xl font-black tabular-nums">{duel.current}</strong>
              <span className="pb-1 text-sm text-violet-200">/ {duel.target} soru</span>
            </div>
            <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold">
              {league.icon} {league.name} lig
            </span>
          </div>
          <progress aria-label="Haftalık kişisel yarış ilerlemesi" value={Math.min(duel.current, duel.target)} max={duel.target}
            className="mt-3 h-3 w-full overflow-hidden rounded-full accent-amber-400" />
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-violet-200">
            <span>{duel.hasPreviousWeek ? `Geçen hafta: ${duel.previous}` : 'Kendi rekorunla yarışıyorsun'}</span>
            <span>{league.next ? `Sonraki lig: ${league.next} soru` : 'En yüksek lige ulaştın'}</span>
          </div>
          <button type="button" onClick={onPractice}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-indigo-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Yarışa devam et <ArrowRight size={17} />
          </button>
        </div>
      </div>}

      {view !== 'race' && <div className="zp-dashboard-surface min-w-0 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
              <Target size={16} /> Günlük görevler
            </p>
            <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-white">
              {completed === 3 ? 'Üç görevi de tamamladın! 🎉' : 'Bugün neler başaracaksın?'}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-sm font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
            {completed}/3
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {missions.map(mission => (
            <div key={mission.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
                  <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-indigo-600 dark:bg-zinc-700">
                    {mission.completed ? <Check size={16} /> : mission.id === 'focus' ? <Flame size={16} /> : <Zap size={16} />}
                  </span>
                  {mission.title}
                </div>
                <strong className="shrink-0 tabular-nums text-indigo-700 dark:text-indigo-300">{mission.current}/{mission.target}</strong>
              </div>
              <p className="mt-1 pl-9 text-xs text-zinc-500 dark:text-zinc-400">{mission.detail}</p>
              <progress aria-label={`${mission.title} ilerlemesi`} value={Math.min(mission.current, mission.target)} max={mission.target}
                className="mt-2 h-2 w-full overflow-hidden rounded-full accent-indigo-600" />
            </div>
          ))}
        </div>
        <button type="button" onClick={onOpenChallenges}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950">
          <Trophy size={16} /> Haftalık rozet görevlerini gör
        </button>
        <details className="group mt-3 rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
          <summary className="flex min-h-10 cursor-pointer items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-indigo-500">
            <Info size={15} /> XP nasıl kazanılır?
          </summary>
          <div className="space-y-1 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
            <p>Doğru cevap: pratikte 10 + zorluk × 2 XP; uyarlamalı çalışmada 15 + zorluk × 2 XP.</p>
            <p>Ardışık doğru cevaplar 1,1× ile 2,5× arası kombo ve belirli serilerde ek XP sağlar.</p>
            <p>Deneme sonunda doğru cevap başına 15 XP ve tamamlamaya 50 XP eklenir. Rozet ve seri ödülleri ayrıca kazanılır.</p>
          </div>
        </details>
      </div>}
    </section>
  );
}

