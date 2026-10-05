import { supabase } from './supabase';
import { fromSupabaseRow, toSupabaseRow } from './supabase-shape';

type Ref = { table: string; id?: string; userId?: string };
type Filter = { field: string; value: unknown };
type Query = Ref & { filters?: Filter[]; max?: number };
const tables: Record<string, string> = {
  users: 'profiles', questions: 'questions',
  practiceSessions: 'practice_sessions', testAttempts: 'test_attempts',
};
export const db = supabase;
export function doc(_db: unknown, ...parts: string[]): Ref {
  if (parts[0] === 'users' && parts[2] === 'private' && parts[3] === 'state') {
    return { table: 'user_private_state', id: parts[1], userId: parts[1] };
  }
  const table = tables[parts[0]];
  if (!table || !parts[1]) throw new Error('Bilinmeyen belge yolu.');
  return { table, id: parts[1] };
}
export function collection(_db: unknown, name: string): Ref {
  const table = tables[name];
  if (!table) throw new Error('Bilinmeyen koleksiyon.');
  return { table };
}
export const where = (field: string, _operator: string, value: unknown): Filter => ({ field, value });
export const limit = (max: number) => ({ max });
export function query(ref: Ref, ...constraints: Array<Filter | { max: number }>): Query {
  return { ...ref, filters: constraints.filter((item): item is Filter => 'field' in item),
    max: constraints.find((item): item is { max: number } => 'max' in item)?.max };
}
function snapshot(row: Record<string, any> | null, id?: string, table = '') {
  const identifier = id ?? (table === 'user_private_state' ? row?.user_id : row?.id);
  return { id: identifier, ref: { table, id: identifier },
    exists: () => !!row, data: () => row ? fromSupabaseRow(table, row) : undefined };
}
export async function getDoc(ref: Ref) {
  const key = ref.table === 'user_private_state' ? 'user_id' : 'id';
  const { data, error } = await supabase.from(ref.table).select('*').eq(key, ref.id!).maybeSingle();
  if (error) throw error;
  return snapshot(data, ref.id, ref.table);
}
export async function getDocs(ref: Query) {
  const rows: Array<Record<string, any>> = [];
  const pageSize = 500;
  while (true) {
    let request = supabase.from(ref.table).select('*').range(rows.length, rows.length + pageSize - 1);
    for (const filter of ref.filters ?? [])
      request = request.eq(filter.field, filter.value as string);
    if (ref.max) request = request.limit(ref.max - rows.length);
    const { data, error } = await request;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize || (ref.max && rows.length >= ref.max)) break;
  }
  return { empty: rows.length === 0, docs: rows.map(row => snapshot(row, undefined, ref.table)) };
}
export async function setDoc(ref: Ref, value: Record<string, any>, options?: { merge?: boolean }) {
  const key = ref.table === 'user_private_state' ? 'user_id' : 'id';
  const existing = options?.merge ? (await getDoc(ref)).data() : undefined;
  const data = { ...(existing ?? {}), ...value };
  const row = toSupabaseRow(ref.table, ref.id!, data);
  // Profiles are created by the registration API. Their restrictive INSERT
  // policy does not authorize an upsert even when the row already exists.
  const { error } = ref.table === 'profiles'
    ? await supabase.from(ref.table).update(row).eq('id', ref.id!)
    : await supabase.from(ref.table).upsert(row, { onConflict: key });
  if (error) throw error;
}
export async function updateDoc(ref: Ref, updates: Record<string, any>) {
  const old = await getDoc(ref);
  if (!old.exists()) throw new Error('Belge bulunamadı.');
  await setDoc(ref, { ...old.data(), ...updates });
}
export async function deleteDoc(ref: Ref) {
  const key = ref.table === 'user_private_state' ? 'user_id' : 'id';
  const { error } = await supabase.from(ref.table).delete().eq(key, ref.id!);
  if (error) throw error;
}
export const serverTimestamp = () => new Date().toISOString();
export function onSnapshot(ref: Ref, onNext: (snapshot: any) => void, onError?: (error: Error) => void) {
  let active = true;
  const refresh = () => (ref.id ? getDoc(ref) : getDocs(ref)).then(result => {
    if (active) onNext(result);
  }).catch(error => { if (active) onError?.(error); });
  void refresh();
  const channel = supabase.channel(`zekapark-${ref.table}-${ref.id ?? 'all'}-${Math.random()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: ref.table }, () => void refresh())
    .subscribe();
  const poll = ref.table === 'profiles' ? setInterval(() => void refresh(), 30000) : null;
  return () => {
    active = false;
    if (poll) clearInterval(poll);
    void supabase.removeChannel(channel);
  };
}
export function writeBatch(_db: unknown) {
  const actions: Array<() => Promise<unknown>> = [];
  return {
    set(ref: Ref, value: Record<string, any>) { actions.push(() => setDoc(ref, value)); },
    delete(ref: Ref) { actions.push(() => deleteDoc(ref)); },
    async commit() { for (const action of actions) await action(); },
  };
}
