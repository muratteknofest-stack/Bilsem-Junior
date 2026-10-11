import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { sound } from '../lib/sound';
import { Logo } from './Logo';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Layers, 
  Compass, 
  Users, 
  Copy,
  Check
} from 'lucide-react';

import { LoginForm } from '../features/auth/components/LoginForm';
import { RegistrationForm } from '../features/auth/components/RegistrationForm';
import { ForgotPasswordModal } from '../features/auth/components/ForgotPasswordModal';
import './landing/design-system.css';
import '../features/auth/auth-design-system.css';

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
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole === 'parent' ? 'parent' : 'student');

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
    <div className="zp-auth min-h-[calc(100vh-4rem)] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="zp-auth-top max-w-6xl mx-auto w-full mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateHome}
          className="zp-auth-back inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <div className="zp-auth-top-note hidden sm:flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl border">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Öğrenci ve veli hesapları</span>
        </div>
      </div>

      <main className="zp-auth-shell max-w-6xl mx-auto w-full overflow-hidden grid">
        <section className="zp-auth-form-panel flex flex-col justify-between" aria-labelledby="zp-auth-heading">
          <div>
            <div className="zp-auth-brand-row flex items-center justify-between">
              <Logo
                size="md"
                showText={true}
                showTagline={false}
                onClick={onNavigateHome}
              />
              <span className="zp-auth-brand-mark" aria-hidden="true"><Sparkles size={18} /></span>
            </div>

            <div className="zp-auth-intro">
              <p className="zp-auth-kicker">ZEKA PARKI / HESAP ALANI</p>
              <h1 id="zp-auth-heading">{activeTab === 'login' ? 'Keşfe kaldığın yerden devam et.' : 'Yeni bir keşif başlasın.'}</h1>
              <p>{activeTab === 'login' ? 'Hesabına gir, yeni sorular ve küçük zaferler seni bekliyor.' : 'Öğrenci veya veli hesabını oluştur, kendi öğrenme yolculuğunu başlat.'}</p>
            </div>

            <div className="zp-auth-mode" role="group" aria-label="Hesap işlemi">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('login');
                    setErrorMessage(null);
                    setSuccessToast(null);
                  }}
                  aria-pressed={activeTab === 'login'}
                  className="zp-auth-mode-button"
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
                  aria-pressed={activeTab === 'register'}
                  className="zp-auth-mode-button"
                >
                  Yeni Kayıt
                </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div role="alert" aria-live="assertive" className="zp-auth-alert mb-4 p-3.5 rounded-xl border font-semibold flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message & Student Code Card */}
            {successToast && (
              <div role="status" aria-live="polite" className="zp-auth-success mb-4 p-4 rounded-xl border font-semibold flex items-start gap-3">
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
                        className="zp-auth-copy ml-auto inline-flex items-center gap-1 rounded-md border px-3 py-2 font-bold transition-colors cursor-pointer"
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

          <div className="zp-auth-foot pt-6 mt-6 border-t flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Çocuk odaklı öğrenme alanı</span>
            </div>
            <span>Kendi hızında ilerle.</span>
          </div>
        </section>

        <aside className="zp-auth-showcase relative flex flex-col justify-between overflow-hidden" aria-label="ZekaPark keşif alanları">
          <div className="zp-auth-showcase-content">
            <span className="zp-auth-showcase-kicker"><Sparkles size={16} aria-hidden="true" /> MERAK EDEN ZİHİNLER İÇİN</span>
            <h2>Her soruda yeni bir dünya.</h2>
            <p>Örüntüleri yakala, mantık kur ve öğrendikçe kendi yolunu çiz.</p>
          </div>
          <div className="zp-auth-scene" aria-hidden="true">
            <div className="zp-auth-orbit zp-auth-orbit-one" /><div className="zp-auth-orbit zp-auth-orbit-two" />
            <div className="zp-auth-scene-cube zp-auth-scene-cube-one" /><div className="zp-auth-scene-cube zp-auth-scene-cube-two" />
            <div className="zp-auth-scene-sphere zp-auth-scene-sphere-one" /><div className="zp-auth-scene-sphere zp-auth-scene-sphere-two" />
            <div className="zp-auth-scene-core"><span>z</span><i /><i /></div>
            <div className="zp-auth-scene-plinth" />
            <div className="zp-auth-scene-note"><span>✦</span> Bugünün rotası: keşfet.</div>
          </div>
          <div className="zp-auth-showcase-footer">
            <div><Layers size={18} aria-hidden="true" /><span>Farklı düşünme yolları</span></div>
            <div><Compass size={18} aria-hidden="true" /><span>Kendi hızında ilerleme</span></div>
            <div><Users size={18} aria-hidden="true" /><span>Veli ile birlikte takip</span></div>
          </div>
        </aside>
      </main>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccessToast={setSuccessToast}
      />
    </div>
  );
};


