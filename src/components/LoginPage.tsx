import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { sound } from '../lib/sound';
import { Logo } from './Logo';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  BookOpen, 
  Layers, 
  Compass, 
  Users, 
  Copy,
  Check
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
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleCopyCode = () => {
    if (!createdStudentCode) return;
    navigator.clipboard?.writeText(createdStudentCode);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2000);
  };

  const handleRegisterSuccess = (options: {
    identifier: string;
    role: UserRole;
    successToast: string;
    createdStudentCode: string | null;
    autoProfile?: UserProfile;
  }) => {
    setSelectedRole(options.role);
    setSuccessToast(options.successToast);
    setCreatedStudentCode(options.createdStudentCode);

    if (options.autoProfile) {
      setTimeout(() => {
        onLoginSuccess(options.role, options.autoProfile);
      }, 600);
      return;
    }

    setActiveTab('login');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/80 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="max-w-6xl mx-auto w-full mb-4 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-Bit SSL Şifreli & Reklamsız Güvenli Alan</span>
        </div>
      </div>

      {/* Main Split Authentication Card */}
      <div className="max-w-6xl mx-auto w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Form Column (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header / Brand Title & Tabs */}
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-slate-100">
              <Logo
                size="md"
                showText={true}
                showTagline={true}
                onClick={onNavigateHome}
              />

              {/* Mode Toggle Tabs */}
              <div className="flex w-full sm:w-auto p-1 rounded-xl bg-slate-100/80 text-xs font-bold border border-slate-200/80" role="tablist" aria-label="Hesap işlemi">
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
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
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
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  Yeni Kayıt
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div role="alert" aria-live="assertive" className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message & Student Code Card */}
            {successToast && (
              <div role="status" aria-live="polite" className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{successToast}</span>
                  {createdStudentCode && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5 border border-emerald-200 shadow-xs">
                      <span className="text-slate-700 font-medium">
                        Öğrenci Giriş Kodu: <strong className="text-slate-900 font-mono tracking-wider text-sm">{createdStudentCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        {hasCopiedCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span>Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-emerald-700" />
                            <span>Kodu Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Mode Form */}
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
              <RegistrationForm
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                setErrorMessage={setErrorMessage}
                onRegisterSuccess={handleRegisterSuccess}
              />
            )}
          </div>

          {/* Pedagogy & Security Trust Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Çocuk odaklı, reklamsız öğrenme ortamı</span>
            </div>
            <div className="flex items-center gap-3 font-medium">
              <span>BİLSEM Standartları</span>
              <span className="text-slate-300">•</span>
              <span>KVKK Uyumlu</span>
              <span className="text-slate-300">•</span>
              <span>Pedagojik İpucu Desteği</span>
            </div>
          </div>
        </div>

        {/* Right Feature Showcase Column (5 Cols) with High-End Educational Design */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 relative flex flex-col justify-between overflow-hidden">
          {/* Subtle Educational Background Texture */}
          <img
            src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80"
            alt="ZekaPark Bilişsel Gelişim Çalışması"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-luminosity pointer-events-none"
          />

          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>BİLSEM & Analitik Düşünme Platformu</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit',sans-serif] leading-tight">
                Zihinsel Muhakeme ve Görsel Algı Becerileri
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-2.5 leading-relaxed">
                Ezbercilikten uzak, 1., 2., 3. ve 4. sınıf düzeyindeki öğrencilerin mantık kurma ve uzamsal algılama reflekslerini geliştiren bilimsel çalışma ortamı.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                  <Layers className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <div className="text-xs font-bold font-['Outfit',sans-serif] text-white">
                    16 Farklı Bilişsel Yetenek Alanı
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Matris tamamlama, 3D küp açılımları, mekanik terazi dengesi, örüntü tanıma ve perspektif analizi.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Compass className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-xs font-bold font-['Outfit',sans-serif] text-white">
                    Adım Adım Mantıksal Rehberlik
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Çözümü doğrudan dayatmayan, çocuğun kendi akıl yürütmesiyle sonuca ulaşmasını sağlayan ipuçları.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/20 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-xs font-bold font-['Outfit',sans-serif] text-white">
                    Şeffaf Veli Gelişim Raporları
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Hangi bilişsel kategoride ne kadar yol kat edildiğini anlık ve net grafiklerle izleme olanağı.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Pedagogical Note */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ZekaPark bağımsız bir bilişsel gelişim platformudur. Resmî sınav kurumu ile doğrudan bağlantılı olmayıp öğrencilere analitik düşünme refleksleri kazandırmayı hedefler.
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
