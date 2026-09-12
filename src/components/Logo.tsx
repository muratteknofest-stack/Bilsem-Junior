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
  // Dimension tokens
  const iconDimensions = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-13 h-13 rounded-xl',
    xl: 'w-18 h-18 rounded-xl',
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
      className={`flex items-center gap-2.5 sm:gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Brand Icon Vector Image with Playful Hover Physics */}
      <div
        className={`${iconDimensions} relative shrink-0 overflow-hidden   ring-1 ring-white/30 flex items-center justify-center transition-all duration-300 transform ${
          onClick ? 'group-hover:scale-108 group-hover:-rotate-2 group-active:scale-95 ' : ''
        }`}
      >
        <img
          src="/logo.svg"
          alt="ZekaPark Logo"
          className="w-full h-full object-contain filter drop-"
          referrerPolicy="no-referrer"
        />
        {/* Subtle glass reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none rounded-inherit" />
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
                  : 'bg-gradient-to-r from-amber-50 to-indigo-50 text-indigo-800 border-indigo-200/80 '
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
              Bilişsel Zeka & Akıl Oyunları
            </p>
          )}
        </div>
      )}
    </div>
  );
};
