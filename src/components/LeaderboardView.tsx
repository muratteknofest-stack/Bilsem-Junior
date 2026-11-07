import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { UserProfile } from '../types';
import { StudentGameBanner } from './student/StudentGameArt';
import { DailyChallenge } from './DailyChallenge';
import { CountUpNumber } from './ui/CountUpNumber';

interface LeaderboardViewProps {
  currentUser?: UserProfile | null;
  onNavigateHome: () => void;
  onStartPractice: () => void;
}

export function LeaderboardView({ currentUser, onNavigateHome, onStartPractice }: LeaderboardViewProps) {
  const liveStudent = currentUser?.role === 'student' && !currentUser.id.startsWith('demo');
  return (
    <div className="bj-game-page bj-game-growth mx-auto w-full max-w-4xl space-y-6 px-4 py-8 pb-28 text-[#1d2036] dark:text-[#f9f7ff]">
      <button
        type="button"
        onClick={onNavigateHome}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#1d2036] hover:bg-slate-50 dark:border-[#49425a] dark:bg-[#262339] dark:text-[#f9f7ff] dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Öğrenci paneline dön
      </button>

      <StudentGameBanner
        headingLevel={1}
        kind="rocket"
        tone="violet"
        title="Günlük görevler ve gelişim"
        description="Küçük keşiflerini düzenli bir alışkanlığa dönüştür. Kendi rekorunu kendin yaz."
      />

      {liveStudent ? (
        <DailyChallenge key={currentUser.id} />
      ) : (
        <section className="bj-game-panel rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs dark:border-[#49425a] dark:bg-[#262339]">
          <h2 className="text-xl font-bold text-[#1d2036] dark:text-[#f9f7ff]">
            Günlük görevler öğrenci hesabında
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#52566b] dark:text-[#cac4d5]">
            Veli tarafından etkinleştirilen öğrenci hesabıyla günlük görev puanlarını biriktirebilirsin. Demoda örnek alıştırmaları deneyebilirsin.
          </p>
        </section>
      )}

      <section className="bj-game-panel rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs dark:border-[#49425a] dark:bg-[#262339]">
        <h2 className="text-xl font-bold text-[#1d2036] dark:text-[#f9f7ff]">
          Kişisel çalışma kaydın
        </h2>
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8f7f3] p-4 dark:border-[#49425a] dark:bg-white/5">
            <dt className="text-xs font-semibold text-[#52566b] dark:text-[#cac4d5]">
              Toplam çalışma XP'si
            </dt>
            <dd className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              <CountUpNumber value={currentUser?.xp || 0} />
            </dd>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8f7f3] p-4 dark:border-[#49425a] dark:bg-white/5">
            <dt className="text-xs font-semibold text-[#52566b] dark:text-[#cac4d5]">
              Kayıtlı soru sayısı
            </dt>
            <dd className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              <CountUpNumber value={currentUser?.totalQuestionsSolved || 0} />
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-6 text-[#52566b] dark:text-[#cac4d5]">
          Bu sayaçlar kişisel alıştırmalarını özetler. Günlük görev puanını veya kullanıcılar arası bir sıralamayı belirlemez.
        </p>
        <button
          type="button"
          onClick={onStartPractice}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Alıştırmaya devam et
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
