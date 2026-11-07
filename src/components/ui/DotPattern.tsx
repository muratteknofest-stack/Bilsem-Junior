import * as React from 'react';
import { cn } from './cn';

export interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  cr?: number;
}

/**
 * DotPattern - Magic UI calm mathematical dot matrix background for distraction-free focus surfaces.
 */
export const DotPattern: React.FC<DotPatternProps> = ({
  width = 24,
  height = 24,
  cx = 1,
  cy = 1,
  cr = 1,
  className = '',
  ...props
}) => {
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full fill-slate-400/25 dark:fill-slate-500/20',
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={`bj-dot-pattern-${id}`}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
        >
          <circle cx={cx} cy={cy} r={cr} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#bj-dot-pattern-${id})`} />
    </svg>
  );
};

export default DotPattern;
