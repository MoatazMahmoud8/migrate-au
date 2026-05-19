/**
 * Expo config plugin: fix Firebase iOS SDK 12 + RNFirebase v24 pod compatibility.
 *
 * THE ROOT CAUSE
 * --------------
 * @react-native-firebase/firestore pulls in FirebaseFirestore → gRPC-C++ →
 * gRPC-Core 1.69.x. This creates a 3-way incompatibility:
 *
 * Problem A (use_frameworks!):
 *   RNFB pods become framework targets that `#import <React/RCTBridgeModule.h>`
 *   non-modularly → -Wnon-modular-include-in-framework-module errors.
 *
 * Problem B (no use_frameworks!, no use_modular_headers!):
 *   Firebase Swift pods (FirebaseAuth, FirebaseFirestore, FirebaseCoreInternal)
 *   depend on Obj-C pods (GoogleUtilities, RecaptchaInterop, *Interop) that lack
 *   module maps → pod install fails with "Swift pods cannot be integrated as
 *   static libraries".
 *
 * Problem C (use_modular_headers! globally):
 *   gRPC-Core 1.69.x ships its OWN module.modulemap at include/grpc/module.modulemap.
 *   CocoaPods' use_modular_headers! ALSO generates a module map symlink at:
 *     Pods/Headers/Private/grpc/gRPC-Core.modulemap
 *   AND injects into gRPC-C++'s build settings:
 *     OTHER_CFLAGS = ... -fmodule-map-file=.../gRPC-Core.modulemap
 *   That symlink doesn't get created correctly → "module map file not found" at
 *   Xcode build time.
 *
 * THE COMPLETE SOLUTION (this plugin)
 * ------------------------------------
 * 1. NO use_frameworks! — keeps pods as static libraries, solving Problem A.
 * 2. use_modular_headers! globally — gives Firebase Swift pods the module maps
 *    they need for their Obj-C deps, solving Problem B.
 * 3. post_install hook that strips the -fmodule-map-file=...gRPC-Core.modulemap
 *    flag from gRPC-C++'s OTHER_CFLAGS / OTHER_CXXFLAGS, solving Problem C.
 *    (gRPC-C++ will fall back to gRPC-Core's own include/grpc/module.modulemap
 *    via its HEADER_SEARCH_PATHS, which works fine.)
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ── Patch 1: use_modular_headers! ────────────────────────────────────────────
const MOD_HDR_MARKER = "# === BEGIN use_modular_headers patch ===";
const MOD_HDR_END    = "# === END use_modular_headers patch ===";
const MOD_HDR_BLOCK  = `\n${MOD_HDR_MARKER}\nuse_modular_headers!\n${MOD_HDR_END}\n`;

// ── Patch 2: gRPC-Core modulemap fix injected INTO existing post_install ─────
// CocoaPods does NOT support multiple post_install blocks. We inject our code
// inside the existing block by anchoring on `react_native_post_install(` which
// Expo's generated Podfile always contains.
const GRPC_MARKER = "# === BEGIN grpc-core-modulemap-fix ===";
const GRPC_END    = "# === END grpc-core-modulemap-fix ===";
// Code block injected before react_native_post_install call (inside its block).
const GRPC_INLINE = `  ${GRPC_MARKER}
  # gRPC-Core 1.69.x ships its own module.modulemap but CocoaPods'
  # use_modular_headers! generates a symlink at
  # Pods/Headers/Private/grpc/gRPC-Core.modulemap that is not reliably
  # created, causing "module map file not found" at Xcode compile time.
  # Strip the bad -fmodule-map-file flag from gRPC-C++ build settings.
  installer.pods_project.targets.each do |target|
    next unless target.name == 'gRPC-C++'
    target.build_configurations.each do |config|
      %w[OTHER_CFLAGS OTHER_CXXFLAGS].each do |key|
        val = config.build_settings[key]
        next unless val
        if val.is_a?(Array)
          config.build_settings[key] = val.reject { |f| f.to_s.include?('gRPC-Core.modulemap') }
        else
          config.build_settings[key] = val.gsub(/-fmodule-map-file=\\S*gRPC-Core\\.modulemap\\S*/, '').gsub(/\\s+/, ' ').strip
        end
      end
    end
  end
  ${GRPC_END}
`;

function patchPodfile(contents) {
  let next = contents;

  // ── Strip all previous patch blocks (idempotent re-runs) ──────────────────
  next = next.replace(
    /\n?# === BEGIN use_modular_headers patch ===[\s\S]*?# === END use_modular_headers patch ===\n?/g,
    ""
  );
  next = next.replace(
    /\n?# === BEGIN grpc-core-modulemap-fix ===[\s\S]*?# === END grpc-core-modulemap-fix ===\n?/g,
    ""
  );
  // Legacy patches from earlier iterations
  next = next.replace(
    /# === BEGIN react-native-firebase static-framework patch ===[\s\S]*?# === END react-native-firebase static-framework patch ===\n?/g,
    ""
  );
  next = next.replace(
    /\n?\s*# === BEGIN react-native-firebase modular-headers patch ===[\s\S]*?# === END react-native-firebase modular-headers patch ===\n?/g,
    ""
  );

  // ── Patch 1: inject use_modular_headers! right after `platform :ios` ──────
  // Must be at top level (not inside a target block) to apply globally.
  if (/^(\s*platform :ios.*)$/m.test(next)) {
    next = next.replace(
      /^(\s*platform :ios.*)$/m,
      (match) => `${match}${MOD_HDR_BLOCK}`
    );
  } else {
    next = `${MOD_HDR_MARKER}\nuse_modular_headers!\n${MOD_HDR_END}\n\n${next}`;
  }

  // ── Patch 2: inject gRPC-Core fix INSIDE the existing post_install block ──
  // CocoaPods does NOT allow multiple post_install blocks. We inject before
  // react_native_post_install() which is always present in Expo's Podfile.
  if (next.includes("react_native_post_install(")) {
    next = next.replace(
      /^(\s*react_native_post_install\()/m,
      `${GRPC_INLINE}\n$1`
    );
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
