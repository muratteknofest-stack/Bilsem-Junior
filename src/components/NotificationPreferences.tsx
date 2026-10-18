import React from 'react';
import { Bell, Mail, Info } from 'lucide-react';
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
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          Haftalık Raporlar
        </h2>
        <div className="max-w-2xl flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="leading-relaxed">
            Zamanlanmış otomatik gönderim etkin değil. Güncel raporu, Genel Bakış ekranındaki
            <strong> Haftalık Raporu Gönder</strong> düğmesiyle kayıtlı veli e-posta adresine güvenli biçimde gönderebilirsiniz.
          </p>
        </div>
      </div>

      {/* Email Preview Panel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            Haftalık Rapor Önizlemesi
          </h2>
          
          <div className="max-w-xl border border-zinc-200/60 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm mx-auto sm:mx-0">
            <div className="bg-zinc-900 dark:bg-zinc-950 p-8 text-center border-b border-zinc-800">
              <h3 className="text-white text-xl font-bold m-0 tracking-tight">Bilsem Junior Haftalık Gelişim Özeti</h3>
            </div>
            <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900">
              <p className="text-zinc-900 dark:text-zinc-100 mb-4 font-bold text-lg">Merhaba,</p>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-base leading-relaxed">Öğrencimiz <strong className="text-zinc-900 dark:text-zinc-100">{currentStudent.name}</strong>'ın bu haftaki çalışma performansı başarıyla analiz edildi:</p>
              
              <div className="bg-zinc-50 dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-700 mb-8 space-y-5 shadow-sm">
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">⏱️ Bugünkü Çalışma</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{currentStudent.todayMinutesSpent || 0} dakika</strong>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">🎯 Çözülen Soru</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{weeklyData?.summary.thisWeekTotal || 0} soru</strong>
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
    </div>
  );
};
