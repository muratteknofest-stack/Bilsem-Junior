import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';
import { UserProfile } from '../types';
import { sound } from '../lib/sound';

interface StudentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile;
  onResetPassword: () => void;
}

export const StudentSettingsModal: React.FC<StudentSettingsModalProps> = ({
  isOpen,
  onClose,
  student,
  onResetPassword,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (student.studentCode) {
      navigator.clipboard.writeText(student.studentCode);
      setCopied(true);
      sound.playSuccess();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 dark:border-slate-700 relative animate-in fade-in zoom-in-95 duration-200 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        
        <h3 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit',sans-serif]">
          Öğrenci Giriş Bilgileri
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Öğrencinizin sisteme giriş yapabilmesi için gereken bilgileri yönetin.
        </p>

        <div className="mt-6 space-y-4">
          {/* Student Code Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Öğrenci Giriş Kodu
            </label>
            <div className="flex items-center justify-between">
              <div className="text-lg font-black text-slate-900 dark:text-white tracking-widest">
                {student.studentCode || 'KOD BULUNAMADI'}
              </div>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Kodu Kopyala"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Öğrenciniz giriş ekranında kullanıcı adı yerine bu kodu kullanmalıdır.
            </p>
          </div>

          {/* Password Reset Box */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Güvenli Şifre Yenileme
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Yeni şifreyi veli olarak siz belirlersiniz. İşlem tamamlandığında öğrencinin açık oturumları güvenlik için kapatılır.
            </p>
            <button
              onClick={() => {
                onClose();
                onResetPassword();
              }}
              className="mt-3 w-full py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              Yeni Öğrenci Şifresi Belirle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
