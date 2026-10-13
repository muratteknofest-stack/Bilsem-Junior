import React from 'react';
import { motion } from 'motion/react';
import { Brain, Play, Sparkles } from 'lucide-react';
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
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            {safeMasteries.length} Bilişsel Çalışma Alanı
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
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
            className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900"
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
                className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold ${
                  skillFilter === value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p role="status" className="text-xs text-zinc-500">
            {visibleMasteries.length} alan gösteriliyor
          </p>
        </div>

        {visibleMasteries.length === 0 && (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm font-semibold">Bu seçimle eşleşen alan yok.</p>
            <button
              type="button"
              onClick={() => {
                setSkillSearch('');
                setSkillFilter('all');
              }}
              className="mt-3 min-h-11 rounded-xl bg-indigo-50 px-4 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
            >
              Tüm alanları göster
            </button>
          </div>
        )}

        {visibleMasteries.map((m: SkillMastery, i: number) => {
          const cfg = categoryStyleConfig[m.category] || {
            color: 'text-indigo-600 dark:text-indigo-400',
            bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
            borderLight: 'border-indigo-200/60 dark:border-indigo-800/40',
            gradient: 'from-indigo-500 to-purple-500',
            icon: Sparkles,
          };
          const Icon = cfg.icon;
          const masteryPct = Math.min(100, Math.max(0, m.mastery || 0));

          return (
            <motion.div
              key={m.category}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="zp-dashboard-surface p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-11 h-11 rounded-2xl ${cfg.bgLight} ${cfg.color} flex items-center justify-center border ${cfg.borderLight} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full ${cfg.bgLight} ${cfg.color} border ${cfg.borderLight}`}
                  >
                    {m.attemptCount > 0 ? `%${masteryPct} Ustalık` : 'Yeni alan'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-['Outfit',sans-serif] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {m.categoryName}
                </h3>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 mb-1.5 font-medium">
                  <span>{m.attemptCount || 0} Çözülen Soru</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {m.attemptCount > 0 ? `%${m.accuracy || 0} Doğruluk` : 'İlk adımını at'}
                  </span>
                </div>

                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${masteryPct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className={`h-full bg-gradient-to-r ${cfg.gradient} rounded-full`}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  onStartPractice(m.category);
                }}
                className="mt-4 w-full py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
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
