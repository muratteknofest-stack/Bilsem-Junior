import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './lib/error-boundary';

// Safely handle unhandled background Firebase Auth network rejections
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

// Register Service Worker for offline support and caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
