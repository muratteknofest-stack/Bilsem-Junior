import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://guixuelbwqgurvmuhkve.supabase.co';
// This project-scoped publishable key is safe in the browser bundle. Never
// substitute the service role key here.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-XGuPVsHBRLFb6PkIEuY8A_bz6vLcdz';
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

export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storage: browserStorage },
});

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
      if (error || !data.session) throw new Error('Oturum süresi dolmuş.');
      return data.session.access_token;
    },
    async getIdTokenResult(forceRefresh) {
      if (forceRefresh) await supabase.auth.refreshSession();
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims) throw error ?? new Error('Oturum doğrulanamadı.');
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
  supabase.auth.getUser().then(({ data, error }) => {
    if (!active) return;
    if (error) onError?.(error);
    else {
      auth.currentUser = data.user ? asUser(data.user) : null;
      onChange(auth.currentUser);
    }
  }).catch(error => onError?.(error));
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (active) {
      auth.currentUser = session?.user ? asUser(session.user) : null;
      onChange(auth.currentUser);
    }
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
export async function createUserWithEmailAndPassword(_auth: typeof auth, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) throw error ?? new Error('Kayıt başarısız.');
  auth.currentUser = asUser(data.user);
  return { user: auth.currentUser };
}
export async function signOut(_auth: typeof auth) {
  const { error } = await supabase.auth.signOut();
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
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw error;
}
