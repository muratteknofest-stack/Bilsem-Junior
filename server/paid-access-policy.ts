import { z } from 'zod';
import { getServiceClient } from './supabase-admin';
import { GooglePlayError } from './google-play-model';

// A fixed server setting, never supplied by the client or derived from editable
// profile/user_metadata timestamps. Existing students keep their previous access.
export function paidAccessStartsAt(env: NodeJS.ProcessEnv = process.env): number | null {
  const value = env.GOOGLE_PLAY_PAID_ACCESS_FROM;
  if (!value) return null;
  const parsed = z.iso.datetime({ offset: true }).safeParse(value);
  if (!parsed.success) throw new GooglePlayError('Üyelik erişim ayarları doğrulanamadı.');
  return Date.parse(parsed.data);
}

export async function studentRequiresPaidAccess(studentId: string): Promise<boolean> {
  if (process.env.GOOGLE_PLAY_ENFORCE_PAID_ACCESS === 'true') return true;
  const startsAt = paidAccessStartsAt();
  if (startsAt === null) return false;
  const { data, error } = await getServiceClient().auth.admin.getUserById(studentId);
  const createdAt = z.iso.datetime({ offset: true }).safeParse(data?.user?.created_at);
  if (error || data?.user?.id !== studentId || !createdAt.success)
    throw new GooglePlayError('Hesabın üyelik kapsamı doğrulanamadı. Yeniden deneyin.');
  return Date.parse(createdAt.data) >= startsAt;
}
