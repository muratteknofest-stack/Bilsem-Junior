export const ADMIN_LOGIN_PATH = '/admin/giris';
export const ADMIN_PANEL_PATH = '/admin';

export function isAdminLocation(pathname: string): boolean {
  return /^\/admin(?:\/giris)?\/?$/.test(pathname);
}

type AdminSession = {
  loading: boolean;
  isAdminAuthorized: boolean;
  currentUser: { uid: string; emailVerified: boolean } | null;
  userProfile: { id: string; role: string } | null;
};

// AuthContext verifies the Supabase app_metadata claim and stored profile.
// A path, cached profile or successful password submission alone is insufficient.
export function hasVerifiedAdminAccess(session: AdminSession): boolean {
  return !session.loading && session.isAdminAuthorized &&
    Boolean(session.currentUser?.emailVerified && session.userProfile?.role === 'admin' &&
      session.currentUser.uid === session.userProfile.id);
}
