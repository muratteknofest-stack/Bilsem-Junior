import React, { useState } from 'react';
import { QuestionType, DifficultyLevel, BaseQuestion, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../../types';
import { generateQuestionByType, ALL_QUESTION_TYPES } from '../../features/questions/generators';
import { validateQuestion, QuestionValidationResult } from '../../features/questions/validator';
import { GRADE_CONFIGS, ALL_GRADES, GradeLevelConfig } from '../../features/questions/grade-config';
import { QuestionRenderer } from '../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../features/questions/renderers/OptionRenderer';
import { VisualExplanationOverlay } from '../../features/questions/renderers/VisualExplanationOverlay';
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
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeCanvasBg, setActiveCanvasBg] = useState<'white' | 'slate' | 'grid'>('white');
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

  // Find initial grade from difficulty & type
  const detectGrade = (): 1 | 2 | 3 | 4 => {
    if (difficulty <= 2) return 1;
    if (difficulty === 3) return 2;
    if (difficulty === 4) return 3;
    return 4;
  };

  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | 4 | 'custom'>(detectGrade());

  // Real-time validation audit
  const validationResult: QuestionValidationResult = validateQuestion(generatedQuestion);

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

  const copyJsonToClipboard = () => {
    sound.playClick();
    const jsonStr = JSON.stringify(generatedQuestion, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadJsonFile = () => {
    sound.playClick();
    const jsonStr = JSON.stringify(generatedQuestion, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question_${generatedQuestion.type}_seed_${generatedQuestion.seed}.json`;
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
      {/* Studio Top Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Configuration & Quality Auditor */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Parametre Kontrolleri</span>
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                18 Motor
              </span>
            </div>

            {/* Grade Level Selector & Grouping */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span>Hedef Sınıf Düzeyi</span>
                </label>
                <span className="text-[10px] font-bold text-purple-700">
                  {selectedGrade !== 'custom' ? GRADE_CONFIGS[selectedGrade].title : 'Serbest'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ALL_GRADES.map((g) => {
                  const cfg = GRADE_CONFIGS[g];
                  const isSelected = selectedGrade === g;
                  return (
                    <button
                      key={g}
                      onClick={() => handleSelectGrade(g)}
                      className={`py-1.5 px-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center flex flex-col items-center gap-0.5 ${
                        isSelected
                          ? `${cfg.badgeBg} ${cfg.badgeColor} border-current  scale-102`
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
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
                <div className={`mt-2 p-2.5 rounded-xl ${activeGradeConfig.badgeBg} border ${activeGradeConfig.cardBorder} space-y-1 text-xs`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className={activeGradeConfig.badgeColor}>{activeGradeConfig.stageName}</span>
                    <span className="text-[10px] font-mono bg-white/80 px-1.5 py-0.5 rounded-md text-slate-700">
                      Süre: {activeGradeConfig.timeLimitSeconds}sn
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {activeGradeConfig.pedagogicalFocus}
                  </p>
                </div>
              )}
            </div>

            {/* Question Type Selector with Grade Recommendations */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Soru Türü & Motor
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  const t = e.target.value as QuestionType;
                  onTypeChange(t);
                  onGenerate(t, seed, difficulty);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
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
                <label className="text-xs font-bold text-slate-700">
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
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleRandomize}
                  title="Rastgele Tohum Üret"
                  className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 cursor-pointer transition-colors"
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
                        : 'bg-slate-50 text-slate-600 border-zinc-200 hover:bg-slate-100'
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
                <label className="text-xs font-bold text-slate-700">
                  Zorluk Derecesi
                </label>
                <span className="text-xs font-bold text-purple-700">
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
                        ? 'bg-purple-600 text-white border-purple-600  scale-105'
                        : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate & Re-render Action */}
            <button
              onClick={() => {
                sound.playClick();
                onGenerate();
              }}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm  transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Yeniden Üret ve Doğrula</span>
            </button>
          </div>

          {/* Real-time Quality Gate Validation Audit Card */}
          <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Kanonik Kural Denetimi</span>
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  validationResult.isValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {validationResult.isValid ? 'Tam Uyumlu (%100)' : 'Uyarı Tespit Edildi'}
              </span>
            </div>

            <div className="space-y-1.5 font-medium text-slate-600">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span>Deterministik Tohum & ID Bütünlüğü</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span>Seçenek Benzersizliği (Parmak İzi)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span>Tekil Doğru Cevap ({generatedQuestion.correctOptionId})</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span>Pedagojik Çözüm Adımları ({generatedQuestion.explanation.steps.length} adım)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            </div>

            {/* Any validation errors */}
            {!validationResult.isValid && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
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

          {/* Technical Metadata Card */}
          <div className="bg-white rounded-xl p-5 border border-zinc-200  space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">Teknik Üretim Detayları</h4>
            <div className="space-y-1 font-mono text-[11px] text-slate-600">
              <div className="flex justify-between border-b border-zinc-200 pb-1">
                <span>Soru ID:</span>
                <span className="text-purple-700 font-bold truncate max-w-[170px]">{generatedQuestion.id}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 py-1">
                <span>Bilişsel Kategori:</span>
                <span className="text-indigo-700 font-bold">{generatedQuestion.category}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 py-1">
                <span>Doğru Seçenek:</span>
                <span className="text-emerald-700 font-bold">Seçenek {generatedQuestion.correctOptionId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Display Modu:</span>
                <span className="text-slate-800 font-bold">{generatedQuestion.visualConfig?.displayMode || 'canvas'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live SVG Rendering Canvas & JSON Inspector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
            {/* View Mode & Canvas Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
              {/* Tab: Visual vs JSON */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'visual'
                      ? 'bg-white text-purple-700 '
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Görsel SVG İnceleme</span>
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'json'
                      ? 'bg-white text-purple-700 '
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>JSON Şeması</span>
                </button>
              </div>

              {/* Canvas Background and Export Actions */}
              <div className="flex items-center gap-2">
                {viewMode === 'visual' && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">Tuval:</span>
                    <button
                      onClick={() => setActiveCanvasBg('white')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        activeCanvasBg === 'white'
                          ? 'bg-white border-purple-500 text-purple-700'
                          : 'bg-slate-50 border-zinc-200 text-slate-600'
                      }`}
                    >
                      Beyaz
                    </button>
                    <button
                      onClick={() => setActiveCanvasBg('slate')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        activeCanvasBg === 'slate'
                          ? 'bg-slate-100 border-purple-500 text-purple-700'
                          : 'bg-slate-50 border-zinc-200 text-slate-600'
                      }`}
                    >
                      Gri
                    </button>
                    <button
                      onClick={() => setActiveCanvasBg('grid')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        activeCanvasBg === 'grid'
                          ? 'bg-purple-50 border-purple-500 text-purple-700'
                          : 'bg-slate-50 border-zinc-200 text-slate-600'
                      }`}
                    >
                      <Grid className="w-3 h-3" />
                      <span>Izgara</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={copyJsonToClipboard}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="JSON Kopyala"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>

                <button
                  onClick={downloadJsonFile}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="JSON İndir"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">İndir</span>
                </button>
              </div>
            </div>

            {viewMode === 'visual' ? (
              <div className="space-y-4">
                {/* Prompt & Category Header */}
                <div className="text-center max-w-xl mx-auto">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                    {activeGradeConfig && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeGradeConfig.badgeBg} ${activeGradeConfig.badgeColor}`}>
                        <span>{activeGradeConfig.icon}</span>
                        <span>{activeGradeConfig.title} Seviyesi</span>
                      </span>
                    )}
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      <span>{QUESTION_TYPE_LABELS[generatedQuestion.type]}</span>
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {generatedQuestion.prompt}
                  </h3>
                  {generatedQuestion.secondaryPrompt && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      {generatedQuestion.secondaryPrompt}
                    </p>
                  )}
                </div>

                {/* Question Visual Canvas with Custom Background */}
                <div
                  className={`p-4 rounded-xl transition-colors border ${
                    activeCanvasBg === 'white'
                      ? 'bg-white border-zinc-200'
                      : activeCanvasBg === 'slate'
                      ? 'bg-slate-100 border-slate-300'
                      : 'bg-slate-50 border-purple-200 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]'
                  }`}
                >
                  <QuestionRenderer question={generatedQuestion} />
                </div>

                {/* Options Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Üretilen Seçenekler & Görsel Parmak İzi
                    </span>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Doğru Cevap: {generatedQuestion.correctOptionId}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {generatedQuestion.options.map((opt) => (
                      <div key={opt.id} className="relative group">
                        <OptionRenderer
                          option={opt}
                          isSelected={opt.id === generatedQuestion.correctOptionId}
                          onSelect={() => {}}
                          disabled={true}
                          showCorrect={true}
                          isCorrectOption={opt.id === generatedQuestion.correctOptionId}
                        />
                        <div className="mt-1 text-[10px] text-center font-mono text-slate-400 truncate">
                          FP: {opt.fingerprint.slice(0, 16)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Explanation Preview */}
                <div className="pt-2">
                  <VisualExplanationOverlay
                    explanation={generatedQuestion.explanation}
                    correctOptionId={generatedQuestion.correctOptionId}
                  />
                </div>
              </div>
            ) : (
              /* Raw JSON Inspector */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Tam Soru Şeması (BaseQuestion Interface)</span>
                  <span>{JSON.stringify(generatedQuestion).length} bytes</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[560px] border border-slate-800 leading-relaxed">
                  {JSON.stringify(generatedQuestion, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
