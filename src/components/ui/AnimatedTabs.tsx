import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  layoutId?: string;
  className?: string;
  tabClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pills' | 'underline' | 'segmented';
  'aria-label'?: string;
}

/**
 * AnimatedTabs - Keyboard-accessible single-line tab component powered by motion/react layoutId.
 * Guarantees zero line wraps with whitespace-nowrap and shrink-0 discipline.
 */
export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  layoutId = 'animated-tab-indicator',
  className = '',
  tabClassName = '',
  size = 'md',
  variant = 'pills',
  'aria-label': ariaLabel = 'Navigasyon Sekmeleri',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const tabRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  const enabledTabs = React.useMemo(() => tabs.filter((t) => !t.disabled), [tabs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (enabledTabs.length === 0) return;
    const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);
    let nextIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % enabledTabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex >= 0) {
      const nextTab = enabledTabs[nextIndex];
      onChange(nextTab.id);
      const buttonEl = tabRefs.current.get(nextTab.id);
      buttonEl?.focus();
    }
  };

  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 min-h-[2rem]',
    md: 'text-sm py-2 px-3.5 min-h-[2.5rem]',
    lg: 'text-base py-2.5 px-4 min-h-[2.75rem]',
  }[size];

  const containerVariantClasses = {
    pills:
      'bg-slate-100/90 dark:bg-slate-800/60 p-1 rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)]',
    segmented:
      'bg-slate-100 dark:bg-[#312b43] p-1.5 rounded-2xl border border-[var(--border-subtle,#dedbe6)] dark:border-[var(--border-subtle,#49425a)]',
    underline:
      'border-b border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] p-0 gap-4',
  }[variant];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`relative flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full touch-pan-y ${containerVariantClasses} ${className}`.trim()}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = !!tab.disabled;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={isActive}
            aria-pressed={isActive}
            aria-label={tab['aria-label']}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.id)}
            className={`relative whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-1 select-none ${sizeClasses} ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : isActive
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            } ${tabClassName}`.trim()}
          >
            {isActive && variant !== 'underline' && (
              <motion.div
                layoutId={layoutId}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', bounce: 0.18, duration: 0.35 }
                }
                className="absolute inset-0 rounded-lg bg-white dark:bg-[#493b68] shadow-sm border border-slate-200/80 dark:border-[#665786]"
                aria-hidden="true"
              />
            )}

            {isActive && variant === 'underline' && (
              <motion.div
                layoutId={`${layoutId}-underline`}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', bounce: 0.15, duration: 0.3 }
                }
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                aria-hidden="true"
              />
            )}

            <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">
              {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge && <span className="shrink-0">{tab.badge}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default AnimatedTabs;
