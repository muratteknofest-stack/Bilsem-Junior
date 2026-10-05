import { readFile } from 'node:fs/promises';

const [, , exportPath, idMapPath, mode] = process.argv;
if (!exportPath || !idMapPath || (mode && mode !== '--apply')) {
  console.error('Usage: node scripts/import-firestore-to-supabase.mjs export.json uid-map.json [--apply]');
  process.exit(2);
}

const source = JSON.parse(await readFile(exportPath, 'utf8'));
const idMap = JSON.parse(await readFile(idMapPath, 'utf8'));
const collections = [
  ['users', 'profiles'], ['privateStates', 'private_states'],
  ['questions', 'questions'], ['practiceSessions', 'practice_sessions'],
  ['testAttempts', 'test_attempts'], ['ai_generation_jobs', 'ai_generation_jobs'],
  ['ai_generation_logs', 'ai_generation_logs'], ['securityEvents', 'security_events'],
];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mapUid = (oldId) => {
  const mapped = idMap[oldId];
  if (!mapped || !uuid.test(mapped)) throw new Error('Missing or invalid Supabase UUID mapping for a Firebase UID');
  return mapped;
};

function entries(name) {
  const input = source[name] ?? {};
  if (Array.isArray(input)) return input.map((data) => [data.id, data]);
  if (input && typeof input === 'object') return Object.entries(input);
  throw new Error(`Invalid ${name} collection`);
}

function row(name, oldId, value) {
  if (!oldId || !value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid record in ${name}`);
  }
  const data = { ...value };
  if (name === 'users') {
    const id = mapUid(oldId);
    data.id = id;
    if (data.linkedParentId) data.linkedParentId = mapUid(data.linkedParentId);
    if (Array.isArray(data.linkedStudentIds)) data.linkedStudentIds = data.linkedStudentIds.map(mapUid);
    return { id, data, linked_parent_id: data.linkedParentId ?? null };
  }
  if (name === 'privateStates') return { user_id: mapUid(oldId), data };
  if (name === 'practiceSessions' || name === 'testAttempts') {
    const user_id = mapUid(data.userId);
    data.userId = user_id;
    return { id: oldId, user_id, data };
  }
  return { id: oldId, data };
}

const batches = collections.map(([sourceName, table]) => ({
  sourceName, table, rows: entries(sourceName).map(([id, value]) => row(sourceName, id, value)),
}));
for (const { sourceName, rows } of batches) console.log(`${sourceName}: ${rows.length} records validated`);
if (mode !== '--apply') {
  console.log('Dry run complete. Add --apply to write after reviewing counts and UID mappings.');
  process.exit(0);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const endpoint = new URL(url);
if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) {
  throw new Error('SUPABASE_URL must use HTTPS');
}
async function request(table, method, body, headers = {}) {
  const response = await fetch(new URL(`/rest/v1/${table}`, endpoint), {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
  return response;
}
for (const { table, rows } of batches) {
  const conflict = table === 'private_states' ? 'user_id' : 'id';
  for (let offset = 0; offset < rows.length; offset += 100) {
    const chunk = rows.slice(offset, offset + 100);
    await request(`${table}?on_conflict=${conflict}`, 'POST', chunk, {
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }
  const response = await request(`${table}?select=*`, 'HEAD', undefined, { Prefer: 'count=exact' });
  const count = Number(response.headers.get('content-range')?.split('/')[1]);
  if (!Number.isFinite(count) || count < rows.length) throw new Error(`${table} count verification failed: ${count}`);
  console.log(`${table}: ${rows.length} imported; target count ${count}`);
}
