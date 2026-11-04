import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type RecoveryMfaPhase = 'checking' | 'required' | 'ready' | 'error';

/** A recovery link starts an AAL1 session. Supabase requires AAL2 for
 * passwords on accounts with enrolled MFA. Never bypass that protection.
 */
export function RecoveryMfaGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<RecoveryMfaPhase>('checking');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = async (isActive: () => boolean = () => true) => {
    if (isActive()) { setPhase('checking'); setError(''); }
    try {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || !assurance.data) throw Error('MFA state unavailable');
      if (assurance.data.currentLevel === 'aal2' ||
        (assurance.data.currentLevel === 'aal1' && assurance.data.nextLevel === 'aal1')) {
        if (isActive()) { setFactorId(''); setPhase('ready'); }
        return;
      }
      if (assurance.data.currentLevel !== 'aal1' || assurance.data.nextLevel !== 'aal2')
        throw Error('Unverified MFA state');
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const factor = factors.data.totp.find(item => item.status === 'verified');
      if (!factor) throw Error('No verified TOTP factor');
      if (isActive()) { setFactorId(factor.id); setPhase('required'); }
    } catch {
      if (isActive()) {
        setFactorId('');
        setError('İki aşamalı doğrulama kontrol edilemedi. Yeni bir şifre sıfırlama bağlantısı isteyin veya tekrar deneyin.');
        setPhase('error');
      }
    }
  };

  useEffect(() => {
    let active = true;
    void check(() => active);
    return () => { active = false; };
  }, []);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || phase !== 'required' || !factorId || !/^[0-9]{6}$/.test(code)) return;
    setBusy(true);
    setError('');
    try {
      const verified = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verified.error) throw verified.error;
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== 'aal2') throw Error('AAL2 not confirmed');
      setCode('');
      setPhase('ready');
    } catch {
      setCode('');
      setError('Doğrulayıcı kodu kabul edilmedi. Uygulamadaki güncel altı haneli kodu girin.');
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'ready') return <>{children}</>;
  if (phase === 'checking') return <p role="status" className="mt-5 text-sm text-slate-700">Hesabın iki aşamalı doğrulama durumu kontrol ediliyor…</p>;
  if (phase === 'error') return <div className="mt-5 space-y-3">
    <p role="alert" className="text-sm text-rose-700">{error}</p>
    <button type="button" className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white" onClick={() => void check()}>
      Doğrulamayı tekrar dene
    </button>
  </div>;
  return <form onSubmit={verify} className="mt-5 space-y-4">
    <p className="text-sm text-slate-700">Bu hesapta iki aşamalı doğrulama açık. Şifre değiştirmeden önce doğrulayıcı uygulamanızdan güncel 6 haneli kodu girin.</p>
    <label htmlFor="recovery-totp" className="block text-sm font-semibold text-slate-700">Doğrulayıcı uygulama kodu</label>
    <input id="recovery-totp" type="text" inputMode="numeric" autoComplete="one-time-code"
      pattern="[0-9]{6}" maxLength={6} required disabled={busy} value={code}
      onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-xl tracking-widest"/>
    <p className="text-xs text-slate-600">Kodunuzu ve yeni şifrenizi kimseyle paylaşmayın.</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button type="submit" disabled={busy || !/^[0-9]{6}$/.test(code)}
      className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
      {busy ? 'Kod doğrulanıyor…' : 'Kodu doğrula ve şifreye geç'}
    </button>
  </form>;
}
