# Verified learning rollout

This branch combines the Supabase student application and discovery homepage with server-owned practice, adaptive, exam, review and reward flows. It targets `main`; the older Firebase login and owner-password fallback are replaced by the existing Supabase authentication implementation.

## Current production database

Project: `vehhvsdkifwstbjhnhao` (ZekaPark Yeni).

- `20261010085952_server_verified_learning.sql` was applied on 2026-10-10. Learning and reward tables are private and their RPCs are service-only. Live transactional tests confirmed revision conflicts, single XP/reward issuance, immutable completed results and student ownership. All fixtures were rolled back. The four existing profiles and their progress were preserved.
- `20261010091235_distributed_api_limits.sql` was also applied. Request counters are shared across Vercel workers and store HMACs rather than IP addresses.
- `20261010090133_protect_verified_progress.sql` is deliberately pending. Applying it while the old student UI is deployed would disable its direct scoring and question reads.

## Deployment order for the existing project

1. Check that the two additive migrations above are present in `supabase_migrations.schema_migrations`. Apply only a missing additive migration. Do not replay `schema.sql` or the repository's historical migrations against this project: its older migration names and timestamps differ from those in the live database.
2. Deploy this branch to a Vercel preview with the existing Supabase URL, publishable key and server-only service-role key. The service key must never use a `VITE_` prefix. The API entrypoint remains `api/index.js`; `vercel-build` generates its server bundle.
3. With a verified test family, check registration/activation, practice, adaptive practice, exam save/clear/resume/expiry, review, reward retries and parent reports. Check that `/api/health` is healthy. Confirm the preview is using the intended database before submitting answers.
4. Apply `20261010090133_protect_verified_progress.sql` during the production switch to the new application. It hides the published bank from students, locks competitive profile/progress fields, blocks legacy result writes and checks active Auth sessions in RLS. Confirm old/revoked tokens and client XP mutations fail, while avatar/favorites still work.
5. Promote the tested application and repeat the student and parent smoke tests. Keep the new permissions when rolling back; use a version that supports the server learning API.

Vercel connector access returned HTTP 403 under `team_OCPzh4sUtUTDyhohl2KeH6C0` (`dyds-projects-c415ba7a`). The authenticated owner dashboard was subsequently readable and confirmed `https://zekapark.vercel.app/`, but showed missing production Supabase variables and a service-role key restricted to an older preview branch. Correct the scopes before releasing; never make the key available to arbitrary preview branches. No authenticated Vercel CLI credentials were available. Production promotion and a live browser smoke test have not been completed. See [the current blocker report](live-release-blockers-20261010.md).

After each deployment, run `npm run verify:live -- https://zekapark.vercel.app COMMIT_SHA vehhvsdkifwstbjhnhao` with the actual deployed commit. The command rejects redirects and HTML protection pages, and requires a healthy JSON response from the expected database and commit. Run it on the approved preview origin before production as well; it supplements the authenticated flow tests, not replaces them.

## Credentials and historical data

The old Firebase administrator password was present in the Git history. Removing the login fallback does not rotate it or erase history. Rotate that credential in the original authentication provider and any account where it was reused; this workspace does not have authenticated Firebase administration access. Do not copy the old password into issues, logs or environment variables.

Historical XP and progress were retained. Those records predate authoritative scoring and are not retroactively certified. New answers and rewards are evaluated from immutable server sessions.

## Validation

- `npm run lint`
- `npm test` (includes actual Postgres RLS/transaction tests through PGlite)
- `npm run test:student`
- `npm run vercel-build`
- `npm audit --omit=dev`

`tests/supabase-learning.integration.sql` can be run on a project with all three migrations installed. It uses reserved fixture accounts inside a transaction and rolls them back. Never remove its `rollback` statement.

Payment-provider integration and commercial acceptance evidence are outside these learning/security fixes. The existing commercial-readiness gate remains enabled; passing the code checks is not evidence of a paid production launch.
