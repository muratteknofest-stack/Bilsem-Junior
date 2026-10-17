import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('Postgres enforces private answer snapshots, atomic rewards, account isolation and revoked sessions', { timeout: 60_000 }, async () => {
  const db = new PGlite();
  try {
    // Supabase Auth contracts; authorization and scoring run in a real Postgres engine.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create publication supabase_realtime; create schema auth;
      grant usage on schema auth,public to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,role text,aud text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz,updated_at timestamptz,not_after timestamptz);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
      grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;`);
    // Match the live fresh-project schema: there is no historical is_admin helper.
    for (const file of ['schema.sql', 'migrations/20261008165142_commercial_support_requests.sql', 'migrations/20261010085952_server_verified_learning.sql', 'migrations/20261010090133_protect_verified_progress.sql', 'migrations/20261010091235_distributed_api_limits.sql', 'migrations/20261010122109_private_security_helpers.sql', 'migrations/20261011080721_platform_release_settings.sql']) await db.exec(await readFile(new URL('../supabase/' + file, import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261008170714_verified_daily_challenges.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261011134720_learning_grade_difficulty.sql', import.meta.url), 'utf8'));
    const result = await db.exec(await readFile(new URL('./supabase-learning.integration.sql', import.meta.url), 'utf8'));
    assert.match(String(result.at(-1)?.rows[0]?.status), /checks passed/);
    assert.equal((await db.query<{ count: number }>('select count(*) from auth.users')).rows[0].count, 0);
  } finally { await db.close(); }
});
