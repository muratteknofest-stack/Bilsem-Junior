import React, { useState } from 'react';
import { UserRole, UserProfile } from '../../../types';
import { auth, db } from '../../../lib/platform';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '../../../lib/supabase';
import { doc, getDoc } from '../../../lib/supabase-data';
import { dataService } from '../../../services/data-service';
import { sound } from '../../../lib/sound';
import { useAuth } from '../../../contexts/AuthContext';
import { isManagedStudentEmail, studentCodeToEmail } from '../../../lib/account-identifiers';
import { loginSchema, formatZodError } from '../../../lib/validations';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  ArrowRight,
  GraduationCap,
  Users,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface LoginFormProps {
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  onLoginSuccess: (role: UserRole, userProfile?: UserProfile) => void;
  onShowForgotPassword: () => void;
  setErrorMessage: (msg: string | null) => void;
  setSuccessToast: (msg: string | null) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  selectedRole,
  setSelectedRole,
  onLoginSuccess,
  onShowForgotPassword,
  setErrorMessage,
  setSuccessToast
}) => {
  const { loginLocally, sendEmailVerification } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleQuickDemo = (role: 'student' | 'parent') => {
    sound.playClick();
    setSelectedRole(role);
    setErrorMessage(null);
    setFieldErrors({});

    if (role === 'student') {
      // Demo student account
      const demoProfile: UserProfile = {
        id: 'demo_student_user',
        email: 'ogrenci@zekapark.com',
        name: 'Deniz Acar',
        role: 'student',
        grade: 2,
        examFocus: 'Genel Zihinsel Yetenek',
        avatar: '🦊',
        level: 3,
        xp: 340,
        streak: 5,
        lastActiveDate: new Date().toISOString(),
        dailyGoalMinutes: 15,
        todayMinutesSpent: 8,
        soundEnabled: true,
        createdAt: Date.now() - 86400000 * 7,
        updatedAt: Date.now(),
        totalPoints: 720,
        claimedStreakDays: [1, 2, 3, 4],
        totalQuestionsSolved: 48,
        resolvedMistakesCount: 6,
      };
      dataService.loginAs('student', demoProfile);
      loginLocally(demoProfile);
      sound.playSuccess();
      setSuccessToast('Öğrenci demo modu ile giriş yapıldı.');
      setTimeout(() => onLoginSuccess('student', demoProfile), 300);
    } else if (role === 'parent') {
      const demoProfile: UserProfile = {
        id: 'demo_parent_user',
        email: 'veli@zekapark.com',
        name: 'Zeynep Acar',
        role: 'parent',
        avatar: '👨‍👩‍👧',
        level: 1,
        xp: 0,
        streak: 0,
        lastActiveDate: new Date().toISOString(),
        dailyGoalMinutes: 0,
        todayMinutesSpent: 0,
        soundEnabled: true,
        linkedStudentIds: ['demo_student_user'],
        parentPhone: '0555 123 4567',
        createdAt: Date.now() - 86400000 * 7,
        updatedAt: Date.now(),
      };
      dataService.loginAs('parent', demoProfile);
      loginLocally(demoProfile);
      sound.playSuccess();
      setSuccessToast('Veli portalı demo modu ile giriş yapıldı.');
      setTimeout(() => onLoginSuccess('parent', demoProfile), 300);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setFieldErrors({});

    const validationResult = loginSchema.safeParse({
      identifier: identifier.trim(),
      password: password,
      role: selectedRole,
      rememberMe: rememberMe,
    });

    if (!validationResult.success) {
      sound.playError();
      const { firstMessage, fieldErrors: errs } = formatZodError(validationResult.error);
      setErrorMessage(firstMessage);
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      let loginEmail = identifier.trim();
      if (!loginEmail.includes('@')) {
        loginEmail = studentCodeToEmail(loginEmail);
      }

      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const credential = await signInWithEmailAndPassword(auth, loginEmail, password);
      if (selectedRole === 'admin') {
        const token = await credential.user.getIdTokenResult(true);
        if (!credential.user.emailVerified || token.claims.role !== 'admin') {
          throw new Error('ADMIN_ACCESS_DENIED');
        }
      }

      // Non-blocking verification notice if email is not verified
      if (!isManagedStudentEmail(credential.user.email) && !credential.user.emailVerified) {
        sendEmailVerification(credential.user).catch(() => {});
      }

      const userDocRef = doc(db, 'users', credential.user.uid);
      const profileSnapshot = await getDoc(userDocRef);
      if (!profileSnapshot.exists()) throw new Error('PROFILE_NOT_FOUND');
      const loggedInProfile = profileSnapshot.data() as UserProfile;
      if (loggedInProfile.id !== credential.user.uid) throw new Error('PROFILE_NOT_FOUND');
      if (loggedInProfile.role !== selectedRole) throw new Error('ROLE_MISMATCH');
      const activeProfile: UserProfile = { ...loggedInProfile,
        email: credential.user.email || loginEmail };

      dataService.loginAs(selectedRole, activeProfile);
      dataService.hydrateUserStateFromFirebase().catch(console.error);
      loginLocally(activeProfile);
      sound.playSuccess();
      setSuccessToast(
        selectedRole === 'student'
          ? 'Öğrenci girişi başarılı! Yönlendiriliyorsunuz...'
          : selectedRole === 'parent'
          ? 'Veli girişi başarılı! Yönlendiriliyorsunuz...'
          : 'Yönetici girişi başarılı! Yönlendiriliyorsunuz...'
      );
      
      setTimeout(() => {
        onLoginSuccess(selectedRole, activeProfile);
      }, 400);
      
    } catch (error: any) {
      if (selectedRole === 'admin') {
        await firebaseSignOut(auth).catch(() => undefined);
        dataService.logout();
      }
      sound.playError();
      console.warn('Login notice (handled):', error.code || error.message);
      let errMsg = 'Giriş yapılamadı.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
         errMsg = 'Giriş bilgileri hatalı. Lütfen e-posta/öğrenci kodunuzu ve şifrenizi kontrol edin.';
      } else if (error.code === 'auth/invalid-email') {
         errMsg = 'Geçersiz e-posta formatı.';
      } else if (error.code === 'auth/too-many-requests') {
         errMsg = 'Çok fazla başarısız deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
      } else if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
         errMsg = 'Ağ bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.';
      } else if (error.message === 'PROFILE_NOT_FOUND') {
         errMsg = 'Kullanıcı profili bulunamadı. Lütfen yeni kayıt oluşturun veya destek ile iletişime geçin.';
      } else if (error.message === 'ADMIN_ACCESS_DENIED') {
          errMsg = 'Yönetici yetkisi doğrulanamadı. Hesap yetkilerini kontrol edin.';
      } else if (error.message === 'ROLE_MISMATCH') {
         errMsg = 'Seçtiğiniz rol bu hesap ile eşleşmiyor.';
      } else if (error.message === 'EMAIL_NOT_VERIFIED_SENT') {
         errMsg = 'E-posta adresiniz henüz doğrulanmadı. Yeni doğrulama bağlantısı gönderildi.';
      }
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Modern Minimalist Role Selector */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hesap Türü
          </label>
          <span className="text-[11px] text-slate-400 font-medium">Lütfen rolünüzü belirleyin</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedRole('student');
              setErrorMessage(null);
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              selectedRole === 'student'
                ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedRole === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-600'
              }`}>
                <GraduationCap className="w-4 h-4" />
              </div>
              {selectedRole === 'student' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-['Outfit',sans-serif]">
                Öğrenci
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                Bireysel Çalışma
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedRole('parent');
              setErrorMessage(null);
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              selectedRole === 'parent'
                ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedRole === 'parent' ? 'bg-emerald-600 text-white' : 'bg-slate-200/80 text-slate-600'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              {selectedRole === 'parent' && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-['Outfit',sans-serif]">
                Veli
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                Gelişim Portalı
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedRole('admin');
              setErrorMessage(null);
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              selectedRole === 'admin'
                ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedRole === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-200/80 text-slate-600'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              {selectedRole === 'admin' && (
                <span className="w-2 h-2 rounded-full bg-purple-600" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-['Outfit',sans-serif]">
                Eğitmen
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                Yönetim Paneli
              </div>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-identifier" className="block text-xs font-bold text-slate-700 mb-1.5">
            {selectedRole === 'student'
              ? 'Öğrenci Kodu, Kullanıcı Adı veya E-posta'
              : selectedRole === 'parent'
              ? 'Veli E-posta Adresi'
              : 'Eğitmen / Yönetici E-postası'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {selectedRole === 'student' ? (
                <User className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </div>
            <input
              id="login-identifier"
              type={selectedRole === 'student' ? 'text' : 'email'}
              value={identifier}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={fieldErrors.identifier ? 'login-identifier-error' : undefined}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors.identifier) {
                  setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                }
              }}
              placeholder={
                selectedRole === 'student'
                  ? 'Örn: DENIZ2026 veya ogrenci@zekapark.com'
                  : selectedRole === 'parent'
                  ? 'Örn: veli@zekapark.com'
                  : 'Örn: yonetici@ornek.com'
              }
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                fieldErrors.identifier
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500 focus:border-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
          </div>
          {fieldErrors.identifier && (
            <p id="login-identifier-error" className="mt-1.5 text-xs text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.identifier}</span>
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
              Şifre
            </label>
            <button
              type="button"
              onClick={onShowForgotPassword}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              Şifremi Unuttum?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              placeholder="••••••••"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                fieldErrors.password
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500 focus:border-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="login-password-error" className="mt-1.5 text-xs text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <span>Beni bu cihazda hatırla</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Giriş Yapılıyor...</span>
            </span>
          ) : (
            <>
              <span>
                {selectedRole === 'student'
                  ? 'Öğrenci Paneline Giriş Yap'
                  : selectedRole === 'parent'
                  ? 'Veli Portalı Raporlarına Gir'
                  : 'Yönetim Stüdyosuna Giriş'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Minimalist Quick Demo Section */}
      <div className="mt-5 pt-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500">Hızlı Deneme & Önizleme:</span>
          <span className="text-[10px] text-slate-400">Tek tıkla giriş</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickDemo('student')}
            className="py-1.5 px-2 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
            <span>Öğrenci Demo</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('parent')}
            className="py-1.5 px-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Veli Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
