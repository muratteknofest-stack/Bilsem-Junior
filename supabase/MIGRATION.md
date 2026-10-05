# ZekaPark Firebase → Supabase

The existing ZekaPark Supabase project is `guixuelbwqgurvmuhkve`. It already
has Auth users and application tables. Do **not** apply a fresh schema or
overwrite these records. Its initial migrations were applied in September
2026. The repository includes the applied `20261005174549_firebase_import_legacy_ids`,
`20261005180525_admin_claim_only`, and
`20261005180629_server_session_revocation` migrations. The last two remove
the former email-based admin exception and allow server-side session revocation.

1. Export Firebase from a trusted machine with Application Default Credentials:
   `FIREBASE_PROJECT_ID=... FIREBASE_DATABASE_ID=... node scripts/export-firebase-for-supabase.mjs ./private-export`.
   This produces private `firestore-export.json` and `auth-users.json`.
2. Reconcile each Firebase Auth UID with the correct existing or newly
   provisioned Supabase Auth UUID. Save an object of old UID → new UUID as
   `uid-map.json`. Do not infer identities solely from a display name.
3. Run `node scripts/import-firestore-to-supabase.mjs private-export/firestore-export.json uid-map.json`.
   This validates every mapped family link and record without writing.
4. Review the export counts against the existing Supabase project. Back up
   existing rows, then set server-only `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` and rerun with `--apply`. Import uses
   conflict-ignore semantics: existing rows are preserved for manual
   reconciliation, not silently overwritten.
5. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and the existing server AI and email settings
   on the application/API host. The service key belongs on the server only.
   Configure the Supabase Auth Site URL, allowed redirects and SMTP delivery.
6. Verify per-table counts and sample records, login, parent/student links,
   progress, question publication, admin AI, and weekly reports. Switch the
   application runtime only after these checks; retire Firebase last.

Auth passwords are not part of this JSON export. Arrange a verified password
reset or a supported credential migration for users who do not yet exist in
Supabase Auth. Never put service-role keys or the export in the browser,
repository, or chat. The importer does not configure application deployment.
The app runtime migration is staged in a draft PR; it has not been deployed.
