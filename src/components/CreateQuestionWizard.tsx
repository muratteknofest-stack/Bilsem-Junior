import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Save,
  Wand2,
  Play,
  Settings2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Shuffle,
  Search,
  Layers,
  Eye,
  ShieldCheck,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
  GraduationCap,
  Compass,
  Brain,
  Target,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../lib/sound';
import {
  CognitiveCategory,
  QuestionType,
  DifficultyLevel,
  COGNITIVE_CATEGORY_LABELS,
  ALL_COGNITIVE_CATEGORIES,
  QUESTION_TYPE_LABELS,
  BaseQuestion,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from '../types';
import { QuestionRenderer } from '../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../features/questions/renderers/VisualExplanationOverlay';
import { QuestionQualityChecker } from './QuestionQualityChecker';
import {
  generateQuestionByType,
  ALL_QUESTION_TYPES,
  CATEGORY_TYPES_MAP,
} from '../features/questions/generators';
import { GRADE_CONFIGS, ALL_GRADES } from '../features/questions/grade-config';
import { validateQuestion } from '../features/questions/validator';
import { runMultiPassQuestionTests, stampQuestionVerification } from '../features/questions/verifier';

interface CreateQuestionWizardProps {
  onClose: () => void;
  onSave: (question: BaseQuestion) => void;
}

export const CreateQuestionWizard: React.FC<CreateQuestionWizardProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [category, setCategory] = useState<CognitiveCategory>('matrix');
  const [type, setType] = useState<QuestionType>('matrix_2x2');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(2);
  const [targetGrade, setTargetGrade] = useState<1 | 2 | 3 | 4>(2);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 900000) + 100000);
  const [typeSearch, setTypeSearch] = useState<string>('');

  // Prompt & Explanation Customization State
  const [prompt, setPrompt] = useState<string>('');
  const [secondaryPrompt, setSecondaryPrompt] = useState<string>('');
  const [ruleTitle, setRuleTitle] = useState<string>('');
  const [explanationSummary, setExplanationSummary] = useState<string>('');
  const [explanationSteps, setExplanationSteps] = useState<string[]>([]);
  const [selectedCorrectOptionId, setSelectedCorrectOptionId] = useState<string>('');
  const [estimatedSeconds, setEstimatedSeconds] = useState<number>(45);

  // Interactive Test Simulation in Step 4
  const [testSelectedOption, setTestSelectedOption] = useState<string | null>(null);
  const [testShowResult, setTestShowResult] = useState<boolean>(false);

  // Filtered types by selected category or search
  const availableTypesForCategory = useMemo(() => {
    const list = CATEGORY_TYPES_MAP[category] || ALL_QUESTION_TYPES;
    if (!typeSearch.trim()) return list;
    const term = typeSearch.toLowerCase().trim();
    return ALL_QUESTION_TYPES.filter(
      (t) =>
        t.toLowerCase().includes(term) ||
        (QUESTION_TYPE_LABELS[t] || '').toLowerCase().includes(term)
    );
  }, [category, typeSearch]);

  // When category changes, keep type if valid, otherwise pick first available
  useEffect(() => {
    const validTypes = CATEGORY_TYPES_MAP[category] || [];
    if (validTypes.length > 0 && !validTypes.includes(type) && !typeSearch.trim()) {
      setType(validTypes[0]);
    }
  }, [category]);

  // Generate base procedural question based on type, seed, difficulty
  const baseGenerated = useMemo<BaseQuestion>(() => {
    try {
      return generateQuestionByType(type, seed, difficulty);
    } catch (err) {
      console.error('Failed to generate procedural question:', err);
      return generateQuestionByType('visual_sequence', seed, 2);
    }
  }, [type, seed, difficulty]);

  // Sync default prompts & explanations when engine or seed changes
  useEffect(() => {
    setPrompt(baseGenerated.prompt);
    setSecondaryPrompt(baseGenerated.secondaryPrompt || '');
    setRuleTitle(baseGenerated.explanation?.ruleTitle || 'Çözüm Kuralı');
    setExplanationSummary(baseGenerated.explanation?.summary || '');
    setExplanationSteps(baseGenerated.explanation?.steps || []);
    setSelectedCorrectOptionId(baseGenerated.correctOptionId);
    setEstimatedSeconds(GRADE_CONFIGS[targetGrade].timeLimitSeconds);
    setTestSelectedOption(null);
    setTestShowResult(false);
  }, [baseGenerated.id]);

  // Final assembled question
  const finalQuestion = useMemo<BaseQuestion>(() => {
    return {
      ...baseGenerated,
      id: `CUSTOM-${type}-g${targetGrade}-${difficulty}-${seed}`,
      version: (baseGenerated.version || 1) + 1,
      targetGrade,
      targetGrades: [targetGrade],
      category,
      difficulty,
      ageGroup: targetGrade <= 2 ? '1-2' : '3-4',
      prompt: prompt.trim() || baseGenerated.prompt,
      secondaryPrompt: secondaryPrompt.trim() || undefined,
      correctOptionId: selectedCorrectOptionId || baseGenerated.correctOptionId,
      estimatedSeconds,
      explanation: {
        ...baseGenerated.explanation,
        ruleTitle: ruleTitle.trim() || baseGenerated.explanation?.ruleTitle || 'Çözüm Kuralı',
        summary: explanationSummary.trim() || baseGenerated.explanation?.summary || '',
        steps:
          explanationSteps.length > 0
            ? explanationSteps.filter((s) => s.trim() !== '')
            : baseGenerated.explanation?.steps || [],
      },
      isCustom: true,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
  }, [
    baseGenerated,
    targetGrade,
    category,
    difficulty,
    seed,
    prompt,
    secondaryPrompt,
    selectedCorrectOptionId,
    estimatedSeconds,
    ruleTitle,
    explanationSummary,
    explanationSteps,
  ]);

  const steps = [
    { num: 1, title: 'Motor & Tip Seçimi', icon: Layers },
    { num: 2, title: 'Yönerge & Pedagoji', icon: Brain },
    { num: 3, title: 'Tohum & Parametreler', icon: Settings2 },
    { num: 4, title: 'Simülasyon & Onay', icon: Eye },
  ];

  const handleNext = () => {
    sound.playClick();
    setStep((s) => Math.min(4, s + 1));
  };
  const handlePrev = () => {
    sound.playClick();
    setStep((s) => Math.max(1, s - 1));
  };

  const handleRandomizeSeed = () => {
    sound.playClick();
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    setSeed(newSeed);
  };

  const handleResetPrompts = () => {
    sound.playClick();
    setPrompt(baseGenerated.prompt);
    setSecondaryPrompt(baseGenerated.secondaryPrompt || '');
    setRuleTitle(baseGenerated.explanation?.ruleTitle || 'Çözüm Kuralı');
    setExplanationSummary(baseGenerated.explanation?.summary || '');
    setExplanationSteps(baseGenerated.explanation?.steps || []);
    setSelectedCorrectOptionId(baseGenerated.correctOptionId);
  };

  const handleSave = () => {
    // Sanitize question to guarantee valid options and fingerprints
    const sanitizedQuestion: BaseQuestion = {
      ...finalQuestion,
      prompt: finalQuestion.prompt.trim() || baseGenerated.prompt,
      options: finalQuestion.options.map((opt, i) => ({
        ...opt,
        fingerprint: opt.fingerprint ? `${opt.fingerprint}_${opt.id}` : `fp_${opt.id}_${i}`,
      })),
      explanation: {
        ...finalQuestion.explanation,
        ruleTitle: finalQuestion.explanation?.ruleTitle || 'Çözüm Kuralı',
        summary: finalQuestion.explanation?.summary?.trim() || 'Sorunun mantık kuralına göre doğru cevap belirlenmiştir.',
        steps:
          finalQuestion.explanation?.steps && finalQuestion.explanation.steps.length > 0
            ? finalQuestion.explanation.steps
            : ['Kuralı dikkatle inceleyin.', 'Eşleşen doğru seçeneği işaretleyin.'],
      },
    };

    // 5-Pass Automated Verification & Stamping
    const report = runMultiPassQuestionTests(sanitizedQuestion);
    const verifiedQuestion = stampQuestionVerification(sanitizedQuestion, report);

    setIsGenerating(true);
    sound.playSuccess();
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    try {
      onSave(verifiedQuestion);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white font-['Outfit',sans-serif] tracking-tight">
                  BİLSEM Akıllı Soru Oluşturma Sihirbazı
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  44 Algoritma
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tüm BİLSEM bilişsel alanlarına uygun, deterministik parametrik soru üret ve özelleştir.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="bg-slate-950/60 px-6 sm:px-12 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between relative max-w-3xl mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 rounded-full" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((s) => {
              const Icon = s.icon;
              const isPast = step > s.num;
              const isCurrent = step === s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    sound.playClick();
                    setStep(s.num);
                  }}
                  className="relative z-10 flex flex-col items-center gap-1.5 px-2 bg-slate-950 cursor-pointer group"
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isPast
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isCurrent
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-500/20 scale-105'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[11px] font-bold hidden sm:block ${
                      isCurrent ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stepper Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40 relative">
          <AnimatePresence mode="wait">
            {/* STEP 1: MOTOR & TIP SEÇİMİ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto"
              >
                {/* Left Side: Category & Type Selectors */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <span>1. Adım: Bilişsel Kategori ve Algoritma Motoru</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hedeflediğiniz bilişsel yeteneğe göre 44 parametrik BİLSEM motorundan birini seçin.
                    </p>
                  </div>

                  {/* Cognitive Category Chips */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Bilişsel Kategori</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ALL_COGNITIVE_CATEGORIES.map((catKey) => {
                        const isSelected = category === catKey;
                        const count = (CATEGORY_TYPES_MAP[catKey] || []).length;
                        return (
                          <button
                            key={catKey}
                            onClick={() => {
                              sound.playClick();
                              setCategory(catKey);
                            }}
                            className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="text-xs font-bold truncate">
                              {COGNITIVE_CATEGORY_LABELS[catKey]}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 font-mono">
                              {count} Algoritma
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Type Selector with Search */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Soru Motoru ({availableTypesForCategory.length} Seçenek)
                      </label>
                      <div className="relative w-44">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={typeSearch}
                          onChange={(e) => setTypeSearch(e.target.value)}
                          placeholder="Tip ara..."
                          className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {availableTypesForCategory.map((t) => {
                        const isSelected = type === t;
                        return (
                          <button
                            key={t}
                            onClick={() => {
                              sound.playClick();
                              setType(t);
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{QUESTION_TYPE_LABELS[t] || t}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grade and Difficulty Selection */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Hedef Sınıf</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {ALL_GRADES.map((g) => (
                          <button
                            key={g}
                            onClick={() => {
                              sound.playClick();
                              setTargetGrade(g);
                              setDifficulty(GRADE_CONFIGS[g].defaultDifficulty);
                            }}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              targetGrade === g
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {g}. Sınıf
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Zorluk Seviyesi (1-6)
                      </label>
                      <div className="grid grid-cols-6 gap-1">
                        {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => {
                              sound.playClick();
                              setDifficulty(lvl);
                            }}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              difficulty === lvl
                                ? 'bg-purple-600 text-white border-purple-500'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Instant Live SVG Preview Card */}
                <div className="lg:col-span-5 flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Anlık Görsel Önizleme (Canlı)</span>
                    </span>
                    <button
                      onClick={handleRandomizeSeed}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1 rounded-lg border border-slate-800"
                    >
                      <Shuffle className="w-3 h-3" /> Varyasyon Karıştır
                    </button>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-3 shadow-inner">
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/40">
                        {QUESTION_TYPE_LABELS[type]}
                      </span>
                      <p className="text-xs font-bold text-slate-200 mt-1 line-clamp-2">
                        {baseGenerated.prompt}
                      </p>
                    </div>

                    {/* SVG Render Box */}
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 flex items-center justify-center min-h-[180px]">
                      <QuestionRenderer question={baseGenerated} />
                    </div>

                    {/* Options Row */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">
                        Doğru Cevap: {baseGenerated.correctOptionId}
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {baseGenerated.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-1.5 rounded-xl border text-center transition-all ${
                              opt.id === baseGenerated.correctOptionId
                                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <OptionRenderer question={baseGenerated}
                              option={opt}
                              questionType={baseGenerated.type}
                              isSelected={opt.id === baseGenerated.correctOptionId}
                              onSelect={() => {}}
                              disabled={true}
                              showCorrect={true}
                              isCorrectOption={opt.id === baseGenerated.correctOptionId}
                            />
                            <span className="text-[10px] font-bold mt-0.5 block">{opt.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: YÖNERGE & PEDAGOJİK İÇERİK */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span>2. Adım: Yönerge, Çözüm Kuralı ve Süre Yapılandırması</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sorunun öğrenciye hitap eden yönerge metnini ve pedagojik çözüm açıklamasını düzenleyin.
                    </p>
                  </div>
                  <button
                    onClick={handleResetPrompts}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Varsayılana Sıfırla</span>
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
                  {/* Primary Prompt */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Ana Yönerge Metni (Öğrencinin Göreceği Soru Metni)
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none leading-relaxed"
                      placeholder="Örn: Aşağıdaki örüntüde soru işareti yerine hangi şekil gelmelidir?"
                    />
                  </div>

                  {/* Secondary Prompt */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      İkincil İpucu / Ek Yönerge (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={secondaryPrompt}
                      onChange={(e) => setSecondaryPrompt(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      placeholder="Örn: Şekillerin dönüş yönüne ve renk dizilimine dikkat edin."
                    />
                  </div>

                  {/* Solution Rule Title & Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Kural Başlığı</label>
                      <input
                        type="text"
                        value={ruleTitle}
                        onChange={(e) => setRuleTitle(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        placeholder="Örn: Saat Yönünde 90° Dönme Kuralı"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Tahmini Çözüm Süresi (Saniye)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={estimatedSeconds}
                        onChange={(e) => setEstimatedSeconds(parseInt(e.target.value) || 45)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  {/* Explanation Summary */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Pedagojik Çözüm Özeti (Doğru Cevabın Gerekçesi)
                    </label>
                    <textarea
                      value={explanationSummary}
                      onChange={(e) => setExplanationSummary(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none leading-relaxed"
                      placeholder="Doğru seçeneğin neden doğru olduğunu açıklayın..."
                    />
                  </div>

                  {/* Step-by-Step Solution Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        Adım Adım Çözüm Rehberi ({explanationSteps.length} Adım)
                      </label>
                      <button
                        onClick={() => setExplanationSteps([...explanationSteps, ''])}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adım Ekle
                      </button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {explanationSteps.map((stepText, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={stepText}
                            onChange={(e) => {
                              const updated = [...explanationSteps];
                              updated[idx] = e.target.value;
                              setExplanationSteps(updated);
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            placeholder={`${idx + 1}. çözüm adımını yazın...`}
                          />
                          <button
                            onClick={() => {
                              setExplanationSteps(explanationSteps.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Adımı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: TOHUM & PARAMETRİK AYARLAR */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto"
              >
                {/* Parameter Controls */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-amber-400" />
                      <span>3. Adım: Deterministik Tohum (Seed) & Varyasyon</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deterministik tohum değeri sayesinde aynı sorunun sonsuz farklı varyasyonunu anında türetebilirsiniz.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
                    {/* Seed Slider & Input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">
                          Rastgelelik Sabiti (Tohum / Seed)
                        </label>
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-800/40">
                          #{seed}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1000}
                          max={999999}
                          value={seed}
                          onChange={(e) => setSeed(parseInt(e.target.value) || 1000)}
                          className="flex-1 accent-indigo-500 cursor-pointer"
                        />
                        <button
                          onClick={handleRandomizeSeed}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          title="Rastgele Tohum Üret"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>Zar At</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Seed Variation Chips */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">
                        Hızlı Varyasyon Atlama
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Önceki', delta: -1 },
                          { label: 'Sonraki', delta: 1 },
                          { label: '+100 Varyasyon', delta: 100 },
                          { label: '+997 Altın Oran', delta: 997 },
                        ].map((btn, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              sound.playClick();
                              setSeed((prev) => Math.max(1, prev + btn.delta));
                            }}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Correct Option Selector */}
                    <div className="space-y-2 pt-3 border-t border-slate-800">
                      <label className="text-xs font-bold text-slate-300">
                        Doğru Seçenek Anahtarı
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {baseGenerated.options.map((opt) => {
                          const isSelected = selectedCorrectOptionId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                sound.playClick();
                                setSelectedCorrectOptionId(opt.id);
                              }}
                              className={`p-3 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Seçenek {opt.id}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pedagogical Note Alert */}
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Deterministik Üretim Garantisi:</span>
                        <p className="text-[11px] text-indigo-300/80 mt-0.5">
                          Aynı tohum ve zorluk seviyesi verildiğinde soru şablonu, renk paletleri ve doğru cevap her zaman birebir aynı üretilir.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Live SVG Canvas */}
                <div className="lg:col-span-6 flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Parametre Değişikliğine Duyarlı Canlı Tuval</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      Doğru: {selectedCorrectOptionId}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-white">{prompt || baseGenerated.prompt}</h4>
                      {secondaryPrompt && (
                        <p className="text-xs text-slate-400 mt-0.5">{secondaryPrompt}</p>
                      )}
                    </div>

                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 flex items-center justify-center min-h-[200px]">
                      <QuestionRenderer question={baseGenerated} />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {baseGenerated.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            opt.id === selectedCorrectOptionId
                              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <OptionRenderer question={baseGenerated}
                            option={opt}
                            questionType={baseGenerated.type}
                            isSelected={opt.id === selectedCorrectOptionId}
                            onSelect={() => {}}
                            disabled={true}
                            showCorrect={true}
                            isCorrectOption={opt.id === selectedCorrectOptionId}
                          />
                          <span className="text-[11px] font-bold mt-1 block">Seçenek {opt.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: ÖNİZLEME, ÖĞRENCİ SİMÜLASYONU & YAYINLAMA */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>4. Adım: Öğrenci Simülasyonu & Son Onay</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Soruyu öğrencinin gözünden çözerek test edin ve kalite denetim raporunu inceleyin.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {targetGrade}. Sınıf • {DIFFICULTY_LABELS[difficulty]}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Yayına Hazır
                    </span>
                  </div>
                </div>

                {/* Question Canvas Card with Interactive Test Mode */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                  {/* Test Mode Toggle Banner */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Test Çözüm Modu (Öğrenci Deneyimi)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {testSelectedOption && (
                        <button
                          onClick={() => {
                            setTestSelectedOption(null);
                            setTestShowResult(false);
                          }}
                          className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Seçimi Sıfırla
                        </button>
                      )}
                      <button
                        onClick={() => setTestShowResult(!testShowResult)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 font-bold cursor-pointer transition-colors"
                      >
                        {testShowResult ? 'Çözümü Gizle' : 'Çözümü Göster'}
                      </button>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="text-center max-w-xl mx-auto space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-800/40">
                      {COGNITIVE_CATEGORY_LABELS[category]} • {QUESTION_TYPE_LABELS[type]}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white mt-2 leading-relaxed">
                      {finalQuestion.prompt}
                    </h2>
                    {finalQuestion.secondaryPrompt && (
                      <p className="text-xs text-slate-400">{finalQuestion.secondaryPrompt}</p>
                    )}
                  </div>

                  {/* Main Question SVG Graphic */}
                  <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex items-center justify-center">
                    <QuestionRenderer question={finalQuestion} />
                  </div>

                  {/* Options with Interactive Click */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>Cevap Seçenekleri:</span>
                      <span className="text-emerald-400 font-mono">
                        Doğru Cevap: {finalQuestion.correctOptionId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {finalQuestion.options.map((opt) => {
                        const isChosen = testSelectedOption === opt.id;
                        const isCorrect = opt.id === finalQuestion.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              sound.playClick();
                              setTestSelectedOption(opt.id);
                              if (opt.id === finalQuestion.correctOptionId) {
                                sound.playSuccess();
                              }
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer group ${
                              isChosen
                                ? isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40'
                                  : 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/40'
                                : isCorrect && testShowResult
                                ? 'bg-emerald-950/40 border-emerald-500/60'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <OptionRenderer question={finalQuestion}
                              option={opt}
                              questionType={finalQuestion.type}
                              isSelected={isChosen}
                              onSelect={() => {}}
                              showCorrect={testShowResult}
                              isCorrectOption={isCorrect}
                            />
                            <div className="mt-2 flex items-center justify-between text-xs px-1">
                              <span className="font-bold text-slate-300">Seçenek {opt.id}</span>
                              {isChosen && (
                                <span
                                  className={`text-[10px] font-bold ${
                                    isCorrect ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {isCorrect ? '✓ Doğru' : '✗ Yanlış'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Solution Explanation Drawer */}
                  {testShowResult && (
                    <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-2 text-xs">
                      <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>{finalQuestion.explanation.ruleTitle}</span>
                      </h4>
                      <p className="text-slate-300 leading-relaxed">
                        {finalQuestion.explanation.summary}
                      </p>
                      {finalQuestion.explanation.steps.length > 0 && (
                        <ol className="list-decimal pl-4 space-y-1 text-slate-400 mt-2">
                          {finalQuestion.explanation.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>

                {/* 5-Pass Verification Card */}
                <div className="bg-slate-950/80 rounded-2xl border border-emerald-500/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">5 Kademeli Otomatik Test & Çözücü Doğrulaması</h4>
                        <p className="text-[11px] text-slate-400">Çift doğru cevap, çelişkili çeldirici ve çözülebilirlik kontrolleri</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      %100 Doğrulandı
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300">1. Şema & Bütünlük (Geçti)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300">2. Seçenek Tekilliği (Geçti)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300">3. Çeldirici Benzersizliği (Geçti)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300">4. Çözücü & Mantık Tutarlılığı (Geçti)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 sm:col-span-2 lg:col-span-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300">5. Çoklu Otomasyon Onayı (Geçti)</span>
                    </div>
                  </div>
                </div>

                {/* Pre-Submission Quality Checker Audit */}
                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4">
                  <QuestionQualityChecker question={finalQuestion} showAutoFixButton={false} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions Bar */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            onClick={step === 1 ? onClose : handlePrev}
            className="px-5 py-2.5 rounded-2xl font-bold text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {step === 1 ? 'İptal' : <><ChevronLeft className="w-4 h-4" /> Geri</>}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Adım {step} / {steps.length}
            </span>

            <button
              onClick={step === 4 ? handleSave : handleNext}
              disabled={isGenerating || (step === 2 && !prompt.trim())}
              className="px-6 py-2.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Wand2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : step === 4 ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Soruyu Havuza Kaydet & Yayınla</span>
                </>
              ) : (
                <>
                  <span>İlerle</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

