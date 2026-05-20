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
 * 3. post_install hook that CREATES the missing modulemap files at the
 *    Pods/Headers/{Public,Private}/<header_dir>/<pod>.modulemap paths Xcode
 *    expects, by copying from the real files at Pods/Target Support Files/
 *    <pod>/<pod>.modulemap. Solves Problem C for every affected pod
 *    (gRPC-Core, abseil, BoringSSL-GRPC, …) regardless of where the missing
 *    reference is set (xcconfig flags, MODULEMAP_FILE, pbxproj, etc.).
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
//
// STRATEGY: instead of trying to STRIP modulemap references (which appear in
// many places: -fmodule-map-file flags, MODULEMAP_FILE setting, MODULEMAP_PRIVATE_FILE
// setting, and pbxproj entries), we instead CREATE the missing modulemap files
// at the exact paths Xcode is looking for. The real modulemap content already
// exists at Pods/Target Support Files/<pod>/<pod>.modulemap — we just need to
// copy it into the Pods/Headers/Public|Private/<header_dir>/ locations that
// CocoaPods should have populated but didn't.
const GRPC_INLINE = `  ${GRPC_MARKER}
  # When use_modular_headers! is set globally, CocoaPods generates modulemap files
  # at Pods/Target Support Files/<pod>/<pod>.modulemap and references them from
  # build settings as Pods/Headers/Public|Private/<header_dir>/<pod>.modulemap.
  # For pods like gRPC-Core, abseil, BoringSSL-GRPC the destination symlinks
  # never get created, causing "module map file not found" at Xcode build time.
  # FIX: walk every modulemap in Target Support Files and copy it into every
  # Pods/Headers/{Public,Private} subdirectory where it might be referenced.
  require 'fileutils'
  pods_root = installer.sandbox.root.to_s
  Dir.glob("#{pods_root}/Target Support Files/*/*.modulemap").each do |src|
    pod_name = File.basename(src, ".modulemap")
    # Place under both Public and Private, in every header subdir for the pod.
    ['Public', 'Private'].each do |scope|
      scope_dir = "#{pods_root}/Headers/#{scope}"
      next unless Dir.exist?(scope_dir)
      # Iterate every per-pod header subdirectory; cover both the canonical
      # pod-name folder and any "alias" folders (e.g. gRPC-Core ships headers
      # under Headers/Public/grpc/, abseil under Headers/Public/absl/, etc.).
      Dir.glob("#{scope_dir}/*/").each do |hdr_dir|
        dst = File.join(hdr_dir, "#{pod_name}.modulemap")
        next if File.exist?(dst) || File.symlink?(dst)
        begin
          FileUtils.cp(src, dst)
          Pod::UI.puts "  modulemap-fix: created #{dst.sub(pods_root, 'Pods')}"
        rescue => e
          Pod::UI.puts "  modulemap-fix: skipped #{dst}: #{e.message}"
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
