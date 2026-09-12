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

## Sites mode

The static Sites deployment keeps Firebase Authentication and Firestore in the
browser. Family registration creates the parent and linked student as two separate
Firebase accounts without exposing an admin credential. Deploy `firestore.rules`
before accepting registrations.

AI hints first use the configured server API, then Firebase AI Logic, and finally
the deterministic pedagogical engine. To enable Firebase AI Logic for production,
enable it in the Firebase console and set up App Check with
`VITE_FIREBASE_APPCHECK_SITE_KEY`. Weekly reports can be shared through the device's
share sheet or opened as a pre-filled email without sending student data through a
third-party mail server.

If an external API service is deployed, set `VITE_API_BASE_URL` when building the
frontend and add the Sites origin to `CORS_ALLOWED_ORIGINS` on the server.

## Authorization model

- Browser clients can create only their own non-admin profile.
- Parent/child account pairs use separate Firebase Auth sessions and passwords;
  the rules accept a parent link only after the student profile points back to it.
- Admin access requires an `admin` Firebase custom claim. A profile document alone
  never grants admin access.
- User progress is stored under `users/{uid}/private/state`; linked parents have
  read-only access to their child's profile and progress.

Deploy `firestore.rules` before enabling real accounts. Existing admin accounts
must receive their matching custom claim through a trusted admin script or the
Firebase Admin SDK.

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
