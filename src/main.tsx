import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PasswordRecoveryEntry } from './features/auth/components/PasswordRecoveryEntry';
import { isRecoveryRedirect } from './lib/supabase';
import './components/wordwall.css';
import { isAdminLocation } from './lib/admin-access';
import { isAndroidApp } from './lib/native-app';
import './native.css';
import { Capacitor } from '@capacitor/core';

if (isAndroidApp) {
  document.documentElement.dataset.nativeApp = 'android';
  // Preserve the test screen's existing popstate flow on Android's Back gesture.
  if (Capacitor.isNativePlatform()) void import('@capacitor/app').then(({ App: NativeApp }) =>
    NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.state?.zekaparkTestPage) window.history.back();
      else void NativeApp.minimizeApp();
    }),
  );
}

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
      <PasswordRecoveryEntry />
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

