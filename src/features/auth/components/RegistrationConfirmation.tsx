import React, { useState } from 'react';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { ConfirmationEmailAction } from './ConfirmationEmailAction';
import type { RegistrationSuccess } from './RegistrationForm';

interface Props { result: RegistrationSuccess; onLogin: (email: string) => void; }
export function RegistrationConfirmation({ result, onLogin }: Props) {
  const [copyNotice, setCopyNotice] = useState('');
  async function copyCode() {
    try { await navigator.clipboard.writeText(result.createdStudentCode); setCopyNotice('Öğrenci kodu kopyalandı.'); }
    catch { setCopyNotice('Kopyalama yapılamadı. Kodu seçip elle kopyalayabilirsiniz.'); }
  }
  return <section className="space-y-5" aria-labelledby="family-created-title">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
      <CheckCircle2 size={28} aria-hidden="true" /><h2 id="family-created-title" className="mt-3 text-xl font-semibold">Aile hesabınız oluşturuldu</h2>
      <p className="mt-2 text-sm leading-6">Veli ve öğrenci hesabınız hazır. Kullanıma başlamak için aşağıdaki adımları tamamlayın.</p>
    </div>
    {!result.verificationSent && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Hesaplarınız oluşturuldu, ancak doğrulama e-postası gönderilemedi. Hesabı yeniden oluşturmanız gerekmez; aşağıdan yeniden göndermeyi deneyin.</p>}
    <ol className="space-y-4 text-sm leading-6 text-slate-700">
      <li><strong>1. Veli e-postasını doğrulayın.</strong><p className="mt-1 break-words">{result.identifier} adresindeki gelen kutusu ve spam klasörünü kontrol edin. E-postadaki doğrulama bağlantısını açın.</p></li>
      <li><strong>2. Veli hesabınıza giriş yapın.</strong><p className="mt-1">Doğrulamadan sonra veli e-postanız ve veli şifrenizle giriş yapın. Bu giriş, bağlı öğrenci hesabını etkinleştirir.</p></li>
      <li><strong>3. Öğrenci kodunu saklayın.</strong><p className="mt-1">Öğrenci, aşağıdaki kod ve kayıt sırasında belirlediğiniz öğrenci şifresiyle giriş yapar. Şifreleri bu ekranda göstermiyoruz.</p></li>
    </ol>
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-sm font-semibold text-indigo-950">Öğrenci giriş kodu</p><p className="mt-2 select-all break-all font-mono text-xl font-bold tracking-wider text-indigo-950">{result.createdStudentCode}</p><button type="button" onClick={copyCode} className="mt-3 flex min-h-11 items-center gap-2 font-semibold text-indigo-700"><Copy size={17} aria-hidden="true" /> Kodu kopyala</button><p role="status" className="text-sm text-slate-600">{copyNotice}</p></div>
    <ConfirmationEmailAction email={result.identifier} initialSent={result.verificationSent} />
    <button type="button" onClick={() => onLogin(result.identifier)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white"><ShieldCheck size={18} aria-hidden="true" /> Veli girişine geç</button>
  </section>;
}
