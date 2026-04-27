// Dynamic config: allows EAS secrets to override static app.json values.
// GOOGLE_SERVICES_JSON env var is set by EAS when using a file-type secret.

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile ?? './google-services.json',
    },
  };
};
