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
 *   gRPC-Core, abseil, BoringSSL-GRPC and others ship their OWN module.modulemap.
 *   CocoaPods' use_modular_headers! ALSO generates module map symlinks at:
 *     Pods/Headers/Public|Private/<pod>/<pod>.modulemap
 *   AND injects -fmodule-map-file flags into every dependent pod's .xcconfig.
 *   Those symlinks aren't reliably created → "module map file not found" at Xcode
 *   build time for gRPC-Core, abseil.modulemap, BoringSSL-GRPC.modulemap, etc.
 *
 * THE COMPLETE SOLUTION (this plugin)
 * ------------------------------------
 * 1. NO use_frameworks! — keeps pods as static libraries, solving Problem A.
 * 2. use_modular_headers! globally — gives Firebase Swift pods the module maps
 *    they need for their Obj-C deps, solving Problem B.
 * 3. post_install hook that strips ALL -fmodule-map-file flags pointing to
 *    Pods/Headers/ paths from ALL pod xcconfig files, solving Problem C for
 *    every affected pod (gRPC-Core, abseil, BoringSSL-GRPC, …). Each pod's
 *    own module.modulemap is still found via HEADER_SEARCH_PATHS.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ── Patch 1: use_modular_headers! ────────────────────────────────────────────
const MOD_HDR_MARKER = "# === BEGIN use_modular_headers patch ===";
const MOD_HDR_END    = "# === END use_modular_headers patch ===";
const MOD_HDR_BLOCK  = `\n${MOD_HDR_MARKER}\nuse_modular_headers!\n${MOD_HDR_END}\n`;

// ── Patch 2: modulemap fix injected INTO existing post_install ───────────────
// CocoaPods does NOT support multiple post_install blocks. We inject our code
// inside the existing block by anchoring on `react_native_post_install(` which
// Expo's generated Podfile always contains.
const GRPC_MARKER = "# === BEGIN grpc-core-modulemap-fix ===";
const GRPC_END    = "# === END grpc-core-modulemap-fix ===";
// Code block injected before react_native_post_install call (inside its block).
const GRPC_INLINE = `  ${GRPC_MARKER}
  # use_modular_headers! globally generates module map symlinks for ALL pods at
  # Pods/Headers/Public|Private/<pod>/<pod>.modulemap and injects those paths as
  # -fmodule-map-file= flags in every dependent pod's .xcconfig files.
  # Several pods (gRPC-Core, abseil, BoringSSL-GRPC, ...) ship their own
  # module.modulemap but the CocoaPods-generated symlinks are never reliably
  # created, causing "module map file not found" at Xcode compile time.
  # FIX: strip ALL -fmodule-map-file flags that reference Pods/Headers/ paths
  # from ALL pod xcconfig files. Pods that ship their own module.modulemap will
  # still be found via HEADER_SEARCH_PATHS.
  Dir.glob("#{installer.sandbox.root}/Target Support Files/**/*.xcconfig").each do |f|
    content = File.read(f)
    new_content = content.gsub(/-fmodule-map-file=\\S*Pods\\/Headers\\S*/, '')
    File.write(f, new_content) if new_content != content
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
