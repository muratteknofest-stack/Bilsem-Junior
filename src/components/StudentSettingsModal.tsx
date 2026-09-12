import React, { useState } from 'react';
import { X, KeyRound, Mail, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { UserProfile } from '../types';
import { sound } from '../lib/sound';

interface StudentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile;
  parentEmail?: string;
  onSendResetEmail: (email: string) => Promise<void>;
}

export const StudentSettingsModal: React.FC<StudentSettingsModalProps> = ({
  isOpen,
  onClose,
  student,
  parentEmail,
  onSendResetEmail,
}) => {
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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

  const handleResetPassword = async () => {
    if (!parentEmail) return;
    setResetStatus('loading');
    try {
      // In a real app with Firebase Admin SDK, we would reset the student's specific password.
      // Here, we send a reset link to the parent email as a fallback, or simulate the process.
      await onSendResetEmail(parentEmail);
      setResetStatus('success');
      sound.playSuccess();
    } catch (error) {
      console.error(error);
      setResetStatus('error');
      sound.playError();
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
              <Mail className="w-4 h-4 text-indigo-500" />
              Şifre Sıfırlama
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Öğrenciniz şifresini unuttuğunda, güvenliğiniz için şifre sıfırlama bağlantısı veli e-posta adresinize (<strong>{parentEmail}</strong>) gönderilir.
            </p>
            
            {resetStatus === 'idle' || resetStatus === 'error' ? (
              <button
                onClick={handleResetPassword}
                disabled={!parentEmail}
                className="mt-3 w-full py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Veli E-postasına Sıfırlama Linki Gönder
              </button>
            ) : resetStatus === 'loading' ? (
              <div className="mt-3 w-full py-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="mt-3 w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Sıfırlama Linki Gönderildi!
              </div>
            )}
            
            {resetStatus === 'error' && (
              <p className="text-[10px] text-rose-500 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> İşlem başarısız oldu. Lütfen tekrar deneyin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
