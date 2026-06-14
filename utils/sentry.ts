/**
 * Sentry initialization.
 *
 * To enable in production:
 *   1. Create a project at https://sentry.io (React Native template).
 *   2. Set EXPO_PUBLIC_SENTRY_DSN in your .env (and EAS secrets).
 *   3. For sourcemap uploads in EAS builds, set SENTRY_AUTH_TOKEN
 *      as an EAS secret with scopes project:releases + org:read.
 *
 * In development the SDK is initialised but events are not sent
 * (dsn is undefined) — local errors still surface in the console.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function initSentry(): void {
  // Skip Sentry initialization on web — @sentry/react-native is native-only
  if (Platform.OS === 'web') {
    if (__DEV__) {
      console.log('[sentry] Skipped on web platform — native-only module');
    }
    return;
  }
  
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.log('[sentry] DSN not set — crash reporting disabled');
    }
    return;
  }
  Sentry.init({
    dsn,
    debug: false,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version ?? 'unknown',
    dist: String(
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode ??
      '0',
    ),
    // Lower sampling for performance traces — errors are always sent.
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    // Send PII off — we don't need IPs or auto-tagged user data.
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    beforeSend(event) {
      // Drop noisy network aborts (user cancelled / offline).
      const msg = event.exception?.values?.[0]?.value ?? '';
      if (/AbortError|NetworkError|Network request failed/i.test(msg)) {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
