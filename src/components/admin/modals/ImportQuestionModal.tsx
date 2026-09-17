import React, { useState } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { questionBankService } from '../../../services/question-bank-service';
import { sound } from '../../../lib/sound';

interface ImportQuestionModalProps {
  onClose: () => void;
  onImported: (count: number, rejectedCount?: number) => void;
}

export const ImportQuestionModal: React.FC<ImportQuestionModalProps> = ({
  onClose,
  onImported,
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    sound.playClick();
    if (!jsonText.trim()) {
      setError('Lütfen içe aktarılacak JSON içeriğini yapıştırın.');
      return;
    }

    const res = questionBankService.importQuestionsJson(jsonText);
    if (res.success) {
      sound.playSuccess();
      onImported(res.count, res.rejectedCount);
    } else {
      setError(res.error || 'İçe aktarma sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-zinc-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">JSON Soru İçe Aktar</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Daha önce dışa aktarılmış veya BİLSEM formatında hazırlanmış soru listesi JSON metnini buraya yapıştırın.
          </p>

          <textarea
            rows={8}
            placeholder='{ "questions": [ { "type": "matrix_2x2", "targetGrade": 2, ... } ] }'
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
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
            onClick={handleImport}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer "
          >
            Soruları İçe Aktar
          </button>
        </div>
      </div>
    </div>
  );
};
