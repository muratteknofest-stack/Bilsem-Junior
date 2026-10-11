import React, { useEffect, useState } from 'react';
import type { UserRole, UserProfile } from '../../../types';
import { registerFamilyInSupabase } from '../../../services/family-registration-service';
import { registerParentSchema, formatZodError } from '../../../lib/validations';
import { FooterInfoModal, type FooterModalTopic } from '../../../components/FooterInfoModal';
import { Users, ArrowRight } from 'lucide-react';
import { NewPasswordFields } from './NewPasswordFields';
import { passwordPairError } from '../../../lib/password-creation';

interface RegistrationFormProps {
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  setErrorMessage: (msg: string | null) => void;
  onRegisterSuccess: (options: { identifier: string; role: UserRole; successToast: string; createdStudentCode: string | null; autoProfile?: UserProfile }) => void;
}
const field = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function RegistrationForm({ setSelectedRole, setErrorMessage, onRegisterSuccess }: RegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [grade, setGrade] = useState(2);
  const [password, setPassword] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [studentPasswordConfirmation, setStudentPasswordConfirmation] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<FooterModalTopic | null>(null);
  useEffect(() => { setSelectedRole('parent'); }, [setSelectedRole]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setErrorMessage(null);
    const passwordError = passwordPairError(password, passwordConfirmation) || passwordPairError(studentPassword, studentPasswordConfirmation);
    if (passwordError) { setErrorMessage(passwordError); return; }
    const parsed = registerParentSchema.safeParse({ parentEmail: email, studentName: alias, grade,
      examFocus: 'Genel Zihinsel Yetenek', password, studentPassword, kvkkConsent: privacy,
      termsAccepted: terms, guardianConfirmed: guardian });
    if (!parsed.success) { setErrorMessage(formatZodError(parsed.error).firstMessage); return; }
    setBusy(true);
    try {
      const result = await registerFamilyInSupabase({ parentEmail: parsed.data.parentEmail,
        parentPassword: password, studentPassword, studentName: parsed.data.studentName, grade,
        examFocus: parsed.data.examFocus, consentAccepted: privacy, termsAccepted: terms, guardianConfirmed: guardian });
      onRegisterSuccess({ identifier: parsed.data.parentEmail, role: 'parent', createdStudentCode: result.student.code,
        successToast: 'Aile hesabınız oluşturuldu. E-postanızı doğrulayıp veli paneline giriş yaptığınızda öğrenci hesabı etkinleşir.' });
      setPassword(''); setStudentPassword(''); setPasswordConfirmation(''); setStudentPasswordConfirmation('');
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Kayıt tamamlanamadı. Tekrar deneyin.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950"><div className="flex items-center gap-2 font-semibold"><Users size={19} /> Veli ve öğrenci hesabı</div><p className="mt-2 leading-6">Hesabı veli oluşturur. Çocuğunuz kendi giriş kodunu kullanır; gelişim ve hesap yönetimi sizde kalır.</p></div>
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="parent-email">Veli e-posta adresi<input id="parent-email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className={field + ' mt-2'} /></label>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="child-alias">Öğrencinin takma adı<input id="child-alias" required minLength={2} maxLength={50} autoComplete="off" value={alias} onChange={e => setAlias(e.target.value)} aria-describedby="alias-help" className={field + ' mt-2'} /><span id="alias-help" className="mt-1 block text-xs font-normal text-slate-500">Ad soyad, okul veya adres yazmanız gerekmez.</span></label>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="child-grade">Sınıf<select id="child-grade" className={field + ' mt-2'} value={grade} onChange={e => setGrade(Number(e.target.value))}>{[1,2,3,4].map(g => <option key={g} value={g}>{g}. sınıf</option>)}</select></label>
        <NewPasswordFields label="Veli şifresi" value={password} confirmation={passwordConfirmation} onChange={setPassword} onConfirmation={setPasswordConfirmation} disabled={busy} />
        <NewPasswordFields label="Öğrenci şifresi" value={studentPassword} confirmation={studentPasswordConfirmation} onChange={setStudentPassword} onConfirmation={setStudentPasswordConfirmation} disabled={busy} />
        <p className="text-xs text-slate-600">Veli ve öğrenci şifreleri farklı olmalıdır.</p>
        <div className="space-y-3 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-700">
          <label className="flex items-start gap-3"><input type="checkbox" required checked={privacy} onChange={e => setPrivacy(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span><button type="button" className="text-indigo-700 underline" onClick={() => setTopic('kvkk')}>Kişisel veriler aydınlatma metnini</button> okudum.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" required checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span><button type="button" className="text-indigo-700 underline" onClick={() => setTopic('terms')}>Kullanım koşullarını</button> kabul ediyorum.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" required checked={guardian} onChange={e => setGuardian(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>Bu çocuk için hesap açmaya yetkili velisi/yasal temsilcisi olduğumu ve 18 yaşını doldurduğumu beyan ediyorum.</span></label>
        </div>
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Hesap hazırlanıyor…' : 'Aile hesabını oluştur'}<ArrowRight size={18} /></button>
      </fieldset>
    </form>
    {topic && <FooterInfoModal onClose={() => setTopic(null)} topic={topic} />}
  </div>;
}

