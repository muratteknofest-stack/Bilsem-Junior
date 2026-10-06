import { readFile, writeFile, chmod } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const normalizedEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

export function reconcileAuthUsers(firebaseAuth, firestoreUsers, supabaseUsers, supabaseProfiles) {
  const result = {};
  const unresolved = [];
  const byEmail = new Map();
  const sourceEmailCounts = new Map();
  for (const user of supabaseUsers) {
    const email = normalizedEmail(user.email);
    if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), user]);
  }
  for (const user of Object.values(firebaseAuth)) {
    const email = normalizedEmail(user?.email);
    if (email) sourceEmailCounts.set(email, (sourceEmailCounts.get(email) ?? 0) + 1);
  }
  const profiles = new Map(supabaseProfiles.map(profile => [profile.id, profile]));
  for (const [oldUid, source] of Object.entries(firebaseAuth)) {
    const email = normalizedEmail(source?.email);
    const matches = byEmail.get(email) ?? [];
    const target = matches[0];
    const sourceProfile = firestoreUsers[oldUid];
    const profile = target && profiles.get(target.id);
    let reason = '';
    if (!oldUid || !email || !source || source.emailVerified !== true) reason = 'unverified or missing Firebase identity';
    else if (sourceEmailCounts.get(email) !== 1 || matches.length !== 1) reason = 'missing or ambiguous email match';
    else if (!uuid.test(target.id) || !target.email_confirmed_at) reason = 'unverified or invalid Supabase identity';
    else if (Boolean(source.disabled) !== Boolean(target.banned_until)) reason = 'account disabled state needs review';
    else if (sourceProfile && normalizedEmail(sourceProfile.email) !== email) reason = 'Firebase profile email differs from Auth';
    else if (sourceProfile && profile && sourceProfile.role !== profile.role) reason = 'application roles differ';
    else if (profile && normalizedEmail(profile.email) !== email) reason = 'Supabase profile email differs from Auth';
    if (reason) unresolved.push({ uid: oldUid, reason });
    else result[oldUid] = target.id;
  }
  return { mapping: result, unresolved };
}

async function main() {
  const [, , authPath, firestorePath, mapPath] = process.argv;
  if (!authPath || !firestorePath || !mapPath) {
    console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reconcile-auth-users.mjs auth-users.json firestore-export.json uid-map.json');
    process.exitCode = 2;
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !/^https:\/\/.+\.supabase\.co\/?$/.test(url) || !key) throw new Error('Server-only Supabase URL and service role key required');
  const [firebaseAuth, firestore] = await Promise.all([
    readFile(authPath, 'utf8').then(JSON.parse), readFile(firestorePath, 'utf8').then(JSON.parse),
  ]);
  if (!firebaseAuth || typeof firebaseAuth !== 'object' || Array.isArray(firebaseAuth) ||
      !firestore?.users || typeof firestore.users !== 'object') throw new Error('Invalid Firebase export');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const profiles = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('profiles').select('id,email,role').range(offset, offset + 499);
    if (error) throw error;
    profiles.push(...data);
    if (data.length < 500) break;
  }
  const { mapping, unresolved } = reconcileAuthUsers(firebaseAuth, firestore.users, users, profiles);
  await writeFile(mapPath, JSON.stringify(mapping, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await chmod(mapPath, 0o600);
  const reportPath = mapPath.replace(/\.json$/i, '') + '.unresolved.json';
  if (unresolved.length) {
    await writeFile(reportPath, JSON.stringify(unresolved, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await chmod(reportPath, 0o600);
  }
  console.log(`${Object.keys(mapping).length} identities mapped; ${unresolved.length} require review.`);
  if (unresolved.length) console.log(`Review ${reportPath}, complete the mapping, then run the importer dry-run.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
