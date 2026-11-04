import { z } from 'zod';
import { getServiceClient } from './supabase-admin';
import { GooglePlayError } from './google-play-model';

export function paidAccessStartsAt(env: NodeJS.ProcessEnv = process.env): number | null {
  const value = env.GOOGLE_PLAY_PAID_ACCESS_FROM;
  if (!value) return null;
  const parsed = z.iso.datetime({ offset: true }).safeParse(value);
  if (!parsed.success) throw new GooglePlayError('Üyelik erişim ayarları doğrulanamadı.');
  return Date.parse(parsed.data);
}
// A fixed operator grant, independent of Google purchases and editable profiles.
export function lifetimeAccessBefore(env: NodeJS.ProcessEnv = process.env): number | null {
  const value = env.BILSEM_LIFETIME_ACCESS_BEFORE;
  if (!value) return null;
  const parsed = z.iso.datetime({ offset: true }).safeParse(value);
  if (!parsed.success) throw new GooglePlayError('Süresiz üyelik ayarı doğrulanamadı.');
  return Date.parse(parsed.data);
}
async function authCreationTime(studentId: string): Promise<number> {
  const { data, error } = await getServiceClient().auth.admin.getUserById(studentId);
  const created = z.iso.datetime({ offset: true }).safeParse(data?.user?.created_at);
  if (error || data?.user?.id !== studentId || !created.success)
    throw new GooglePlayError('Hesabın üyelik kapsamı doğrulanamadı. Yeniden deneyin.');
  return Date.parse(created.data);
}
export async function studentAccessPolicy(studentId: string) {
  const before = lifetimeAccessBefore();
  let created: number | undefined;
  if (before !== null) {
    created = await authCreationTime(studentId);
    if (created < before) return { lifetime: true, requiresSubscription: false };
  }
  if (process.env.GOOGLE_PLAY_ENFORCE_PAID_ACCESS === 'true') return { lifetime: false, requiresSubscription: true };
  const startsAt = paidAccessStartsAt();
  return { lifetime: false, requiresSubscription: startsAt !== null && (created ?? await authCreationTime(studentId)) >= startsAt };
}
export async function studentRequiresPaidAccess(studentId: string): Promise<boolean> {
  return (await studentAccessPolicy(studentId)).requiresSubscription;
}
export async function studentHasLifetimeAccess(studentId: string): Promise<boolean> {
  const before = lifetimeAccessBefore();
  return before !== null && await authCreationTime(studentId) < before;
}
