// Dynamic config: allows EAS secrets to override static app.json values.
// GOOGLE_SERVICES_JSON env var is set by EAS when using a file-type secret.

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  // Only use env var if it has the correct platform prefix
  const iosKey = (process.env.REVENUECAT_API_KEY_IOS || '').startsWith('appl_')
    ? process.env.REVENUECAT_API_KEY_IOS
    : config.extra?.revenueCatKeyIos || '';
  const androidKey = (process.env.REVENUECAT_API_KEY_ANDROID || '').startsWith('goog_')
    ? process.env.REVENUECAT_API_KEY_ANDROID
    : config.extra?.revenueCatKeyAndroid || '';

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile ?? './google-services.json',
    },
    extra: {
      ...config.extra,
      geminiApiKey:         process.env.GEMINI_API_KEY ?? config.extra?.geminiApiKey ?? '',
      revenueCatKeyIos:     iosKey,
      revenueCatKeyAndroid: androidKey,
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    },
  };
};
