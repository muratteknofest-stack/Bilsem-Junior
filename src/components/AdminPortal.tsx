import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, Cpu, Lock, LogOut, ShieldCheck } from 'lucide-react';
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
    document.title = authorized ? 'Yönetici Paneli | Bilsem Junior' : 'Yönetici Girişi | Bilsem Junior';
    return () => { document.title = previousTitle; };
  }, [authorized]);

  async function logout() {
    if (signingOut) return;
    setSigningOut(true); setError(null); setSuccess(null);
    try { await session.logout(); }
    catch { setError('Oturum kapatılamadı. Bağlantınızı kontrol edip tekrar deneyin.'); }
    finally { setSigningOut(false); }
  }

  if (session.loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 text-slate-200 p-6">
        <p role="status" className="text-sm font-semibold">Yönetici yetkisi doğrulanıyor…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Ana sayfaya dön</span>
          </a>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
            <ShieldCheck size={18} className="text-indigo-400" aria-hidden="true" />
            <span>Bilsem Junior Yönetim</span>
          </span>
          {session.currentUser && (
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void logout()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{signingOut ? 'Çıkış yapılıyor…' : 'Oturumu kapat'}</span>
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="px-5 pt-4">
          <p role="alert" className="mx-auto max-w-2xl rounded-xl border border-rose-800/60 bg-rose-950/60 px-5 py-3 text-sm font-semibold text-rose-200">
            {error}
          </p>
        </div>
      )}

      {authorized ? (
        <main className="text-slate-100 [&>section]:my-10 [&>section]:border-slate-200 [&>section]:text-slate-900">
          <AdminMfaGate>
            <div className="dark text-slate-100">
              <Suspense fallback={<p role="status" className="p-8 text-center text-sm text-slate-300">Yönetici paneli yükleniyor…</p>}>
                <AdminPanelView />
              </Suspense>
            </div>
          </AdminMfaGate>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <section className="lg:col-span-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Operasyonel Güvenlik & Mimari
                </span>
                <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  BİLSEM Soru Motoru ve İçerik Denetim Konsolu
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Soru üretim hatları, çok aşamalı kalite kontrolü, veli-öğrenci abonelik dizini ve sistem tanı araçları yalnızca doğrulanmış yöneticilere açıktır.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <Lock size={18} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">AAL2 TOTP İki Aşamalı Doğrulama</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-400">
                      Oturum açıldıktan sonra Supabase RLS ve zamana dayalı doğrulayıcı kodu zorunludur.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <Cpu size={18} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Deterministik Soru ve SVG Doğrulaması</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-400">
                      Üretilen her taslak geometrik çakışma, tek doğru yanıt ve sınıf kazanım kontrolünden geçer.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="lg:col-span-6 zp-auth-form-panel rounded-3xl border border-slate-200 bg-white text-slate-900 p-6 shadow-xl sm:p-8"
              aria-labelledby="admin-login-heading"
            >
              <p className="zp-auth-kicker">Yönetim Konsolu</p>
              <h1 id="admin-login-heading" className="mb-3 mt-3 text-3xl font-bold text-slate-900">Yönetici girişi</h1>
              <p className="mb-7 text-sm leading-6 text-slate-600">Bu alan yalnızca yetkilendirilmiş yönetici hesapları içindir.</p>
              {session.currentUser ? (
                <div role="alert">
                  <p className="mb-4 text-sm font-semibold text-rose-800">
                    Bu hesabın yönetici yetkisi doğrulanamadı. Yönetici hesabınızla giriş yapmak için mevcut oturumu kapatın.
                  </p>
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={() => void logout()}
                    className="min-h-[44px] w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {signingOut ? 'Çıkış yapılıyor…' : 'Oturumu kapat ve yönetici girişi yap'}
                  </button>
                </div>
              ) : (
                <>
                  {success && <p role="status" className="mb-4 text-sm text-emerald-800">{success}</p>}
                  <LoginForm
                    adminOnly
                    selectedRole="admin"
                    setSelectedRole={ignore}
                    onLoginSuccess={ignore}
                    onShowForgotPassword={() => setShowRecovery(true)}
                    setErrorMessage={setError}
                    setSuccessToast={setSuccess}
                  />
                </>
              )}
            </section>
          </div>
        </main>
      )}
      <ForgotPasswordModal isOpen={showRecovery} onClose={() => setShowRecovery(false)} onSuccessToast={setSuccess} />
    </div>
  );
}
