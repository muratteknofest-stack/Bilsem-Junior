import { lazy, Suspense } from 'react';
import { accountEntryPath } from '../account-entry';

const LandingPage = lazy(() => import('../../../components/LandingPage').then(module => ({ default: module.LandingPage })));

export function AuthConnectionNotice({ error }: { error: string }) {
  return <section role="alert" className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-950">
    <p>{error}</p>
    <button type="button" className="mt-2 min-h-11 rounded-xl bg-amber-950 px-5 font-semibold text-white" onClick={() => window.location.reload()}>Yeniden dene</button>
  </section>;
}

function SessionWaiting({ error }: { error: string | null }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
      <p className="mb-3 text-sm font-bold text-indigo-600">BİLSEM JUNIOR</p>
      <h1 className="text-2xl font-bold">{error ? 'Birlikte yeniden deneyelim' : 'Keşfe hazırlanıyoruz'}</h1>
      <p role={error ? 'alert' : 'status'} className="mt-4 leading-relaxed">{error || 'Hesabın doğrulanıyor. Birazdan kaldığın yerden devam edebilirsin.'}</p>
      {error && <button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-indigo-600 px-5 font-bold text-white" onClick={() => window.location.reload()}>Yeniden dene</button>}
      <a href="/" className="mt-4 inline-flex min-h-11 items-center px-3 font-semibold text-indigo-700">Ana sayfayı aç</a>
    </div>
  </main>;
}

/** This public content never reads a cached identity or unlocks a private route. */
export function AuthStartupView({ error, publicLanding = false }: { error: string | null; publicLanding?: boolean }) {
  if (!publicLanding) return <SessionWaiting error={error} />;
  return <>
    {error && <AuthConnectionNotice error={error} />}
    <Suspense fallback={<SessionWaiting error={error} />}>
      <LandingPage
        onNavigateToLogin={role => window.location.assign(accountEntryPath('login', role))}
        onNavigate={route => {
          if (route === 'register') window.location.assign('/register');
          if (route === 'landing') window.location.assign('/');
        }}
      />
    </Suspense>
  </>;
}
