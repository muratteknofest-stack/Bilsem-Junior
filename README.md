# ZekaPark

ZekaPark is a React, TypeScript, Express and Firebase learning application with
procedurally generated cognitive-skill questions.

## Local setup

Prerequisites: Node.js 22+, a Firebase project with Email/Password Authentication
and Cloud Firestore enabled, and Application Default Credentials for server-side
Firebase Admin operations.

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Install the locked dependencies with `npm ci`.
3. Run `npm run dev`.
4. Before a release, run `npm run check`.

The Express server hosts both `/api/*` and the Vite application. AI endpoints use
the procedural fallback when `GEMINI_API_KEY` is not configured. Weekly email
reports require the SMTP variables.

## Authorization model

- Browser clients can create only their own student profile.
- Parent/child account pairs are created by `/api/auth/register-family` with
  separate passwords and server-assigned custom role claims.
- Admin access requires an `admin` Firebase custom claim. A profile document alone
  never grants admin access.
- User progress is stored under `users/{uid}/private/state`; linked parents have
  read-only access to their child's profile and progress.

Deploy `firestore.rules` before enabling real accounts. Existing admin and parent
accounts must receive their matching custom claims through a trusted admin script
or the Firebase Admin SDK.

## Deployment

Build and deploy the API container to Cloud Run, granting the service account
Firebase access and supplying server-only secrets there:

```sh
gcloud run deploy zekapark-api --source . --region europe-west1 --allow-unauthenticated
```

The service itself is public so the app can reach it, while protected endpoints
verify Firebase ID tokens. Then deploy the static site and Firestore rules:

```sh
npm run check
firebase deploy --only firestore:rules,hosting
```

`firebase.json` routes `/api/**` to the `zekapark-api` Cloud Run service and all
remaining routes to the single-page application.
