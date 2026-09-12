import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { MistakeItem, CognitiveCategory, QuestionType } from '../types';
import { sound } from '../lib/sound';
import {
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Filter,
  Lightbulb,
  X,
  Compass,
  Shapes,
  Grid3X3,
  Brain,
  Eye,
  Zap,
  Target,
} from 'lucide-react';

export interface CategoryMistakeStat {
  category: CognitiveCategory;
  categoryName: string;
  count: number;
  unresolvedCount: number;
  resolvedCount: number;
  percentage: number;
  color: string;
  bgLight: string;
  borderColor: string;
  advice: string;
  icon: React.ReactNode;
}

export const CATEGORY_CONFIG: Record<
  CognitiveCategory,
  {
    name: string;
    color: string;
    bgLight: string;
    borderColor: string;
    advice: string;
    icon: (className?: string) => React.ReactNode;
  }
> = {
  spatial: {
    name: 'Uzamsal Zeka ve Döndürme',
    color: '#f43f5e', // Rose
    bgLight: 'bg-rose-50 text-rose-800',
    borderColor: 'border-rose-200',
    advice: 'Şekilleri zihninde 90° ve 180° adım adım çevirme egzersizleri ve ayna yansımalarına odaklan.',
    icon: (cls = 'w-4 h-4') => <Compass className={cls} />,
  },
  matrix: {
    name: 'Matris Tamamlama',
    color: '#3b82f6', // Blue
    bgLight: 'bg-blue-50 text-blue-800',
    borderColor: 'border-blue-200',
    advice: 'Satır ve sütunlardaki eleman sayısını, renk değişimlerini ve ekleme-çıkarma kurallarını ayrı ayrı tara.',
    icon: (cls = 'w-4 h-4') => <Grid3X3 className={cls} />,
  },
  pattern: {
    name: 'Örüntü ve Dizi',
    color: '#8b5cf6', // Violet
    bgLight: 'bg-violet-50 text-violet-800',
    borderColor: 'border-violet-200',
    advice: 'Adımlar arasındaki artış ve azalış ritmini, saat yönü hareketlerini kontrol et.',
    icon: (cls = 'w-4 h-4') => <Shapes className={cls} />,
  },
  logic: {
    name: 'Mantık ve Muhakeme',
    color: '#10b981', // Emerald
    bgLight: 'bg-emerald-50 text-emerald-800',
    borderColor: 'border-emerald-200',
    advice: 'Sembol eşleşmelerinde ortak harf veya şekilleri eleyerek ipucu çıkar.',
    icon: (cls = 'w-4 h-4') => <Brain className={cls} />,
  },
  attention: {
    name: 'Dikkat ve Odaklanma',
    color: '#f59e0b', // Amber
    bgLight: 'bg-amber-50 text-amber-800',
    borderColor: 'border-amber-200',
    advice: 'Üst üste binen şekilleri sayarken parmağınla işaretleyerek sistemli gruplama yap.',
    icon: (cls = 'w-4 h-4') => <Target className={cls} />,
  },
  visual_perception: {
    name: 'Görsel Algı',
    color: '#06b6d4', // Cyan
    bgLight: 'bg-cyan-50 text-cyan-800',
    borderColor: 'border-cyan-200',
    advice: 'Farklı olanı bulurken kenar sayısı, doluluk oranı ve yön detaylarına dikkat et.',
    icon: (cls = 'w-4 h-4') => <Eye className={cls} />,
  },
  memory: {
    name: 'Görsel Bellek',
    color: '#ec4899', // Pink
    bgLight: 'bg-pink-50 text-pink-800',
    borderColor: 'border-pink-200',
    advice: 'Gördüğün şekilleri küçük bir hikayeye dönüştürerek hafızanda kodla.',
    icon: (cls = 'w-4 h-4') => <Zap className={cls} />,
  },
  verbal: {
      name: 'Sözel Mantık',
      color: '#ec4899',
      bgLight: '#fdf2f8',
      borderColor: '#fbcfe8',
      advice: 'Sözel ilişkileri ve kelime mantığını pekiştirmelisin.',
      icon: (cls) => <Brain className={cls} />
    },
    coding: {
      name: 'Algoritma & Kodlama',
      color: '#8b5cf6',
      bgLight: '#f5f3ff',
      borderColor: '#ede9fe',
      advice: 'Mantıksal sıralama ve adım-adım düşünme pratiği yapmalısın.',
      icon: (cls) => <Brain className={cls} />
    },
    numerical: {
      name: 'Sayısal Muhakeme',
    color: '#6366f1', // Indigo
    bgLight: 'bg-indigo-50 text-indigo-800',
    borderColor: 'border-indigo-200',
    advice: 'Sayılar arasındaki iki katı, +3, -1 gibi kural dizilimlerini not alarak çöz.',
    icon: (cls = 'w-4 h-4') => <Sparkles className={cls} />,
  },
};

