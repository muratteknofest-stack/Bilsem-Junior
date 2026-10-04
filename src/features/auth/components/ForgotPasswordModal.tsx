import React, { useEffect, useRef, useState } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { sound } from '../../../lib/sound';
import { forgotPasswordSchema, formatZodError } from '../../../lib/validations';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const { sendPasswordResetEmail } = useAuth();
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const forgotEmailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    forgotEmailInputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isResettingPassword) {
        onClose();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isResettingPassword, onClose]);

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setForgotEmail('');
      setForgotSubmitted(false);
      setForgotError(null);
    }
  }, [isOpen]);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResettingPassword) return;
    setForgotError(null);

    const validationResult = forgotPasswordSchema.safeParse({
      email: forgotEmail.trim(),
    });

    if (!validationResult.success) {
      sound.playError();
      const { firstMessage } = formatZodError(validationResult.error);
      setForgotError(firstMessage);
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(forgotEmail.trim());
      sound.playSuccess();
      setForgotSubmitted(true);
      onSuccessToast('Eğer e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setForgotSubmitted(true);
        onSuccessToast('Eğer e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.');
        return;
      }
      sound.playError();
      let errMsg = 'Şifre sıfırlama e-postası gönderilemedi.';
      if (err.code === 'auth/invalid-email') errMsg = 'Geçersiz e-posta adresi.';
      else if (err.code === 'auth/network-request-failed') errMsg = 'Ağ bağlantısı kurulamadı. Lütfen tekrar deneyin.';
      setForgotError(errMsg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-slate-200/80 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          aria-label="Kapat"
          onClick={onClose}
          disabled={isResettingPassword}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
          <KeyRound className="w-5 h-5" />
        </div>

        <h3 id="forgot-password-title" className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif]">
          Şifre Sıfırlama
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Kayıtlı e-posta adresinizi girerek güvenli bir şifre yenileme bağlantısı talep edebilirsiniz.
        </p>

        {!forgotSubmitted ? (
          <form
            onSubmit={handleForgotPasswordSubmit}
            className="mt-4 space-y-3.5"
            noValidate
          >
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-700 mb-1">
                Kayıtlı E-posta Adresi
              </label>
              <input
                ref={forgotEmailInputRef}
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  if (forgotError) setForgotError(null);
                }}
                placeholder="veli@eposta.com veya ogrenci@eposta.com"
                autoComplete="email"
                aria-invalid={Boolean(forgotError)}
                aria-describedby={forgotError ? 'forgot-email-error' : undefined}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  forgotError
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
              {forgotError && (
                <p id="forgot-email-error" role="alert" className="mt-1.5 text-xs text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{forgotError}</span>
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="text-slate-700">Öğrenci Kodu ile Giriş Yapanlar:</strong> Öğrenci şifresi yenileme işlemi veli panelindeki hesap yönetimi alanından yapılabilir.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isResettingPassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isResettingPassword}
                aria-busy={isResettingPassword}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isResettingPassword ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 text-center p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold">Talimatlar Gönderildi</h4>
            <p className="text-xs mt-1 text-emerald-800 leading-relaxed">
              Kayıtlı bir hesap bulunuyorsa <strong className="font-semibold">{forgotEmail}</strong> adresine şifre sıfırlama bağlantısı iletildi.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tamam
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
