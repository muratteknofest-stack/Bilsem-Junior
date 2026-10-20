import { Component, StrictMode, Suspense, lazy, useEffect, type ReactNode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { PasswordRecoveryEntry } from './features/auth/components/PasswordRecoveryEntry';
import { isRecoveryRedirect } from './lib/supabase';
import { isAdminLocation } from './lib/admin-access';
import { normalizeAppPathname } from './lib/route-sync';

const AdminPortal = lazy(() => import('./components/AdminPortal').then(module => ({ default: module.AdminPortal })));
const WordwallPage = lazy(() => import('./components/WordwallLibrary').then(module => ({ default: module.WordwallPage })));

// Safely handle unhandled background Supabase Auth network rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.code === 'auth/network-request-failed' ||
       reason.message?.includes('auth/network-request-failed') ||
       reason.message?.includes('network-request-failed'))
    ) {
      console.warn('Handled background auth network notice:', reason.message || reason);
      event.preventDefault();
    }
  });
}

const pathname = normalizeAppPathname(window.location.pathname);


/** A render or lazy-import failure must leave a usable recovery screen. */
class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { window.__bilsemBoot?.fail(); }
  render() {
    return this.state.failed ? <main role="alert" className="bj-load-recovery"><div className="bj-load-card"><h1>Bilsem Junior yeniden denemeye hazır</h1><p>Uygulama açılamadı. Güncel sürümü yeniden yükleyebilirsin.</p><button type="button" onClick={() => window.location.reload()}>Yeniden yükle</button><a href="/">Ana sayfaya dön</a></div></main> : this.props.children;
  }
}
function AppReady() {
  useEffect(() => { window.__bilsemBoot?.ready(); }, []);
  return null;
}
export function mountApp() {
  const root = document.getElementById('root');
  if (!root) throw new Error('Uygulama başlangıç alanı bulunamadı.');

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
    <AppReady />
    {pathname === '/reset-password' || isRecoveryRedirect ? (
      <PasswordRecoveryEntry />
    ) : pathname === '/wordwall' ? (
      <Suspense fallback={<p role="status" className="p-8 text-center">Testler yükleniyor…</p>}><WordwallPage /></Suspense>
    ) : (
      <AuthProvider>
        {isAdminLocation(pathname) ? (
          <Suspense fallback={<p role="status" className="p-8 text-center">Yönetici alanı yükleniyor…</p>}><AdminPortal /></Suspense>
        ) : <App />}
      </AuthProvider>
    )}
    </AppErrorBoundary>
  </StrictMode>,
);


}
