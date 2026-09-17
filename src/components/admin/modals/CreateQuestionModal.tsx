import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, GraduationCap, Brain, Target, Shuffle, ChevronUp, ChevronDown, Eye, Check } from 'lucide-react';
import { BaseQuestion, CognitiveCategory, DifficultyLevel, QuestionType, QUESTION_TYPE_LABELS, COGNITIVE_CATEGORY_LABELS, DIFFICULTY_LABELS, DIFFICULTY_COLORS, ALL_COGNITIVE_CATEGORIES } from '../../../types';
import { GRADE_CONFIGS, ALL_GRADES } from '../../../features/questions/grade-config';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants';
import { CATEGORY_TYPES_MAP, ALL_QUESTION_TYPES, generateQuestionByType } from '../../../features/questions/generators';
import { questionBankService, CreateQuestionPayload } from '../../../services/question-bank-service';
import { QuestionRenderer } from '../../../features/questions/renderers/QuestionRenderer';
import { OptionRenderer } from '../../../features/questions/renderers/OptionRenderer';
import { sound } from '../../../lib/sound';

interface CreateQuestionModalProps {
  initialGrade: 1 | 2 | 3 | 4;
  initialCategory: CognitiveCategory;
  initialDifficulty: DifficultyLevel;
  onClose: () => void;
  onCreated: (q: BaseQuestion) => void;
}

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  initialGrade,
  initialCategory,
  initialDifficulty,
  onClose,
  onCreated,
}) => {
  const [targetGrade, setTargetGrade] = useState<1 | 2 | 3 | 4>(initialGrade);
  const [category, setCategory] = useState<CognitiveCategory>(initialCategory);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 900000) + 100000);

  const categoryTypes = useMemo(() => {
    return CATEGORY_TYPES_MAP[category] || ['matrix_2x2'];
  }, [category]);

  const [selectedType, setSelectedType] = useState<QuestionType>(categoryTypes[0]);

  useEffect(() => {
    if (!categoryTypes.includes(selectedType)) {
      setSelectedType(categoryTypes[0]);
    }
  }, [category, categoryTypes]);

  const liveQuestion = useMemo(() => {
    try {
      const q = generateQuestionByType(selectedType, seed, difficulty);
      q.targetGrade = targetGrade;
      q.targetGrades = [targetGrade];
      q.category = category;
      q.estimatedSeconds = GRADE_CONFIGS[targetGrade].timeLimitSeconds;
      return q;
    } catch (err) {
      console.error('Failed to generate preview question', err);
      return generateQuestionByType('visual_sequence', seed, 2);
    }
  }, [selectedType, seed, difficulty, targetGrade, category]);

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customSecondaryPrompt, setCustomSecondaryPrompt] = useState<string>('');
  const [customSummary, setCustomSummary] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    setCustomPrompt(liveQuestion.prompt);
    setCustomSecondaryPrompt(liveQuestion.secondaryPrompt || '');
    setCustomSummary(liveQuestion.explanation.summary);
  }, [liveQuestion.id]);

  const activeGradeCfg = GRADE_CONFIGS[targetGrade];

  const handleRandomizeSeed = () => {
    sound.playClick();
    setSeed(Math.floor(Math.random() * 900000) + 100000);
  };

  const handleSave = () => {
    sound.playSuccess();
    const payload: CreateQuestionPayload = {
      targetGrade,
      category,
      difficulty,
      type: selectedType,
      seed,
      prompt: customPrompt.trim() !== '' ? customPrompt : liveQuestion.prompt,
      secondaryPrompt: customSecondaryPrompt.trim() !== '' ? customSecondaryPrompt : undefined,
      correctOptionId: liveQuestion.correctOptionId,
      customExplanationSummary:
        customSummary.trim() !== '' ? customSummary : liveQuestion.explanation.summary,
    };

    const created = questionBankService.addQuestion(payload);
    onCreated(created);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Yeni BİLSEM Sorusu Ekle & Yapılandır
              </h3>
              <p className="text-xs text-slate-500">
                Sınıf düzeyi, bilişsel kategori ve zorluk derecesini belirleyip soruyu canlı önizleyin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span>1. Hedef Sınıf Düzeyi</span>
                </label>
                <span className="text-[11px] font-bold text-purple-700">
                  {activeGradeCfg.stageName} ({activeGradeCfg.timeLimitSeconds} sn)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALL_GRADES.map((g) => {
                  const cfg = GRADE_CONFIGS[g];
                  const isSelected = targetGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setTargetGrade(g);
                        if (!cfg.difficultyRange.includes(difficulty)) {
                          setDifficulty(cfg.defaultDifficulty);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isSelected
                          ? `${cfg.badgeBg} ${cfg.badgeColor} border-current scale-102`
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <span>{cfg.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span>2. Bilişsel Kategori</span>
                </label>
                <span className="text-[11px] font-bold text-indigo-700">
                  {COGNITIVE_CATEGORY_LABELS[category]}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_COGNITIVE_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  const theme = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setCategory(cat);
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                        isSelected
                          ? `${theme.bg} ${theme.text} border-current `
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-[11px] leading-tight line-clamp-1">
                        {COGNITIVE_CATEGORY_LABELS[cat]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>3. Zorluk Derecesi</span>
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  {targetGrade}. Sınıf İçin Önerilen: Seviye {activeGradeCfg.difficultyRange.join(' - ')}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => {
                  const isSelected = difficulty === lvl;
                  const isRec = activeGradeCfg.difficultyRange.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDifficulty(lvl);
                      }}
                      className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer flex flex-col items-center ${
                        isSelected
                          ? `${DIFFICULTY_COLORS[lvl]} border-current scale-102`
                          : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm font-black">{lvl}</span>
                      <span className="text-[9px] leading-tight opacity-80">
                        {DIFFICULTY_LABELS[lvl]}
                      </span>
                      {isRec && <span className="text-[8px] text-purple-600 font-bold">⭐</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  4. Soru Motoru / Türü
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    sound.playClick();
                    setSelectedType(e.target.value as QuestionType);
                  }}
                  className="w-full p-2 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                >
                  <optgroup label={`${COGNITIVE_CATEGORY_LABELS[category]} Motorları`}>
                    {categoryTypes.map((t) => (
                      <option key={t} value={t}>
                        ⭐ {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Diğer 18 Motor">
                    {ALL_QUESTION_TYPES.filter((t) => !categoryTypes.includes(t)).map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Deterministik Tohum (RNG)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value) || 100000)}
                    className="w-full p-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeSeed}
                    title="Rastgele yeni varyant tohumu üret"
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer shrink-0 transition-colors"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showAdvanced ? 'Özel Metin Ayarlarını Gizle' : 'Özel Yönerge & Metinleri Düzenle'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 bg-slate-50 p-3 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Soru Ana Yönergesi (Prompt):
                    </label>
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Alt Yönerge / İpucu (İsteğe Bağlı):
                    </label>
                    <input
                      type="text"
                      value={customSecondaryPrompt}
                      placeholder="Örn: Soru işareti yerine gelecek şekli bulunuz."
                      onChange={(e) => setCustomSecondaryPrompt(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Pedagojik Çözüm Açıklaması:
                    </label>
                    <textarea
                      rows={2}
                      value={customSummary}
                      onChange={(e) => setCustomSummary(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-zinc-200 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span>Canlı Önizleme Tuvali</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Doğru Cevap: {liveQuestion.correctOptionId}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center mb-3">
                <h4 className="text-xs font-bold text-slate-900">
                  {customPrompt || liveQuestion.prompt}
                </h4>
                {(customSecondaryPrompt || liveQuestion.secondaryPrompt) && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {customSecondaryPrompt || liveQuestion.secondaryPrompt}
                  </p>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-zinc-200 mb-3 flex items-center justify-center min-h-[160px]">
                <div className="w-full max-w-[280px]">
                  <QuestionRenderer question={liveQuestion} />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Seçenekler & Doğru Cevap:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {liveQuestion.options.map((opt) => {
                    const isCorrect = opt.id === liveQuestion.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-1.5 rounded-xl border text-center transition-all ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                            : 'bg-white border-zinc-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold mb-1 flex items-center justify-center gap-1">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.id}
                          </span>
                          {isCorrect && <Check className="w-3 h-3 text-emerald-600" />}
                        </div>
                        <div className="h-12 flex items-center justify-center pointer-events-none scale-75">
                          <OptionRenderer option={opt} questionType={selectedType} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Havuza Kaydet & Yayınla</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
