import * as React from 'react';
import { SpotlightSurface } from './SpotlightSurface';
import { cn } from './cn';

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 12;
}

/**
 * BentoGrid - Magic UI asymmetric 12-column responsive showcase layout.
 */
export const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ columns = 12, className = '', children, ...props }, ref) => {
    const gridCols =
      columns === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : columns === 3
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-6 lg:grid-cols-12';

    return (
      <div
        ref={ref}
        className={cn('grid gap-4 sm:gap-5 w-full auto-rows-fr', gridCols, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BentoGrid.displayName = 'BentoGrid';

export interface BentoCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  colSpan?: 'full' | 4 | 6 | 8;
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  background?: React.ReactNode;
  spotlightColor?: string;
}

export const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  (
    {
      colSpan = 4,
      icon,
      eyebrow,
      title,
      description,
      footer,
      background,
      spotlightColor = 'rgba(79, 70, 229, 0.10)',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const spanClasses = {
      4: 'md:col-span-3 lg:col-span-4',
      6: 'md:col-span-3 lg:col-span-6',
      8: 'md:col-span-6 lg:col-span-8',
      full: 'md:col-span-6 lg:col-span-12',
    }[colSpan];

    return (
      <SpotlightSurface
        ref={ref}
        spotlightColor={spotlightColor}
        className={cn(
          'flex flex-col justify-between p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(29,32,54,0.05)] dark:shadow-[0_8px_24px_rgba(7,6,17,0.35)]',
          spanClasses,
          className
        )}
        {...props}
      >
        {background && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {background}
          </div>
        )}
        {(icon || eyebrow || title || description) && (
          <div className="relative z-10 flex flex-col gap-2">
            {(icon || eyebrow) && (
              <div className="flex items-center justify-between gap-3">
                {icon && (
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] bg-slate-50 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-300">
                    {icon}
                  </span>
                )}
                {eyebrow && (
                  <span className="text-xs font-semibold text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)]">
                    {eyebrow}
                  </span>
                )}
              </div>
            )}
            {title && (
              <h3 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary,#1d2036)] dark:text-[var(--text-primary,#f9f7ff)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm leading-relaxed text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)]">
                {description}
              </p>
            )}
          </div>
        )}
        {children && <div className="relative z-10 flex-1">{children}</div>}
        {footer && <div className="relative z-10 mt-4 pt-3 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)]">{footer}</div>}
      </SpotlightSurface>
    );
  }
);
BentoCard.displayName = 'BentoCard';
