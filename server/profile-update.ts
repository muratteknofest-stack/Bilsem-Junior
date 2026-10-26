import type { Response } from 'express';
import { z } from 'zod';
import { userProfileUpdateSchema } from '../src/lib/validations';
import { toSupabaseRow } from '../src/lib/supabase-shape';
import type { AuthenticatedRequest } from './security';
import { getServiceClient } from './supabase-admin';

interface ProfileWriteDependencies {
  save: (ownerId: string, row: Record<string, unknown>) => Promise<boolean>;
  now?: () => number;
}
const empty = z.object({}).strict();
const notWritable = (res: Response) => res.status(409).json({ error: 'Profil güncellenemiyor. Oturumunuzu ve hesap durumunu kontrol edin.', code: 'PROFILE_NOT_WRITABLE' });

export function createProfileUpdateHandler(deps: ProfileWriteDependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
    const parsed = userProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success || !empty.safeParse(req.query).success) return res.status(400).json({
      error: 'Profil ayarları geçersiz. Sınıf değişikliği için sınıf seçimini kullanın.', code: 'INVALID_PROFILE_UPDATE',
    });
    const updatedAt = (deps.now || Date.now)();
    const row: Record<string, unknown> = toSupabaseRow('profiles', req.authUser.uid, parsed.data);
    delete row.id;
    row.updated_at = updatedAt;
    if (!await deps.save(req.authUser.uid, row)) return notWritable(res);
    // Never return the complete profile/DB row from a preferences mutation.
    return res.json({ changes: parsed.data, updatedAt });
  };
}

export function createProfileActivityHandler(deps: ProfileWriteDependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
    if (!empty.safeParse(req.body).success || !empty.safeParse(req.query).success)
      return res.status(400).json({ error: 'Geçersiz profil etkinliği.', code: 'INVALID_PROFILE_ACTIVITY' });
    const now = (deps.now || Date.now)();
    if (!await deps.save(req.authUser.uid, { last_login_at: now, updated_at: now })) return notWritable(res);
    return res.json({ lastLoginAt: now });
  };
}

const database: ProfileWriteDependencies = {
  async save(ownerId, row) {
    const { data, error } = await getServiceClient().from('profiles').update(row)
      .eq('id', ownerId).eq('deletion_pending', false).select('id').maybeSingle();
    if (error) throw error;
    return data?.id === ownerId;
  },
};
export const updateOwnProfile = createProfileUpdateHandler(database);
export const recordOwnProfileActivity = createProfileActivityHandler(database);
