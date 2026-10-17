import React from 'react';
import { Sparkles } from 'lucide-react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = true,
  theme = 'light',
  className = '',
  onClick,
}) => {
  const iconDimensions = {
    xs: 'w-8 h-8 rounded-xl',
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  }[size];

  const titleSizes = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl sm:text-5xl',
  }[size];

  const badgeSizes = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[9px] px-2 py-0.5',
    md: 'text-[10px] px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1',
    xl: 'text-xs px-3.5 py-1',
  }[size];

  const taglineSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  const isDark = theme === 'dark';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'ZekaPark ana sayfasına git' : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      className={`flex items-center gap-2.5 sm:gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Cute Wise Owl "Zeki" Mascot Emblem */}
      <div
        className={`${iconDimensions} relative shrink-0 overflow-hidden shadow-md ring-2 ring-indigo-500/20 flex items-center justify-center transition-transform duration-300 ${
          onClick ? 'group-hover:scale-105 group-hover:-rotate-3 group-active:scale-95' : ''
        }`}
      >
        <img
          src="/logo.svg"
          alt="ZekaPark Bilge Baykuş Zeki Maskotu"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Logotype Typography */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
            <span
              className={`font-black tracking-tight font-['Outfit',sans-serif] ${titleSizes} ${
                isDark
                  ? 'text-white'
                  : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 bg-clip-text text-transparent'
              }`}
            >
              Zeka<span className="text-emerald-500 group-hover:text-emerald-400 transition-colors">Park</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 font-extrabold rounded-full border shrink-0 transition-transform ${badgeSizes} ${
                isDark
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                  : 'bg-gradient-to-r from-amber-50 to-indigo-50 text-indigo-800 border-indigo-200/80'
              } ${onClick ? 'group-hover:scale-105' : ''}`}
            >
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 shrink-0" />
              <span>BİLSEM</span>
            </span>
          </div>

          {showTagline && (
            <p
              className={`font-semibold uppercase tracking-wider sm:tracking-widest mt-0.5 ${taglineSizes} ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Bilge Baykuş Zeki ile Keşfet
            </p>
          )}
        </div>
      )}
    </div>
  );
};
