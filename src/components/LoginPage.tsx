import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { sound } from '../lib/sound';
import { Logo } from './Logo';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  Star, Flame, Users
} from 'lucide-react';

import { LoginForm } from '../features/auth/components/LoginForm';
import { RegistrationForm } from '../features/auth/components/RegistrationForm';
import { ForgotPasswordModal } from '../features/auth/components/ForgotPasswordModal';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, userProfile?: UserProfile) => void;
  onNavigateHome: () => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
  initialRole = 'student',
  initialMode = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [createdStudentCode, setCreatedStudentCode] = useState<string | null>(null);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleRegisterSuccess = (options: {
    identifier: string;
    role: UserRole;
    successToast: string;
    createdStudentCode: string | null;
  }) => {
    setSelectedRole(options.role);
    setActiveTab('login');
    setSuccessToast(options.successToast);
    setCreatedStudentCode(options.createdStudentCode);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Return to Landing */}
      <div className="max-w-6xl mx-auto w-full mb-4 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white px-3.5 py-2 rounded-xl border border-zinc-200 hover: transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-zinc-200 ">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-Bit SSL Şifreli & Reklamsız Güvenli Alan</span>
        </div>
      </div>

      {/* Main Split Authentication Card */}
      <div className="max-w-6xl mx-auto w-full bg-white rounded-xl border border-zinc-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Form Column (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header / Brand Title */}
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <Logo
                size="md"
                showText={true}
                showTagline={true}
                onClick={onNavigateHome}
              />

              {/* Mode Toggle Pills (Giriş / Kayıt) */}
              <div className="flex w-full sm:w-auto p-1 rounded-xl bg-slate-100 text-xs font-bold border border-zinc-200" role="tablist" aria-label="Hesap işlemi">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('login');
                    setErrorMessage(null);
                    setSuccessToast(null);
                  }}
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white text-indigo-700 '
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('register');
                    if (selectedRole === 'admin') setSelectedRole('student');
                    setErrorMessage(null);
                    setSuccessToast(null);
                  }}
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white text-indigo-700 '
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yeni Kayıt
                </button>
              </div>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div role="alert" aria-live="assertive" className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successToast && (
              <div role="status" aria-live="polite" className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <span>{successToast}</span>
                  {createdStudentCode && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/80 px-2.5 py-2 text-slate-800">
                      <span>Öğrenci kodu: <strong className="tracking-wider">{createdStudentCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(createdStudentCode)}
                        className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                      >
                        Kodu Kopyala
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LOGIN MODE */}
            {activeTab === 'login' ? (
              <LoginForm
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                onLoginSuccess={onLoginSuccess}
                onShowForgotPassword={() => setShowForgotPasswordModal(true)}
                setErrorMessage={setErrorMessage}
                setSuccessToast={setSuccessToast}
              />
            ) : (
              /* REGISTER MODE */
              <RegistrationForm
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                setErrorMessage={setErrorMessage}
                onRegisterSuccess={handleRegisterSuccess}
              />
            )}
          </div>

          {/* Pedagogy & Security Trust Footer */}
          <div className="pt-6 mt-6 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Çocuk odaklı, reklamsız öğrenme deneyimi</span>
            </div>
            <div className="flex items-center gap-3 font-semibold">
              <span className="text-slate-400">•</span>
              <span>Reklamsız Çocuk Alanı</span>
              <span className="text-slate-400">•</span>
              <span>Pedagojik İpucu Koçu</span>
            </div>
          </div>
        </div>

        {/* Right Feature Showcase Column (5 Cols) with Real Photo Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-10 relative flex flex-col justify-between overflow-hidden">
          {/* Real Learning Photo as subtle texture */}
          <img
            src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80"
            alt="Anne ve çocuk ZekaPark ile birlikte zihinsel becerilerini geliştiriyor"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity pointer-events-none"
          />

          {/* Ambient Lighting Gradient */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Stat Pills */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-indigo-200">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Parametrik bilişsel beceri çalışmaları</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] leading-tight">
                Zihinsel Potansiyeli Özgür Bırakan Akıllı Algoritmalar
              </h2>
              <p className="text-indigo-200 text-xs sm:text-sm mt-2 leading-relaxed">
                Her çocuk kendine özel hızda öğrenir. ZekaPark parametrik soru motoru ezberletmez, analitik düşünme refleksini kazandırır.
              </p>
            </div>

            {/* Floating Highlight Cards */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-extrabold font-['Outfit',sans-serif]">
                    Tekrarlanabilir Parametrik Tohumlar
                  </div>
                  <div className="text-[11px] text-indigo-200">
                    Aynı soru tipi, farklı tohumlarla yeni ve yeniden üretilebilir varyasyonlar oluşturur.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-extrabold font-['Outfit',sans-serif]">
                    3 Aşamalı Sokratik İpucu
                  </div>
                  <div className="text-[11px] text-indigo-200">
                    Cevabı doğrudan vermez; çocuğu doğru mantığa adım adım yönlendirir.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Users className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <div className="text-xs font-extrabold font-['Outfit',sans-serif]">
                    Şeffaf Veli Bilişsel Isı Haritası
                  </div>
                  <div className="text-[11px] text-indigo-200">
                    Hangi bilişsel kategoride ne kadar yol kat edildiğini şeffafça izleyin.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product scope note */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/15">
            <p className="text-xs text-indigo-100 leading-relaxed">
              ZekaPark bağımsız bir bilişsel beceri çalışma aracıdır. Resmî sınav sonucu veya başarı garantisi sunmaz.
            </p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccessToast={setSuccessToast}
      />
    </div>
  );
};
