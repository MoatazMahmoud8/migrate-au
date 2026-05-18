/**
 * Expo config plugin: inject `use_modular_headers!` into the iOS Podfile.
 *
 * Why
 * ---
 * With useFrameworks unset (default static-library linkage) and RNFirebase v24
 * + Firebase iOS SDK 12 (which ships Swift pods like FirebaseAuth,
 * FirebaseFirestore, FirebaseCoreInternal), CocoaPods fails pod install with:
 *
 *   [!] The following Swift pods cannot yet be integrated as static libraries:
 *   The Swift pod `FirebaseAuth` depends upon `FirebaseAuthInterop`,
 *   `FirebaseAppCheckInterop`, `GoogleUtilities`, and `RecaptchaInterop`,
 *   which do not define modules. To opt into those targets generating module
 *   maps (which is necessary to import them from Swift when building as
 *   static libraries), you may set `use_modular_headers!` globally in your
 *   Podfile, or specify `:modular_headers => true` for particular dependencies.
 *
 * The clean fix is `use_modular_headers!` globally — this only affects header
 * module-map generation and does NOT switch pods to frameworks, so it does not
 * re-trigger the `-Wnon-modular-include-in-framework-module` error chain.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# === BEGIN use_modular_headers patch ===";
const END = "# === END use_modular_headers patch ===";
const BLOCK = `\n  ${MARKER}\n  use_modular_headers!\n  ${END}\n`;

function patchPodfile(contents) {
  // Strip previous version of this patch and any earlier static-framework
  // patches that may linger.
  let next = contents
    .replace(
      /\n?\s*# === BEGIN use_modular_headers patch ===[\s\S]*?# === END use_modular_headers patch ===\n?/g,
      ""
    )
    .replace(
      /# === BEGIN react-native-firebase static-framework patch ===[\s\S]*?# === END react-native-firebase static-framework patch ===\n?/g,
      ""
    )
    .replace(
      /\n?\s*# === BEGIN react-native-firebase modular-headers patch ===[\s\S]*?# === END react-native-firebase modular-headers patch ===\n?/g,
      ""
    );

  // Insert `use_modular_headers!` right after the first `platform :ios, ...`
  // line so it applies inside the abstract target scope CocoaPods uses for
  // Expo's Podfile. (Expo's template does not include `use_frameworks!` when
  // useFrameworks isn't set, so we anchor on `platform :ios` instead.)
  if (/^(\s*platform :ios.*)$/m.test(next)) {
    next = next.replace(
      /^(\s*platform :ios.*)$/m,
      (match) => `${match}${BLOCK}`
    );
  } else {
    // Fallback: prepend at the very top.
    next = `${MARKER}\nuse_modular_headers!\n${END}\n\n${next}`;
  }

  return next;
}

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      const contents = fs.readFileSync(podfilePath, "utf8");
      const patched = patchPodfile(contents);
      fs.writeFileSync(podfilePath, patched);
      return cfg;
    },
  ]);
};
