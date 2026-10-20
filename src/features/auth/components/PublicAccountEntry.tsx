import { lazy, Suspense } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { accountEntryPath, type AccountEntry } from '../account-entry';
import { AuthConnectionNotice } from './AuthStartupView';

const LoginPage = lazy(() => import('../../../components/LoginPage').then(module => ({ default: module.LoginPage })));

/** Keep public forms usable and mounted while the previous session is checked. */
export function PublicAccountEntry({ entry }: { entry: AccountEntry }) {
  const { startupError } = useAuth();
  return <>
    {startupError && <AuthConnectionNotice error={startupError} />}
    <Suspense fallback={<p role="status" className="p-8 text-center">Hesap sayfası açılıyor…</p>}>
      <LoginPage
        initialRole={entry.role}
        initialMode={entry.mode}
        onNavigateHome={() => window.location.assign('/')}
        onModeChange={(mode, role) => window.history.replaceState(window.history.state, '', accountEntryPath(mode, role))}
        onLoginSuccess={() => window.location.assign('/')}
      />
    </Suspense>
  </>;
}
