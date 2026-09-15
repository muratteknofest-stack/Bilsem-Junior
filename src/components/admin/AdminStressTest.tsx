import React, { useState } from 'react';
import { QuestionType, DifficultyLevel, QUESTION_TYPE_LABELS } from '../../types';
import { ALL_QUESTION_TYPES, generateQuestionByType } from '../../features/questions/generators';
import { validateQuestion } from '../../features/questions/validator';
import { sound } from '../../lib/sound';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Search,
  Timer,
  Activity,
  Layers,
  ExternalLink,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface EngineTestRecord {
  type: QuestionType;
  label: string;
  category: string;
  testedCount: number;
  passedCount: number;
  failedCount: number;
  totalTimeMs: number;
  avgTimeMs: number;
  isValid: boolean;
  errors: string[];
}

interface AdminStressTestProps {
  onInspectType: (type: QuestionType) => void;
}

export const AdminStressTest: React.FC<AdminStressTestProps> = ({ onInspectType }) => {
  const [testScale, setTestScale] = useState<18 | 54 | 100 | 180>(54);
  const [isRunning, setIsRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<EngineTestRecord[] | null>(null);
  const [summary, setSummary] = useState<{
    totalTested: number;
    totalPassed: number;
    totalFailed: number;
    elapsedMs: number;
    avgMs: number;
  } | null>(null);

  const runMultiEngineTest = (scale = testScale) => {
    sound.playClick();
    setIsRunning(true);
    setProgressPercent(10);

    setTimeout(() => {
      const startTime = performance.now();

      // Initialize map for all 18 types
      const engineMap = new Map<QuestionType, {
        tested: number;
        passed: number;
        failed: number;
        time: number;
        errors: string[];
        category: string;
      }>();

      ALL_QUESTION_TYPES.forEach((t) => {
        engineMap.set(t, { tested: 0, passed: 0, failed: 0, time: 0, errors: [], category: '' });
      });

      let passedTotal = 0;
      let failedTotal = 0;

      for (let i = 0; i < scale; i++) {
        const type = ALL_QUESTION_TYPES[i % ALL_QUESTION_TYPES.length];
        const seed = 300000 + i * 4919;
        const diff = ((i % 6) + 1) as DifficultyLevel;

        const qStart = performance.now();
        const entry = engineMap.get(type)!;
        entry.tested++;

        try {
          const q = generateQuestionByType(type, seed, diff);
          entry.category = q.category;
          const validation = validateQuestion(q);
          const qElapsed = performance.now() - qStart;
          entry.time += qElapsed;

          if (validation.isValid) {
            entry.passed++;
            passedTotal++;
          } else {
            entry.failed++;
            failedTotal++;
            validation.errors.forEach((e) => entry.errors.push(e.message));
          }
        } catch (err: any) {
          entry.failed++;
          failedTotal++;
          entry.errors.push(err?.message || 'Bilinmeyen motor hatası');
        }
      }

      const endTime = performance.now();
      const totalElapsed = Math.round(endTime - startTime);

      const computedRecords: EngineTestRecord[] = ALL_QUESTION_TYPES.map((type) => {
        const data = engineMap.get(type)!;
        const avg = data.tested > 0 ? +(data.time / data.tested).toFixed(1) : 0;
        return {
          type,
          label: QUESTION_TYPE_LABELS[type],
          category: data.category || 'bilişsel',
          testedCount: data.tested,
          passedCount: data.passed,
          failedCount: data.failed,
          totalTimeMs: Math.round(data.time),
          avgTimeMs: avg,
          isValid: data.failed === 0,
          errors: data.errors,
        };
      });

      setRecords(computedRecords);
      setSummary({
        totalTested: scale,
        totalPassed: passedTotal,
        totalFailed: failedTotal,
        elapsedMs: totalElapsed,
        avgMs: +(totalElapsed / scale).toFixed(1),
      });

      setProgressPercent(100);
      setIsRunning(false);
      sound.playLevelUp();
    }, 60);
  };

  const filteredRecords = records
    ? records.filter(
        (r) =>
          r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-extrabold text-slate-900">
                18 Prosedürel Motor Kalite Güvence & Stres Laboratuvarı
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tüm soru üreteçlerini deterministik tohumlarla eş zamanlı test edin; kanonik kuralları, gecikmeleri ve görsel benzersizliği doğrulayın.
            </p>
          </div>

          {/* Test Scale Selector & Launch Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                disabled={isRunning}
                onClick={() => setTestScale(18)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  testScale === 18 ? 'bg-white text-purple-700 ' : 'text-slate-600'
                }`}
              >
                18 Soru (1x)
              </button>
              <button
                disabled={isRunning}
                onClick={() => setTestScale(54)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  testScale === 54 ? 'bg-white text-purple-700 ' : 'text-slate-600'
                }`}
              >
                54 Soru (3x)
              </button>
              <button
                disabled={isRunning}
                onClick={() => setTestScale(100)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  testScale === 100 ? 'bg-white text-purple-700 ' : 'text-slate-600'
                }`}
              >
                100 Soru
              </button>
              <button
                disabled={isRunning}
                onClick={() => setTestScale(180)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  testScale === 180 ? 'bg-white text-purple-700 ' : 'text-slate-600'
                }`}
              >
                180 Soru (10x)
              </button>
            </div>

            <button
              onClick={() => runMultiEngineTest()}
              disabled={isRunning}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm  transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Test Ediliyor...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Testi Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar (Visible during and right after run) */}
        {isRunning && (
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono font-bold text-purple-700">
              <span>Motorlar taranıyor...</span>
              <span>Lütfen bekleyin</span>
            </div>
            <div className="w-full h-2 rounded-full bg-purple-100 overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards (When test has completed) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 ">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Test Edilen
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {summary.totalTested} Soru
            </div>
            <span className="text-[10px] text-purple-600 font-bold">18 Motor Kapsandı</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 ">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Başarılı (Doğrulandı)
            </span>
            <div className="text-xl font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{summary.totalPassed}</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">
              %{Math.round((summary.totalPassed / summary.totalTested) * 100)} Başarı Oranı
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 ">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Hatalı / Kural İhlali
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {summary.totalFailed}
            </div>
            <span className="text-[10px] text-slate-400 font-bold">0 Tolerans</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 ">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Toplam Çalışma Süresi
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-1 font-mono">
              <Timer className="w-4 h-4 text-slate-400" />
              <span>{summary.elapsedMs} ms</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">Anlık Üretim</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 ">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Ortalama Gecikme
            </span>
            <div className="text-xl font-extrabold text-indigo-700 mt-1 flex items-center gap-1 font-mono">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{summary.avgMs} ms/soru</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold">Ultra Yüksek Hız</span>
          </div>
        </div>
      )}

      {/* Results Table & Search */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              18 Motor Detaylı Tanı & Doğrulama Tablosu
            </h3>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Motor veya kategori ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {records ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Motor Adı</th>
                  <th className="py-3 px-3">Bilişsel Alan</th>
                  <th className="py-3 px-3 text-center">Test Adedi</th>
                  <th className="py-3 px-3 text-center">Başarılı / Hatalı</th>
                  <th className="py-3 px-3 text-center">Ort. Hız (ms)</th>
                  <th className="py-3 px-3 text-center">Kural Durumu</th>
                  <th className="py-3 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec, index) => (
                  <tr key={rec.type} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="font-bold">{rec.label}</div>
                      <div className="text-[10px] font-mono text-slate-400">{rec.type}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px]">
                        {rec.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {rec.testedCount}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-emerald-700 font-bold font-mono">
                        {rec.passedCount}
                      </span>
                      {rec.failedCount > 0 && (
                        <span className="text-rose-600 font-bold font-mono ml-1">
                          / {rec.failedCount} hata
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                      {rec.avgTimeMs} ms
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rec.isValid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tam Uyumlu</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Hata Tespit</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          sound.playClick();
                          onInspectType(rec.type);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Stüdyoda İncele</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Cpu className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-medium">Henüz kapsamlı stres testi çalıştırılmadı.</p>
            <button
              onClick={() => runMultiEngineTest(54)}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer "
            >
              54 Soruluk Doğrulama Testini Başlat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
