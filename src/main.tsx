import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SocialChallenge } from './components/SocialChallenge';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname.startsWith('/soru-gunu/')
      ? <SocialChallenge />
      : <AuthProvider><App /></AuthProvider>}
  </StrictMode>,
);
