# Administrator security rollout

The old browser bundle contained a fixed administrator password. Removing it
from source does not invalidate a password already served to browsers.

1. In the Firebase project used by the live app, rotate that account's password
   and revoke all refresh tokens. Review recent authentication and administrator
   activity for unexpected access. Do not place the new password in source,
   build variables prefixed with `VITE_`, or documentation.
2. Confirm the intended administrator's Firebase UID and verified email outside
   the browser. In a trusted Firebase Admin SDK environment, assign that UID the
   `role=admin` custom claim and ensure `users/{uid}` has the same UID, email,
   and `role=admin`. Preserve any other needed custom claims. Do not grant
   administration based on an email string supplied by a browser.
3. Revoke refresh tokens once more so old tokens and claims cannot continue to
   authorize requests. Sign in afresh and verify both the admin UI and one
   protected admin API request with App Check enabled.
4. Deploy the Firestore rules, API, and browser bundle together. Test that a
   regular account and an unverified account cannot read administrator data,
   write questions, or invoke administrator API endpoints.
5. Keep the site private or disable administrator features if the claim/profile
   provisioning or negative access tests fail. Roll back only to another version
   without the embedded credential; the old browser bundle is unsafe.

This repository change cannot perform steps 1–4 in the live Firebase project.
