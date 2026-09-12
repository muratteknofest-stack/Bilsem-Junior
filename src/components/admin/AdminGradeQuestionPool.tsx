import React, { useState } from 'react';
import { BaseQuestion, DifficultyLevel, QuestionType, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../types';
import { GRADE_CONFIGS, GradeLevelConfig, ALL_GRADES } from '../../features/questions/grade-config';
import { generateQuestionForGrade, generateQuestionByType } from '../../features/questions/generators';
import { validateQuestion } from '../../features/questions/validator';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../../features/questions/renderers/VisualExplanationOverlay';
import { sound } from '../../lib/sound';
import {
  Layers,
  Sparkles,
  Shuffle,
  Play,
  Download,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileJson,
  Sliders,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface GradeQuestionItem {
  id: string;
  grade: 1 | 2 | 3 | 4;
  question: BaseQuestion;
  type: QuestionType;
  difficulty: DifficultyLevel;
  seed: number;
}

interface AdminGradeQuestionPoolProps {
  onInspectInStudio: (type: QuestionType, seed: number, difficulty: DifficultyLevel) => void;
}

export const AdminGradeQuestionPool: React.FC<AdminGradeQuestionPoolProps> = ({
  onInspectInStudio,
}) => {
  // Active grade view tab: 'all' or 1 | 2 | 3 | 4
  const [activeGradeTab, setActiveGradeTab] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [displayMode, setDisplayMode] = useState<'detailed' | 'compact'>('detailed');
  const [copiedGradeJson, setCopiedGradeJson] = useState<number | 'all' | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  // Questions grouped by grade: Record<1 | 2 | 3 | 4, GradeQuestionItem[]>
  const [questionsByGrade, setQuestionsByGrade] = useState<Record<1 | 2 | 3 | 4, GradeQuestionItem[]>>(() => {
    const initialSeed = 45120;
    return {
      1: [
        {
          id: 'gr1_q1',
          grade: 1,
          type: 'figure_completion',
          difficulty: 2,
          seed: initialSeed + 101,
          question: generateQuestionByType('figure_completion', initialSeed + 101, 2),
        },
        {
          id: 'gr1_q2',
          grade: 1,
          type: 'odd_one_out',
          difficulty: 1,
          seed: initialSeed + 102,
          question: generateQuestionByType('odd_one_out', initialSeed + 102, 1),
        },
      ],
      2: [
        {
          id: 'gr2_q1',
          grade: 2,
          type: 'matrix_2x2',
          difficulty: 3,
          seed: initialSeed + 201,
          question: generateQuestionByType('matrix_2x2', initialSeed + 201, 3),
        },
        {
          id: 'gr2_q2',
          grade: 2,
          type: 'mirror_reflection',
          difficulty: 2,
          seed: initialSeed + 202,
          question: generateQuestionByType('mirror_reflection', initialSeed + 202, 2),
        },
      ],
      3: [
        {
          id: 'gr3_q1',
          grade: 3,
          type: 'visual_analogy',
          difficulty: 4,
          seed: initialSeed + 301,
          question: generateQuestionByType('visual_analogy', initialSeed + 301, 4),
        },
        {
          id: 'gr3_q2',
          grade: 3,
          type: 'number_pattern',
          difficulty: 3,
          seed: initialSeed + 302,
          question: generateQuestionByType('number_pattern', initialSeed + 302, 3),
        },
      ],
      4: [
        {
          id: 'gr4_q1',
          grade: 4,
          type: 'matrix_3x3',
          difficulty: 5,
          seed: initialSeed + 401,
          question: generateQuestionByType('matrix_3x3', initialSeed + 401, 5),
        },
        {
          id: 'gr4_q2',
          grade: 4,
          type: 'logical_sequence',
          difficulty: 5,
          seed: initialSeed + 402,
          question: generateQuestionByType('logical_sequence', initialSeed + 402, 5),
        },
      ],
    };
  });

  const toggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Regenerate all questions for all grades
  const handleRegenerateAllGrades = () => {
    sound.playClick();
    const baseSeed = Math.floor(Math.random() * 800000) + 100000;
    const newPool: Record<1 | 2 | 3 | 4, GradeQuestionItem[]> = { 1: [], 2: [], 3: [], 4: [] };

    ALL_GRADES.forEach((g) => {
      const currentList = questionsByGrade[g];
      newPool[g] = currentList.map((item, idx) => {
        const newSeed = baseSeed + g * 1000 + idx * 107;
        const q = generateQuestionForGrade(g, newSeed, item.type, item.difficulty);
        return {
          ...item,
          seed: newSeed,
          question: q,
        };
      });
    });

    setQuestionsByGrade(newPool);
  };

  // Regenerate single grade
  const handleRegenerateSingleGrade = (grade: 1 | 2 | 3 | 4) => {
    sound.playClick();
    const baseSeed = Math.floor(Math.random() * 800000) + 100000;
    setQuestionsByGrade((prev) => ({
      ...prev,
      [grade]: prev[grade].map((item, idx) => {
        const newSeed = baseSeed + idx * 107;
        const q = generateQuestionForGrade(grade, newSeed, item.type, item.difficulty);
        return {
          ...item,
          seed: newSeed,
          question: q,
        };
      }),
    }));
  };

  // Add a new question to a specific grade
  const handleAddQuestionToGrade = (grade: 1 | 2 | 3 | 4) => {
    sound.playClick();
    const cfg = GRADE_CONFIGS[grade];
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    // Pick a random recommended type from that grade
    const randomType = cfg.recommendedTypes[Math.floor(Math.random() * cfg.recommendedTypes.length)];
    const q = generateQuestionForGrade(grade, newSeed, randomType, cfg.defaultDifficulty);

    const newItem: GradeQuestionItem = {
      id: `gr${grade}_q${Date.now()}`,
      grade,
      type: randomType,
      difficulty: cfg.defaultDifficulty,
      seed: newSeed,
      question: q,
    };

    setQuestionsByGrade((prev) => ({
      ...prev,
      [grade]: [...prev[grade], newItem],
    }));
  };

  // Remove question from a grade
  const handleRemoveQuestion = (grade: 1 | 2 | 3 | 4, id: string) => {
    sound.playClick();
    setQuestionsByGrade((prev) => ({
      ...prev,
      [grade]: prev[grade].filter((item) => item.id !== id),
    }));
  };

  // Change type of a specific question
  const handleChangeQuestionType = (
    grade: 1 | 2 | 3 | 4,
    itemId: string,
    newType: QuestionType
  ) => {
    sound.playClick();
    setQuestionsByGrade((prev) => ({
      ...prev,
      [grade]: prev[grade].map((item) => {
        if (item.id !== itemId) return item;
        const q = generateQuestionForGrade(grade, item.seed, newType, item.difficulty);
        return {
          ...item,
          type: newType,
          question: q,
        };
      }),
    }));
  };

  // Change difficulty of a specific question
  const handleChangeQuestionDifficulty = (
    grade: 1 | 2 | 3 | 4,
    itemId: string,
    newDiff: DifficultyLevel
  ) => {
    sound.playClick();
    setQuestionsByGrade((prev) => ({
      ...prev,
      [grade]: prev[grade].map((item) => {
        if (item.id !== itemId) return item;
        const q = generateQuestionForGrade(grade, item.seed, item.type, newDiff);
        return {
          ...item,
          difficulty: newDiff,
          question: q,
        };
      }),
    }));
  };

  // Reseed a specific question
  const handleReseedQuestion = (grade: 1 | 2 | 3 | 4, itemId: string) => {
    sound.playClick();
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    setQuestionsByGrade((prev) => ({
      ...prev,
      [grade]: prev[grade].map((item) => {
        if (item.id !== itemId) return item;
        const q = generateQuestionForGrade(grade, newSeed, item.type, item.difficulty);
        return {
          ...item,
          seed: newSeed,
          question: q,
        };
      }),
    }));
  };

  // Export JSON for single grade or all
  const handleExportGradeJson = (targetGrade: 1 | 2 | 3 | 4 | 'all') => {
    sound.playClick();
    let exportData: any;
    let fileName = '';

    if (targetGrade === 'all') {
      exportData = {
        exportedAt: new Date().toISOString(),
        totalGrades: 4,
        cohortQuestions: {
          grade_1: questionsByGrade[1].map((q) => q.question),
          grade_2: questionsByGrade[2].map((q) => q.question),
          grade_3: questionsByGrade[3].map((q) => q.question),
          grade_4: questionsByGrade[4].map((q) => q.question),
        },
      };
      fileName = `bilsem_tum_siniflar_soru_havuzu.json`;
    } else {
      exportData = {
        exportedAt: new Date().toISOString(),
        grade: targetGrade,
        gradeTitle: GRADE_CONFIGS[targetGrade].title,
        pedagogicalFocus: GRADE_CONFIGS[targetGrade].pedagogicalFocus,
        questions: questionsByGrade[targetGrade].map((q) => q.question),
      };
      fileName = `bilsem_${targetGrade}_sinif_sorulari.json`;
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const handleCopyGradeJson = (targetGrade: 1 | 2 | 3 | 4 | 'all') => {
    sound.playClick();
    let exportData: any;
    if (targetGrade === 'all') {
      exportData = {
        grade_1: questionsByGrade[1].map((q) => q.question),
        grade_2: questionsByGrade[2].map((q) => q.question),
        grade_3: questionsByGrade[3].map((q) => q.question),
        grade_4: questionsByGrade[4].map((q) => q.question),
      };
    } else {
      exportData = questionsByGrade[targetGrade].map((q) => q.question);
    }
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedGradeJson(targetGrade);
    setTimeout(() => setCopiedGradeJson(null), 2000);
  };

  // Filter which grades to show based on active tab
  const visibleGrades: (1 | 2 | 3 | 4)[] = activeGradeTab === 'all' ? ALL_GRADES : [activeGradeTab];

  const totalQuestionCount =
    questionsByGrade[1].length +
    questionsByGrade[2].length +
    questionsByGrade[3].length +
    questionsByGrade[4].length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center ">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Sınıf Düzeyli Soru Havuzu ve Üretim Merkezi</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    4 Sınıf Grubu • {totalQuestionCount} Soru
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  MEB BİLSEM Genel Yetenek Sınavı standartlarına uygun olarak 1, 2, 3 ve 4. sınıf düzeyleri için ayrı ayrı gruplanmış sorular.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRegenerateAllGrades}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all  flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tüm Sınıflar İçin Yeniden Üret</span>
            </button>

            <button
              onClick={() => handleExportGradeJson('all')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Tüm sınıfları tek JSON dosyası olarak indir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tümünü İndir (JSON)</span>
            </button>

            <button
              onClick={() => handleCopyGradeJson('all')}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Tüm sınıfların JSON şemasını kopyala"
            >
              {copiedGradeJson === 'all' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedGradeJson === 'all' ? 'Kopyalandı' : 'JSON Kopyala'}</span>
            </button>
          </div>
        </div>

        {/* Grade Selection Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                sound.playClick();
                setActiveGradeTab('all');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeGradeTab === 'all'
                  ? 'bg-purple-600 text-white '
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tüm Sınıflar (4 Grup Bir Arada)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
                {totalQuestionCount}
              </span>
            </button>

            {ALL_GRADES.map((g) => {
              const cfg = GRADE_CONFIGS[g];
              const isActive = activeGradeTab === g;
              const count = questionsByGrade[g].length;
              return (
                <button
                  key={g}
                  onClick={() => {
                    sound.playClick();
                    setActiveGradeTab(g);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isActive
                      ? `${cfg.badgeBg} ${cfg.badgeColor} border-current `
                      : 'bg-white border-zinc-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.title} Grubu</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/80' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View density toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setDisplayMode('detailed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                displayMode === 'detailed'
                  ? 'bg-white text-slate-900 '
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Görsel Tuval</span>
            </button>
            <button
              onClick={() => setDisplayMode('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                displayMode === 'compact'
                  ? 'bg-white text-slate-900 '
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Kompakt Denetim</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grade Question Groups */}
      <div className="space-y-8">
        {visibleGrades.map((grade) => {
          const cfg = GRADE_CONFIGS[grade];
          const questions = questionsByGrade[grade];

          return (
            <div
              key={grade}
              className={`bg-white rounded-xl border-2 ${cfg.cardBorder}  overflow-hidden transition-all`}
            >
              {/* Group Header */}
              <div className={`p-5 sm:p-6 ${cfg.badgeBg} border-b ${cfg.cardBorder}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-3xl">{cfg.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {cfg.title} Soru Grubu
                          </h3>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${cfg.badgeColor} bg-white `}>
                            {cfg.stageName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          {cfg.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Pedagogical info badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-zinc-200/80 text-slate-700 font-semibold ">
                        <Target className="w-3.5 h-3.5 text-purple-600" />
                        <span>Hedef Zorluk:</span>
                        <span className="font-bold text-slate-900">
                          Seviye {cfg.difficultyRange.join(' - ')}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-zinc-200/80 text-slate-700 font-semibold ">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Soru Başı Süre:</span>
                        <span className="font-bold text-slate-900">{cfg.timeLimitSeconds} sn</span>
                      </span>

                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-zinc-200/80 text-slate-700 font-semibold ">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kazanım Sayısı:</span>
                        <span className="font-bold text-slate-900">{cfg.targetSkills.length} Temel Yetenek</span>
                      </span>
                    </div>

                    {/* Pedagogical Focus text */}
                    <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-zinc-200/60 leading-relaxed max-w-4xl">
                      <strong>Bilişsel Odak:</strong> {cfg.pedagogicalFocus}
                    </p>
                  </div>

                  {/* Group Action Buttons */}
                  <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAddQuestionToGrade(grade)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-zinc-200 text-xs font-bold transition-all  flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Soru Ekle (+1)</span>
                      </button>

                      <button
                        onClick={() => handleRegenerateSingleGrade(grade)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-zinc-200 text-xs font-bold transition-all  flex items-center gap-1.5 cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Grup Yenile</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyGradeJson(grade)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-zinc-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Bu grubun JSON şemasını kopyala"
                      >
                        {copiedGradeJson === grade ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedGradeJson === grade ? 'Kopyalandı' : 'JSON'}</span>
                      </button>

                      <button
                        onClick={() => handleExportGradeJson(grade)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-zinc-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Bu grubun sorularını indir"
                      >
                        <Download className="w-3 h-3" />
                        <span>İndir</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions List for This Grade */}
              <div className="p-5 sm:p-6 space-y-6">
                {questions.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-zinc-200 rounded-xl">
                    <p className="text-sm font-bold text-slate-500">
                      Bu sınıf grubunda henüz soru bulunmuyor.
                    </p>
                    <button
                      onClick={() => handleAddQuestionToGrade(grade)}
                      className="mt-3 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold  hover:bg-purple-700 cursor-pointer"
                    >
                      Hemen Bir Soru Oluştur
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {questions.map((item, idx) => {
                      const q = item.question;
                      const val = validateQuestion(q);
                      const isExpanded = !!expandedExplanations[item.id];

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-50/70 rounded-xl border border-zinc-200 p-5 space-y-4 hover:border-slate-300 transition-all "
                        >
                          {/* Question Item Header & Controls */}
                          <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-zinc-200/80">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-slate-900 px-2 py-0.5 rounded-lg bg-white ">
                                  {cfg.title} • Soru #{idx + 1}
                                </span>
                                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                                  {QUESTION_TYPE_LABELS[q.type]}
                                </span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    DIFFICULTY_COLORS[q.difficulty]
                                  }`}
                                >
                                  Zorluk {q.difficulty}: {DIFFICULTY_LABELS[q.difficulty]}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                Tohum: {item.seed} • Doğru: {q.correctOptionId}
                              </div>
                            </div>

                            {/* Question Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReseedQuestion(grade, item.id)}
                                title="Bu soru için yeni tohum üret"
                                className="p-1.5 rounded-xl bg-white text-slate-600 hover:text-purple-600 hover:bg-purple-50 cursor-pointer transition-colors"
                              >
                                <Shuffle className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onInspectInStudio(q.type, item.seed, q.difficulty)}
                                title="Soru Mimarı & SVG Stüdyosunda Detaylı İncele"
                                className="p-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-bold px-2"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Stüdyo</span>
                              </button>

                              {questions.length > 1 && (
                                <button
                                  onClick={() => handleRemoveQuestion(grade, item.id)}
                                  title="Soruyu kaldır"
                                  className="p-1.5 rounded-xl bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Config Selectors (Type & Difficulty) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Motor / Soru Tipi
                              </label>
                              <select
                                value={item.type}
                                onChange={(e) =>
                                  handleChangeQuestionType(
                                    grade,
                                    item.id,
                                    e.target.value as QuestionType
                                  )
                                }
                                className="w-full p-1.5 rounded-xl bg-white border border-slate-300 font-semibold text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                              >
                                {cfg.recommendedTypes.map((t) => (
                                  <option key={t} value={t}>
                                    ⭐ {QUESTION_TYPE_LABELS[t]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Sınıf Zorluğu
                              </label>
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => {
                                  const isRecommended = cfg.difficultyRange.includes(lvl);
                                  return (
                                    <button
                                      key={lvl}
                                      onClick={() =>
                                        handleChangeQuestionDifficulty(grade, item.id, lvl)
                                      }
                                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        q.difficulty === lvl
                                          ? 'bg-purple-600 text-white border-purple-600 '
                                          : isRecommended
                                          ? 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                                          : 'bg-white text-slate-500 border-zinc-200 hover:bg-slate-100'
                                      }`}
                                      title={isRecommended ? `${cfg.title} için önerilen seviye` : ''}
                                    >
                                      {lvl}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Question Prompt */}
                          <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center">
                            <h4 className="text-sm font-bold text-slate-900">{q.prompt}</h4>
                            {q.secondaryPrompt && (
                              <p className="text-xs text-slate-500 mt-0.5">{q.secondaryPrompt}</p>
                            )}
                          </div>

                          {/* Live Visual Canvas (Detailed mode only) */}
                          {displayMode === 'detailed' && (
                            <div className="space-y-3">
                              {/* SVG Canvas */}
                              <div className="bg-white p-3 rounded-xl border border-zinc-200 ">
                                <QuestionRenderer question={q} />
                              </div>

                              {/* Options */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5 text-xs">
                                  <span className="font-bold text-slate-500">Seçenekler:</span>
                                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                    Doğru: {q.correctOptionId}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {q.options.map((opt) => (
                                    <div key={opt.id} className="relative">
                                      <OptionRenderer
                                        option={opt}
                                        isSelected={opt.id === q.correctOptionId}
                                        onSelect={() => {}}
                                        disabled={true}
                                        showCorrect={true}
                                        isCorrectOption={opt.id === q.correctOptionId}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Toggleable Solution & Pedagogical Steps */}
                          <div className="pt-1">
                            <button
                              onClick={() => toggleExplanation(item.id)}
                              className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-zinc-200 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>BİLSEM Pedagojik Çözüm & Mantık İncele</span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-3.5 rounded-xl bg-white space-y-2 text-xs">
                                <div className="font-bold text-purple-900">
                                  {q.explanation.ruleTitle}
                                </div>
                                <p className="text-slate-600 leading-relaxed">
                                  {q.explanation.summary}
                                </p>
                                <div className="space-y-1 pt-1 border-t border-zinc-200">
                                  {q.explanation.steps.map((step, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="flex items-start gap-1.5 text-slate-700"
                                    >
                                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {sIdx + 1}
                                      </span>
                                      <span className="leading-snug">{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
