# ZekaPark

React, Vite, Express, Supabase Auth/Postgres and Gemini based learning app.

## Local development

1. Install Node.js 22+ and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set the Supabase project URL and a
   **publishable** key in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the API
   environment. Never put the service key in a `VITE_` variable.
4. Run `npm run dev`. The Express service hosts `/api/*` and the app.
5. Run `npm run build` and the focused migration tests before deployment.

The existing Supabase project is `guixuelbwqgurvmuhkve`. Apply committed
migrations in version order and check Supabase Security Advisor. Existing
profiles, users, questions and private state must be preserved.

## Hosting

A static Vite host needs a separately deployed Express API for family
registration, parent password reset, weekly email reports and AI endpoints.
Set `VITE_API_BASE_URL` to that API origin at **build time** and add the site
origin to the API's `CORS_ALLOWED_ORIGINS`. Configure Supabase Auth's site and
redirect URLs for the deployed origin. The frontend can otherwise use
Supabase Auth and Postgres directly under RLS.

The API uses the service role key only on the server. It checks bearer tokens,
profile roles and, for admin routes, the server controlled Auth
`app_metadata.role=admin` claim. Parent and child have separate Auth
accounts. Confirmation email is required before the parent can sign in;
managed child codes use a separate password. Admin access is never inferred
from an email address.

AI endpoints require `GEMINI_API_KEY`. Weekly emails require SMTP settings.
If an AI endpoint is unavailable, the existing deterministic teaching
fallback runs in the client. The parent can use the device share flow when
email service is unavailable.

## Firebase cutover

See [supabase/MIGRATION.md](supabase/MIGRATION.md). Export Firebase Auth and
Firestore privately, reconcile every UID to the corresponding Supabase Auth
UUID, dry-run the importer and verify per-feature data before changing the
live site. Retire Firebase only after the app, API and user sessions pass
end-to-end checks.
