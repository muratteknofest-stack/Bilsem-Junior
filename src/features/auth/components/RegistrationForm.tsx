import React, { useEffect, useRef, useState } from 'react';
import { FamilyRegistrationError, registerFamilyInSupabase } from '../../../services/family-registration-service';
import { FooterInfoModal, type FooterModalTopic } from '../../../components/FooterInfoModal';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Users } from 'lucide-react';
import { NewPasswordFields } from './NewPasswordFields';
import { apiUrl } from '../../../lib/api-client';
import { firstInvalidRegistrationStep, registrationControls, validateRegistrationDraft, type RegistrationDraft, type RegistrationErrors, type RegistrationStep } from '../registration-draft';

export interface RegistrationSuccess {
  identifier: string;
  createdStudentCode: string;
  verificationSent: boolean;
}
interface Props {
  setErrorMessage: (msg: string | null) => void;
  onRegisterSuccess: (options: RegistrationSuccess) => void;
  onBusyChange?: (busy: boolean) => void;
  onLogin?: (email: string) => void;
}
const field = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const steps = ['Veli bilgileri', 'Öğrenci bilgileri', 'Kontrol ve onay'];
const emptyDraft: RegistrationDraft = { parentEmail: '', password: '', passwordConfirmation: '', studentName: '', grade: 0, studentPassword: '', studentPasswordConfirmation: '', kvkkConsent: false, termsAccepted: false, guardianConfirmed: false };

