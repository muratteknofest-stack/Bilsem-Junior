import * as React from 'react';

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'muted' | 'interactive';
  elevation?: 'single' | 'none';
}

/**
 * SurfaceCard - Single-elevation 1px thin border card component (shadcn/ui Card pattern).
 * Designed for Bilsem Junior to prevent nested card clutter while harmonizing with light/dark themes.
 */
export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className = '', variant = 'default', elevation = 'single', children, ...props }, ref) => {
    const baseClasses =
      'rounded-2xl transition-all duration-200 border text-[var(--text-primary,#1d2036)] dark:text-[var(--text-primary,#f9f7ff)]';

    const variantClasses = {
      default:
        'bg-[var(--surface-card,#ffffff)] dark:bg-[var(--surface-card,#262339)] border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)]',
      flat:
        'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60',
      muted:
        'bg-slate-100/70 dark:bg-slate-800/40 border-transparent',
      interactive:
        'bg-[var(--surface-card,#ffffff)] dark:bg-[var(--surface-card,#262339)] border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] hover:border-indigo-400/60 dark:hover:border-indigo-500/50 hover:shadow-md cursor-pointer',
    }[variant];

    const elevationClass =
      elevation === 'single'
        ? 'shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
        : 'shadow-none';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${elevationClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SurfaceCard.displayName = 'SurfaceCard';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-5 sm:p-6 pb-3 ${className}`.trim()}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg sm:text-xl font-bold leading-tight tracking-[-0.025em] text-[var(--text-primary,#1d2036)] dark:text-[var(--text-primary,#f9f7ff)] font-['Outfit',sans-serif] ${className}`.trim()}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-xs sm:text-sm text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)] leading-relaxed ${className}`.trim()}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`p-5 sm:p-6 pt-0 ${className}`.trim()}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center p-5 sm:p-6 pt-0 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] mt-4 ${className}`.trim()}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Aliases for shadcn/ui Card naming compatibility
export const Card = SurfaceCard;
export default SurfaceCard;
