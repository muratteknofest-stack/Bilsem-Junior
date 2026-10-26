# Preview and production database isolation

The deployment entry point is `vercel.ts`. The JSON file in `config/` is a
reviewed template, not an independently deployed Vercel configuration.

For Vercel preview/development, set both `SUPABASE_URL` and `VITE_SUPABASE_URL`
to the same isolated Supabase project's canonical HTTPS URL. Supply that
project's server-only `SUPABASE_SERVICE_ROLE_KEY` and public
`VITE_SUPABASE_PUBLISHABLE_KEY`. Never copy production credentials or customer
data into a preview. A legacy JWT key whose project reference differs from the
selected URL is rejected; opaque keys must be provisioned from the correct
project by the operator.

An unconfigured preview intentionally fails instead of falling back to
production. The preflight runs before network connectivity tests. Generated
Auth/REST rewrites preserve the existing cookie stripping and no-store rules.
CSP permits the selected project's HTTPS/WebSocket origins without allowing
all Supabase projects or retaining the production origin in a preview policy.

These source controls take effect on deployments built from this version.
They do not remove credentials embedded in older deployments, revoke a
previously disclosed key, or prevent malicious build code from reading a key
already made available to its environment. Release-time operations still must:

1. Remove production credentials from preview environment scopes, including
   the old `codex/question-engine-v2-20261021` branch override.
2. Disable/remove old preview deployments that were built with production
   credentials. Changing environment variables alone does not update them.
3. Review exposure and rotate the previously disclosed server credential
   through a coordinated production update if its revocation is unverified.
4. Configure an isolated test project using synthetic data, approved schema
   migrations and separate Auth callback URLs, then verify a real preview.

During the staged security patch work, no project was created, schema copied,
credential rotated, production setting changed or deployment published.