export function RegistrationForm({ setErrorMessage, onRegisterSuccess, onBusyChange, onLogin }: Props) {
  const [draft, setDraft] = useState<RegistrationDraft>(emptyDraft);
  const [step, setStep] = useState<RegistrationStep>(0);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const focusInvalid = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [availability, setAvailability] = useState<{ registrationOpen: boolean; policyVersion: string } | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [reload, setReload] = useState(0);
  const [topic, setTopic] = useState<FooterModalTopic | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let mounted = true;
    setAvailability(null); setAvailabilityError('');
    fetch(apiUrl('/api/public/platform'), { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw Error();
      const value = await response.json();
      if (typeof value.registrationOpen !== 'boolean' || !/^2026-10-11\.\d+$/.test(value.policyVersion)) throw Error();
      if (mounted) setAvailability(value);
    }).catch(() => { if (mounted) setAvailabilityError('Kayıt durumu kontrol edilemedi. İnternet bağlantınızı kontrol edip yeniden deneyin.'); }).finally(() => clearTimeout(timeout));
    return () => { mounted = false; clearTimeout(timeout); controller.abort(); };
  }, [reload]);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (focusInvalid.current) {
      focusInvalid.current = false;
      (form.current?.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus();
    }
  }, [errors]);
  function update<K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setAccountExists(false);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setErrorMessage(null); setAccountExists(false);
    const problems = validateRegistrationDraft(draft, step < 2 ? step : undefined);
    focusInvalid.current = Object.keys(problems).length > 0;
    setErrors(problems);
    if (Object.keys(problems).length) { if (step === 2) setStep(firstInvalidRegistrationStep(problems)); return; }
    if (step < 2) { setStep(previous => (previous + 1) as RegistrationStep); return; }
    if (!availability?.registrationOpen) {
      setErrorMessage(availabilityError || (availability ? 'Hesap oluşturma şu anda kapalı. Bilgilerinizi düzenleyebilir veya kayıt durumunu yeniden kontrol edebilirsiniz.' : 'Kayıt durumu kontrol ediliyor. Lütfen kontrolün tamamlanmasını bekleyin.'));
      return;
    }
    submitting.current = true; setBusy(true); onBusyChange?.(true);
    try {
      const email = draft.parentEmail.trim().toLowerCase();
      const result = await registerFamilyInSupabase({ parentEmail: email, parentPassword: draft.password, studentPassword: draft.studentPassword, studentName: draft.studentName.trim(), grade: draft.grade, examFocus: 'Genel Zihinsel Yetenek', consentAccepted: draft.kvkkConsent, termsAccepted: draft.termsAccepted, guardianConfirmed: draft.guardianConfirmed, policyVersion: availability.policyVersion });
      setDraft(emptyDraft);
      onRegisterSuccess({ identifier: email, createdStudentCode: result.student.code, verificationSent: result.verificationSent });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kayıt tamamlanamadı. Tekrar deneyin.');
      if (error instanceof FamilyRegistrationError) {
        if (error.code === 'ACCOUNT_EXISTS' || error.code === 'NETWORK_ERROR' || error.code === 'INVALID_RESPONSE') setAccountExists(true);
        if (error.code === 'POLICY_UPDATED') { setDraft(previous => ({ ...previous, kvkkConsent: false, termsAccepted: false, guardianConfirmed: false })); setReload(previous => previous + 1); }
        if (error.code === 'REGISTRATION_NOT_READY') setReload(previous => previous + 1);
      }
    } finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  }
  const controls = registrationControls(step, busy, availability?.registrationOpen);
  return <div className="space-y-5">
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950">
      <div className="flex items-center gap-2 font-semibold"><Users size={19} aria-hidden="true" /> Tek kayıtla veli ve öğrenci hesabı</div>
      <p className="mt-2 leading-6">Kaydı veli tamamlar. Veli e-posta ve şifreyle, öğrenci kendisine verilen kod ve ayrı şifreyle giriş yapar.</p>
    </div>
    <ol className="grid grid-cols-3 gap-2 text-xs sm:text-sm" aria-label="Kayıt adımları">
      {steps.map((name, index) => <li key={name} aria-current={step === index ? 'step' : undefined} className={`rounded-xl border p-3 ${step === index ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-950' : 'border-slate-200 text-slate-600'}`}><span className="mb-1 flex items-center gap-1">{step > index ? <Check size={16} aria-label="Tamamlandı" /> : `${index + 1}. adım`}</span>{name}</li>)}
    </ol>
    {!availability?.registrationOpen && <div id="registration-availability" className="rounded-xl border border-slate-200 p-4 text-sm leading-6"><p role={availabilityError ? 'alert' : 'status'}>{availabilityError || (availability ? 'Bilgilerinizi doldurup kontrol adımına ilerleyebilirsiniz. Hesap oluşturma şu anda kapalıdır.' : 'Kayıt durumu kontrol ediliyor. Bu sırada bilgilerinizi doldurabilirsiniz.')}</p><p className="mt-2 text-slate-600">Hesap oluşturulana kadar bu bilgiler gönderilmez. Sayfayı kapatırsanız form temizlenir.</p>{(availability || availabilityError) && <button type="button" disabled={busy} onClick={() => { setErrorMessage(null); setReload(previous => previous + 1); }} className="mt-2 min-h-11 font-semibold text-indigo-700 underline disabled:opacity-60">Kayıt durumunu yeniden kontrol et</button>}</div>}
    <form ref={form} onSubmit={submit} noValidate className="space-y-4" aria-busy={busy}>
      <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold text-slate-900 focus:outline-none">{steps[step]}</h2>
      <fieldset disabled={controls.fieldsDisabled} className="space-y-4">
        <legend className="sr-only">{steps[step]}</legend>
        {step === 0 && <>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="parent-email">Veli e-posta adresi<input id="parent-email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={draft.parentEmail} onChange={e => update('parentEmail', e.target.value)} aria-invalid={Boolean(errors.parentEmail)} aria-describedby="parent-email-help parent-email-error" className={field} /><span id="parent-email-help" className="mt-1 block text-xs font-normal text-slate-600">Doğrulama bağlantısı ve hesap kurtarma iletileri bu adrese gönderilir.</span></label>
          <p id="parent-email-error" className="text-sm text-rose-700">{errors.parentEmail}</p>
          <NewPasswordFields label="Veli şifresi" value={draft.password} confirmation={draft.passwordConfirmation} onChange={v => update('password', v)} onConfirmation={v => update('passwordConfirmation', v)} error={errors.password} confirmationError={errors.passwordConfirmation} disabled={controls.fieldsDisabled} />
        </>}
        {step === 1 && <>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="child-alias">Öğrencinin takma adı<input id="child-alias" required minLength={2} maxLength={50} autoComplete="off" value={draft.studentName} onChange={e => update('studentName', e.target.value)} aria-invalid={Boolean(errors.studentName)} aria-describedby="alias-help alias-error" className={field} /><span id="alias-help" className="mt-1 block text-xs font-normal text-slate-600">Ad soyad, okul veya adres yazmanız gerekmez.</span></label>
          <p id="alias-error" className="text-sm text-rose-700">{errors.studentName}</p>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="child-grade">Öğrencinin sınıf düzeyi<select id="child-grade" required className={field} value={draft.grade} onChange={e => update('grade', Number(e.target.value))} aria-invalid={Boolean(errors.grade)} aria-describedby="grade-error grade-help"><option value={0} disabled>Sınıf seçin</option>{[1,2,3,4].map(g => <option key={g} value={g}>{g}. sınıf</option>)}</select></label>
          <p id="grade-help" className="text-xs text-slate-600">Sorular bu sınıfa göre seçilir. Daha sonra öğrenci profilinden değiştirebilirsiniz.</p>
          <p id="grade-error" className="text-sm text-rose-700">{errors.grade}</p>
          <NewPasswordFields label="Öğrenci şifresi" value={draft.studentPassword} confirmation={draft.studentPasswordConfirmation} onChange={v => update('studentPassword', v)} onConfirmation={v => update('studentPasswordConfirmation', v)} error={errors.studentPassword} confirmationError={errors.studentPasswordConfirmation} disabled={controls.fieldsDisabled} />
          <p className="text-xs text-slate-600">Öğrenci şifresi veli şifresinden farklı olmalıdır. Öğrenci hesabı, veli e-postası doğrulanıp veli paneline giriş yapıldığında etkinleşir.</p>
        </>}
        {step === 2 && <>
          <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><div><dt className="text-slate-600">Veli e-postası</dt><dd className="break-words font-semibold">{draft.parentEmail.trim().toLowerCase()}</dd></div><div><dt className="text-slate-600">Öğrenci</dt><dd className="font-semibold">{draft.studentName.trim()} · {draft.grade}. sınıf</dd></div><div><dt className="text-slate-600">Şifreler</dt><dd>Ayrı şifreler belirlendi. Güvenli bir yerde saklayın.</dd></div></dl>
          <div className="space-y-4 text-sm leading-6 text-slate-700">
            <label className="flex items-start gap-3"><input type="checkbox" required checked={draft.kvkkConsent} onChange={e => update('kvkkConsent', e.target.checked)} aria-invalid={Boolean(errors.kvkkConsent)} aria-describedby="privacy-error" className="mt-1 h-5 w-5 shrink-0" /><span><button type="button" className="text-indigo-700 underline" onClick={() => setTopic('kvkk')}>Kişisel veriler aydınlatma metnini</button> okudum.</span></label><p id="privacy-error" className="text-rose-700">{errors.kvkkConsent}</p>
            <label className="flex items-start gap-3"><input type="checkbox" required checked={draft.termsAccepted} onChange={e => update('termsAccepted', e.target.checked)} aria-invalid={Boolean(errors.termsAccepted)} aria-describedby="terms-error" className="mt-1 h-5 w-5 shrink-0" /><span><button type="button" className="text-indigo-700 underline" onClick={() => setTopic('terms')}>Kullanım koşullarını</button> kabul ediyorum.</span></label><p id="terms-error" className="text-rose-700">{errors.termsAccepted}</p>
            <label className="flex items-start gap-3"><input type="checkbox" required checked={draft.guardianConfirmed} onChange={e => update('guardianConfirmed', e.target.checked)} aria-invalid={Boolean(errors.guardianConfirmed)} aria-describedby="guardian-error" className="mt-1 h-5 w-5 shrink-0" /><span>Bu çocuk için hesap açmaya yetkili velisi/yasal temsilcisi olduğumu ve 18 yaşını doldurduğumu beyan ediyorum.</span></label><p id="guardian-error" className="text-rose-700">{errors.guardianConfirmed}</p>
          </div>
        </>}
        <div className="flex gap-3">
          {step > 0 && <button type="button" onClick={() => { setStep(previous => (previous - 1) as RegistrationStep); setErrors({}); setErrorMessage(null); }} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold"><ArrowLeft size={18} /> Geri</button>}
          <button type="submit" disabled={controls.submitDisabled} aria-describedby={step === 2 && !availability?.registrationOpen ? 'registration-availability' : undefined} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Hesap oluşturuluyor…</> : <>{step === 2 ? (availability?.registrationOpen ? 'Aile hesabını oluştur' : availabilityError ? 'Kayıt durumu doğrulanamadı' : availability ? 'Kayıtlar şu anda kapalı' : 'Kayıt durumu bekleniyor…') : 'Devam et'}<ArrowRight size={18} aria-hidden="true" /></>}</button>
        </div>
      </fieldset>
      {busy && <p role="status" className="text-sm text-slate-600">Kayıt tamamlanırken lütfen sayfayı kapatmayın.</p>}
    </form>
    {accountExists && onLogin && <button type="button" onClick={() => onLogin(draft.parentEmail.trim().toLowerCase())} className="min-h-11 font-semibold text-indigo-700 underline">Veli e-postamla giriş yap</button>}
    {topic && <FooterInfoModal onClose={() => setTopic(null)} topic={topic} />}
  </div>;
}
