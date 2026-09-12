import React, { useState, useEffect } from 'react';
import { StudyReminderConfig, ReminderFrequency, UserProfile } from '../types';
import { reminderService } from '../services/reminder-service';
import { sound } from '../lib/sound';
import {
  Bell,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Zap,
  Play,
  Smartphone,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface StudyReminderSettingsModalProps {
  user?: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: StudyReminderConfig) => void;
}

const PRESET_TIMES = [
  { label: 'Okul Sonrası', time: '16:30', icon: '🎒' },
  { label: 'Akşamüstü', time: '18:00', icon: '☕' },
  { label: 'Yemek Sonrası', time: '19:30', icon: '🍽️' },
  { label: 'Akşam', time: '20:30', icon: '🌙' },
];

export const StudyReminderSettingsModal: React.FC<StudyReminderSettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<StudyReminderConfig>(() => reminderService.getConfig());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(reminderService.getConfig());
      setPermission(reminderService.getNotificationPermission());
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleEnabled = (enabled: boolean) => {
    sound.playClick();
    const updated = { ...config, enabled };
    setConfig(updated);
    reminderService.saveConfig(updated);
    onConfigSaved?.(updated);
  };

  const handleTimeSelect = (time: string) => {
    sound.playClick();
    const updated = { ...config, reminderTime: time };
    setConfig(updated);
    reminderService.saveConfig(updated);
    onConfigSaved?.(updated);
  };

  const handleFrequencyChange = (frequency: ReminderFrequency) => {
    sound.playClick();
    const updated = { ...config, frequency };
    setConfig(updated);
    reminderService.saveConfig(updated);
    onConfigSaved?.(updated);
  };

  const handleToggleSound = (soundAlert: boolean) => {
    sound.playClick();
    if (soundAlert) sound.playReminderChime();
    const updated = { ...config, soundAlert };
    setConfig(updated);
    reminderService.saveConfig(updated);
    onConfigSaved?.(updated);
  };

  const handleToggleWeekend = (weekendIncluded: boolean) => {
    sound.playClick();
    const updated = { ...config, weekendIncluded };
    setConfig(updated);
    reminderService.saveConfig(updated);
    onConfigSaved?.(updated);
  };

  const handleRequestPushPermission = async () => {
    sound.playClick();
    setRequestingPerm(true);
    try {
      const granted = await reminderService.requestNotificationPermission();
      setPermission(reminderService.getNotificationPermission());
      if (granted) {
        sound.playSuccess();
        const updated = { ...config, browserPushEnabled: true };
        setConfig(updated);
        reminderService.saveConfig(updated);
        onConfigSaved?.(updated);
      }
    } finally {
      setRequestingPerm(false);
    }
  };

  const handleTestReminder = () => {
    sound.playClick();
    setTestSent(true);
    reminderService.testReminderNow(user || undefined);
    setTimeout(() => {
      setTestSent(false);
    }, 4000);
  };

  return (
    <div
      id="study-reminder-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl  border border-zinc-200 overflow-hidden my-auto animate-in zoom-in-95 duration-250">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 ">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold font-['Outfit',sans-serif]">
                  Çalışma Hatırlatıcısı
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                  {config.enabled ? 'Aktif' : 'Kapalı'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Günlük zeka hedeflerini aksatmadan tamamlamak için uyarıları özelleştir.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Master Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  config.enabled
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Günlük Çalışma Hatırlatıcıları
                </h4>
                <p className="text-xs text-slate-500">
                  Hedefin tamamlanmadığında gün içinde motivasyon uyarısı gönder
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {config.enabled && (
            <>
              {/* Reminder Time Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hatırlatma Saati</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    {config.reminderTime}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_TIMES.map((preset) => {
                    const isSelected = config.reminderTime === preset.time;
                    return (
                      <button
                        key={preset.time}
                        onClick={() => handleTimeSelect(preset.time)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 '
                            : 'bg-slate-50 hover:bg-white border-zinc-200 text-slate-700'
                        }`}
                      >
                        <span className="text-base">{preset.icon}</span>
                        <span className="text-[11px] font-bold leading-tight">
                          {preset.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            isSelected ? 'text-indigo-300' : 'text-slate-500'
                          }`}
                        >
                          {preset.time}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Time Input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">Veya özel saat:</span>
                  <input
                    type="time"
                    value={config.reminderTime}
                    onChange={(e) => handleTimeSelect(e.target.value)}
                    className="text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Frequency / Strategy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Hatırlatma Stratejisi
                </label>
                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => handleFrequencyChange('smart_goal')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      config.frequency === 'smart_goal'
                        ? 'bg-indigo-50/70 border-indigo-300 '
                        : 'bg-white border-zinc-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      checked={config.frequency === 'smart_goal'}
                      onChange={() => handleFrequencyChange('smart_goal')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
                        <span>Akıllı Hedef Hatırlatması (Önerilen)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          Önerilen
                        </span>
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Hedefin tamamlanmadığı günlerde seçilen saatte ve akşamüstü seriyi korumak için uygun zamanda uyarır.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => handleFrequencyChange('daily_fixed')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      config.frequency === 'daily_fixed'
                        ? 'bg-indigo-50/70 border-indigo-300 '
                        : 'bg-white border-zinc-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      checked={config.frequency === 'daily_fixed'}
                      onChange={() => handleFrequencyChange('daily_fixed')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Yalnızca Belirlenen Saatte
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Günde sadece bir kez, tam olarak {config.reminderTime} saati geldiğinde hatırlatır.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => handleFrequencyChange('interval_3h')}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      config.frequency === 'interval_3h'
                        ? 'bg-indigo-50/70 border-indigo-300 '
                        : 'bg-white border-zinc-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      checked={config.frequency === 'interval_3h'}
                      onChange={() => handleFrequencyChange('interval_3h')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Düzenli Aralıklarla (Günde 2-3 Kez)
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Hedefe ulaşılana kadar gündüz ve akşamüstü aralıklarla motive edici uyarı gönderir.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Push Notification Integration Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-zinc-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-900">
                        Tarayıcı / Masaüstü Push Bildirimi
                      </h5>
                      <span className="text-[11px] text-slate-500 block">
                        Uygulama sekmesi arka plandayken bile bildirim al
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      permission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : permission === 'denied'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {permission === 'granted'
                      ? 'İzin Verildi'
                      : permission === 'denied'
                      ? 'Engellendi'
                      : 'İzin Bekleniyor'}
                  </span>
                </div>

                {permission !== 'granted' && (
                  <button
                    onClick={handleRequestPushPermission}
                    disabled={requestingPerm}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer "
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>
                      {requestingPerm ? 'İzin İsteniyor...' : 'Tarayıcı Bildirimlerine İzin Ver'}
                    </span>
                  </button>
                )}
                {permission === 'granted' && (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tarayıcı push bildirimleri ve uygulama içi uyarılar tam uyumlu.</span>
                  </p>
                )}
              </div>

              {/* Switches: Sound & Weekend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.soundAlert ? (
                      <Volume2 className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      Zil & Ses Efekti
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.soundAlert}
                    onChange={(e) => handleToggleSound(e.target.checked)}
                    className="rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Hafta Sonu Dahil
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.weekendIncluded}
                    onChange={(e) => handleToggleWeekend(e.target.checked)}
                    className="rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          {/* Test Reminder CTA */}
          <div className="pt-2 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleTestReminder}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2  transition-all cursor-pointer active:scale-95"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              <span>Hatırlatıcıyı Şimdi Test Et</span>
            </button>

            {testSent && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Uyarı gönderildi!</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-zinc-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Ayarlar cihazınızda güvenle saklanır.
          </p>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
