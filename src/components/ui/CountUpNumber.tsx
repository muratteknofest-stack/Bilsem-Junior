import * as React from 'react';
import { useReducedMotion } from 'motion/react';

export interface CountUpNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  from?: number;
  duration?: number; // In seconds
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
  locale?: string;
}

/**
 * CountUpNumber - Animated numeric counter component (React Bits CountUp pattern).
 * Fully compliant with prefers-reduced-motion and optimized with tabular numbers to prevent horizontal jitter.
 */
export const CountUpNumber = React.forwardRef<HTMLSpanElement, CountUpNumberProps>(
  (
    {
      value,
      from = 0,
      duration = 1.2,
      decimals = 0,
      prefix = '',
      suffix = '',
      formatter,
      locale = 'tr-TR',
      className = '',
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const [displayValue, setDisplayValue] = React.useState<number>(shouldReduceMotion ? value : from);

    const formatNumber = React.useCallback(
      (val: number) => {
        if (formatter) return formatter(val);
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val);
      },
      [formatter, locale, decimals]
    );

    React.useEffect(() => {
      // If user prefers reduced motion or duration is 0, jump immediately to final value
      if (shouldReduceMotion || duration <= 0) {
        setDisplayValue(value);
        return;
      }

      let startTimestamp: number | null = null;
      let animationFrameId: number;
      const startValue = from;
      const targetValue = value;
      const diff = targetValue - startValue;
      const totalDurationMs = duration * 1000;

      // Ease-out cubic curve: 1 - (1 - t)^3
      const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

      const step = (timestamp: number) => {
        if (startTimestamp === null) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / totalDurationMs, 1);
        const easedProgress = easeOutCubic(progress);

        const current = startValue + diff * easedProgress;
        setDisplayValue(current);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setDisplayValue(targetValue);
        }
      };

      animationFrameId = requestAnimationFrame(step);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [value, from, duration, shouldReduceMotion]);

    const formattedOutput = formatNumber(displayValue);
    const accessibleLabel = `${prefix}${formatNumber(value)}${suffix}`;

    return (
      <span
        ref={ref}
        aria-label={accessibleLabel}
        className={`inline-block tabular-nums font-variant-numeric:tabular-nums ${className}`.trim()}
        {...props}
      >
        {prefix}
        {formattedOutput}
        {suffix}
      </span>
    );
  }
);

CountUpNumber.displayName = 'CountUpNumber';

export default CountUpNumber;
