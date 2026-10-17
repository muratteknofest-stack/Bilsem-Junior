import React from 'react';
import { BaseQuestion, QUESTION_TYPE_LABELS, DIFFICULTY_COLORS, COGNITIVE_CATEGORY_LABELS } from '../../../types';
import { GRADE_CONFIGS } from '../../../features/questions/grade-config';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { CheckSquare, Square, Eye, Edit3, ExternalLink, Trash2, Play } from 'lucide-react';
import { sound } from '../../../lib/sound';

interface AdminQuestionTableRowProps {
  q: BaseQuestion;
  isSelected: boolean;
  toggleSelectQuestion: (id: string) => void;
  setActiveQuestion: (q: BaseQuestion) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  setActiveSimulatorQuestion: (q: BaseQuestion) => void;
  setIsEditModalOpen: (open: boolean) => void;
  onInspectInStudio: (type: any, seed: number, difficulty: any) => void;
  handleDelete: (id: string, prompt: string) => void;
}

export const AdminQuestionTableRow: React.FC<AdminQuestionTableRowProps> = ({
  q, isSelected, toggleSelectQuestion, setActiveQuestion, setIsDetailModalOpen,
  setActiveSimulatorQuestion, setIsEditModalOpen, onInspectInStudio, handleDelete
}) => {
  const grade = (q.targetGrade || 1) as 1 | 2 | 3 | 4;
  const gradeCfg = GRADE_CONFIGS[grade];
  const catTheme = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.visual_perception;

  return (
    <tr
      className={`transition-colors ${
        isSelected ? 'bg-purple-50/70' : 'hover:bg-slate-50/80'
      }`}
    >
      <td className="py-3 px-3 text-center">
        <button
          type="button"
          onClick={() => toggleSelectQuestion(q.id)}
          className="cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-purple-600" />
          ) : (
            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
          )}
        </button>
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${gradeCfg.badgeBg} ${gradeCfg.badgeColor}`}
        >
          <span>{gradeCfg.icon}</span>
          <span>{gradeCfg.title}</span>
        </span>
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${catTheme.pill}`}
        >
          <span>{CATEGORY_ICONS[q.category]}</span>
          <span>{COGNITIVE_CATEGORY_LABELS[q.category]}</span>
        </span>
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
            DIFFICULTY_COLORS[q.difficulty]
          }`}
        >
          Seviye {q.difficulty}
        </span>
      </td>

      <td className="py-3 px-4 max-w-xs">
        <div className="font-bold text-slate-900 truncate">{q.prompt}</div>
        {q.secondaryPrompt && (
          <div className="text-[11px] text-slate-400 truncate">
            {q.secondaryPrompt}
          </div>
        )}
      </td>

      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-semibold">
        {QUESTION_TYPE_LABELS[q.type]}
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
          {q.correctOptionId}
        </span>
      </td>

      <td className="py-3 px-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              sound.playClick();
              setActiveSimulatorQuestion(q);
            }}
            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer"
            title="Öğrenci Gibi Çöz (Simülatör)"
          >
            <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveQuestion(q);
              setIsDetailModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-zinc-200 cursor-pointer"
            title="İncele"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveQuestion(q);
              setIsEditModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-zinc-200 cursor-pointer"
            title="Düzenle"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onInspectInStudio(q.type, q.seed, q.difficulty)}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-zinc-200 cursor-pointer"
            title="Stüdyoda Aç"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(q.id, q.prompt)}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-zinc-200 cursor-pointer"
            title="Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
