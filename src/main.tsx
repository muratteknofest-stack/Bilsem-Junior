import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PasswordResetPage } from './features/auth/components/PasswordResetPage';
import { isRecoveryRedirect } from './lib/supabase';
import './components/wordwall.css';
import { isAdminLocation } from './lib/admin-access';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/reset-password' || isRecoveryRedirect ? (
      <PasswordResetPage />
    ) : window.location.pathname === '/wordwall' ? (
      <Suspense fallback={<p role="status" className="p-8 text-center">Testler yükleniyor…</p>}><WordwallPage /></Suspense>
    ) : (
      <AuthProvider>
        {isAdminLocation(window.location.pathname) ? (
          <Suspense fallback={<p role="status" className="p-8 text-center">Yönetici alanı yükleniyor…</p>}><AdminPortal /></Suspense>
        ) : <App />}
      </AuthProvider>
    )}
  </StrictMode>,
);

