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
import { UserProfile, WeeklyQuestionProgressData, DayQuestionStats, PastWeekTrendItem } from '../types';
import { dataService } from '../services/data-service';
import { sound } from '../lib/sound';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Award,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  Flame,
  Play,
  HelpCircle,
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

  // Retrieve dynamic weekly stats
  const progressData: WeeklyQuestionProgressData = dataService.getWeeklyQuestionProgressData(user);
  const { summary, dailyStats, fourWeeksTrend, allTimeTotal } = progressData;

  // Custom Tooltip for Daily Comparison
  const renderDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = dailyStats.find((d) => d.shortDay === label || d.dayName === label);
      const thisWeekVal = payload.find((p: any) => p.dataKey === 'thisWeek')?.value ?? 0;
      const lastWeekVal = payload.find((p: any) => p.dataKey === 'lastWeek')?.value ?? 0;
      const diff = thisWeekVal - lastWeekVal;

      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl  border border-slate-700 text-xs space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
            <span className="text-amber-400 font-['Outfit',sans-serif]">
              {dataPoint?.dayName || label}
            </span>
            {dataPoint?.isToday && (
              <span className="bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                Bugün
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              Bu Hafta:
            </span>
            <span className="font-extrabold text-sm">{thisWeekVal} Soru</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
              Geçen Hafta:
            </span>
            <span className="font-medium text-slate-300">{lastWeekVal} Soru</span>
          </div>
          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Haftalık Fark:</span>
            <span
              className={`font-bold ${
                diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-300'
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

  // Custom Tooltip for 4-Weeks Trend
  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = fourWeeksTrend.find((w) => w.weekLabel === label || w.shortLabel === label);
      const total = payload[0]?.value ?? 0;
      const target = item?.targetGoal ?? 50;
      const reached = total >= target;

      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl  border border-slate-700 text-xs space-y-1.5 min-w-[160px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
            <span className="text-amber-400 font-['Outfit',sans-serif]">{item?.weekLabel || label}</span>
            {item?.isCurrentWeek && (
              <span className="bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                Bu Hafta
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Toplam Çözülen:</span>
            <span className="font-extrabold text-sm text-indigo-300">{total} Soru</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Haftalık Hedef:</span>
            <span>{target} Soru</span>
          </div>
          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-300 flex items-center gap-1">
            {reached ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Hedefe Ulaşıldı!
              </span>
            ) : (
              <span className="text-amber-400">
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
      className={`bg-white rounded-xl p-5 sm:p-6 border border-zinc-200  transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>İlerleme ve Soru İstatistiği</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Haftalık Karşılaştırma</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
            <span>Haftalık Soru Çözüm Performansı</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
              Bu Hafta: {summary.thisWeekTotal} Soru
            </span>
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Her gün çözdüğün soruları geçen haftayla karşılaştırarak bilişsel istikrarını ve gelişim hızını takip et.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-zinc-200 self-start md:self-auto shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('daily_comparison');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'daily_comparison'
                ? 'bg-white text-indigo-900 '
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bu Hafta vs. Geçen Hafta</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('four_weeks_trend');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'four_weeks_trend'
                ? 'bg-white text-indigo-900 '
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>4 Haftalık Trend</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-5">
        {/* Card 1: Bu Hafta Çözülen Soru */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/80">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-bold mb-1">
            <span>Bu Hafta</span>
            <span
              className={`inline-flex items-center text-[11px] font-extrabold px-1.5 py-0.2 rounded-md ${
                summary.direction === 'up'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : summary.direction === 'down'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-200 text-slate-700'
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
            <strong className="text-2xl sm:text-3xl font-black text-indigo-950 font-['Outfit',sans-serif]">
              {summary.thisWeekTotal}
            </strong>
            <span className="text-xs font-semibold text-indigo-700">Soru</span>
          </div>
          <p className="text-[11px] text-indigo-700 mt-1 font-medium">
            Geçen haftaya göre{' '}
            <strong>
              {summary.difference >= 0 ? `+${summary.difference}` : summary.difference} soru
            </strong>
          </p>
        </div>

        {/* Card 2: Geçen Hafta */}
        <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200">
          <div className="text-xs text-slate-500 font-medium mb-1">Geçen Hafta Toplam</div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-slate-800 font-['Outfit',sans-serif]">
              {summary.lastWeekTotal}
            </strong>
            <span className="text-xs font-semibold text-slate-500">Soru</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Önceki haftanın tamamı</p>
        </div>

        {/* Card 3: Toplam Çözülen Soru (Tüm Zamanlar) */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
            <span>Toplam Soru</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-amber-950 font-['Outfit',sans-serif]">
              {allTimeTotal}
            </strong>
            <span className="text-xs font-semibold text-amber-800">Soru</span>
          </div>
          <p className="text-[11px] text-amber-800 mt-1 font-medium">yapyap genel toplamı</p>
        </div>

        {/* Card 4: Haftalık Hedef & Günlük Ortalama */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
            <span>Haftalık Hedef (%{summary.targetCompletionRate})</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl sm:text-3xl font-black text-emerald-950 font-['Outfit',sans-serif]">
              {summary.thisWeekTotal} / {summary.weeklyTarget}
            </strong>
          </div>
          <div className="w-full bg-emerald-200/60 h-2 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.targetCompletionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-zinc-200/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="text-xs text-slate-600">
            {activeTab === 'daily_comparison' ? (
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>📅 Gün Bazında Soru Çözümü:</span>
                <span className="text-indigo-600 font-bold">Bu Hafta (Koyu İndigo)</span>
                <span>vs.</span>
                <span className="text-slate-500 font-bold">Geçen Hafta (Açık Gri)</span>
              </span>
            ) : (
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>📈 Son 4 Haftanın Çözülen Toplam Soru Trendi ve Hedef Çizgisi</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Günlük Ort: <strong>{summary.dailyAverage} soru</strong></span>
            <span>•</span>
            <span>En İyi Gün: <strong className="text-indigo-700">{summary.bestDay.dayName} ({summary.bestDay.count})</strong></span>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                          fill={isToday ? '#4f46e5' : '#64748b'}
                          fontSize={12}
                          fontWeight={isToday ? 800 : 600}
                        >
                          {payload.value}
                        </text>
                        {isToday && (
                          <circle cx={0} cy={22} r={2.5} fill="#4f46e5" />
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
                <Tooltip content={renderDailyTooltip} cursor={{ fill: '#f1f5f9', opacity: 0.8 }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  formatter={(value) => (
                    <span className="text-xs font-bold text-slate-700">
                      {value === 'thisWeek' ? 'Bu Hafta' : 'Geçen Hafta'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="lastWeek"
                  name="lastWeek"
                  fill="#cbd5e1"
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
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
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
                    fill: '#b45309',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalQuestions"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#questionTrendGradient)"
                  dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Selected Day Interaction Details Banner */}
        {selectedDay && activeTab === 'daily_comparison' && (
          <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-indigo-950 font-['Outfit',sans-serif]">
                📌 {selectedDay.dayName} Detayı:
              </span>
              <span className="text-slate-700">
                Bu Hafta: <strong>{selectedDay.thisWeek} Soru</strong> • Geçen Hafta: <strong>{selectedDay.lastWeek} Soru</strong>
              </span>
              <span
                className={`font-extrabold px-1.5 py-0.5 rounded text-[11px] ${
                  selectedDay.thisWeek >= selectedDay.lastWeek
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {selectedDay.thisWeek - selectedDay.lastWeek >= 0
                  ? `+${selectedDay.thisWeek - selectedDay.lastWeek} Soru`
                  : `${selectedDay.thisWeek - selectedDay.lastWeek} Soru`}
              </span>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-slate-400 hover:text-slate-700 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Footer Motivation & Quick Practice CTA */}
      <div className="mt-4 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </span>
          <p className="leading-tight">
            <strong>BİLSEM Tavsiyesi:</strong> Günde ortalama <strong>8-10 soru</strong> çözmek,
            zihinsel yorgunluk yaratmadan soru çözme refleksini en üst seviyede tutar.
          </p>
        </div>

        {onStartPractice && (
          <button
            onClick={() => {
              sound.playClick();
              onStartPractice();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs   active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Soru Çöz ve Grafiği Yükselt</span>
          </button>
        )}
      </div>
    </div>
  );
};
