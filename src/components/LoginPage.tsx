import { isAndroidApp } from '../lib/native-app';
import { LegalLinks } from './LegalLinks';
import { useEntryViewport } from '../hooks/useEntryViewport';
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
  Users
} from 'lucide-react';

import { LoginForm } from '../features/auth/components/LoginForm';
import { RegistrationForm, type RegistrationSuccess } from '../features/auth/components/RegistrationForm';
import { RegistrationConfirmation } from '../features/auth/components/RegistrationConfirmation';
import { ForgotPasswordModal } from '../features/auth/components/ForgotPasswordModal';
import './landing/design-system.css';
import '../features/auth/auth-design-system.css';
import './android/android-entry.css';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, userProfile?: UserProfile) => void;
  onNavigateHome: () => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register', role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
  initialRole = 'student',
  initialMode = 'login',
  onModeChange,
}) => {
  const viewportRef = useEntryViewport(isAndroidApp);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialMode === 'register' || initialRole === 'parent' ? 'parent' : 'student');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationSuccess | null>(null);
  const [registrationPage, setRegistrationPage] = useState(0);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const openParentLogin = (email: string) => {
    setSelectedRole('parent');
    setLoginIdentifier(email);
    setActiveTab('login');
    setErrorMessage(null);
    setSuccessToast(null);
    setRegistrationResult(null);
    onModeChange?.('login', 'parent');
  };
  const handleRegisterSuccess = (result: RegistrationSuccess) => {
    setSelectedRole('parent');
    setRegistrationResult(result);
    setErrorMessage(null);
  };

  return (
    <div ref={viewportRef} data-native-entry={isAndroidApp} data-registration-complete={Boolean(registrationResult)} data-registration-page={isAndroidApp && activeTab === 'register' && !registrationResult ? registrationPage : undefined} className="zp-auth min-h-[calc(100vh-4rem)] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="zp-auth-top max-w-6xl mx-auto w-full mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateHome}
          disabled={registrationBusy}
          className="zp-auth-back inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isAndroidApp ? 'Ana sayfa' : 'Ana Sayfaya Dön'}</span>
        </button>

        {isAndroidApp && <Logo size="xs" showTagline={false} showText={false} />}
        <LegalLinks mode="trigger" disabled={registrationBusy}/>
      </div>

      <main className="zp-auth-shell max-w-6xl mx-auto w-full overflow-hidden grid">
        <section className="zp-auth-form-panel flex flex-col justify-between" aria-labelledby="zp-auth-heading">
          <div>
            <div className="zp-auth-brand-row flex items-center justify-between">
              <Logo
                size="md"
                showText={true}
                showTagline={false}
                onClick={registrationBusy ? undefined : onNavigateHome}
              />
              <span className="zp-auth-brand-mark" aria-hidden="true"><Sparkles size={18} /></span>
            </div>

            <div className="zp-auth-intro">
              <p className="zp-auth-kicker">BİLSEM JUNIOR / HAZIRLIK HESABI</p>
              <h1 id="zp-auth-heading">{isAndroidApp ? (activeTab === 'login' ? 'Tekrar hoş geldin!' : 'Birlikte başlayalım') : activeTab === 'login' ? 'Hazırlığına kaldığın yerden devam et.' : 'Bilsem Junior yolculuğun başlasın.'}</h1>
              <p>{activeTab === 'login' ? 'Hesabına gir, yeni sorular ve küçük zaferler seni bekliyor.' : 'Veli bilgilerini gir, öğrenci hesabını ekle ve e-postanı doğrula.'}</p>
            </div>

            <div className="zp-auth-mode" role="group" aria-label="Hesap işlemi">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    if (registrationResult) { openParentLogin(registrationResult.identifier); return; }
                    setActiveTab('login');
                    onModeChange?.('login', selectedRole);
                    setErrorMessage(null);
                    setSuccessToast(null);
                  }}
                  disabled={registrationBusy}
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
                    setSelectedRole('parent');
                    onModeChange?.('register', 'parent');
                    setRegistrationResult(null);
                    setErrorMessage(null);
                    setSuccessToast(null);
                  }}
                  disabled={registrationBusy}
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

            {/* Login feedback */}
            {successToast && (
              <div role="status" aria-live="polite" className="zp-auth-success mb-4 p-4 rounded-xl border font-semibold flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{successToast}</span>

                </div>
              </div>
            )}

            {/* Active Mode Form */}
            {activeTab === 'login' ? (
              <LoginForm
                compact={isAndroidApp}
                initialIdentifier={loginIdentifier}
                selectedRole={selectedRole}
                setSelectedRole={role => { setSelectedRole(role); onModeChange?.('login', role); }}
                onLoginSuccess={onLoginSuccess}
                onShowForgotPassword={() => setShowForgotPasswordModal(true)}
                setErrorMessage={setErrorMessage}
                setSuccessToast={setSuccessToast}
              />
            ) : registrationResult ? (
              <RegistrationConfirmation compact={isAndroidApp} result={registrationResult} onLogin={openParentLogin} />
            ) : (
              <RegistrationForm
                compact={isAndroidApp}
                onPageChange={setRegistrationPage}
                setErrorMessage={setErrorMessage}
                onRegisterSuccess={handleRegisterSuccess}
                onBusyChange={setRegistrationBusy}
                onLogin={openParentLogin}
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

        <aside className="zp-auth-showcase relative flex flex-col justify-between overflow-hidden" aria-label="Bilsem Junior keşif alanları">
          <div className="zp-auth-showcase-content">
            <span className="zp-auth-showcase-kicker"><Sparkles size={16} aria-hidden="true" /> MERAK EDEN ZİHİNLER İÇİN</span>
            <h2>BİLSEM hazırlığında her gün bir adım.</h2>
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


