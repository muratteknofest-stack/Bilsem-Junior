import React, { useState, useMemo } from 'react';
import { UserRole, UserProfile } from '../../../types';
import { sound } from '../../../lib/sound';
import { registerFamilyInFirebase } from '../../../services/family-registration-service';
import { apiUrl } from '../../../lib/api-client';
import { FooterInfoModal, FooterModalTopic } from '../../../components/FooterInfoModal';
import {
  registerStudentSchema,
  registerParentSchema,
  evaluatePasswordStrength,
  formatZodError
} from '../../../lib/validations';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Check, 
  ArrowRight,
  GraduationCap,
  Users,
  Info,
  User,
  Mail,
  Lock,
  Phone
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface RegistrationFormProps {
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  setErrorMessage: (msg: string | null) => void;
  onRegisterSuccess: (options: {
    identifier: string;
    role: UserRole;
    successToast: string;
    createdStudentCode: string | null;
    autoProfile?: UserProfile;
  }) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  selectedRole,
  setSelectedRole,
  setErrorMessage,
  onRegisterSuccess,
}) => {

  const [regStudentName, setRegStudentName] = useState('');
  const [regGrade, setRegGrade] = useState<number>(2);
  const [regExamFocus, setRegExamFocus] = useState('Genel Zihinsel Yetenek');
  const [regParentEmail, setRegParentEmail] = useState('');
  const [regParentPhone, setRegParentPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStudentPassword, setRegStudentPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegStudentPassword, setShowRegStudentPassword] = useState(false);
  const [regKvkkConsent, setRegKvkkConsent] = useState(false);
  const [legalTopic, setLegalTopic] = useState<FooterModalTopic | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const passwordStrength = useMemo(() => evaluatePasswordStrength(regPassword), [regPassword]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setFieldErrors({});

    let validationResult;
    if (selectedRole === 'student') {
      validationResult = registerStudentSchema.safeParse({
        studentName: regStudentName.trim(),
        grade: regGrade,
        examFocus: regExamFocus,
        parentEmail: regParentEmail.trim(),
        parentPhone: regParentPhone.trim() || undefined,
        password: regPassword,
        kvkkConsent: regKvkkConsent,
      });
    } else {
      validationResult = registerParentSchema.safeParse({
        parentEmail: regParentEmail.trim(),
        parentPhone: regParentPhone.trim() || undefined,
        studentName: regStudentName.trim(),
        grade: regGrade,
        examFocus: regExamFocus,
        password: regPassword,
        studentPassword: regStudentPassword,
        kvkkConsent: regKvkkConsent,
      });
    }

    if (!validationResult.success) {
      sound.playError();
      const { firstMessage, fieldErrors: errs } = formatZodError(validationResult.error);
      setErrorMessage(firstMessage);
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedRole === 'parent') {
        const result = await registerFamilyInFirebase({
          parentEmail: regParentEmail.trim(),
          parentPassword: regPassword,
          studentPassword: regStudentPassword,
          parentPhone: regParentPhone.trim() || undefined,
          studentName: regStudentName.trim(),
          grade: regGrade,
          examFocus: regExamFocus,
        });

        sound.playSuccess();

        onRegisterSuccess({
          identifier: regParentEmail.trim(),
          role: 'parent',
          createdStudentCode: result.student.code,
          successToast: `Aile hesabı oluşturuldu. E-postanızı doğrulayın. Çocuğunuzun giriş kodu: ${result.student.code}`,
        });
      } else {
        const email = regParentEmail.trim().toLowerCase();
        const response = await fetch(apiUrl('/api/register-student'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, password: regPassword, studentName: regStudentName.trim(),
            grade: regGrade, examFocus: regExamFocus,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Kayıt oluşturulamadı.');
        sound.playSuccess();

        onRegisterSuccess({
          identifier: email,
          role: 'student',
          createdStudentCode: null,
          successToast: `ZekaPark'a hoş geldin, ${regStudentName.trim()}! Giriş için e-postanı doğrula.`,
        });
      }
      
    } catch (error: any) {
      sound.playError();
      console.warn('Registration notice (handled):', error.code || error.message);
      let errMsg = 'Kayıt sırasında bir hata oluştu.';
      if (error.code === 'auth/email-already-in-use') errMsg = 'Bu e-posta adresi zaten kayıtlı.';
      else if (error.code === 'auth/weak-password') errMsg = 'Şifre çok zayıf. En az 8 karakter, bir harf ve bir rakam kullanın.';
      else if (error.code === 'auth/invalid-email') errMsg = 'Geçersiz e-posta adresi.';
      else if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
        errMsg = 'Ağ bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
      } else if (error.message) {
        errMsg = error.message;
      }
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Role Switcher */}
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Kayıt Türü Seçin
        </label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Kayıt türü">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('student');
              setErrorMessage(null);
              setFieldErrors({});
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
              selectedRole === 'student'
                ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              selectedRole === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-['Outfit',sans-serif]">
                Öğrenci Kaydı
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Bireysel BİLSEM Çalışması
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('parent');
              setErrorMessage(null);
              setFieldErrors({});
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
              selectedRole === 'parent'
                ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              selectedRole === 'parent' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-['Outfit',sans-serif]">
                Veli + Öğrenci
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Gelişim Portalı + Giriş Kodu
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Helpful educational badge */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {selectedRole === 'parent'
            ? 'Veli hesabınızla birlikte çocuğunuz için bağımsız bir öğrenci giriş kodu oluşturulur; çözdüğü soruları ve gelişim raporlarını anlık izleyebilirsiniz.'
            : 'Öğrenci hesabı ile BİLSEM ve analitik düşünme egzersizlerine anında başlayabilirsiniz.'}
        </p>
      </div>

      <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
        <div className={`grid grid-cols-1 ${selectedRole === 'parent' ? 'sm:grid-cols-2' : ''} gap-3`}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Öğrencinin Adı Soyadı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={regStudentName}
                onChange={(e) => {
                  setRegStudentName(e.target.value);
                  if (fieldErrors.studentName) {
                    setFieldErrors((prev) => ({ ...prev, studentName: '' }));
                  }
                }}
                placeholder="Örn: Efe Yılmaz"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  fieldErrors.studentName
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
            </div>
            {fieldErrors.studentName && (
              <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.studentName}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Sınıf Seviyesi
            </label>
            <select
              value={regGrade}
              onChange={(e) => setRegGrade(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden bg-white cursor-pointer"
            >
              <option value={1}>1. Sınıf (BİLSEM Hazırlık)</option>
              <option value={2}>2. Sınıf (BİLSEM Hazırlık)</option>
              <option value={3}>3. Sınıf (BİLSEM Hazırlık)</option>
              <option value={4}>4. Sınıf (BİLSEM & Yetenek)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Geliştirilmek İstenen Öncelikli Alan
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            {[
              { id: 'Genel Zihinsel Yetenek', label: 'Genel Zihinsel' },
              { id: 'Görsel Beceriler', label: 'Görsel Muhakeme' },
              { id: 'Mantık & Muhakeme', label: 'Mantık & Denge' }
            ].map((focus) => (
              <button
                key={focus.id}
                type="button"
                onClick={() => setRegExamFocus(focus.id)}
                className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer truncate ${
                  regExamFocus === focus.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {focus.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${selectedRole === 'parent' ? 'sm:grid-cols-2' : ''} gap-3`}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {selectedRole === 'student' ? 'Giriş / İletişim E-postası' : 'Veli E-posta Adresi'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                type="email"
                value={regParentEmail}
                onChange={(e) => {
                  setRegParentEmail(e.target.value);
                  if (fieldErrors.parentEmail) {
                    setFieldErrors((prev) => ({ ...prev, parentEmail: '' }));
                  }
                }}
                placeholder={selectedRole === 'student' ? 'ogrenci@eposta.com' : 'veli@eposta.com'}
                autoComplete="email"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  fieldErrors.parentEmail
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
            </div>
            {fieldErrors.parentEmail && (
              <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.parentEmail}</span>
              </p>
            )}
          </div>

          {selectedRole === 'parent' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Veli Cep Telefonu (İsteğe Bağlı)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={regParentPhone}
                  onChange={(e) => {
                    setRegParentPhone(e.target.value);
                    if (fieldErrors.parentPhone) {
                      setFieldErrors((prev) => ({ ...prev, parentPhone: '' }));
                    }
                  }}
                  placeholder="05XX XXX XX XX"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                    fieldErrors.parentPhone
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.parentPhone && (
                <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.parentPhone}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="register-password" className="block text-xs font-bold text-slate-700">
              {selectedRole === 'parent' ? 'Veli Hesabı Şifresi' : 'Güvenli Şifre'} (En az 8 karakter)
            </label>
            {regPassword && (
              <span className={`text-[11px] font-bold ${
                passwordStrength.score <= 1
                  ? 'text-rose-600'
                  : passwordStrength.score === 2
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>
                Güç: {passwordStrength.label}
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <input
              id="register-password"
              type={showRegPassword ? 'text' : 'password'}
              value={regPassword}
              onChange={(e) => {
                setRegPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              placeholder="••••••••"
              className={`w-full pl-9 pr-10 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                fieldErrors.password
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
            <button
              type="button"
              aria-label={showRegPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              onClick={() => setShowRegPassword(!showRegPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showRegPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {regPassword && (
            <div className="mt-2 space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= step
                        ? step <= 1
                          ? 'bg-rose-500'
                          : step === 2
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                <span className={`flex items-center gap-1 font-semibold ${
                  passwordStrength.hasMinLength ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  <Check className={`w-3 h-3 ${passwordStrength.hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                  En az 8 karakter
                </span>
                <span className={`flex items-center gap-1 font-semibold ${
                  passwordStrength.hasLetter ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  <Check className={`w-3 h-3 ${passwordStrength.hasLetter ? 'text-emerald-600' : 'text-slate-300'}`} />
                  Harf
                </span>
                <span className={`flex items-center gap-1 font-semibold ${
                  passwordStrength.hasNumber ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  <Check className={`w-3 h-3 ${passwordStrength.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                  Rakam
                </span>
              </div>
            </div>
          )}

          {fieldErrors.password && (
            <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        {selectedRole === 'parent' && (
          <div>
            <label htmlFor="student-password" className="block text-xs font-bold text-slate-700 mb-1">
              Öğrenci Giriş Şifresi (çocuğunuz bu şifreyle girecek)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="student-password"
                type={showRegStudentPassword ? 'text' : 'password'}
                value={regStudentPassword}
                onChange={(e) => {
                  setRegStudentPassword(e.target.value);
                  if (fieldErrors.studentPassword) {
                    setFieldErrors((prev) => ({ ...prev, studentPassword: '' }));
                  }
                }}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`w-full pl-9 pr-10 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  fieldErrors.studentPassword
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
              <button
                type="button"
                aria-label={showRegStudentPassword ? 'Öğrenci şifresini gizle' : 'Öğrenci şifresini göster'}
                onClick={() => setShowRegStudentPassword(!showRegStudentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showRegStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.studentPassword && (
              <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.studentPassword}</span>
              </p>
            )}
          </div>
        )}

        <div>
          <label className="flex items-start gap-2.5 pt-1 cursor-pointer text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={regKvkkConsent}
              onChange={(e) => {
                setRegKvkkConsent(e.target.checked);
                if (fieldErrors.kvkkConsent) {
                  setFieldErrors((prev) => ({ ...prev, kvkkConsent: '' }));
                }
              }}
              className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <span>
              <button type="button" onClick={() => setLegalTopic('kvkk')} className="font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
                KVKK Çocuk Verileri Aydınlatma Metni
              </button>{' '}
              ve{' '}
              <button type="button" onClick={() => setLegalTopic('terms')} className="font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
                Kullanım Koşulları
              </button>
              ’nı okudum, kabul ediyorum.
            </span>
          </label>
          {fieldErrors.kvkkConsent && (
            <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{fieldErrors.kvkkConsent}</span>
            </p>
          )}
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
              <span>Hesap Oluşturuluyor...</span>
            </span>
          ) : (
            <>
              <span>Hesabı Oluştur ve Başla</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {legalTopic && (
        <FooterInfoModal
          topic={legalTopic}
          onClose={() => setLegalTopic(null)}
          onSelectTopic={setLegalTopic}
        />
      )}
    </div>
  );
};
