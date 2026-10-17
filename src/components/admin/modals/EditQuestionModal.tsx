import React, { useState } from 'react';
import { Edit3, X } from 'lucide-react';
import { BaseQuestion, CognitiveCategory, DifficultyLevel, ALL_COGNITIVE_CATEGORIES, COGNITIVE_CATEGORY_LABELS, DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../../../types';
import { ALL_GRADES } from '../../../features/questions/grade-config';
import { CATEGORY_ICONS } from '../constants';
import { questionBankService } from '../../../services/question-bank-service';
import { sound } from '../../../lib/sound';

interface EditQuestionModalProps {
  question: BaseQuestion;
  onClose: () => void;
  onSaved: (q: BaseQuestion) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  onClose,
  onSaved,
}) => {
  const [targetGrade, setTargetGrade] = useState<1 | 2 | 3 | 4>(
    (question.targetGrade || 1) as 1 | 2 | 3 | 4
  );
  const [category, setCategory] = useState<CognitiveCategory>(question.category);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(question.difficulty);
  const [prompt, setPrompt] = useState<string>(question.prompt);
  const [secondaryPrompt, setSecondaryPrompt] = useState<string>(question.secondaryPrompt || '');
  const [summary, setSummary] = useState<string>(question.explanation.summary);
  const [correctOptionId, setCorrectOptionId] = useState<string>(question.correctOptionId);

  const handleUpdate = () => {
    sound.playSuccess();
    const updated = questionBankService.updateQuestion(question.id, {
      targetGrade,
      targetGrades: [targetGrade],
      category,
      difficulty,
      prompt,
      secondaryPrompt: secondaryPrompt.trim() !== '' ? secondaryPrompt : undefined,
      correctOptionId,
      explanation: {
        ...question.explanation,
        summary,
      },
    });

    if (updated) {
      onSaved(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Soruyu Düzenle (#{question.id.replace('q_', '')})
              </h3>
              <p className="text-xs text-slate-500">
                Sınıf düzeyi, kategori, zorluk ve metin alanlarını güncelleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Hedef Sınıf Düzeyi:</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTargetGrade(g)}
                  className={`p-2 rounded-xl border font-bold cursor-pointer transition-all ${
                    targetGrade === g
                      ? 'bg-purple-600 text-white border-purple-600 '
                      : 'bg-slate-50 text-slate-700 border-zinc-200'
                  }`}
                >
                  {g}. Sınıf
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Bilişsel Kategori:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CognitiveCategory)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
            >
              {ALL_COGNITIVE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {COGNITIVE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Zorluk Derecesi (1-6):</label>
            <div className="grid grid-cols-6 gap-1">
              {([1, 2, 3, 4, 5, 6] as DifficultyLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`py-1.5 rounded-xl border font-bold text-center cursor-pointer transition-all ${
                    difficulty === lvl
                      ? `${DIFFICULTY_COLORS[lvl]} border-current `
                      : 'bg-slate-50 text-slate-700 border-zinc-200'
                  }`}
                >
                  {lvl} - {DIFFICULTY_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Soru Metni (Prompt):</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Alt Yönerge / İpucu:</label>
            <input
              type="text"
              value={secondaryPrompt}
              onChange={(e) => setSecondaryPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Doğru Seçenek:</label>
            <div className="flex gap-2">
              {['A', 'B', 'C', 'D'].map((optId) => (
                <button
                  key={optId}
                  type="button"
                  onClick={() => setCorrectOptionId(optId)}
                  className={`flex-1 py-1.5 rounded-xl border font-bold cursor-pointer ${
                    correctOptionId === optId
                      ? 'bg-emerald-600 text-white border-emerald-600 '
                      : 'bg-slate-50 text-slate-700 border-zinc-200'
                  }`}
                >
                  Seçenek {optId}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Çözüm Özeti:</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer "
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
