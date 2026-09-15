import React from 'react';
import { Clock, AlertTriangle, Flame } from 'lucide-react';

interface VisualCountdownTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  isStrictMode: boolean;
  isOvertime?: boolean;
  overtimeSeconds?: number;
  label?: string;
  compact?: boolean;
}

export const VisualCountdownTimer: React.FC<VisualCountdownTimerProps> = ({
  remainingSeconds,
  totalSeconds,
  isStrictMode,
  isOvertime = false,
  overtimeSeconds = 0,
  label,
  compact = false,
}) => {
  const percentage = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.abs(secs) / 60);
    const s = Math.abs(secs) % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Color logic based on time remaining
  let colorClass = 'bg-emerald-500';
  let badgeBorder = 'border-emerald-200 bg-emerald-50 text-emerald-800';
  let isUrgent = false;

  if (isOvertime) {
    colorClass = 'bg-amber-500';
    badgeBorder = 'border-amber-300 bg-amber-50 text-amber-900';
  } else if (percentage <= 15 || remainingSeconds <= 30) {
    colorClass = 'bg-rose-500';
    badgeBorder = 'border-rose-300 bg-rose-50 text-rose-800 animate-pulse';
    isUrgent = true;
  } else if (percentage <= 35 || remainingSeconds <= 90) {
    colorClass = 'bg-amber-500';
    badgeBorder = 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-1 min-w-[110px]">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-600 animate-spin' : 'text-slate-400'}`} />
            <span>{label || 'Kalan Süre'}</span>
          </span>
          <span className={`font-mono px-1.5 py-0.5 rounded-md text-xs font-bold border ${badgeBorder}`}>
            {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${colorClass}`}
            style={{ width: `${isOvertime ? 100 : percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-600 animate-bounce' : 'text-slate-500'}`} />
          <span className="text-slate-700 font-semibold">{label || 'Süre & Tempo'}</span>
          {isStrictMode ? (
            <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase tracking-wide border border-rose-200">
              Katı Mod
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-zinc-200">
              Serbest Tempo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOvertime && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Ek Süre</span>
            </span>
          )}
          <span className={`font-mono text-base px-3 py-1 rounded-xl font-extrabold border  tracking-tight ${badgeBorder}`}>
            {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-zinc-200/60 ">
        <div
          className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
          style={{ width: `${isOvertime ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
};
