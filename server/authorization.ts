export type AppRole = 'student' | 'parent' | 'admin';

export function hasAuthorizedProfileRole(
  uid: string,
  profile: { id?: unknown; role?: unknown } | undefined,
  token: { role?: unknown; email_verified?: unknown },
  roles: AppRole[],
): boolean {
  if (!profile || profile.id !== uid || !roles.includes(profile.role as AppRole)) return false;
  if (profile.role === 'admin') {
    return token.role === 'admin' && token.email_verified === true;
  }
  return true;
}
