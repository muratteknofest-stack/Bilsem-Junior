export type AccountEntry = { mode: 'login' | 'register'; role: 'student' | 'parent' };
export function accountEntry(url: URL): AccountEntry | null {
  const path = url.pathname.replace(/\/$/, '');
  if (path === '/register') return { mode: 'register', role: 'parent' };
  if (path === '/login') return { mode: 'login', role: url.searchParams.get('role') === 'parent' ? 'parent' : 'student' };
  return null;
}
export function accountEntryPath(mode: AccountEntry['mode'], role: string): string {
  return mode === 'register' ? '/register' : role === 'parent' ? '/login?role=parent' : '/login';
}
