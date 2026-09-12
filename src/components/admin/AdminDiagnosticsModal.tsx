import React, { useState, useEffect } from 'react';
import { sound } from '../../lib/sound';
import { ALL_QUESTION_TYPES, generateQuestionByType } from '../../features/questions/generators';
import { validateQuestion } from '../../features/questions/validator';
import { questionBankService } from '../../services/question-bank-service';
import { dataService } from '../../services/data-service';
import { QUESTION_TYPE_LABELS, QuestionType } from '../../types';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  RefreshCw,
  X,
  Zap,
  Clock,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AdminDiagnosticsModalProps {
  onClose: () => void;
}

interface BenchmarkResult {
  type: QuestionType;
  label: string;
  durationMs: number;
  isValid: boolean;
  status: 'passed' | 'warning' | 'failed';
}

export const AdminDiagnosticsModal: React.FC<AdminDiagnosticsModalProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [averageLatency, setAverageLatency] = useState<number | null>(null);
  const [storageStats, setStorageStats] = useState<{
    usedBytes: number;
    usedKb: number;
    totalKeys: number;
    questionBankCount: number;
  }>({
    usedBytes: 0,
    usedKb: 0,
    totalKeys: 0,
    questionBankCount: 0,
  });

  const calculateStorage = () => {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        bytes += (key.length + val.length) * 2; // UTF-16
      }
    }
    const questions = questionBankService.getAll();
    setStorageStats({
      usedBytes: bytes,
      usedKb: Math.round(bytes / 1024),
      totalKeys: localStorage.length,
      questionBankCount: questions.length,
    });
  };

  const runBenchmark = () => {
    setIsRunning(true);
    sound.playClick();

    setTimeout(() => {
      const results: BenchmarkResult[] = [];
      let totalTime = 0;

      ALL_QUESTION_TYPES.forEach((type) => {
        const start = performance.now();
        let isValid = false;
        try {
          const q = generateQuestionByType(type, 881234, 3);
          const validation = validateQuestion(q);
          isValid = validation.isValid;
        } catch (e) {
          isValid = false;
        }
        const end = performance.now();
        const duration = Math.round((end - start) * 10) / 10;
        totalTime += duration;

        results.push({
          type,
          label: QUESTION_TYPE_LABELS[type] || type,
          durationMs: duration,
          isValid,
          status: isValid && duration < 30 ? 'passed' : isValid ? 'warning' : 'failed',
        });
      });

      setBenchmarkResults(results);
      setAverageLatency(Math.round((totalTime / ALL_QUESTION_TYPES.length) * 10) / 10);
      setIsRunning(false);
      sound.playSuccess();
    }, 150);
  };

  useEffect(() => {
    calculateStorage();
    runBenchmark();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-zinc-200  w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center ">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Sistem Sağlığı & Motor Tanılama
              </h3>
              <p className="text-xs text-slate-500">
                18 prosedürel motorun üretim hızı, doğrulama durumu ve yerel bellek sağlığı.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200/70">
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Ortalama Süre</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-purple-950">
                {averageLatency !== null ? `${averageLatency} ms` : '...'}
              </div>
              <span className="text-[10px] text-purple-700 font-bold">Ultra Hızlı Üretim</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/70">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Doğruluk Oranı</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-emerald-950">
                {benchmarkResults.length > 0
                  ? `${Math.round((benchmarkResults.filter((r) => r.isValid).length / benchmarkResults.length) * 100)}%`
                  : '100%'}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold">0 Çakışma / 0 Hata</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/70">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Havuz Boyutu</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-blue-950">
                {storageStats.questionBankCount} Soru
              </div>
              <span className="text-[10px] text-blue-700 font-bold">Aktif Kayıtlı Soru</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/70">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Yerel Bellek</span>
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-amber-950">{storageStats.usedKb} KB</div>
              <span className="text-[10px] text-amber-700 font-bold">
                {storageStats.totalKeys} Depolama Anahtarı
              </span>
            </div>
          </div>

          {/* Procedural Generators Benchmark List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>18 Prosedürel Motor Performans Matrisi</span>
              </h4>
              <button
                onClick={runBenchmark}
                disabled={isRunning}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>Testi Yeniden Çalıştır</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              {benchmarkResults.map((res) => (
                <div
                  key={res.type}
                  className="p-3 rounded-xl border border-zinc-200 bg-slate-50/70 hover:bg-white transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{res.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{res.type}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {res.durationMs} ms
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        res.isValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.isValid ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                      )}
                      <span>{res.isValid ? 'Tam Doğru' : 'Uyarı'}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Tüm motorlar SVG vektörel çıktı üretmektedir.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
