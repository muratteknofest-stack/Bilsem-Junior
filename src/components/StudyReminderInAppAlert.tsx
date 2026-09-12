import React from 'react';
import { ReminderAlertEvent } from '../types';
import { reminderService } from '../services/reminder-service';
import { sound } from '../lib/sound';
import {
  Bell,
  Flame,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
  X,
  Target,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface StudyReminderInAppAlertProps {
  alert: ReminderAlertEvent;
  onNavigateToAction: (action: 'practice' | 'adaptive' | 'mistakes') => void;
  onClose: () => void;
}

export const StudyReminderInAppAlert: React.FC<StudyReminderInAppAlertProps> = ({
  alert,
  onNavigateToAction,
  onClose,
}) => {
  const handleStart = (action: 'practice' | 'adaptive' | 'mistakes') => {
    sound.playClick();
    reminderService.dismissAlert();
    onClose();
    onNavigateToAction(action);
  };

  const handleSnooze = (minutes: number) => {
    sound.playClick();
    reminderService.snoozeAlert(minutes);
    onClose();
  };

  const handleDismiss = () => {
    sound.playClick();
    reminderService.dismissAlert();
    onClose();
  };

  return (
    <div
      id="study-reminder-in-app-alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl  border-2 border-indigo-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-250">
        {/* Decorative Top Accent Gradient */}
        <div className="h-3 bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header with animated bell badge */}
          <div className="flex items-start gap-4">
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center   shrink-0">
              <Bell className="w-7 h-7 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white" />
              </span>
            </div>

            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Çalışma Hatırlatıcısı
                </span>
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Şimdi
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif] mt-1 leading-snug">
                {alert.title}
              </h2>
            </div>
          </div>

          {/* Goal & Streak Summary Pill Box */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-zinc-200/80 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-600 block text-[11px]">Kalan Hedef</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {alert.remainingMinutes} dakika
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-l border-zinc-200 pl-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
              </div>
              <div>
                <span className="text-slate-600 block text-[11px]">Mevcut Seri</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {alert.currentStreak} Gün Korunuyor!
                </span>
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">
              {alert.motivationQuote}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => handleStart('practice')}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2   active:scale-98 transition-all cursor-pointer group"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Hemen Günlük Pratiğe Başla</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStart('adaptive')}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Adaptif Seans</span>
              </button>

              <button
                onClick={() => handleStart('mistakes')}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Hata Defterini Aç</span>
              </button>
            </div>
          </div>

          {/* Footer Snooze Options */}
          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs text-slate-600">
            <button
              onClick={() => handleSnooze(15)}
              className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>15 Dakika Ertele</span>
            </button>

            <button
              onClick={handleDismiss}
              className="text-slate-600 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
            >
              Daha Sonra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
