import type { User } from '../../lib/supabase';
import type { UserProfile } from '../../types';

export interface SessionStartupState {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdminAuthorized: boolean;
  loading: boolean;
  startupError: string | null;
}
interface SessionAttempt {
  user: User;
  profile: UserProfile | null;
  admin: boolean;
  finished: boolean;
  abort: AbortController;
}
export interface SessionStartupDependencies {
  currentUserId: () => string | null;
  subscribe: (receive: (user: User | null) => void, fail: (error: unknown) => void) => () => void;
  canUseAccount: (user: User) => boolean;
  loadProfile: (user: User) => Promise<UserProfile | null>;
  authorizeAdmin: (user: User) => Promise<boolean>;
  activate: (profile: UserProfile) => void;
  syncProfile: (profile: UserProfile) => void;
  hydrate: (signal: AbortSignal) => Promise<void>;
  progressUnavailable: (userId: string) => void;
  clearSession: () => void;
  signOut: () => Promise<void>;
  watch: (user: User, next: (profile: UserProfile | null) => void, fail: (error: unknown) => void) => () => void;
  onState: (state: SessionStartupState) => void;
  notice: (error: unknown) => void;
  sessionTimeoutMs?: number;
  progressTimeoutMs?: number;
}

/** Bound startup independently from SDK locks; stale completions cannot reopen an account. */
export function observeSession(deps: SessionStartupDependencies): () => void {
  let mounted = true;
  let attempt: SessionAttempt | null = null;
  let verified: { userId: string; profile: UserProfile; admin: boolean } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unwatch: (() => void) | null = null;
  let unsubscribe = () => {};
  const pending: SessionStartupState = { currentUser: null, userProfile: null, isAdminAuthorized: false, loading: true, startupError: null };
  const anonymous = { ...pending, loading: false };

  function stopAttempt() {
    clearTimeout(timer);
    attempt?.abort.abort();
    attempt = null;
    if (unwatch) { unwatch(); unwatch = null; }
  }
  function isCurrent(next: SessionAttempt) {
    return mounted && attempt === next && deps.currentUserId() === next.user.uid;
  }
  function fail(error: unknown) {
    if (!mounted) return;
    stopAttempt();
    verified = null;
    deps.notice(error);
    // A network outage is not a sign-out. Keep account-scoped cached progress.
    deps.onState({ ...anonymous, startupError: 'Hesabına şu anda bağlanamadık. Bağlantını kontrol edip yeniden dene.' });
  }
  function rejectAccount(next: SessionAttempt) {
    if (!isCurrent(next)) return;
    stopAttempt();
    verified = null;
    deps.clearSession();
    deps.onState(anonymous);
    // Never let a stalled sign-out keep the public screen waiting.
    void Promise.resolve().then(() => deps.signOut()).catch(deps.notice);
  }
  function validProfile(profile: UserProfile | null, user: User) {
    return profile !== null && profile.id === user.uid &&
      ['student', 'parent', 'admin'].includes(profile.role);
  }
  function finish(next: SessionAttempt) {
    if (!isCurrent(next) || next.finished || !next.profile) return;
    next.finished = true;
    clearTimeout(timer);
    const profile = next.profile;
    verified = { userId: next.user.uid, profile, admin: next.admin };
    deps.onState({ currentUser: next.user, userProfile: profile, isAdminAuthorized: next.admin, loading: false, startupError: null });
    try {
      unwatch = deps.watch(next.user, updated => {
        if (!isCurrent(next)) return;
        if (!validProfile(updated, next.user) || (updated?.role === 'admin' && !next.admin)) {
          rejectAccount(next); return;
        }
        if (!updated) return;
        verified = { userId: next.user.uid, profile: updated, admin: updated.role === 'admin' && next.admin };
        deps.syncProfile(updated);
        deps.onState({ currentUser: next.user, userProfile: updated, isAdminAuthorized: updated.role === 'admin' && next.admin, loading: false, startupError: null });
      }, deps.notice);
    } catch (error) { deps.notice(error); }
  }
  async function receive(user: User | null) {
    if (!mounted || deps.currentUserId() !== (user?.uid ?? null)) return;
    stopAttempt();
    if (!user) {
      verified = null;
      deps.clearSession();
      deps.onState(anonymous);
      return;
    }
    if (verified?.userId !== user.uid) verified = null;
    const next: SessionAttempt = { user, profile: null, admin: false, finished: false, abort: new AbortController() };
    attempt = next;
    deps.onState({ ...pending, currentUser: user,
      // A token refresh must not unmount a student's active adventure.
      userProfile: verified?.profile ?? null, isAdminAuthorized: verified?.admin ?? false, loading: !verified,
    });
    timer = setTimeout(() => { if (isCurrent(next)) fail(new Error('AUTH_PROFILE_TIMEOUT')); }, deps.sessionTimeoutMs ?? 12000);
    if (!deps.canUseAccount(user)) { rejectAccount(next); return; }
    try {
      const profile = await deps.loadProfile(user);
      if (!isCurrent(next)) return;
      if (!validProfile(profile, user) || !profile) { rejectAccount(next); return; }
      if (profile.role === 'admin') {
        next.admin = await deps.authorizeAdmin(user);
        if (!isCurrent(next)) return;
        if (!next.admin) { rejectAccount(next); return; }
      }
      next.profile = profile;
      deps.activate(profile);
      clearTimeout(timer);
      // Progress is optional for opening a verified account. Abort its late
      // cache writes before releasing the dashboard when the read stalls.
      timer = setTimeout(() => {
        if (!isCurrent(next) || next.finished) return;
        next.abort.abort();
        deps.progressUnavailable(user.uid);
        finish(next);
      }, deps.progressTimeoutMs ?? 6000);
      try { await deps.hydrate(next.abort.signal); }
      catch (error) {
        if (isCurrent(next) && !next.finished) {
          deps.notice(error);
          deps.progressUnavailable(user.uid);
        }
      }
      finish(next);
    } catch (error) { if (isCurrent(next)) fail(error); }
  }

  timer = setTimeout(() => fail(new Error('AUTH_INITIAL_SESSION_TIMEOUT')), deps.sessionTimeoutMs ?? 12000);
  try { unsubscribe = deps.subscribe(user => { void receive(user); }, fail); }
  catch (error) { fail(error); }
  return () => {
    if (!mounted) return;
    mounted = false;
    stopAttempt();
    unsubscribe();
  };
}
