import React, { useState } from 'react';
import { Bell, Mail, CheckCircle2 } from 'lucide-react';
import { UserProfile, WeeklyQuestionProgressData } from '../types';

interface NotificationPreferencesProps {
  currentStudent: UserProfile;
  weeklyData: WeeklyQuestionProgressData | null;
  accuracy: number;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  currentStudent,
  weeklyData,
  accuracy
}) => {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [reportDay, setReportDay] = useState('Friday');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          Bildirim Ayarları
        </h2>
        
        <div className="space-y-8 max-w-2xl">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">Haftalık E-posta Bildirimleri</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Çocuğunuzun haftalık gelişim raporunu e-posta ile alın.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          {emailEnabled && (
            <div className="pt-6 border-t border-zinc-200/60 dark:border-zinc-800">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">Rapor Gönderim Günü</label>
              <select 
                value={reportDay}
                onChange={(e) => setReportDay(e.target.value)}
                className="w-full md:w-64 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm transition-all outline-none"
              >
                <option value="Friday">Cuma Günü (Okul Çıkışı)</option>
                <option value="Sunday">Pazar Akşamı (Hafta Özeti)</option>
                <option value="Monday">Pazartesi Sabahı</option>
              </select>
            </div>
          )}
          
          <div className="pt-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center min-w-[140px] shadow-sm"
            >
              {isSaving ? (
                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Kaydedildi
                </>
              ) : (
                'Ayarları Kaydet'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email Preview Panel */}
      {emailEnabled && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            Haftalık Rapor Önizlemesi
          </h2>
          
          <div className="max-w-xl border border-zinc-200/60 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm mx-auto sm:mx-0">
            <div className="bg-zinc-900 dark:bg-zinc-950 p-8 text-center border-b border-zinc-800">
              <h3 className="text-white text-xl font-bold m-0 tracking-tight">ZekaPark Haftalık Gelişim Özeti</h3>
            </div>
            <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900">
              <p className="text-zinc-900 dark:text-zinc-100 mb-4 font-bold text-lg">Merhaba,</p>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-base leading-relaxed">Öğrencimiz <strong className="text-zinc-900 dark:text-zinc-100">{currentStudent.name}</strong>'ın bu haftaki çalışma performansı başarıyla analiz edildi:</p>
              
              <div className="bg-zinc-50 dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-700 mb-8 space-y-5 shadow-sm">
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">⏱️ Haftalık Çalışma</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{weeklyData?.thisWeekTotal || 0} dakika</strong>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">🎯 Çözülen Soru</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">42 soru</strong>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">✅ Doğruluk Oranı</span>
                  <strong className="text-emerald-500">% {accuracy}</strong>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">🔥 Güncel Seri</span>
                  <strong className="text-amber-500">{currentStudent.streak || 0} gün</strong>
                </div>
              </div>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-8 leading-relaxed font-medium">
                Gelişim eğrisini incelemek ve yapay zeka destekli detaylı analizlere ulaşmak için Veli Portalı'nı ziyaret edebilirsiniz.
              </p>
              
              <div className="text-center">
                <span className="inline-block px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl shadow-sm">Portala Giriş Yap</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
