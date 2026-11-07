import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { UserProfile, WeeklyQuestionProgressData, DayQuestionStats } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Award,
  CheckCircle2,
  Lightbulb,
  Play,
  X,
} from 'lucide-react';

interface WeeklyProgressChartCardProps {
  user: UserProfile;
  onStartPractice?: () => void;
  className?: string;
}

export const WeeklyProgressChartCard: React.FC<WeeklyProgressChartCardProps> = ({
  user,
  onStartPractice,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'daily_comparison' | 'four_weeks_trend'>('daily_comparison');
  const [selectedDay, setSelectedDay] = useState<DayQuestionStats | null>(null);

  const progressData: WeeklyQuestionProgressData = dataService.getWeeklyQuestionProgressData(user);
  const { summary, dailyStats, fourWeeksTrend, allTimeTotal } = progressData;

  const renderDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = dailyStats.find((d) => d.shortDay === label || d.dayName === label);
      const thisWeekVal = payload.find((p: any) => p.dataKey === 'thisWeek')?.value ?? 0;
      const lastWeekVal = payload.find((p: any) => p.dataKey === 'lastWeek')?.value ?? 0;
      const diff = thisWeekVal - lastWeekVal;

      return (
        <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg text-xs space-y-1.5 min-w-[170px] tabular-nums">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 font-bold">
            <span className="text-indigo-600 dark:text-indigo-400">
              {dataPoint?.dayName || label}
            </span>
            {dataPoint?.isToday && (
              <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                Bugün
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
              Bu Hafta:
            </span>
            <span className="font-extrabold text-sm">{thisWeekVal} Soru</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
              Geçen Hafta:
            </span>
            <span className="font-medium">{lastWeekVal} Soru</span>
          </div>
          <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-zinc-400">Haftalık Fark:</span>
            <span
              className={`font-bold ${
                diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-zinc-300'
              }`}
            >
              {diff > 0 ? `+${diff} Soru` : diff < 0 ? `${diff} Soru` : 'Eşit'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = fourWeeksTrend.find((w) => w.weekLabel === label || w.shortLabel === label);
      const total = payload[0]?.value ?? 0;
      const target = item?.targetGoal ?? 50;
      const reached = total >= target;

      return (
        <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg text-xs space-y-1.5 min-w-[160px] tabular-nums">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 font-bold">
            <span className="text-indigo-600 dark:text-indigo-400">{item?.weekLabel || label}</span>
            {item?.isCurrentWeek && (
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                Bu Hafta
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-zinc-400">Toplam Çözülen:</span>
            <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">{total} Soru</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
            <span>Haftalık Hedef:</span>
            <span>{target} Soru</span>
          </div>
          <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 text-[10px] flex items-center gap-1">
            {reached ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Hedefe Ulaşıldı
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                Hedefe {target - total} soru kaldı
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="progress-panel"
      className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 transition-colors ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>İlerleme ve Soru İstatistiği</span>
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-zinc-100">
            Haftalık Soru Çözüm Performansı
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
            Her gün çözdüğün soruları geçen haftayla karşılaştırarak bilişsel istikrarını ve gelişim hızını takip et.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 self-start md:self-auto shrink-0" role="group" aria-label="Haftalık grafik görünümü">
          <button
            type="button"
            aria-pressed={activeTab === 'daily_comparison'}
            onClick={() => {
              sound.playClick();
              setActiveTab('daily_comparison');
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'daily_comparison'
                ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bu Hafta vs. Geçen Hafta</span>
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'four_weeks_trend'}
            onClick={() => {
              sound.playClick();
              setActiveTab('four_weeks_trend');
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'four_weeks_trend'
                ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>4 Haftalık Trend</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-5 tabular-nums">
        {/* Card 1: Bu Hafta Çözülen Soru */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
          <div className="flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 font-bold mb-1">
            <span>Bu Hafta</span>
            <span
              className={`inline-flex items-center text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
                summary.direction === 'up'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : summary.direction === 'down'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
              }`}
            >
              {summary.direction === 'up' ? (
                <>
                  <TrendingUp className="w-3 h-3 mr-0.5" />+{summary.percentChange}%
                </>
              ) : summary.direction === 'down' ? (
                <>
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                  {summary.percentChange}%
                </>
              ) : (
                '0%'
              )}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-indigo-950 dark:text-indigo-100">
              {summary.thisWeekTotal}
            </strong>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Soru</span>
          </div>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1 font-medium">
            Geçen haftaya göre{' '}
            <strong>
              {summary.difference >= 0 ? `+${summary.difference}` : summary.difference} soru
            </strong>
          </p>
        </div>

        {/* Card 2: Geçen Hafta */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-1">Geçen Hafta Toplam</div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-zinc-100">
              {summary.lastWeekTotal}
            </strong>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Soru</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Önceki haftanın tamamı</p>
        </div>

        {/* Card 3: Toplam Çözülen Soru (Tüm Zamanlar) */}
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
          <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold mb-1">
            <span>Toplam Soru</span>
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-100">
              {allTimeTotal}
            </strong>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Soru</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 font-medium">Bilsem Junior genel toplamı</p>
        </div>

        {/* Card 4: Haftalık Hedef & Günlük Ortalama */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-1">
            <span>Haftalık Hedef (%{summary.targetCompletionRate})</span>
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100">
              {summary.thisWeekTotal} / {summary.weeklyTarget}
            </strong>
          </div>
          <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 h-2 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.targetCompletionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="bg-slate-50/80 dark:bg-zinc-800/40 rounded-xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="text-xs text-slate-600 dark:text-zinc-300">
            {activeTab === 'daily_comparison' ? (
              <span className="font-semibold text-slate-800 dark:text-zinc-200 flex flex-wrap items-center gap-1.5">
                <span>Gün Bazında Soru Çözümü:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Bu Hafta</span>
                <span>vs.</span>
                <span className="text-slate-500 dark:text-zinc-400 font-bold">Geçen Hafta</span>
              </span>
            ) : (
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                Son 4 Haftanın Çözülen Toplam Soru Trendi ve Hedef Çizgisi
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 tabular-nums">
            <span>Günlük Ort: <strong className="text-slate-800 dark:text-zinc-200">{summary.dailyAverage} soru</strong></span>
            <span>·</span>
            <span>En İyi Gün: <strong className="text-indigo-700 dark:text-indigo-300">{summary.bestDay.dayName} ({summary.bestDay.count})</strong></span>
          </div>
        </div>

        {/* Dynamic Recharts Rendering */}
        <div className="w-full h-64 sm:h-72">
          {activeTab === 'daily_comparison' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyStats}
                margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedDay(e.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" className="dark:stroke-zinc-700" />
                <XAxis
                  dataKey="shortDay"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={({ x, y, payload }) => {
                    const item = dailyStats.find((d) => d.shortDay === payload.value);
                    const isToday = item?.isToday;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={14}
                          textAnchor="middle"
                          fill={isToday ? '#6366f1' : '#64748b'}
                          fontSize={12}
                          fontWeight={isToday ? 800 : 600}
                        >
                          {payload.value}
                        </text>
                        {isToday && (
                          <circle cx={0} cy={22} r={2.5} fill="#6366f1" />
                        )}
                      </g>
                    );
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip content={renderDailyTooltip} cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  formatter={(value) => (
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      {value === 'thisWeek' ? 'Bu Hafta' : 'Geçen Hafta'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="lastWeek"
                  name="lastWeek"
                  fill="#94a3b8"
                  radius={[6, 6, 0, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="thisWeek"
                  name="thisWeek"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={fourWeeksTrend}
                margin={{ top: 16, right: 16, left: -16, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="questionTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" className="dark:stroke-zinc-700" />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip content={renderTrendTooltip} />
                <ReferenceLine
                  y={50}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Hedef: 50 Soru',
                    position: 'top',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalQuestions"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#questionTrendGradient)"
                  dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Selected Day Interaction Details Banner */}
        {selectedDay && activeTab === 'daily_comparison' && (
          <div className="mt-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs tabular-nums">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-indigo-950 dark:text-indigo-200">
                {selectedDay.dayName} Detayı:
              </span>
              <span className="text-slate-700 dark:text-zinc-300">
                Bu Hafta: <strong>{selectedDay.thisWeek} Soru</strong> · Geçen Hafta: <strong>{selectedDay.lastWeek} Soru</strong>
              </span>
              <span
                className={`font-extrabold px-1.5 py-0.5 rounded text-[11px] ${
                  selectedDay.thisWeek >= selectedDay.lastWeek
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                }`}
              >
                {selectedDay.thisWeek - selectedDay.lastWeek >= 0
                  ? `+${selectedDay.thisWeek - selectedDay.lastWeek} Soru`
                  : `${selectedDay.thisWeek - selectedDay.lastWeek} Soru`}
              </span>
            </div>
            <button
              type="button"
              aria-label="Gün detayını kapat"
              onClick={() => setSelectedDay(null)}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 font-bold rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Motivation & Quick Practice CTA */}
      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-400">
          <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4" />
          </span>
          <p className="leading-relaxed">
            <strong className="text-slate-800 dark:text-zinc-200">BİLSEM Tavsiyesi:</strong> Günde ortalama <strong className="tabular-nums">8–10 soru</strong> çözmek,
            zihinsel yorgunluk yaratmadan soru çözme refleksini en üst seviyede tutar.
          </p>
        </div>

        {onStartPractice && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onStartPractice();
            }}
            className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Soru Çöz ve Grafiği Yükselt</span>
          </button>
        )}
      </div>
    </div>
  );
};
