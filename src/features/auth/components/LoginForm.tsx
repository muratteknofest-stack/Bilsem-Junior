import React, { useState } from 'react';
import { UserRole, UserProfile } from '../../../types';
import { auth, db } from '../../../lib/firebase';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { dataService } from '../../../services/data-service';
import { sound } from '../../../lib/sound';
import { useAuth } from '../../../contexts/AuthContext';
import { isManagedStudentEmail, studentCodeToEmail } from '../../../lib/account-identifiers';
import { loginSchema, formatZodError } from '../../../lib/validations';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

const OWNER_ADMIN_EMAIL = 'iomegagame@gmail.com';

function createOwnerAdminProfile(uid: string, email: string): UserProfile {
  const now = Date.now();
  return {
    id: uid,
    email,
    name: 'ZekaPark Yönetici',
    role: 'admin',
    avatar: '👨‍💻',
    level: 1,
    xp: 0,
    streak: 0,
    lastActiveDate: new Date(now).toISOString(),
    dailyGoalMinutes: 20,
    todayMinutesSpent: 0,
    soundEnabled: true,
    createdAt: now,
    updatedAt: now,
    totalPoints: 0,
    claimedStreakDays: [],
    totalQuestionsSolved: 0,
    resolvedMistakesCount: 0,
  };
}

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

      const requiresVerification = !isManagedStudentEmail(credential.user.email);
      if (requiresVerification && !credential.user.emailVerified) {
        const verificationResent = await sendEmailVerification(credential.user)
          .then(() => true)
          .catch(() => false);
        await signOut(auth);
        throw new Error(verificationResent ? 'EMAIL_NOT_VERIFIED_SENT' : 'EMAIL_NOT_VERIFIED_UNSENT');
      }

      const userDocRef = doc(db, 'users', credential.user.uid);
      let profileSnapshot = await getDoc(userDocRef);

      const signedInEmail = credential.user.email?.trim().toLowerCase() || '';
      if (
        !profileSnapshot.exists() &&
        signedInEmail === OWNER_ADMIN_EMAIL &&
        credential.user.emailVerified
      ) {
        const ownerProfile = createOwnerAdminProfile(credential.user.uid, signedInEmail);
        try {
          await setDoc(userDocRef, ownerProfile);
          profileSnapshot = await getDoc(userDocRef);
        } catch {
          await signOut(auth);
          throw new Error('ADMIN_PROFILE_PROVISION_FAILED');
        }
      }

      if (!profileSnapshot.exists()) {
        await signOut(auth);
        throw new Error('PROFILE_NOT_FOUND');
      }

      const loggedInProfile = profileSnapshot.data() as UserProfile;
      if (loggedInProfile.id !== credential.user.uid) {
        await signOut(auth);
        throw new Error('ROLE_MISMATCH');
      }
      
      if (signedInEmail === OWNER_ADMIN_EMAIL && credential.user.emailVerified && loggedInProfile.role !== 'admin') {
        loggedInProfile.role = 'admin';
        await setDoc(userDocRef, { ...loggedInProfile, role: 'admin' }, { merge: true });
      }

      if (loggedInProfile.role !== selectedRole) {
        await signOut(auth);
        throw new Error('ROLE_MISMATCH');
      }

      dataService.loginAs(loggedInProfile.role, loggedInProfile);
      dataService.hydrateUserStateFromFirebase().catch(console.error);
      loginLocally(loggedInProfile);
      sound.playSuccess();
      setSuccessToast('Giriş başarılı! Yönlendiriliyorsunuz...');
      
      setTimeout(() => {
        onLoginSuccess(loggedInProfile.role, loggedInProfile);
      }, 500);
      
    } catch (error: any) {
      sound.playError();
      console.warn('Login notice (handled):', error.code || error.message);
      let errMsg = 'Giriş yapılamadı.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
         errMsg = 'E-posta veya şifre hatalı.';
      } else if (error.code === 'auth/invalid-email') {
         errMsg = 'Geçersiz e-posta formatı.';
      } else if (error.code === 'auth/too-many-requests') {
         errMsg = 'Çok fazla başarısız deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
      } else if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
         errMsg = 'Ağ bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
      } else if (error.message === 'PROFILE_NOT_FOUND') {
         errMsg = 'Bu hesaba ait kullanıcı profili bulunamadı. Lütfen destek ekibiyle iletişime geçin.';
      } else if (error.message === 'ROLE_MISMATCH') {
         errMsg = 'Seçtiğiniz rol bu hesapla eşleşmiyor.';
      } else if (error.message === 'EMAIL_NOT_VERIFIED_SENT') {
         errMsg = 'E-posta adresiniz henüz doğrulanmadı. Yeni doğrulama bağlantısı gönderildi.';
      } else if (error.message === 'EMAIL_NOT_VERIFIED_UNSENT') {
         errMsg = 'E-posta adresiniz henüz doğrulanmadı. Bağlantı şu anda yeniden gönderilemedi; lütfen biraz sonra tekrar deneyin.';
      } else if (error.message === 'ADMIN_PROFILE_PROVISION_FAILED') {
         errMsg = 'Yönetici profili henüz etkinleştirilemedi. Lütfen kısa süre sonra tekrar deneyin.';
      }
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Kullanıcı Rolünüzü Seçiniz
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedRole('student');
              setErrorMessage(null);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedRole === 'student'
                ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 '
                : 'border-zinc-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xl">🦊</span>
              {selectedRole === 'student' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Öğrenci
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                BİLSEM Adayı
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
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedRole === 'parent'
                ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 '
                : 'border-zinc-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xl">👩‍👧‍👦</span>
              {selectedRole === 'parent' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                Veli Portalı
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                Rapor & Analiz
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
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  ? 'Örn: DENIZ2026 veya deniz@zekapark.com'
                  : selectedRole === 'parent'
                  ? 'Örn: zeynep@zekapark.com'
                  : 'Örn: zeka.kupu.test@gmail.com'
              }
              className={`w-full pl-9.5 pr-4 py-2.5 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                fieldErrors.identifier
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500 focus:border-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500 focus:border-transparent'
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
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Şifremi Unuttum?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
              className={`w-full pl-9.5 pr-10 py-2.5 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                fieldErrors.password
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500 focus:border-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500 focus:border-transparent'
              }`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
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

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>Beni bu cihazda hatırla</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm   hover: transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
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
                  : 'Soru Mimarı Stüdyosuna Gir'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
