import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasVerifiedAdminAccess } from '../lib/admin-access';
import { LoginForm } from '../features/auth/components/LoginForm';
import { ForgotPasswordModal } from '../features/auth/components/ForgotPasswordModal';
import './landing/design-system.css';
import '../features/auth/auth-design-system.css';
import { AdminMfaGate } from './AdminMfaGate';

const AdminPanelView = lazy(() => import('./AdminPanelView').then(module => ({ default: module.AdminPanelView })));
const ignore = () => {};

export function AdminPortal() {
  const session = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const authorized = hasVerifiedAdminAccess(session);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = authorized ? 'Yönetici Paneli | BİLSEM Junior' : 'Yönetici Girişi | BİLSEM Junior';
    return () => { document.title = previousTitle; };
  }, [authorized]);

  async function logout() {
    if (signingOut) return;
    setSigningOut(true); setError(null); setSuccess(null);
    try { await session.logout(); }
    catch { setError('Oturum kapatılamadı. Bağlantınızı kontrol edip tekrar deneyin.'); }
    finally { setSigningOut(false); }
  }

  if (session.loading) return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><p role="status">Yönetici yetkisi doğrulanıyor…</p></main>;

  return <div className="zp-auth min-h-screen bg-slate-50 text-slate-900">
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
      <a href="/" className="zp-auth-back inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><ArrowLeft size={16} aria-hidden="true" />Ana sayfaya dön</a>
      <span className="inline-flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} aria-hidden="true" />BİLSEM Junior Yönetim</span>
      {session.currentUser && <button type="button" disabled={signingOut} onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><LogOut size={16} aria-hidden="true" />{signingOut ? 'Çıkış yapılıyor…' : 'Oturumu kapat'}</button>}
    </header>
    {error && <p role="alert" className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-rose-800">{error}</p>}
    {authorized ? <main><AdminMfaGate><Suspense fallback={<p role="status" className="p-8 text-center">Yönetici paneli yükleniyor…</p>}><AdminPanelView /></Suspense></AdminMfaGate></main> :
      <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-8">
        <section className="zp-auth-form-panel rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="admin-login-heading">
          <p className="zp-auth-kicker">BİLSEM JUNIOR / YÖNETİM</p>
          <h1 id="admin-login-heading" className="mb-3 mt-3 text-3xl font-bold">Yönetici girişi</h1>
          <p className="mb-7 text-sm leading-6 text-slate-600">Bu alan yalnızca yetkilendirilmiş yönetici hesapları içindir.</p>
          {session.currentUser ? <div role="alert"><p className="mb-4 text-sm font-semibold text-rose-800">Bu hesabın yönetici yetkisi doğrulanamadı. Yönetici hesabınızla giriş yapmak için mevcut oturumu kapatın.</p><button type="button" disabled={signingOut} onClick={() => void logout()} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">{signingOut ? 'Çıkış yapılıyor…' : 'Oturumu kapat ve yönetici girişi yap'}</button></div> : <>
            {success && <p role="status" className="mb-4 text-sm text-emerald-800">{success}</p>}
            <LoginForm adminOnly selectedRole="admin" setSelectedRole={ignore} onLoginSuccess={ignore} onShowForgotPassword={() => setShowRecovery(true)} setErrorMessage={setError} setSuccessToast={setSuccess} />
          </>}
        </section>
      </main>}
    <ForgotPasswordModal isOpen={showRecovery} onClose={() => setShowRecovery(false)} onSuccessToast={setSuccess} />
  </div>;
}
