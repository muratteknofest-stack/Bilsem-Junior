import * as React from 'react';
import { cn } from './cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'outline';
}

/**
 * Badge - Subtle single-layer semantic badge (replaces stacked ALL-CAPS pill sandwiches).
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', ...props }, ref) => {
    const variants = {
      neutral:
        'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      primary:
        'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/70',
      success:
        'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
      warning:
        'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
      outline:
        'bg-transparent text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)] border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)]',
    }[variant];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
          variants,
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export const Separator: React.FC<React.HTMLAttributes<HTMLHRElement>> = ({ className = '', ...props }) => (
  <hr
    className={cn(
      'border-0 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)]',
      className
    )}
    {...props}
  />
);
