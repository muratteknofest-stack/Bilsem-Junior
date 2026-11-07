import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from './cn';

export interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  closeLabel?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * ModalDialog - Accessible shadcn/ui Dialog pattern with Escape key, backdrop click, scroll lock, and <=180ms motion.
 */
export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  closeLabel = 'Kapat',
  className = '',
  'aria-label': ariaLabel,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[maxWidth];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={!ariaLabel && title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 w-full rounded-2xl border border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] bg-[var(--surface-card,#ffffff)] dark:bg-[var(--surface-card,#262339)] text-[var(--text-primary,#1d2036)] dark:text-[var(--text-primary,#f9f7ff)] shadow-xl max-h-[90dvh] flex flex-col overflow-hidden',
              widthClass,
              className
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] px-5 py-4 sm:px-6">
                <div className="min-w-0 space-y-1">
                  {title && (
                    <h2 id={titleId} className="text-lg font-bold tracking-[-0.025em]">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="text-sm text-[var(--text-secondary,#52566b)] dark:text-[var(--text-secondary,#cac4d5)]">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] px-5 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModalDialog;
