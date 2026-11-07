import React from 'react';
import { motion } from 'motion/react';
import { Brain, Play } from 'lucide-react';
import { StudentGameArt } from './StudentGameArt';
import { sound } from '../../lib/sound';
import type { SkillMastery } from '../../types';

export interface StudentSkillsGridProps {
  safeMasteries: SkillMastery[];
  visibleMasteries: SkillMastery[];
  skillSearch: string;
  setSkillSearch: (s: string) => void;
  skillFilter: 'all' | 'practice' | 'new';
  setSkillFilter: (f: 'all' | 'practice' | 'new') => void;
  categoryStyleConfig: Record<
    string,
    { color: string; bgLight: string; borderLight: string; gradient: string; icon: any }
  >;
  onStartPractice: (category: string) => void;
}

export const StudentSkillsGrid: React.FC<StudentSkillsGridProps> = ({
  safeMasteries,
  visibleMasteries,
  skillSearch,
  setSkillSearch,
  skillFilter,
  setSkillFilter,
  categoryStyleConfig,
  onStartPractice,
}) => {
  return (
    <motion.div
      key="tab-skills"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 bj-game-skills"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1d2036] dark:text-[#f9f7ff] flex items-center gap-2 tabular-nums">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {safeMasteries.length} Bilişsel Çalışma Alanı
          </h2>
          <p className="text-xs text-[#52566b] dark:text-[#cac4d5] mt-1">
            Her alandaki ustalık dereceni gör ve istediğin alanda anında antrenmana başla
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-3">
          <label htmlFor="student-skill-search" className="sr-only">
            Çalışma alanı ara
          </label>
          <input
            id="student-skill-search"
            type="search"
            value={skillSearch}
            onChange={(event) => setSkillSearch(event.target.value)}
            placeholder="Çalışma alanı ara…"
            className="min-h-12 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#1d2036] placeholder:text-[#52566b]/70 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-[#49425a] dark:bg-[#262339] dark:text-[#f9f7ff] dark:placeholder:text-[#cac4d5]/60 dark:focus:ring-indigo-500/30"
          />
          <div className="flex flex-wrap gap-2" aria-label="Çalışma alanı filtreleri">
            {(
              [
                ['all', 'Tüm alanlar'],
                ['practice', 'Pekiştireceklerim'],
                ['new', 'Henüz keşfetmediklerim'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={skillFilter === value}
                onClick={() => setSkillFilter(value)}
                className={`min-h-11 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  skillFilter === value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-200'
                    : 'border-[#e2e8f0] bg-white text-[#52566b] hover:bg-slate-50 dark:border-[#49425a] dark:bg-[#262339] dark:text-[#cac4d5] dark:hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p role="status" className="text-xs text-[#52566b] dark:text-[#cac4d5] tabular-nums">
            {visibleMasteries.length} alan gösteriliyor
          </p>
        </div>

        {visibleMasteries.length === 0 && (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-[#e2e8f0] bg-white p-8 text-center dark:border-[#49425a] dark:bg-[#262339]">
            <p className="text-sm font-semibold text-[#1d2036] dark:text-[#f9f7ff]">Bu seçimle eşleşen alan yok.</p>
            <button
              type="button"
              onClick={() => {
                setSkillSearch('');
                setSkillFilter('all');
              }}
              className="mt-3 min-h-11 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-200 dark:hover:bg-indigo-500/30"
            >
              Tüm alanları göster
            </button>
          </div>
        )}

        {visibleMasteries.map((m: SkillMastery, i: number) => {
          const cfg = categoryStyleConfig[m.category] || {
            color: 'text-indigo-600 dark:text-indigo-400',
            bgLight: 'bg-indigo-50/70 dark:bg-indigo-500/10',
            borderLight: 'border-indigo-200/60 dark:border-indigo-500/20',
            gradient: 'from-indigo-500 to-violet-500',
            icon: Brain,
          };

          const masteryPct = Math.min(100, Math.max(0, m.mastery || 0));

          return (
            <motion.div
              key={m.category}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, delay: i * 0.03 }}
              whileHover={{ y: -2 }}
              className="bj-game-skill-card zp-dashboard-surface p-5 rounded-2xl bg-[var(--surface-card,#ffffff)] dark:bg-[var(--surface-card,#262339)] border border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] shadow-xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`bj-game-skill-art w-11 h-11 rounded-xl ${cfg.bgLight} ${cfg.color} flex items-center justify-center border ${cfg.borderLight} transition-transform group-hover:scale-105`}
                  >
                    <StudentGameArt kind={m.category==='spatial'?'cubes':m.category==='attention'?'target':m.category==='numerical'?'rocket':'puzzle'}/>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full tabular-nums bg-slate-100 text-[#1d2036] border border-[#e2e8f0] dark:bg-white/10 dark:text-[#f9f7ff] dark:border-[#49425a]"
                  >
                    {m.attemptCount > 0 ? `%${masteryPct} Ustalık` : 'Yeni alan'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#1d2036] dark:text-[#f9f7ff] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {m.categoryName}
                </h3>

                <div className="flex items-center justify-between text-xs text-[#52566b] dark:text-[#cac4d5] mt-2 mb-1.5 font-medium tabular-nums">
                  <span>{m.attemptCount || 0} Çözülen Soru</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {m.attemptCount > 0 ? `%${m.accuracy || 0} Doğruluk` : 'İlk adımını at'}
                  </span>
                </div>

                <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${masteryPct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.03 }}
                    className={`h-full bg-gradient-to-r ${cfg.gradient} rounded-full`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onStartPractice(m.category);
                }}
                className="mt-4 min-h-11 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-indigo-500/20 border border-[#e2e8f0] dark:border-[#49425a] text-[#1d2036] hover:text-indigo-700 dark:text-[#f9f7ff] dark:hover:text-indigo-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Bu Kategoride Pratik Yap
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
