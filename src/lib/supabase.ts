import { apiFetch } from './api-fetch';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { hasRecoveryClaims, isPasswordRecoveryLocation, passwordRecoveryRedirect } from './password-recovery';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase bağlantı ayarları eksik.');

let rememberSession = true;
const browserStorage = {
  getItem(name: string) {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(name) ?? window.localStorage.getItem(name);
  },
  setItem(name: string, value: string) {
    if (typeof window === 'undefined') return;
    const selected = rememberSession ? window.localStorage : window.sessionStorage;
    const other = rememberSession ? window.sessionStorage : window.localStorage;
    selected.setItem(name, value);
    other.removeItem(name);
  },
  removeItem(name: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

export const isRecoveryRedirect = typeof window !== 'undefined' &&
  isPasswordRecoveryLocation(window.location);

export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storage: browserStorage },
});

let recoverySessionReady = false;
const recoveryListeners = new Set<() => void>();
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) {
    recoverySessionReady = true;
    recoveryListeners.forEach(listener => listener());
  } else if (event === 'SIGNED_OUT') {
    recoverySessionReady = false;
  }
});

export function onPasswordRecovery(listener: () => void) {
  recoveryListeners.add(listener);
  if (recoverySessionReady) listener();
  return () => { recoveryListeners.delete(listener); };
}

export async function isPasswordRecoveryReady(): Promise<boolean> {
  // Wait for Supabase to consume the redirect token before judging the link.
  // A fixed wall-clock timeout can reject valid links on slower connections.
  const { error } = await supabase.auth.initialize();
  if (error) return false;
  if (recoverySessionReady) return true;
  // A reload loses the in-memory event flag, but not the verified recovery
  // session. Ordinary password/sign-up sessions must not unlock this form.
  const { data, error: claimsError } = await supabase.auth.getClaims();
  recoverySessionReady = !claimsError && hasRecoveryClaims(data?.claims);
  return recoverySessionReady;
}

export async function updateRecoveredPassword(password: string) {
  if (!recoverySessionReady) throw new Error('Sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Sıfırlama oturumu doğrulanamadı. Yeni bağlantı isteyin.');
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const response = await apiFetch(`${base}/api/auth/change-password`, {
    method: 'POST', credentials: base ? 'omit' : 'same-origin',
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (response.status !== 204) {
    let message = 'Şifre yenilenemedi. Biraz sonra tekrar deneyin.';
    try { const body = await response.json(); if (typeof body.error === 'string') message = body.error; } catch {}
    throw new Error(message);
  }
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) throw new Error('Şifre değişti ancak oturum kapatılamadı. Lütfen çıkış yapın.');
  recoverySessionReady = false;
}

export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  getIdToken: () => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>;
}

function asUser(user: SupabaseUser): User {
  return {
    uid: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    displayName: String(user.user_metadata?.display_name ?? ''),
    async getIdToken() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session || data.session.user.id !== user.id) throw new Error('Oturum süresi dolmuş veya hesap değişmiş.');
      return data.session.access_token;
    },
    async getIdTokenResult(forceRefresh) {
      if (forceRefresh) await supabase.auth.refreshSession();
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims || data.claims.sub !== user.id) throw error ?? new Error('Oturum doğrulanamadı.');
      return { claims: { ...data.claims, role: data.claims.app_metadata?.role } };
    },
  };
}

export const auth: { currentUser: User | null; authStateReady: () => Promise<void> } = {
  currentUser: null,
  async authStateReady() {
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    auth.currentUser = data.user ? asUser(data.user) : null;
  },
};
supabase.auth.getUser().then(({ data }) => {
  auth.currentUser = data.user ? asUser(data.user) : null;
}).catch(() => {});
supabase.auth.onAuthStateChange((_event, session) => {
  auth.currentUser = session?.user ? asUser(session.user) : null;
});

export function onAuthStateChanged(_auth: typeof auth, onChange: (user: User | null) => void, onError?: (error: Error) => void) {
  let active = true;
  let authEventSeen = false;
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    authEventSeen = true;
    const user = session?.user ? asUser(session.user) : null;
    auth.currentUser = user;
    // Auth callbacks run under the Supabase Auth lock. Profile reads and
    // sign-out in onChange must start after the callback has returned.
    setTimeout(() => {
      if (active) onChange(user);
    }, 0);
  });
  supabase.auth.getUser().then(({ data, error }) => {
    if (!active || authEventSeen) return;
    if (error && error.name !== 'AuthSessionMissingError') onError?.(error);
    else {
      auth.currentUser = data.user ? asUser(data.user) : null;
      onChange(auth.currentUser);
    }
  }).catch(error => {
    if (active && !authEventSeen) onError?.(error);
  });
  return () => { active = false; listener.subscription.unsubscribe(); };
}

export const browserLocalPersistence = 'local';
export const browserSessionPersistence = 'session';
export async function setPersistence(_auth: typeof auth, persistence: string) {
  rememberSession = persistence !== browserSessionPersistence;
}
export async function signInWithEmailAndPassword(_auth: typeof auth, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error('Giriş başarısız.');
  auth.currentUser = asUser(data.user);
  return { user: auth.currentUser };
}
export async function signOut(_auth: typeof auth) {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  auth.currentUser = null;
}
export async function sendEmailVerification(_user: User) {
  if (!_user.email) throw new Error('E-posta adresi bulunamadı.');
  const { error } = await supabase.auth.resend({ type: 'signup', email: _user.email });
  if (error) throw error;
}
export async function sendPasswordResetEmail(_auth: typeof auth, email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordRecoveryRedirect(window.location.origin, import.meta.env.VITE_PUBLIC_SITE_URL),
  });
  if (error) throw error;
}


