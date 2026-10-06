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

For a new Supabase project, apply [supabase/schema.sql](supabase/schema.sql)
once before registering accounts. The schema enables RLS for every application
table and grants browser access only to the necessary roles. Configure the
project's publishable key and URL in both the Vite and API environments.
Set Auth's site URL, redirects and SMTP delivery before inviting users. On a
trusted server, run `node scripts/bootstrap-admin.mjs admin@example.com` with
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment. The
script sends an invitation, sets the server-controlled `app_metadata.role` and
creates the matching admin profile. The publishable key cannot perform this
step. Invite only the verified administrator for the new project.

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

## Supabase-only start

New accounts use Supabase Auth and Postgres directly. Firebase data and Google
account access are not required. The previous ZekaPark Supabase project and its
records remain untouched during a new-project installation. Old accounts are
not automatically available in the new project; their owners create new
accounts, or an administrator migrates them separately after identity checks.

Set Auth site/redirect URLs and email delivery in Supabase. Deploy the Express
API with its server-only environment variables, then set `VITE_API_BASE_URL`
to its origin for the Vite build. Check parent registration, email confirmation,
student login, progress sync, question publishing, and admin AI using dedicated
test accounts before replacing the live deployment.
