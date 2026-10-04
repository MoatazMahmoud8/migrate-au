/**
 * utils/firebaseAuth.ts
 *
 * Silent Firebase Anonymous Auth bootstrap.
 *
 * Why this exists:
 *   The app has never called `signInAnonymously()` for regular users -- all
 *   non-admin reads/writes (subscriptions, watchlists) are keyed by the
 *   RevenueCat anonymous app-user ID instead, with `request.auth` always
 *   `null` on the Firestore side. That made the `watchlists` security rule
 *   (`allow read, write: if request.auth != null`) permanently unsatisfiable
 *   for real users -- i.e. watchlists have been broken (permission-denied)
 *   for every guest/non-admin user.
 *
 *   This gives watchlists a real, stable `request.auth.uid` to key off,
 *   without forcing a login wall: Firebase's anonymous auth creates a
 *   session silently and persists it across app restarts via the SDK's
 *   local keychain/keystore, so it behaves like RevenueCat's anonymous ID
 *   (stable per-install) but is also usable in security rules.
 *
 *   Scope: used for watchlists only for now. Subscriptions remain keyed by
 *   the RevenueCat ID (utils/iap.ts getRevenueCatUserId) -- out of scope for
 *   this change, left untouched intentionally.
 */

import auth from '@react-native-firebase/auth';

let signInPromise: Promise<string> | null = null;

/**
 * Returns a stable Firebase Auth uid, signing in anonymously the first time
 * it's needed. Safe to call repeatedly/concurrently -- subsequent calls
 * reuse the in-flight sign-in or the already-authenticated user.
 */
export async function getWatchlistUid(): Promise<string> {
  const existing = auth().currentUser;
  if (existing) return existing.uid;

  if (!signInPromise) {
    signInPromise = auth()
      .signInAnonymously()
      .then((cred) => cred.user.uid)
      .catch((err) => {
        signInPromise = null;
        throw err;
      });
  }
  return signInPromise;
}
