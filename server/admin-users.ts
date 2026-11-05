import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { z } from 'zod';
import { strongPasswordSchema } from '../src/lib/validations';
import { toSupabaseRow } from '../src/lib/supabase-shape';
import { isManagedStudentEmail } from '../src/lib/account-identifiers';
import { isDuplicateEmail } from './family-registration';
import { PasswordPolicyError } from './password-policy';
import { logServerFailure } from './safe-log';
import { getAdminAuth, normalizeStudentCode, type AuthenticatedRequest } from './security';
import { getServiceClient } from './supabase-admin';

const id = z.uuid();
const name = z.string().trim().min(2, 'Ad en az 2 karakter olmalıdır.').max(50, 'Ad en fazla 50 karakter olabilir.');
const grade = z.number().int().min(1, 'Sınıf 1 ile 4 arasında olmalıdır.').max(4, 'Sınıf 1 ile 4 arasında olmalıdır.');
const email = z.string().trim().toLowerCase().max(254, 'E-posta adresi çok uzun.').email('Geçerli bir e-posta adresi giriniz.');

export const createAdminUserSchema = z.object({
  role: z.enum(['student', 'parent']),
  name,
  email: email.optional(),
  password: strongPasswordSchema,
  grade: grade.optional(),
  parentId: id.nullable().optional(),
  initialTier: z.enum(['free', 'subscriber', 'legacy_lifetime']).optional(),
  planId: z.enum(['monthly', 'quarterly', 'annual']).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.role === 'parent') {
    if (!value.email) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Veli için e-posta adresi gerekli.' });
    else if (isManagedStudentEmail(value.email)) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Veli e-postası öğrenci alan adını kullanamaz.' });
    if (value.parentId) ctx.addIssue({ code: 'custom', path: ['parentId'], message: 'Veli hesabına veli bağlanamaz.' });
    if (value.initialTier && value.initialTier !== 'free') ctx.addIssue({ code: 'custom', path: ['initialTier'], message: 'Abonelik yalnızca öğrenci hesabı için belirlenebilir.' });
  } else if (!value.grade) {
    ctx.addIssue({ code: 'custom', path: ['grade'], message: 'Öğrenci için sınıf seçiniz.' });
  }
});

