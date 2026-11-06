import * as React from 'react';
import { useReducedMotion } from 'motion/react';

export interface SpotlightSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  spotlightSize?: number;
  spotlightOpacity?: number;
  borderSpotlight?: boolean;
  disabled?: boolean;
}

/**
 * SpotlightSurface - Mouse/touch interactive spotlight surface (React Bits SpotlightCard & Magic UI BentoCard pattern).
 * Radiates a subtle dynamic glow following cursor or touch coordinates.
 */
export const SpotlightSurface = React.forwardRef<HTMLDivElement, SpotlightSurfaceProps>(
  (
    {
      spotlightColor = 'rgba(99, 102, 241, 0.12)',
      spotlightSize = 340,
      spotlightOpacity = 1,
      borderSpotlight = true,
      disabled = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
    const [isHovered, setIsHovered] = React.useState<boolean>(false);

    // Merge external ref with internal ref
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || shouldReduceMotion || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || shouldReduceMotion || !containerRef.current) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    };

    const handleMouseEnter = () => {
      if (!disabled && !shouldReduceMotion) setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setPosition({ x: -1000, y: -1000 });
    };

    return (
      <div
        ref={setRefs}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={() => setIsHovered(true)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsHovered(false)}
        className={`group relative rounded-2xl border border-[var(--border-subtle,#e2e8f0)] dark:border-[var(--border-subtle,#49425a)] bg-[var(--surface-card,#ffffff)] dark:bg-[var(--surface-card,#262339)] overflow-hidden transition-all duration-300 ${className}`.trim()}
        {...props}
      >
        {/* Spotlight Glow Layer */}
        {!disabled && !shouldReduceMotion && (
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 ease-out"
            style={{
              opacity: isHovered ? spotlightOpacity : 0,
              background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Illuminated Spotlight Border Layer */}
        {borderSpotlight && !disabled && !shouldReduceMotion && (
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl border border-transparent transition-opacity duration-300 ease-out"
            style={{
              opacity: isHovered ? spotlightOpacity : 0,
              WebkitMaskImage: `radial-gradient(${spotlightSize * 0.75}px circle at ${position.x}px ${position.y}px, black, transparent)`,
              maskImage: `radial-gradient(${spotlightSize * 0.75}px circle at ${position.x}px ${position.y}px, black, transparent)`,
              borderColor: 'rgba(99, 102, 241, 0.4)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

SpotlightSurface.displayName = 'SpotlightSurface';

export default SpotlightSurface;
