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
    NativeApp.addListener('backButton', () => {
      // React routes need to consume Back before the native activity minimizes.
      // Window is an ancestor here: capture handlers for forms/dialogs always run
      // before the window's bubbling route handler, regardless of registration order.
      if (document.dispatchEvent(new Event('zekapark:native-back', { bubbles: true, cancelable: true }))) void NativeApp.minimizeApp();
    }),
  ).catch(() => {});
}

const AdminPortal = lazy(() => import('./components/AdminPortal').then(module => ({ default: module.AdminPortal })));
const WordwallPage = lazy(() => import('./components/WordwallPage').then(module => ({ default: module.WordwallPage })));

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
      <AuthProvider><Suspense fallback={<p role="status" className="p-8 text-center">Testler yükleniyor…</p>}><WordwallPage /></Suspense></AuthProvider>
    ) : (
      <AuthProvider>
        {isAdminLocation(window.location.pathname) ? (
          <Suspense fallback={<p role="status" className="p-8 text-center">Yönetici alanı yükleniyor…</p>}><AdminPortal /></Suspense>
        ) : <App />}
      </AuthProvider>
    )}
  </StrictMode>,
);

