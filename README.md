# ZekaPark

React, Vite, Express, Supabase Auth/Postgres and Gemini based learning app.

## Local development

1. Install Node.js 22+ and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set the Supabase project URL and a
   **publishable** key in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the API
   environment. Never put the service key in a `VITE_` variable.
4. Run `npm run dev`. The Express service hosts `/api/*` and the app.
5. Run `npm run lint`, `npm test`, `npm run test:student` and the build before deployment.

The active Supabase project is `vtcsoqohkiagbwatlabk` (Bilsem Junior).
Its account-project alignment preserves existing Auth identities and XP and
keeps the previous question, exam and purchase tables in the private
`bilsem_legacy` schema. See [project alignment](docs/project-alignment-20261021.md).
Apply `supabase/schema.sql` only to a genuinely empty project; it is not an
upgrade script for an existing database.
The incremental, reviewed [database security shield](docs/database-shield.md)
contains standalone SQL Editor files, the complete access matrix and verification
steps. Its preparation does not mean it has been applied to production.
Production environment settings, Cloudflare/Vercel WAF rollout and five manual
release checks are in the [production security runbook](docs/production-security-runbook.md).
The schema enables RLS for every application
table and grants browser access only to the necessary roles. Configure the
project's publishable key and URL in both the Vite and API environments.
Set Auth's site URL, redirects and SMTP delivery before inviting users. On a
trusted server, run `node scripts/bootstrap-admin.mjs admin@example.com` with
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment. The
script sends an invitation, sets the server-controlled `app_metadata.role` and
creates the matching admin profile. The publishable key cannot perform this
step. Invite only the verified administrator for the new project.

## Hosting

On Vercel, `api/index.js` exposes the Express API through a Function and
`vercel.ts` generates environment-specific routes from `config/vercel-base.json`.
Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` for the Vite build, plus server-only
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the Function. Leave
`VITE_API_BASE_URL` empty for this same-origin deployment. Other static hosts
need a separately deployed Express API and `VITE_API_BASE_URL` set to its
origin at build time. Configure Supabase Auth's site and redirect URLs for
the deployed origin. The frontend accesses Supabase under RLS.

Preview/development deployments require a separate Supabase project and matching
server/client URLs and keys. Production database targets are rejected before
connectivity checks, at Vite build time and when a server client is created.
Auth/REST edge rewrites and CSP use only that environment's selected project.
See [preview isolation](docs/preview-isolation.md) before configuring previews.

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

All accounts, family links, questions and learning records use Supabase Auth
and Postgres directly. No alternate identity or database provider is used.
Only the Supabase public URL/key and the API origin are exposed in browser
builds; unrelated hosting variables are excluded. The previous ZekaPark Supabase
project and its
records remain untouched during a new-project installation. Old accounts are
not automatically available in the new project; their owners create new
accounts, or an administrator migrates them separately after identity checks.

Set Auth site/redirect URLs and email delivery in Supabase. Deploy the Express
API with its server-only environment variables. Set `VITE_API_BASE_URL` only
for a separate API origin. Check parent registration, email confirmation,
student login, progress sync, question publishing, and admin AI using dedicated
test accounts before replacing the live deployment.

Database operations and migration history: [supabase/MIGRATION.md](supabase/MIGRATION.md).

## Password recovery

Supabase Auth Site URL must be `https://bilsemjunior.vercel.app`; explicitly allow
`https://bilsemjunior.vercel.app/reset-password` in Redirect URLs. Set
`PUBLIC_SITE_URL=https://bilsemjunior.vercel.app` for production builds. Isolated
previews must use their own site origin and that preview database's Auth redirect
allowlist; do not send preview recovery tokens to production. Recovery links are
single-use; request a new email from `/reset-password` when an old link expires.

The app relay rejects raw signup/OTP account creation and direct user updates.
The public Supabase origin also needs provider controls; see
[Auth security and read-only verification](docs/auth-security.md).
Profile preferences use the authenticated application API; see
[profile validation and remaining database controls](docs/profile-security.md).
The API applies pre-auth request limits and bounded public/readiness reads;
see [request cost controls and edge limitations](docs/request-cost-security.md).
CI pins and retired Firebase policies are checked with `npm run security:ci`;
see [CI and legacy Firebase security](docs/ci-legacy-firebase-security.md).

## Wordwall zeka testleri

Öğrenci panelindeki “Zeka Testleri” bölümü ve `/wordwall` sayfası, Sayisalmuhakeme hesabının herkese açık 157 etkinliğini içerir: 1. sınıf 77, 2. sınıf 27, 3. sınıf 27, 4. sınıf 26. Öğrencinin sınıfı otomatik seçilir; sınıf, konu ve Türkçe arama filtreleri kullanılabilir. Test seçildiğinde resmi Wordwall oynatıcısı sayfa içinde açılır; aynı anda yalnızca bir oyun yüklenir.

Katalog `src/content/wordwall-catalog.json` içinde tutulur. `npm run import:wordwall` public klasör ağacını okuyup her etkinliğin sahibini ve gömme adresini resmi oEmbed yanıtıyla doğrular; herhangi bir hata halinde mevcut dosyayı değiştirmez. Yeni etkinlikler için komutu çalıştırıp oluşan kataloğu gözden geçirerek yayımlayın. Gizli veya paylaşılmamış etkinlikler içeri alınmaz.

Giriş bilgileri ve öğrenci verileri içe aktarma sırasında kullanılmaz. Oyunlar kullanıcının seçimiyle Wordwall sunucularından yüklenir. Wordwall sonuçları ZekaPark/Supabase ilerleme ve ödül kayıtlarına otomatik yazılmaz. Gömme ve görsel adresleri yalnızca resmi HTTPS alan adlarından kabul edilir; iframe üst sayfayı yönlendiremez.
