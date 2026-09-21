import React, { useEffect, useState, useMemo } from 'react';
import { UserRole } from '../../../types';
import { auth } from '../../../lib/firebase';
import { browserLocalPersistence, setPersistence, signOut } from 'firebase/auth';
import { dataService } from '../../../services/data-service';
import { sound } from '../../../lib/sound';
import { registerFamilyInFirebase } from '../../../services/family-registration-service';
import { FooterInfoModal, FooterModalTopic } from '../../../components/FooterInfoModal';
import {
  registerParentSchema,
  evaluatePasswordStrength,
  formatZodError
} from '../../../lib/validations';
import { Sparkles, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

interface RegistrationFormProps {
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  setErrorMessage: (msg: string | null) => void;
  onRegisterSuccess: (options: {
    identifier: string;
    role: UserRole;
    successToast: string;
    createdStudentCode: string | null;
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

  useEffect(() => {
    if (selectedRole !== 'parent') setSelectedRole('parent');
  }, [selectedRole, setSelectedRole]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setFieldErrors({});

    const validationResult = registerParentSchema.safeParse({
      parentEmail: regParentEmail.trim(),
      parentPhone: regParentPhone.trim() || undefined,
      studentName: regStudentName.trim(),
      grade: regGrade,
      examFocus: regExamFocus,
      password: regPassword,
      studentPassword: regStudentPassword,
      kvkkConsent: regKvkkConsent,
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
      await setPersistence(auth, browserLocalPersistence);
      const result = await registerFamilyInFirebase({
        parentEmail: regParentEmail.trim(),
        parentPassword: regPassword,
        studentPassword: regStudentPassword,
        parentPhone: regParentPhone.trim() || undefined,
        studentName: regStudentName.trim(),
        grade: regGrade,
        examFocus: regExamFocus,
        guardianConsent: true,
      });
      await signOut(auth);
      dataService.logout();
      onRegisterSuccess({
        identifier: regParentEmail.trim(),
        role: 'parent',
        createdStudentCode: result.student.code,
        successToast: result.verificationSent
          ? `Aile hesabı hazır. Öğrenci kodu: ${result.student.code}. Veli girişi için e-postanıza gönderilen bağlantıyı doğrulayın.`
          : `Aile hesabı hazır. Öğrenci kodu: ${result.student.code}. Veli girişinde doğrulama bağlantısını yeniden gönderebilirsiniz.`,
      });

      sound.playSuccess();
      
    } catch (error: any) {
      sound.playError();
      console.warn('Registration notice (handled):', error.code || error.message);
      let errMsg = 'Kayıt olurken bir hata oluştu.';
      if (error.code === 'auth/email-already-in-use') errMsg = 'Bu e-posta adresi zaten kullanımda.';
      if (error.code === 'auth/weak-password') errMsg = 'Şifre çok zayıf. En az 8 karakter, bir harf ve bir rakam kullanın.';
      if (error.code === 'auth/invalid-email') errMsg = 'Geçersiz e-posta formatı.';
      if (error.code === 'auth/network-request-failed' || error.message?.includes('network-request-failed')) {
        errMsg = 'Ağ bağlantısı kurulamadı. Lütfen tekrar deneyin.';
      }
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-slate-900 font-['Outfit',sans-serif]">
          Yeni Öğrenci & Veli Kaydı
        </h3>
        <p className="text-xs text-slate-500">
          Bireysel adaptif zeka egzersizleri ve BİLSEM simülasyonu için hemen başlayın.
        </p>
      </div>

      <div className="mb-4" aria-label="Kayıt türü">
        <div className="rounded-xl border border-indigo-600 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-700">
          Veli + Öğrenci aile kaydı
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-xs leading-relaxed text-sky-900">
        Veli hesabınızla birlikte öğrenciniz için ayrı bir giriş kodu ve ayrı şifre oluşturulur. Çocuk hesabı yasal veli onayı olmadan açılamaz.
      </div>

      <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
        <div className={`grid grid-cols-1 ${selectedRole === 'parent' ? 'sm:grid-cols-2' : ''} gap-3`}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Öğrencinin Adı Soyadı
            </label>
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
              className={`w-full px-3 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 ${
                fieldErrors.studentName
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
            >
              <option value={1}>1. Sınıf (BİLSEM Hazırlık)</option>
              <option value={2}>2. Sınıf (BİLSEM Hazırlık)</option>
              <option value={3}>3. Sınıf (BİLSEM Hazırlık)</option>
              <option value={4}>4. Sınıf (Genel Zihinsel)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Hedef Yetenek Alanı
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs font-bold">
            {['Genel Zihinsel', 'Görsel Sanatlar', 'Müzik & Ritim'].map((focus) => (
              <button
                key={focus}
                type="button"
                onClick={() => setRegExamFocus(focus)}
                className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer truncate ${
                  regExamFocus === focus
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-extrabold '
                    : 'border-zinc-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {focus}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${selectedRole === 'parent' ? 'sm:grid-cols-2' : ''} gap-3`}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {selectedRole === 'student' ? 'Öğrenci Giriş E-postası' : 'Veli E-posta Adresi'}
            </label>
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
              className={`w-full px-3 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 ${
                fieldErrors.parentEmail
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
            {fieldErrors.parentEmail && (
              <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.parentEmail}</span>
              </p>
            )}
          </div>

          {selectedRole === 'parent' && <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Veli Cep Telefonu (İsteğe Bağlı)
            </label>
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
              className={`w-full px-3 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 ${
                fieldErrors.parentPhone
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
            {fieldErrors.parentPhone && (
              <p className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.parentPhone}</span>
              </p>
            )}
          </div>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="register-password" className="block text-xs font-bold text-slate-700">
              {selectedRole === 'parent' ? 'Veli Şifresi' : 'Şifre'} (En az 8 karakter)
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
              className={`w-full pl-3.5 pr-10 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 ${
                fieldErrors.password
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500'
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
            <div className="mt-2 space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-zinc-200/80">
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
                  Harf içerir
                </span>
                <span className={`flex items-center gap-1 font-semibold ${
                  passwordStrength.hasNumber ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  <Check className={`w-3 h-3 ${passwordStrength.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                  Rakam içerir
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
              Öğrenci Şifresi (veli şifresinden farklı)
            </label>
            <div className="relative">
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
                className={`w-full pl-3.5 pr-10 py-2 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 ${
                  fieldErrors.studentPassword
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-indigo-500'
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
              className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>
              <button type="button" onClick={() => setLegalTopic('kvkk')} className="font-bold text-indigo-700 underline underline-offset-2">
                KVKK Çocuk Verileri Koruma Metni
              </button>{' '}
              ve{' '}
              <button type="button" onClick={() => setLegalTopic('terms')} className="font-bold text-indigo-700 underline underline-offset-2">
                Kullanım Koşulları
              </button>
              ’nı okudum; öğrencinin yasal velisi olduğumu ve çocuk hesabının bu onayla açılmasını kabul ediyorum.
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
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm   hover: transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSubmitting ? (
            <span>Hesap Hazırlanıyor...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Ücretsiz Başla</span>
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
