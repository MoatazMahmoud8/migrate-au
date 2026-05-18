/**
 * Expo config plugin: make @react-native-firebase work with useFrameworks=static.
 *
 * Why this exists
 * ---------------
 * With `useFrameworks: "static"` the RNFB pods become framework modules.
 * Their .m sources `#import <React/RCTBridgeModule.h>` etc. — and unless
 * RNFB is compiled as a static framework with modular headers, those imports
 * fail with either:
 *   (a) -Wnon-modular-include-in-framework-module errors, or
 *   (b) "declaration of RCTPromiseRejectBlock must be imported from module
 *       RNFBApp.RNFBAppModule before it is required" + cascading parse errors.
 *
 * The RNFirebase-recommended fix is the global Podfile flag
 *   $RNFirebaseAsStaticFramework = true
 * which makes the RNFB podspecs declare themselves as static frameworks with
 * modular headers. See https://rnfirebase.io/#expo
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const TOP_MARKER = "# === BEGIN react-native-firebase static-framework patch ===";
const TOP_END = "# === END react-native-firebase static-framework patch ===";

const TOP_BLOCK = `${TOP_MARKER}
$RNFirebaseAsStaticFramework = true
${TOP_END}
`;

const MODHDR_MARKER = "# === BEGIN react-native-firebase modular-headers patch ===";
const MODHDR_END = "# === END react-native-firebase modular-headers patch ===";

const MODHDR_BLOCK = `\n  ${MODHDR_MARKER}\n  use_modular_headers!\n  ${MODHDR_END}\n`;

function patchPodfile(contents) {
  let next = contents;

  // Strip any previous version of the patch so re-runs stay clean.
  next = next.replace(
    /# === BEGIN allow-non-modular-headers patch ===[\s\S]*?# === END allow-non-modular-headers patch ===\n?/g,
    ""
  );
  next = next.replace(
    /# === BEGIN react-native-firebase static-framework patch ===[\s\S]*?# === END react-native-firebase static-framework patch ===\n?/g,
    ""
  );
  next = next.replace(
    /\n?\s*# === BEGIN react-native-firebase modular-headers patch ===[\s\S]*?# === END react-native-firebase modular-headers patch ===\n?/g,
    ""
  );

  // 1. Inject the global flag at the very top of the Podfile (must come before
  //    any `target ... do` block so all pod blocks see it).
  next = TOP_BLOCK + "\n" + next;

  // 2. Inject `use_modular_headers!` right after `use_frameworks!`. Without
  //    this, React-Core stays non-modular and RNFB framework targets fail with
  //    `-Wnon-modular-include-in-framework-module` errors when they
  //    `#import <React/RCTBridgeModule.h>` etc.
  next = next.replace(
    /^(\s*use_frameworks!.*)$/m,
    (match) => `${match}${MODHDR_BLOCK}`
  );

  return next;
}

module.exports = function withRNFirebaseStaticFramework(config) {
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
