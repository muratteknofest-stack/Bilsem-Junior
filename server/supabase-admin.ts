import { createClient } from '@supabase/supabase-js';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabase-shape';
import { checkedDeploymentDatabase, checkedSupabaseOrigin, vercelEnvironment } from '../shared/supabase-environment.mjs';

export function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase sunucu ayarları eksik.');
  const origin = vercelEnvironment(process.env)
    ? checkedDeploymentDatabase(process.env, { requireServerKey: true }).serverOrigin
    : checkedSupabaseOrigin(url, process.env);
  return createClient(origin, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const tables: Record<string, string> = {
  users: 'profiles', questions: 'questions', securityEvents: 'security_events',
  ai_generation_logs: 'ai_generation_logs', ai_generation_jobs: 'ai_generation_jobs',
  practiceSessions: 'practice_sessions', testAttempts: 'test_attempts',
};
type Row = Record<string, any>;
function pathRef(path: string) {
  const parts = path.split('/');
  if (parts[0] === 'users' && parts[2] === 'private' && parts[3] === 'state')
    return { table: 'user_private_state', id: parts[1], key: 'user_id' };
  const table = tables[parts[0]];
  if (!table) throw new Error('Bilinmeyen veri yolu.');
  const key = table === 'ai_generation_jobs' ? 'job_id'
    : table === 'ai_generation_logs' || table === 'security_events' ? 'legacy_id' : 'id';
  return { table, id: parts[1], key };
}
function checked<T extends { error: any }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}
function document(path: string) {
  const { table, id = crypto.randomUUID(), key } = pathRef(path);
  return {
    id,
    async get() {
      const { data } = checked(await getServiceClient().from(table).select('*').eq(key, id).maybeSingle());
      return { id, exists: Boolean(data),
        data: () => data ? fromSupabaseRow(table, data) as Row : undefined };
    },
    async set(value: Row, options?: { merge?: boolean }) {
      const previous = options?.merge ? (await this.get()).data() : undefined;
      const data = { ...(previous ?? {}), ...value };
      checked(await getServiceClient().from(table).upsert(
        toSupabaseRow(table, id, data), { onConflict: key }));
    },
    async update(value: Row) {
      const previous = await this.get();
      if (!previous.exists) throw new Error('Belge bulunamadı.');
      await this.set(value, { merge: true });
    },
    async delete() {
      checked(await getServiceClient().from(table).delete().eq(key, id));
    },
  };
}
export function getAdminDb() {
  return {
    doc: document,
    collection(name: string) {
      if (!tables[name]) throw new Error('Bilinmeyen koleksiyon.');
      return {
        doc(id?: string) { return document(`${name}/${id ?? crypto.randomUUID()}`); },
        async add(value: Row) { const ref = this.doc(); await ref.set(value); return ref; },
        where(field: string, operator: string, values: unknown[]) {
          return {
            async get() {
              if (operator !== 'in') throw new Error('Desteklenmeyen sorgu.');
              const { data } = checked(await getServiceClient().from(tables[name])
                .select('*').in(field, values));
              return { docs: (data ?? []).map((row: Row) => ({
                id: row.job_id ?? row.id, data: () => fromSupabaseRow(tables[name], row),
              })) };
            },
          };
        },
      };
    },
    batch() {
      const actions: Array<() => Promise<void>> = [];
      return {
        set(ref: ReturnType<typeof document>, value: Row) { actions.push(() => ref.set(value)); },
        async commit() { for (const action of actions) await action(); },
      };
    },
  };
}
