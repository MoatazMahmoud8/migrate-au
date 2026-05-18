/**
 * Expo config plugin: allow non-modular includes in framework modules.
 *
 * Why this exists
 * ---------------
 * With `useFrameworks: "static"` and `@react-native-firebase/app`, the RNFBApp
 * pod becomes a framework module whose sources import React-Core headers like
 *   #import <React/RCTBridgeModule.h>
 *   #import <React/RCTConvert.h>
 *   #import <React/RCTEventEmitter.h>
 * non-modularly. Clang treats this as an error
 * (`-Werror,-Wnon-modular-include-in-framework-module`) and the iOS build dies.
 *
 * The well-known workaround is to set
 *   CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
 * for every pod target. We inject that into the Podfile's post_install hook.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const HOOK_MARKER = "# === BEGIN allow-non-modular-headers patch ===";
const HOOK_END = "# === END allow-non-modular-headers patch ===";

const HOOK = `
${HOOK_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
    ${HOOK_END}
`;

function patchPodfile(contents) {
  if (contents.includes(HOOK_MARKER)) return contents;

  // Inject inside the existing `post_install do |installer|` block.
  // Expo's template Podfile has exactly one such block.
  const postInstallRegex = /(post_install do \|installer\|\s*\n)/;
  if (postInstallRegex.test(contents)) {
    return contents.replace(postInstallRegex, (match) => match + HOOK);
  }

  // Fallback: append a new post_install block at the end of the target block.
  return (
    contents +
    `\n\npost_install do |installer|${HOOK}\nend\n`
  );
}

module.exports = function withAllowNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      const contents = fs.readFileSync(podfilePath, "utf8");
      const patched = patchPodfile(contents);
      fs.writeFileSync(podfilePath, patched);
      return config;
    },
  ]);
};
