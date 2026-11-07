import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from './cn';

export interface DrawerSheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left' | 'bottom';
  title?: React.ReactNode;
  children: React.ReactNode;
  closeLabel?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * DrawerSheet - Accessible shadcn/ui Sheet/Drawer pattern with Escape close, backdrop click, scroll lock, and <=180ms motion.
 */
export const DrawerSheet: React.FC<DrawerSheetProps> = ({
  open,
  onClose,
  side = 'right',
  title,
  children,
  closeLabel = 'Menüyü kapat',
  className = '',
  'aria-label': ariaLabel,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const titleId = React.useId();

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

  const positionClasses = {
    right: 'inset-y-0 right-0 h-full w-full max-w-sm border-l',
    left: 'inset-y-0 left-0 h-full w-full max-w-xs border-r',
    bottom: 'inset-x-0 bottom-0 w-full max-h-[85dvh] rounded-t-2xl border-t',
  }[side];

  const initialOffset =
    side === 'right' ? { x: '100%' } : side === 'left' ? { x: '-100%' } : { y: '100%' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={!ariaLabel && title ? titleId : undefined}
            initial={shouldReduceMotion ? false : initialOffset}
            animate={{ x: 0, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : initialOffset}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed z-10 flex flex-col border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] bg-[var(--surface-card,#ffffff)] dark:bg-[var(--surface-card,#262339)] text-[var(--text-primary,#1d2036)] dark:text-[var(--text-primary,#f9f7ff)] shadow-2xl',
              positionClasses,
              className
            )}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] px-4 py-3">
                <h2 id={titleId} className="text-base font-bold tracking-[-0.02em]">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 pb-safe">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DrawerSheet;