export const updateAdminUserSchema = z.object({
  name: name.optional(),
  email: email.optional(),
  password: strongPasswordSchema.optional(),
  grade: grade.optional(),
  avatar: z.string().trim().min(1).max(16).optional(),
  level: z.number().int().min(1).max(1000).optional(),
  xp: z.number().int().min(0).max(10_000_000).optional(),
  parentId: id.nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Değiştirilecek bir alan belirtilmedi.');

export const deleteAdminUserSchema = z.object({
  confirm: z.literal(true),
  purgeBilling: z.boolean().optional(),
}).strict();

export const updateAdminSubscriptionSchema = z.object({
  tier: z.enum(['subscriber', 'legacy_lifetime', 'free']),
  planId: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  expiresAt: z.string().nullable().optional(),
  autoRenewing: z.boolean().optional(),
}).strict();

export class AdminUserError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

interface ProfileRow {
  id: string;
  role: 'student' | 'parent' | 'admin';
  name: string;
  email: string | null;
  linked_parent_id: string | null;
  linked_student_ids: string[] | null;
  deletion_pending: boolean | null;
}

/** Accounts removed together: a parent takes every linked student with it. */
export function deletionScope(target: ProfileRow, children: Pick<ProfileRow, 'id' | 'role'>[]) {
  if (target.role === 'admin') throw new AdminUserError('Yönetici hesapları buradan silinemez.', 403);
  const ids = new Set<string>([target.id]);
  if (target.role === 'parent') {
    for (const child of children) {
      if (child.role !== 'student') throw new AdminUserError('Aile bağlantıları doğrulanamadı.');
      ids.add(child.id);
    }
    for (const linked of target.linked_student_ids ?? []) ids.add(linked);
  }
  return [...ids];
}

function fail(res: Response, error: unknown, context: string) {
  if (error instanceof PasswordPolicyError) return res.status(error.status).json({ error: error.message, code: error.code });
  if (error instanceof AdminUserError) return res.status(error.status).json({ error: error.message });
  if (isDuplicateEmail(error)) return res.status(409).json({ error: 'Bu e-posta ile kayıtlı bir hesap zaten var.' });
  logServerFailure(context, error);
  return res.status(503).json({ error: 'İşlem tamamlanamadı. Bir süre sonra tekrar deneyin.' });
}

function invalid(res: Response, error: z.ZodError) {
  return res.status(400).json({ error: error.issues[0]?.message || 'Geçersiz kullanıcı bilgisi.' });
}

async function audit(type: string, actor: string, target: string, detail: Record<string, unknown>) {
  try {
    const { error } = await getServiceClient().from('security_events').insert({
      legacy_id: randomUUID(), type, actor_id: actor, student_id: target, detail, created_at: Date.now(),
    });
    if (error) throw error;
  } catch (error) { logServerFailure('Admin user audit failed', error); }
}

async function loadProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await getServiceClient().from('profiles')
    .select('id,role,name,email,linked_parent_id,linked_student_ids,deletion_pending').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new AdminUserError('Kullanıcı bulunamadı.', 404);
  if (data.deletion_pending) throw new AdminUserError('Bu hesap silme işlemi bekliyor; değiştirilemez.');
  return data as ProfileRow;
}

async function loadParent(parentId: string): Promise<ProfileRow> {
  const parent = await loadProfile(parentId).catch(error => {
    if (error instanceof AdminUserError && error.status === 404) throw new AdminUserError('Seçilen veli bulunamadı.', 422);
    throw error;
  });
  if (parent.role !== 'parent') throw new AdminUserError('Seçilen hesap bir veli hesabı değil.', 422);
  return parent;
}

async function setStudentLinks(parentId: string, mutate: (ids: string[]) => string[]) {
  const client = getServiceClient();
  const { data, error } = await client.from('profiles').select('linked_student_ids').eq('id', parentId).maybeSingle();
  if (error) throw error;
  if (!data) return;
  const next = [...new Set(mutate(data.linked_student_ids ?? []))];
  const result = await client.from('profiles').update({ linked_student_ids: next, updated_at: Date.now() }).eq('id', parentId);
  if (result.error) throw result.error;
}

export async function setStudentSubscription(
  studentId: string,
  parentId: string | null,
  options: {
    tier: 'subscriber' | 'legacy_lifetime' | 'free';
    planId?: 'monthly' | 'quarterly' | 'annual';
    expiresAt?: string | null;
    autoRenewing?: boolean;
  }
) {
  const client = getServiceClient();
  const nowIso = new Date().toISOString();

  if (options.tier === 'free') {
    const updated = await client
      .from('google_play_subscriptions')
      .update({
        subscription_state: 'SUBSCRIPTION_STATE_EXPIRED',
        auto_renewing: false,
        verified_at: nowIso,
      })
      .eq('student_id', studentId);
    if (updated.error) throw updated.error;
    return { tier: 'free', expiresAt: null };
  }

  const isLifetime = options.tier === 'legacy_lifetime';
  let expiryIso: string;
  if (isLifetime) {
    expiryIso = '2099-12-31T23:59:59.000Z';
  } else if (options.expiresAt) {
    expiryIso = new Date(options.expiresAt).toISOString();
  } else {
    const plan = options.planId || 'monthly';
    const days = plan === 'annual' ? 365 : plan === 'quarterly' ? 90 : 30;
    expiryIso = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const tokenHash = createHash('sha256').update(`admin_grant:${studentId}`).digest('hex');
  const dummyCipher = `v1.admin_grant.${randomBytes(16).toString('hex')}.${randomBytes(32).toString('hex')}`;

  const row = {
    token_hash: tokenHash,
    parent_id: parentId,
    student_id: studentId,
    token_ciphertext: dummyCipher,
    package_name: 'com.quantumtech.bilsemjunior',
    product_id: 'zekapark_uyelik',
    base_plan_id: options.planId || (isLifetime ? 'annual' : 'monthly'),
    subscription_state: 'SUBSCRIPTION_STATE_ACTIVE',
    expires_at: expiryIso,
    auto_renewing: options.autoRenewing ?? false,
    acknowledgement_state: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    test_purchase: false,
    verified_at: nowIso,
  };

  const saved = await client.from('google_play_subscriptions').upsert(row, { onConflict: 'token_hash' });
  if (saved.error) throw saved.error;

  return { tier: options.tier, planId: row.base_plan_id, expiresAt: expiryIso };
}

export async function createAdminUser(req: AuthenticatedRequest, res: Response) {
  const parsed = createAdminUserSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const input = parsed.data;
  let createdId: string | undefined;
  try {
    const parent = input.role === 'student' && input.parentId ? await loadParent(input.parentId) : null;
    const auth = getAdminAuth();
    let userEmail = input.email!;
    let studentCode: string | undefined;
    let uid = '';
    if (input.role === 'student') {
      for (let attempt = 0; attempt < 5 && !uid; attempt++) {
        const code = `${normalizeStudentCode(input.name)}${randomInt(1000, 10000)}`;
        try {
          uid = (await auth.createUser({ email: `${code.toLowerCase()}@zekapark.com`, password: input.password, emailVerified: true, displayName: input.name })).uid;
          studentCode = code; userEmail = `${code.toLowerCase()}@zekapark.com`;
        } catch (error) { if (!isDuplicateEmail(error)) throw error; }
      }
      if (!uid) throw new Error('Student code allocation failed');
    } else {
      uid = (await auth.createUser({ email: userEmail, password: input.password, emailVerified: true, displayName: input.name })).uid;
    }
    createdId = uid;
    const now = Date.now();
    const profile = {
      email: userEmail, name: input.name, role: input.role,
      avatar: input.role === 'parent' ? '🦉' : '🦊', createdAt: now, updatedAt: now,
      ...(input.role === 'student' ? {
        studentCode, grade: input.grade, level: 1, xp: 0, streak: 0, lastActiveDate: new Date(now).toISOString(),
        dailyGoalMinutes: 15, todayMinutesSpent: 0, soundEnabled: true,
        ...(parent ? { linkedParentId: parent.id, recoveryEmail: parent.email ?? undefined } : {}),
      } : { linkedStudentIds: [] }),
    };
    const inserted = await getServiceClient().from('profiles').insert(toSupabaseRow('profiles', uid, profile), { defaultToNull: false });
    if (inserted.error) throw inserted.error;
    if (parent) await setStudentLinks(parent.id, ids => [...ids, uid]);

    if (input.role === 'student' && input.initialTier && input.initialTier !== 'free') {
      await setStudentSubscription(uid, parent?.id ?? null, {
        tier: input.initialTier,
        planId: input.planId,
      }).catch(err => logServerFailure('Initial subscription grant failed', err));
    }

    await audit('admin_user_created', req.authUser!.uid, uid, { role: input.role, parentId: parent?.id ?? null });
    return res.status(201).json({ success: true, id: uid, email: userEmail, studentCode: studentCode ?? null });
  } catch (error) {
    // The profile cascades from auth.users, so removing the Auth account fully rolls back.
    if (createdId) await getAdminAuth().deleteUser(createdId).catch(cleanup => logServerFailure('Admin user rollback failed', cleanup));
    return fail(res, error, 'Admin user creation failed');
  }
}

export async function updateAdminUser(req: AuthenticatedRequest, res: Response) {
  const target = id.safeParse(req.params.id);
  const parsed = updateAdminUserSchema.safeParse(req.body);
  if (!target.success) return res.status(400).json({ error: 'Geçersiz kullanıcı kimliği.' });
  if (!parsed.success) return invalid(res, parsed.error);
  const input = parsed.data;
  try {
    const profile = await loadProfile(target.data);
    if (profile.role === 'admin') throw new AdminUserError('Yönetici hesapları buradan düzenlenemez.', 403);
    if (profile.role === 'parent' && (input.grade !== undefined || input.parentId !== undefined))
      throw new AdminUserError('Veli hesabında sınıf veya veli bağlantısı değiştirilemez.', 422);
    if (profile.role === 'student' && input.email !== undefined)
      throw new AdminUserError('Öğrenci e-postası öğrenci koduna bağlıdır ve değiştirilemez.', 422);
    if (input.email && isManagedStudentEmail(input.email)) throw new AdminUserError('Veli e-postası öğrenci alan adını kullanamaz.', 422);

    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.avatar !== undefined) row.avatar = input.avatar;
    if (input.grade !== undefined) row.grade = input.grade;
    if (input.level !== undefined) row.level = input.level;
    if (input.xp !== undefined) row.xp = input.xp;
    if (input.email !== undefined) row.email = input.email;

    let newParent: ProfileRow | null | undefined;
    if (input.parentId !== undefined && input.parentId !== profile.linked_parent_id) {
      newParent = input.parentId ? await loadParent(input.parentId) : null;
      row.linked_parent_id = newParent?.id ?? null;
      row.recovery_email = newParent?.email ?? null;
    }

    const client = getServiceClient();
    if (input.email !== undefined || input.password !== undefined) {
      if (input.password !== undefined) await getAdminAuth().updateUser(profile.id, { password: input.password });
      if (input.email !== undefined) {
        const changed = await client.auth.admin.updateUserById(profile.id, { email: input.email, email_confirm: true });
        if (changed.error) throw changed.error;
      }
    }
    if (Object.keys(row).length) {
      const updated = await client.from('profiles').update({ ...row, updated_at: Date.now() }).eq('id', profile.id);
      if (updated.error) throw updated.error;
    }
    if (newParent !== undefined) {
      if (profile.linked_parent_id) await setStudentLinks(profile.linked_parent_id, ids => ids.filter(value => value !== profile.id));
      if (newParent) await setStudentLinks(newParent.id, ids => [...ids, profile.id]);
    }
    // A reset password must also end any session that is already open.
    if (input.password !== undefined) await getAdminAuth().revokeRefreshTokens(profile.id).catch(error => logServerFailure('Session revoke failed', error));
    await audit('admin_user_updated', req.authUser!.uid, profile.id, { fields: Object.keys(input).map(key => key === 'password' ? 'password_reset' : key) });
    return res.json({ success: true });
  } catch (error) {
    return fail(res, error, 'Admin user update failed');
  }
}

export async function updateAdminUserSubscription(req: AuthenticatedRequest, res: Response) {
  const target = id.safeParse(req.params.id);
  const parsed = updateAdminSubscriptionSchema.safeParse(req.body);
  if (!target.success) return res.status(400).json({ error: 'Geçersiz kullanıcı kimliği.' });
  if (!parsed.success) return invalid(res, parsed.error);

  try {
    const profile = await loadProfile(target.data);
    if (profile.role !== 'student') {
      throw new AdminUserError('Abonelik yönetimi yalnızca öğrenci hesapları için geçerlidir.', 422);
    }

    const result = await setStudentSubscription(profile.id, profile.linked_parent_id, parsed.data);
    await audit('admin_subscription_updated', req.authUser!.uid, profile.id, {
      tier: parsed.data.tier,
      planId: parsed.data.planId ?? null,
      expiresAt: result.expiresAt,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return fail(res, error, 'Admin subscription update failed');
  }
}

/** Row keys here already use database column names. */

export async function deleteAdminUser(req: AuthenticatedRequest, res: Response) {
  const target = id.safeParse(req.params.id);
  const parsed = deleteAdminUserSchema.safeParse(req.body);
  if (!target.success || !parsed.success)
    return res.status(400).json({ error: 'Silme işlemi onaylanmadı.' });
  try {
    if (target.data === req.authUser!.uid) throw new AdminUserError('Kendi hesabınızı silemezsiniz.', 403);
    const profile = await loadProfile(target.data);
    const client = getServiceClient();
    const children = profile.role === 'parent'
      ? await client.from('profiles').select('id,role').eq('linked_parent_id', profile.id)
      : { data: [], error: null };
    if (children.error) throw children.error;
    const scope = deletionScope(profile, children.data ?? []);

    // Clean up billing records & bindings so deletion is never blocked for admin user management
    const list = scope.join(',');
    try {
      await client.from('google_play_purchase_bindings').delete().or(`parent_id.in.(${list}),student_id.in.(${list})`);
      await client.from('google_play_subscriptions').delete().or(`parent_id.in.(${list}),student_id.in.(${list})`);
    } catch {
      // Ignore if tables are empty or non-existent
    }

    for (const userId of scope) {
      const removed = await client.auth.admin.deleteUser(userId);
      if (removed.error &&
          removed.error.status !== 404 &&
          removed.error.code !== 'user_not_found' &&
          !/not found/i.test(removed.error.message || '')) {
        logServerFailure('Admin user auth delete warning', removed.error);
      }
    }
    // Profiles cascade from auth.users; this removes any remaining rows whose Auth account was already gone.
    const leftover = await client.from('profiles').delete().in('id', scope);
    if (leftover.error) throw leftover.error;
    if (profile.role === 'student' && profile.linked_parent_id)
      await setStudentLinks(profile.linked_parent_id, ids => ids.filter(value => value !== profile.id));
    await audit('admin_user_deleted', req.authUser!.uid, profile.id, { role: profile.role, deletedAccounts: scope.length });
    return res.json({ success: true, deletedAccounts: scope.length });
  } catch (error) {
    return fail(res, error, 'Admin user deletion failed');
  }
}