export const QUESTION_TYPE_TO_CATEGORY: Record<QuestionType, CognitiveCategory> = {
  odd_one_out: 'visual_perception',
  visual_sequence: 'pattern',
  matrix_2x2: 'matrix',
  figure_rotation: 'spatial',
  mirror_reflection: 'spatial',
  symmetry_completion: 'spatial',
  figure_completion: 'visual_perception',
  spatial_relationship: 'spatial',
  visual_analogy: 'logic',
  shape_counting: 'attention',
  direction_path: 'spatial',
  visual_memory: 'memory',
  symbol_coding: 'logic',
  classification: 'logic',
  visual_attention: 'attention',
  number_pattern: 'pattern',
  logical_sequence: 'logic',
  matrix_3x3: 'matrix',
  shape_equation: 'numerical',
  latin_square: 'logic',
  shadow_matching: 'visual_perception',
  balance_scale: 'logic',
  gear_rotation: 'spatial',
  paper_folding: 'spatial',
  venn_diagram: 'logic',
  cube_counting: 'attention',
  dice_unfold: 'spatial',
  cryptogram: 'logic',
  operation_machine: 'numerical',
  top_view: 'spatial',
  shape_combination: 'visual_perception',
  verbal_analogy: 'logic',
  number_pyramid: 'numerical',
  story_logic: 'logic',
  tangram_puzzle: 'visual_perception',
  maze_path: 'spatial',
  logic_grid: 'logic',
  punch_folding: 'spatial',
  detail_detection: 'attention',
  weight_comparison: 'numerical',
  multiview_perspective: 'spatial',
  raven_matrix: 'matrix',
  word_scramble_logic: 'pattern',
  spatial_origami: 'spatial',
};

interface MistakeAnalyticsPieChartProps {
  mistakes: MistakeItem[];
  selectedCategoryFilter: CognitiveCategory | 'all';
  onSelectCategoryFilter: (category: CognitiveCategory | 'all') => void;
}

// Active shape renderer for smooth hover highlight in recharts
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 11}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

