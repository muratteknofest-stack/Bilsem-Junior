import * as React from 'react';
import { SurfaceCard } from './SurfaceCard';

export type DeltaDirection = 'up' | 'down' | 'neutral';

export interface MetricDelta {
  value: string | number;
  direction?: DeltaDirection;
  label?: string;
}

export interface MetricCategoryBar {
  values: number[];
  colors?: string[];
  labels?: string[];
  showLabels?: boolean;
}

export interface MetricProgressBar {
  value: number; // 0 - 100
  color?: string;
  label?: string;
}

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  metric: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  delta?: MetricDelta;
  categoryBar?: MetricCategoryBar;
  progressBar?: MetricProgressBar;
  variant?: 'default' | 'flat' | 'interactive';
}

const DEFAULT_CATEGORY_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

/**
 * MetricCard - Analytics KPI and progress presentation component (Tremor KPI Card & CategoryBar pattern).
 * Features tabular numbers standard, accessible delta badges, and segmented category progress bars.
 */
export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      title,
      metric,
      subtitle,
      icon,
      delta,
      categoryBar,
      progressBar,
      variant = 'default',
      className = '',
      ...props
    },
    ref
  ) => {
    // Delta direction indicator styling
    const deltaStyle = React.useMemo(() => {
      if (!delta) return null;
      const dir = delta.direction || 'neutral';
      if (dir === 'up') {
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
          symbol: '↑',
        };
      }
      if (dir === 'down') {
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
          symbol: '↓',
        };
      }
      return {
        bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        symbol: '•',
      };
    }, [delta]);

    // Calculate CategoryBar percentages
    const categoryBarData = React.useMemo(() => {
      if (!categoryBar || !categoryBar.values.length) return null;
      const total = categoryBar.values.reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
      return categoryBar.values.map((v, i) => {
        const percentage = Math.max(0, (v / total) * 100);
        const color =
          categoryBar.colors && categoryBar.colors[i]
            ? categoryBar.colors[i]
            : DEFAULT_CATEGORY_COLORS[i % DEFAULT_CATEGORY_COLORS.length];
        const label = categoryBar.labels?.[i] || `${Math.round(percentage)}%`;
        return { value: v, percentage, color, label };
      });
    }, [categoryBar]);

    return (
      <SurfaceCard
        ref={ref}
        variant={variant === 'interactive' ? 'interactive' : variant === 'flat' ? 'flat' : 'default'}
        className={`p-5 sm:p-6 space-y-3 relative overflow-hidden ${className}`.trim()}
        {...props}
      >
        {/* Header: Title and optional Icon */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)]">
            {title}
          </p>
          {icon && (
            <div className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              {icon}
            </div>
          )}
        </div>

        {/* Metric and Delta Display */}
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums text-[var(--text-primary,#1d2036)] dark:text-[var(--text-primary,#f9f7ff)] font-[family-name:var(--bj-font-display)]">
            {metric}
          </div>

          {delta && deltaStyle && (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border tabular-nums ${deltaStyle.bg}`}
              aria-label={`Değişim: ${delta.value}`}
            >
              <span>{deltaStyle.symbol}</span>
              <span>{delta.value}</span>
              {delta.label && <span className="opacity-75 font-normal ml-0.5">{delta.label}</span>}
            </div>
          )}
        </div>

        {/* Subtitle / Note */}
        {subtitle && (
          <p className="text-xs text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)] leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Tremor CategoryBar (Segmented multi-category bar) */}
        {categoryBarData && (
          <div className="pt-2 space-y-1.5" role="progressbar" aria-label={`${title} kategori dağılımı`}>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 gap-0.5 p-0.5">
              {categoryBarData.map((seg, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${seg.percentage}%`,
                    backgroundColor: seg.color,
                  }}
                  className="h-full rounded-sm transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  title={`${seg.label}: ${seg.value}`}
                />
              ))}
            </div>

            {categoryBar?.showLabels && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums pt-1">
                {categoryBarData.map((seg, idx) => (
                  <span key={idx} className="flex items-center gap-1 truncate">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate">{seg.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Simple Progress Bar */}
        {progressBar && (
          <div
            className="pt-2 space-y-1"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.max(0, progressBar.value))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressBar.label || title}
          >
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progressBar.value))}%`,
                  backgroundColor: progressBar.color || '#6366f1',
                }}
              />
            </div>
            {progressBar.label && (
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>{progressBar.label}</span>
                <span>{Math.round(progressBar.value)}%</span>
              </div>
            )}
          </div>
        )}
      </SurfaceCard>
    );
  }
);

MetricCard.displayName = 'MetricCard';

export default MetricCard;
