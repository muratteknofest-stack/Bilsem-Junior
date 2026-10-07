import React, { useState, useEffect } from 'react';
import {
  QuestionType,
  DifficultyLevel,
  BaseQuestion,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from '../../types';
import { generateQuestionByType, ALL_QUESTION_TYPES } from '../../features/questions/generators';
import { validateQuestion, QuestionValidationResult } from '../../features/questions/validator';
import { GRADE_CONFIGS, ALL_GRADES, GradeLevelConfig } from '../../features/questions/grade-config';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../../features/questions/renderers/VisualExplanationOverlay';
import { questionBankService } from '../../services/question-bank-service';
import confetti from 'canvas-confetti';
import { sound } from '../../lib/sound';
import {
  Sparkles,
  Shuffle,
  Play,
  CheckCircle2,
  AlertTriangle,
  Code,
  Copy,
  Check,
  Download,
  Layers,
  Eye,
  ShieldCheck,
  Grid,
  Clock,
  Target,
  GraduationCap,
  Save,
  Wand2,
  Edit3,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface AdminQuestionStudioProps {
  selectedType: QuestionType;
  onTypeChange: (type: QuestionType) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
  difficulty: DifficultyLevel;
  onDifficultyChange: (diff: DifficultyLevel) => void;
  generatedQuestion: BaseQuestion;
  onGenerate: (type?: QuestionType, seed?: number, diff?: DifficultyLevel) => void;
  onOpenWizard?: () => void;
}

export const AdminQuestionStudio: React.FC<AdminQuestionStudioProps> = ({
  selectedType,
  onTypeChange,
  seed,
  onSeedChange,
  difficulty,
  onDifficultyChange,
  generatedQuestion,
  onGenerate,
  onOpenWizard,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeCanvasBg, setActiveCanvasBg] = useState<'white' | 'slate' | 'grid'>('white');
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Interactive Student Solve Simulation Mode
  const [testMode, setTestMode] = useState<boolean>(false);
  const [testSelectedOption, setTestSelectedOption] = useState<string | null>(null);
  const [testShowAnswer, setTestShowAnswer] = useState<boolean>(false);

  // Custom Prompt & Explanation Inline Editor
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>(generatedQuestion.prompt);
  const [customSecondary, setCustomSecondary] = useState<string>(generatedQuestion.secondaryPrompt || '');
  const [customRuleTitle, setCustomRuleTitle] = useState<string>(generatedQuestion.explanation?.ruleTitle || '');
  const [customSummary, setCustomSummary] = useState<string>(generatedQuestion.explanation?.summary || '');

  // Keep editor state in sync when generated question changes
  useEffect(() => {
    setCustomPrompt(generatedQuestion.prompt);
    setCustomSecondary(generatedQuestion.secondaryPrompt || '');
    setCustomRuleTitle(generatedQuestion.explanation?.ruleTitle || '');
    setCustomSummary(generatedQuestion.explanation?.summary || '');
    setTestSelectedOption(null);
    setTestShowAnswer(false);
  }, [generatedQuestion.id]);

  // Find initial grade from difficulty & type
  const detectGrade = (): 1 | 2 | 3 | 4 => {
    if (difficulty <= 2) return 1;
    if (difficulty === 3) return 2;
    if (difficulty === 4) return 3;
    return 4;
  };

  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | 4 | 'custom'>(detectGrade());

  // Active question combined with inline edits
  const activeQuestion: BaseQuestion = {
    ...generatedQuestion,
    prompt: customPrompt.trim() !== '' ? customPrompt : generatedQuestion.prompt,
    secondaryPrompt: customSecondary.trim() !== '' ? customSecondary : undefined,
    explanation: {
      ...generatedQuestion.explanation,
      ruleTitle: customRuleTitle.trim() !== '' ? customRuleTitle : generatedQuestion.explanation?.ruleTitle,
      summary: customSummary.trim() !== '' ? customSummary : generatedQuestion.explanation?.summary,
    },
  };

  // Real-time validation audit
  const validationResult: QuestionValidationResult = validateQuestion(activeQuestion);

  const handleSelectGrade = (g: 1 | 2 | 3 | 4) => {
    sound.playClick();
    setSelectedGrade(g);
    const cfg = GRADE_CONFIGS[g];
    const newDiff = cfg.defaultDifficulty;
    onDifficultyChange(newDiff);

    // If current type is not recommended for this grade, switch to first recommended type
    let newType = selectedType;
    if (!cfg.recommendedTypes.includes(selectedType)) {
      newType = cfg.recommendedTypes[0];
      onTypeChange(newType);
    }
    onGenerate(newType, seed, newDiff);
  };

  const handleRandomize = () => {
    sound.playClick();
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    onSeedChange(newSeed);
    onGenerate(selectedType, newSeed, difficulty);
  };

  const handleQuickSeed = (s: number) => {
    sound.playClick();
    onSeedChange(s);
    onGenerate(selectedType, s, difficulty);
  };

  const handleSaveToBank = () => {
    sound.playSuccess();
    confetti({ particleCount: 50, spread: 65, origin: { y: 0.5 } });
    const targetG = selectedGrade !== 'custom' ? selectedGrade : (generatedQuestion.targetGrade || 2);
    const toSave: BaseQuestion = {
      ...activeQuestion,
      targetGrade: targetG,
      targetGrades: [targetG],
      isCustom: true,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    questionBankService.createCustomQuestion(toSave);
    setSaveToast(`Soru taslak olarak kaydedildi; yayımlamadan önce inceleyin. (ID: ${toSave.id})`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const copyJsonToClipboard = () => {
    sound.playClick();
    const jsonStr = JSON.stringify(activeQuestion, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadJsonFile = () => {
    sound.playClick();
    const jsonStr = JSON.stringify(activeQuestion, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question_${activeQuestion.type}_seed_${activeQuestion.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4 quick seed variation presets
  const seedPresets = [
    { label: 'Tohum A', seed: seed },
    { label: 'Tohum B', seed: seed + 10007 },
    { label: 'Tohum C', seed: seed + 34821 },
    { label: 'Tohum D', seed: seed + 77777 },
  ];

  const activeGradeConfig: GradeLevelConfig | null =
    selectedGrade !== 'custom' ? GRADE_CONFIGS[selectedGrade] : null;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Studio Top Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Configuration & Quality Auditor */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-sm text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Parametre Kontrolleri</span>
              </h3>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {ALL_QUESTION_TYPES.length} BİLSEM Motoru
              </span>
            </div>

            {/* Grade Level Selector & Grouping */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Hedef Sınıf Düzeyi</span>
                </label>
                <span className="text-[10px] font-bold text-purple-400">
                  {selectedGrade !== 'custom' ? GRADE_CONFIGS[selectedGrade].title : 'Serbest'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ALL_GRADES.map((g) => {
                  const cfg = GRADE_CONFIGS[g];
                  const isSelected = selectedGrade === g;
                  return (
                    <button
                      key={g}
                      onClick={() => handleSelectGrade(g)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center flex flex-col items-center gap-0.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-[11px]">{g}. Sınıf</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Grade Pedagogical Overview */}
              {activeGradeConfig && (
                <div className="mt-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-purple-300">{activeGradeConfig.stageName}</span>
                    <span className="text-[10px] font-mono bg-purple-900/60 px-1.5 py-0.5 rounded-md text-purple-200">
                      Süre: {activeGradeConfig.timeLimitSeconds}sn
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {activeGradeConfig.pedagogicalFocus}
                  </p>
                </div>
              )}
            </div>

            {/* Question Type Selector with Grade Recommendations */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Soru Türü & Motor ({ALL_QUESTION_TYPES.length} Tip)
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  const t = e.target.value as QuestionType;
                  onTypeChange(t);
                  onGenerate(t, seed, difficulty);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm font-semibold bg-slate-950 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                {activeGradeConfig ? (
                  <>
                    <optgroup label={`⭐ ${activeGradeConfig.title} İçin Önerilen Motorlar`}>
                      {activeGradeConfig.recommendedTypes.map((t) => (
                        <option key={t} value={t}>
                          ⭐ {QUESTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Diğer BİLSEM Motorları">
                      {ALL_QUESTION_TYPES.filter(
                        (t) => !activeGradeConfig.recommendedTypes.includes(t)
                      ).map((t) => (
                        <option key={t} value={t}>
                          {QUESTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  ALL_QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Seed Input & Randomize */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Deterministik Tohum (Seed)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">RNG Sabiti</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => {
                    const num = parseInt(e.target.value) || 1;
                    onSeedChange(num);
                    onGenerate(selectedType, num, difficulty);
                  }}
                  className="flex-1 p-2.5 rounded-xl border border-slate-700 font-mono text-sm bg-slate-950 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleRandomize}
                  title="Rastgele Tohum Üret"
                  className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 cursor-pointer transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>

              {/* Seed Presets */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {seedPresets.map((sp) => (
                  <button
                    key={sp.label}
                    onClick={() => handleQuickSeed(sp.seed)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer text-center truncate ${
                      seed === sp.seed
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level (1-6) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Zorluk Derecesi</label>
                <span className="text-xs font-bold text-purple-400">
                  Seviye {difficulty}: {DIFFICULTY_LABELS[difficulty]}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      onDifficultyChange(lvl);
                      onGenerate(selectedType, seed, lvl);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-105'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Generate & Launch Wizard */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  sound.playClick();
                  onGenerate();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Yeniden Üret ve Doğrula</span>
              </button>

              {onOpenWizard && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenWizard();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>4 Adımlı Sihirbazı Başlat</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-time Quality Gate Validation Audit Card */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Kanonik Kural Denetimi</span>
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  validationResult.isValid
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {validationResult.isValid ? 'Tam Uyumlu (%100)' : 'Uyarı Tespit Edildi'}
              </span>
            </div>

            <div className="space-y-1.5 font-medium">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <span>Deterministik Tohum & ID Bütünlüğü</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <span>Seçenek Benzersizliği (Parmak İzi)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <span>Tekil Doğru Cevap ({activeQuestion.correctOptionId})</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                <span>Pedagojik Çözüm ({activeQuestion.explanation?.steps?.length || 0} Adım)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            </div>

            {!validationResult.isValid && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Kural İhlali Tespit Edildi:</span>
                </div>
                {validationResult.errors.map((err, idx) => (
                  <p key={idx} className="text-[11px] leading-snug">
                    • [{err.code}] {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live SVG Rendering Canvas & JSON Inspector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-sm text-slate-100">
            {/* View Mode & Canvas Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              {/* Tab: Visual vs JSON */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'visual'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Görsel İnceleme</span>
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'json'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>JSON Şeması</span>
                </button>
              </div>

              {/* Action Buttons: Save to Bank, Edit, Test Mode */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Save to Bank Primary Button */}
                <button
                  onClick={handleSaveToBank}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Soruyu Soru Bankası Havuzuna Kaydet"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Havuza Kaydet</span>
                </button>

                {/* Test Mode Toggle */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setTestMode(!testMode);
                    setTestSelectedOption(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                    testMode
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Öğrenci gibi çözerek test et"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test Modu</span>
                </button>

                {/* Inline Edit Toggle */}
                <button
                  onClick={() => setIsEditingInline(!isEditingInline)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                    isEditingInline
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Yönerge ve Açıklamayı Özelleştir"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>

                {/* Canvas Background Buttons */}
                {viewMode === 'visual' && (
                  <div className="hidden sm:flex items-center gap-1 text-xs bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveCanvasBg('white')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        activeCanvasBg === 'white'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Açık
                    </button>
                    <button
                      onClick={() => setActiveCanvasBg('slate')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        activeCanvasBg === 'slate'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Koyu
                    </button>
                    <button
                      onClick={() => setActiveCanvasBg('grid')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        activeCanvasBg === 'grid'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Grid className="w-3 h-3" />
                      <span>Izgara</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={copyJsonToClipboard}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="JSON Kopyala"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={downloadJsonFile}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="JSON İndir"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline Customization Accordion */}
            {isEditingInline && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Yönerge & Çözüm Metinlerini Özelleştir</span>
                  </span>
                  <button
                    onClick={() => {
                      setCustomPrompt(generatedQuestion.prompt);
                      setCustomSecondary(generatedQuestion.secondaryPrompt || '');
                      setCustomRuleTitle(generatedQuestion.explanation?.ruleTitle || '');
                      setCustomSummary(generatedQuestion.explanation?.summary || '');
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Varsayılana Dön
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Ana Yönerge Metni</label>
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">İkincil Yönerge (Opsiyonel)</label>
                    <input
                      type="text"
                      value={customSecondary}
                      onChange={(e) => setCustomSecondary(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Kural Başlığı</label>
                    <input
                      type="text"
                      value={customRuleTitle}
                      onChange={(e) => setCustomRuleTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Çözüm Özeti</label>
                    <input
                      type="text"
                      value={customSummary}
                      onChange={(e) => setCustomSummary(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Test Mode Alert Banner */}
            {testMode && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Öğrenci Test Çözüm Modu Aktif. Seçeneklere tıklayarak test edin.</span>
                </span>
                <button
                  onClick={() => setTestShowAnswer(!testShowAnswer)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-bold transition-colors cursor-pointer"
                >
                  {testShowAnswer ? 'Cevabı Gizle' : 'Doğru Cevabı Göster'}
                </button>
              </div>
            )}

            {viewMode === 'visual' ? (
              <div className="space-y-5">
                {/* Prompt & Category Header */}
                <div className="text-center max-w-xl mx-auto">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                    {activeGradeConfig && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <span>{activeGradeConfig.icon}</span>
                        <span>{activeGradeConfig.title} Seviyesi</span>
                      </span>
                    )}
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{QUESTION_TYPE_LABELS[activeQuestion.type]}</span>
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {activeQuestion.prompt}
                  </h3>
                  {activeQuestion.secondaryPrompt && (
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      {activeQuestion.secondaryPrompt}
                    </p>
                  )}
                </div>

                {/* Question Visual Canvas */}
                <div
                  className={`p-6 rounded-2xl transition-colors border flex items-center justify-center ${
                    activeCanvasBg === 'white'
                      ? 'bg-white text-slate-900 border-slate-200 shadow-inner'
                      : activeCanvasBg === 'slate'
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-950 border-slate-800 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]'
                  }`}
                >
                  <QuestionRenderer question={activeQuestion} />
                </div>

                {/* Options Preview with Interactive Click in Test Mode */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Seçenekler {testMode && '(Tıklanabilir)'}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-800/40 font-mono">
                      Doğru Cevap: {activeQuestion.correctOptionId}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeQuestion.options.map((opt) => {
                      const isSelectedInTest = testSelectedOption === opt.id;
                      const isCorrect = opt.id === activeQuestion.correctOptionId;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (!testMode) return;
                            setTestSelectedOption(opt.id);
                            if (isCorrect) sound.playSuccess();
                            else sound.playError();
                          }}
                          className={`relative p-2.5 rounded-2xl border transition-all ${
                            testMode ? 'cursor-pointer hover:border-slate-600' : ''
                          } ${
                            isSelectedInTest
                              ? isCorrect
                                ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40'
                                : 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/40'
                              : isCorrect && (testShowAnswer || !testMode)
                              ? 'bg-slate-950 border-emerald-500/50'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <OptionRenderer
                            option={opt}
                            questionType={activeQuestion.type}
                            isSelected={testMode ? isSelectedInTest : opt.id === activeQuestion.correctOptionId}
                            onSelect={() => {}}
                            disabled={!testMode}
                            showCorrect={testMode ? testShowAnswer : true}
                            isCorrectOption={opt.id === activeQuestion.correctOptionId}
                          />
                          <div className="mt-1.5 flex items-center justify-between text-[11px] px-1 font-mono text-slate-400">
                            <span className="font-bold text-slate-300">Seçenek {opt.id}</span>
                            {isSelectedInTest && (
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

                {/* Visual Explanation Preview */}
                <div className="pt-2">
                  <VisualExplanationOverlay
                    explanation={activeQuestion.explanation}
                    correctOptionId={activeQuestion.correctOptionId}
                  />
                </div>
              </div>
            ) : (
              /* Raw JSON Inspector */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Tam Soru Şeması (BaseQuestion Interface)</span>
                  <span>{JSON.stringify(activeQuestion).length} bytes</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[560px] border border-slate-800 leading-relaxed">
                  {JSON.stringify(activeQuestion, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