export const MistakeAnalyticsPieChart: React.FC<MistakeAnalyticsPieChartProps> = ({
  mistakes,
  selectedCategoryFilter,
  onSelectCategoryFilter,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Analyze mistakes per category
  const stats = useMemo(() => {
    const totalCount = mistakes.length;
    if (totalCount === 0) return { categoryStats: [], totalCount: 0, mostMistaken: null };

    const map: Partial<Record<CognitiveCategory, { total: number; unresolved: number; resolved: number }>> = {};

    mistakes.forEach((m) => {
      // Determine category (fallback to questionType mapping if missing)
      const cat: CognitiveCategory =
        m.category || QUESTION_TYPE_TO_CATEGORY[m.questionType] || 'spatial';

      if (!map[cat]) {
        map[cat] = { total: 0, unresolved: 0, resolved: 0 };
      }
      map[cat]!.total += 1;
      if (m.resolved) {
        map[cat]!.resolved += 1;
      } else {
        map[cat]!.unresolved += 1;
      }
    });

    const categoryStats: CategoryMistakeStat[] = Object.entries(map).map(([key, data]) => {
      const cat = key as CognitiveCategory;
      const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.spatial;
      const count = data?.total || 0;
      const percentage = Math.round((count / totalCount) * 100);

      return {
        category: cat,
        categoryName: config.name,
        count,
        unresolvedCount: data?.unresolved || 0,
        resolvedCount: data?.resolved || 0,
        percentage,
        color: config.color,
        bgLight: config.bgLight,
        borderColor: config.borderColor,
        advice: config.advice,
        icon: config.icon(),
      };
    });

    // Sort descending by count
    categoryStats.sort((a, b) => b.count - a.count);

    const mostMistaken = categoryStats[0] || null;

    return { categoryStats, totalCount, mostMistaken };
  }, [mistakes]);

  // Chart data formatted for recharts
  const chartData = useMemo(() => {
    return stats.categoryStats.map((item) => ({
      name: item.categoryName,
      value: item.count,
      category: item.category,
      percentage: item.percentage,
      color: item.color,
      unresolved: item.unresolvedCount,
      resolved: item.resolvedCount,
    }));
  }, [stats.categoryStats]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const handleCategoryClick = (cat: CognitiveCategory) => {
    sound.playClick();
    if (selectedCategoryFilter === cat) {
      onSelectCategoryFilter('all');
    } else {
      onSelectCategoryFilter(cat);
    }
  };

  if (stats.totalCount === 0) {
    return null;
  }

  const mostMistaken = stats.mostMistaken;

  return (
    <div
      id="mistake-analytics-card"
      className="bg-white rounded-xl border border-zinc-200  overflow-hidden transition-all"
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 ">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Hata Konuları & Beceri Alanı Analizi
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {stats.totalCount} Soru Kayıtlı
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Yanlış cevapların hangi bilişsel becerilerde yoğunlaştığını pasta grafikte incele.
            </p>
          </div>
        </div>

        {/* Action / Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedCategoryFilter !== 'all' && (
            <button
              onClick={() => {
                sound.playClick();
                onSelectCategoryFilter('all');
              }}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Filtreyi Kaldır</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {isExpanded ? 'Grafiği Daralt' : 'Grafiği Genişlet'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Main Visual Row: Pie Chart on left, Insight and Category Bars on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Pie Chart Display (5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/70 p-4 rounded-xl border border-zinc-200">
              <div className="w-full h-64 sm:h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl  border border-zinc-200 text-xs space-y-1.5 z-50">
                              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-zinc-200 pb-1">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span>{data.name}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-600">
                                <span>Hata Sayısı:</span>
                                <span className="font-bold text-slate-900 font-mono">
                                  {data.value} Soru (%{data.percentage})
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-500 text-[11px]">
                                <span>Durum:</span>
                                <span className="font-semibold text-amber-700">
                                  {data.unresolved} Bekliyor • {data.resolved} Öğrenildi
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      activeIndex={activeIndex !== null ? activeIndex : undefined}
                      activeShape={renderActiveShape}
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                      onClick={(entry: any) => handleCategoryClick(entry?.category || entry?.payload?.category)}
                      cursor="pointer"
                    >
                      {chartData.map((entry, index) => {
                        const isSelected = selectedCategoryFilter === entry.category;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={isSelected ? '#0f172a' : '#ffffff'}
                            strokeWidth={isSelected ? 3 : 1.5}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge / Counter inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {stats.totalCount}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Toplam Hata
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-slate-600 font-medium text-center mt-2">
                Dilime tıklayarak o alandaki hataları filtreleyebilirsin 🎯
              </span>
            </div>

            {/* Analysis Insights & Category Breakdown (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Weakest Area Alert Box */}
              {mostMistaken && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-rose-500 text-white ">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wide block">
                          En Çok Hata Yapılan Beceri Alanı
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {mostMistaken.categoryName} ({mostMistaken.count} Hata - %{mostMistaken.percentage})
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCategoryClick(mostMistaken.category)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedCategoryFilter === mostMistaken.category
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/50 '
                      }`}
                    >
                      {selectedCategoryFilter === mostMistaken.category
                        ? 'Filtre Aktif'
                        : 'Bu Konuyu İncele'}
                    </button>
                  </div>

                  {/* Pedagogical tip */}
                  <div className="flex items-start gap-2 pt-1 border-t border-rose-200/50 text-xs text-rose-950">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="font-bold">Özel Tavsiye: </strong>
                      {mostMistaken.advice}
                    </p>
                  </div>
                </div>
              )}

              {/* Category Breakdown List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <span>Beceri Dağılımı ({stats.categoryStats.length} Kategori)</span>
                  <span>Hata Payı</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stats.categoryStats.map((item) => {
                    const isSelected = selectedCategoryFilter === item.category;

                    return (
                      <div
                        key={item.category}
                        onClick={() => handleCategoryClick(item.category)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 '
                            : 'bg-slate-50/80 hover:bg-white border-zinc-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="min-w-0">
                            <span
                              className={`text-xs font-bold truncate block ${
                                isSelected ? 'text-white' : 'text-slate-800'
                              }`}
                            >
                              {item.categoryName}
                            </span>
                            <span
                              className={`text-[11px] block ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {item.unresolvedCount > 0
                                ? `${item.unresolvedCount} bekliyor`
                                : 'Tümü öğrenildi! ✨'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-extrabold font-mono block ${
                              isSelected ? 'text-amber-300' : 'text-slate-900'
                            }`}
                          >
                            %{item.percentage}
                          </span>
                          <span
                            className={`text-[10px] ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {item.count} soru
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
