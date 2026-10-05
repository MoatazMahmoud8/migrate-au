const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * expo-notifications sets AndroidManifest.xml meta-data
 * com.google.firebase.messaging.default_notification_channel_id="migration_news",
 * but @react-native-firebase/messaging's own AndroidManifest.xml declares the
 * same meta-data key with an empty value. Gradle's manifest merger treats
 * this as a conflicting attribute and fails the release build
 * (":app:processReleaseMainManifest FAILED" — see
 * https://developer.android.com/r/studio-ui/build/manifest-merger).
 *
 * This plugin adds tools:replace="android:value" to our app's copy of that
 * meta-data tag so our value always wins over the library default.
 */
const META_DATA_NAME = 'com.google.firebase.messaging.default_notification_channel_id';

module.exports = function withFcmManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application || !application['meta-data']) {
      return config;
    }

    const metaData = application['meta-data'].find(
      (item) => item.$['android:name'] === META_DATA_NAME
    );

    if (metaData) {
      metaData.$['tools:replace'] = 'android:value';
      // Ensure the `tools` namespace is declared on the root manifest element.
      const manifest = config.modResults.manifest;
      if (!manifest.$['xmlns:tools']) {
        manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
    }

    return config;
  });
};
