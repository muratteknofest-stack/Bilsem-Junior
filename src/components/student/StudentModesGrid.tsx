import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Brain,
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  RotateCcw,
  BookOpen,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { sound } from '../../lib/sound';

export interface StudentModesGridProps {
  unresolvedMistakesCount: number;
  onStartAdaptive: () => void;
  onStartExam: () => void;
  onStartPractice: (category?: string) => void;
  onOpenMistakes: () => void;
  onNavigate: (view: string) => void;
  onOpenChallenges: () => void;
}

export const StudentModesGrid: React.FC<StudentModesGridProps> = ({
  unresolvedMistakesCount,
  onStartAdaptive,
  onStartExam,
  onStartPractice,
  onOpenMistakes,
  onNavigate,
  onOpenChallenges,
}) => {
  return (
    <motion.div
      key="tab-modes"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500" />
            BİLSEM Hazırlık Modları
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Zihnini güçlendirecek antrenman türünü seç ve hemen başla
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Adaptif BİLSEM Testi (Special Glow & Recommendation) */}
        <motion.button
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sound.playClick();
            onStartAdaptive();
          }}
          className="group relative min-w-0 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white text-left shadow-lg shadow-indigo-500/20 overflow-hidden cursor-pointer flex flex-col justify-between min-h-52 border border-indigo-400/30"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl" />

          <div className="flex items-start justify-between w-full relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-400 text-zinc-900 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" /> Önerilen
            </span>
          </div>

          <div className="relative z-10">
            <h3 className="text-lg font-black text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
              Adaptif Test
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
              Çalışma geçmişine göre daha çok pratik yapabileceğin alanlardan soru seçer.
            </p>
          </div>
        </motion.button>

        {/* 2. Gerçek Süreli Deneme Sınavı */}
        <motion.button
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sound.playClick();
            onStartExam();
          }}
          className="zp-dashboard-surface group relative min-w-0 p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 text-left shadow-sm border border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between min-h-52"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/40">
              Süreli Simülasyon
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
              Deneme Sınavı
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-amber-500" />
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Gerçek BİLSEM tablet sınavı formatında süreye karşı yeteneklerini sına.
            </p>
          </div>
        </motion.button>

        {/* 3. 10 Soru Karışık Pratik */}
        <motion.button
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sound.playClick();
            onStartPractice('mixed');
          }}
          className="zp-dashboard-surface group relative min-w-0 p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 text-left shadow-sm border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between min-h-52"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              10 Soru Isınma
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              Karışık Pratik
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-500" />
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Tüm kategorilerden derlenen dinamik soru setiyle zihnini zinde tut.
            </p>
          </div>
        </motion.button>

        {/* 4. Hata Defteri (Hata Avcısı) */}
        <motion.button
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sound.playClick();
            onOpenMistakes();
          }}
          className="zp-dashboard-surface group relative min-w-0 p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 text-left shadow-sm border border-zinc-200/80 dark:border-zinc-800 hover:border-rose-400 dark:hover:border-rose-500/50 transition-all cursor-pointer flex flex-col justify-between min-h-52"
        >
          <div className="flex items-start justify-between w-full">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                unresolvedMistakesCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/50 dark:border-rose-800/50'
                  : 'bg-teal-50 dark:bg-teal-950/40 text-teal-500 border border-teal-200/50 dark:border-teal-800/50'
              }`}
            >
              <RotateCcw className="w-6 h-6" />
            </div>

            {unresolvedMistakesCount > 0 ? (
              <span className="text-[11px] font-extrabold bg-rose-500 text-white px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                {unresolvedMistakesCount} Hata Bekliyor
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                Tertemiz ✨
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-['Outfit',sans-serif] group-hover:text-rose-600 transition-colors flex items-center gap-1.5">
              Hata Defteri
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-rose-500" />
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              {unresolvedMistakesCount > 0
                ? 'Yanıldığın soruları pedagojik yapay zeka ipuçlarıyla yeniden çöz.'
                : 'Tüm hatalarını başarıyla çözdün! Yeni sorularla kendini geliştir.'}
            </p>
          </div>
        </motion.button>
      </div>

      {/* Secondary Explore Row: Glossary & Weekly Challenges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bilişsel Sözlük & Mini Oyunlar Shortcut Card */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          onClick={() => {
            sound.playClick();
            onNavigate('glossary');
          }}
          className="min-w-0 w-full p-5 rounded-3xl bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-950/30 dark:to-purple-950/30 border border-sky-200/80 dark:border-sky-800/40 flex items-center justify-between gap-4 cursor-pointer hover:border-sky-400 transition-all group text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 group-hover:rotate-6 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-['Outfit',sans-serif]">
                  Bilişsel Sözlük
                </h4>
                <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded-full shrink-0">
                  Simülatör
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                İnteraktif görsel kavram mini oyunları
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0 shadow-xs">
            <ChevronRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Haftalık Bilişsel Görevler & Rozetler Shortcut Card */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          onClick={() => {
            sound.playClick();
            onOpenChallenges();
          }}
          className="min-w-0 w-full p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-violet-500/10 dark:from-amber-950/30 dark:to-indigo-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between gap-4 cursor-pointer hover:border-amber-400 transition-all group text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:rotate-6 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-['Outfit',sans-serif]">
                  Haftalık Görevler
                </h4>
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full shrink-0">
                  8 Rozet
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Kategori hedeflerini tamamla, rozetleri kap
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 shadow-xs">
            <ChevronRight className="w-4 h-4" />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};
