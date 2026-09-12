import React, { useState } from 'react';
import { sound } from '../../lib/sound';
import {
  Settings,
  Sliders,
  Database,
  Volume2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface AdminSystemSettingsProps {
  onSyncNeeded: () => void;
}

export const AdminSystemSettings: React.FC<AdminSystemSettingsProps> = ({ onSyncNeeded }) => {
  const [examQuestionCount, setExamQuestionCount] = useState<number>(30);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number>(45);
  const [adaptiveDifficultyEnabled, setAdaptiveDifficultyEnabled] = useState<boolean>(true);
  const [soundVolumeEnabled, setSoundVolumeEnabled] = useState<boolean>(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSaveSettings = () => {
    sound.playSuccess();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleTestSound = (type: 'correct' | 'wrong' | 'levelup' | 'reminder') => {
    if (type === 'correct') sound.playSuccess();
    if (type === 'wrong') sound.playError();
    if (type === 'levelup') sound.playLevelUp();
    if (type === 'reminder') sound.playReminderChime();
  };

  const handleExportAllData = () => {
    sound.playClick();
    const backupObj: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        backupObj[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zekapark_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFactoryReset = () => {
    sound.playClick();
    localStorage.clear();
    setResetConfirmOpen(false);
    onSyncNeeded();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-extrabold text-slate-900">
            Sistem Parametreleri & Sınav Konfigürasyonu
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          ZekaPark BİLSEM simülasyon parametrelerini, adaptif zorluk eğrisini ve veri tabanı yedekleme rutinlerini yönetin.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Sistem yapılandırma parametreleri başarıyla güncellendi.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: BİLSEM Exam Presets */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
            <Sliders className="w-4 h-4 text-purple-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              BİLSEM Deneme Sınavı Standartları
            </h3>
          </div>

          {/* Question count selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Varsayılan Deneme Soru Sayısı
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 15, label: '15 Soru (Mini)' },
                { count: 30, label: '30 Soru (Standart)' },
                { count: 40, label: '40 Soru (Tam BİLSEM)' },
              ].map((item) => (
                <button
                  key={item.count}
                  onClick={() => setExamQuestionCount(item.count)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    examQuestionCount === item.count
                      ? 'bg-purple-600 text-white border-purple-600 '
                      : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time per question */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Soru Başına Tanınan Standart Süre
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { sec: 30, label: '30 Saniye (Hızlı)' },
                { sec: 45, label: '45 Saniye (MEB Standart)' },
                { sec: 60, label: '60 Saniye (Öğrenme)' },
              ].map((item) => (
                <button
                  key={item.sec}
                  onClick={() => setSecondsPerQuestion(item.sec)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    secondsPerQuestion === item.sec
                      ? 'bg-purple-600 text-white border-purple-600 '
                      : 'bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bilsem Rule Note */}
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>MEB BİLSEM Kuralı Devrede:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-800">
              Yanlış cevaplar doğruları götürmez. Öğrencinin tereddütte kaldığı sorularda mantıklı tahmin yapması teşvik edilir.
            </p>
          </div>

          {/* Audio sound preview */}
          <div className="pt-2 border-t border-zinc-200">
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Ses Efekti Motoru Testi
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleTestSound('correct')}
                className="py-1.5 px-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
              >
                Doğru
              </button>
              <button
                onClick={() => handleTestSound('wrong')}
                className="py-1.5 px-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer"
              >
                Yanlış
              </button>
              <button
                onClick={() => handleTestSound('levelup')}
                className="py-1.5 px-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 cursor-pointer"
              >
                Seviye
              </button>
              <button
                onClick={() => handleTestSound('reminder')}
                className="py-1.5 px-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 cursor-pointer"
              >
                Zil / Hatırlatıcı
              </button>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs  cursor-pointer transition-colors"
          >
            Sınav Standartlarını Kaydet
          </button>
        </div>

        {/* Right Column: Adaptive CAT & Backup Controls */}
        <div className="space-y-4">
          {/* Adaptive CAT Engine */}
          <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Adaptif Algoritma (IRT / CAT)
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-zinc-200">
                <div>
                  <div className="font-bold text-slate-900">Otomatik Zorluk Adaptasyonu</div>
                  <div className="text-[11px] text-slate-500">
                    Öğrenci üst üste 2 doğru yaptığında zorluğu 1 kademe artırır
                  </div>
                </div>
                <button
                  onClick={() => setAdaptiveDifficultyEnabled(!adaptiveDifficultyEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    adaptiveDifficultyEnabled ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full  transform transition-transform ${
                      adaptiveDifficultyEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-zinc-200 space-y-1 font-mono text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Yetenek Katsayısı (K-Factor):</span>
                  <span className="font-bold text-purple-700">0.32</span>
                </div>
                <div className="flex justify-between">
                  <span>Hedef Akış Doğruluk Aralığı:</span>
                  <span className="font-bold text-emerald-700">%70 - %85</span>
                </div>
                <div className="flex justify-between">
                  <span>Otomatik Hata Defteri Kaydı:</span>
                  <span className="font-bold text-slate-800">Aktif</span>
                </div>
              </div>
            </div>
          </div>

          {/* Database Backup & Factory Reset */}
          <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
              <Database className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Veritabanı & Platform Yedekleme
              </h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleExportAllData}
                className="w-full py-2.5 px-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tüm Platform Durumunu JSON Olarak İndir (Yedek)</span>
              </button>

              <button
                onClick={() => setResetConfirmOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Verileri Sıfırla & Fabrika Ayarlarına Dön</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border border-zinc-200  space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Verileri Sıfırlamak İstiyor Musunuz?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tüm öğrenci ilerlemeleri, sınav sonuçları ve hata kayıtları temizlenecektir. Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleFactoryReset}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
