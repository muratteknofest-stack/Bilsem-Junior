# Firebase to Supabase migration

This is the data foundation for a staged cutover. It does **not** switch the
application runtime or cancel the Firebase project. Keep Firebase available
until application authentication, API calls, and data reads use Supabase and
production counts have been reconciled.

1. Use the Zekapark Supabase project (`guixuelbwqgurvmuhkve`). The initial
   schema was applied as migration `20261005170918_initial_zekapark_supabase_schema`.
2. With Firebase Application Default Credentials, run
   `FIREBASE_PROJECT_ID=... FIREBASE_DATABASE_ID=... node scripts/export-firebase-for-supabase.mjs ./private-export`.
   The script creates `firestore-export.json` and `auth-users.json` with
   owner-only permissions and refuses to overwrite them. Export Firestore
   collections as JSON objects keyed by document ID:
   `users`, `privateStates` (the `users/{uid}/private/state` documents),
   `questions`, `practiceSessions`, `testAttempts`,
   `ai_generation_jobs`, `ai_generation_logs`, and `securityEvents`.
   Missing collections may be omitted. Keep this export private.
3. Provision Supabase Auth users through a trusted admin process and create
   `uid-map.json`: a JSON object mapping each Firebase Auth UID to the new
   Supabase Auth UUID. All referenced parent/student IDs must be mapped.
   Firebase passwords cannot be assumed portable; arrange a verified password
   reset or supported hash migration before cutting over.
4. Run `node scripts/import-firestore-to-supabase.mjs export.json uid-map.json`
   to validate records without writing. Review counts and relationship maps.
5. Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then
   rerun with `--apply`. The importer upserts in chunks and reports target
   counts. Keep the service role key off the browser and out of version control.
6. Reconcile counts, sample family links, state and question documents, then
   switch and verify application behavior before disabling Firebase.

The `profiles` and `private_states` tables store the existing document
shape in JSONB to preserve content during import. The stored role cannot be
written from an ordinary browser session; administrator access in RLS uses a
server-controlled `app_metadata.role = admin` claim. A trusted server must
handle profile creation and role assignment in the eventual runtime migration.
