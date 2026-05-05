# Google Play Signing Key Configuration

## Problem Encountered

When uploading the MigrateAU app to Google Play Console, we encountered a signing key mismatch:

```
Your Android App Bundle is signed with the wrong key.
Expected certificate SHA1 fingerprint:
  26:32:AE:71:04:6C:6E:79:45:9F:D5:56:D1:4C:88:82:4A:E2:AD:97

Uploaded certificate SHA1 fingerprint:
  FC:E0:32:F2:3E:E3:71:94:7D:02:FA:0C:2C:F8:2D:36:A4:A7:45:B4
```

## Root Cause

EAS Build was pre-signing the app bundle with its own managed credentials, but Google Play had already assigned a different signing key for this app (the account's managed signing key used by Citizenship App and DKT App).

## Solution Implemented

### 1. Disabled EAS Pre-Signing

Updated `eas.json` production profile:

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "credentialsSource": "local",
      "node": "22.15.0",
      "android": {
        "buildType": "app-bundle",
        "withoutCredentials": true
      }
    }
  }
}
```

**Key changes:**
- `credentialsSource`: "local" - Don't fetch remote EAS credentials
- `buildType`: "app-bundle" - Generate AAB (not APK)
- `withoutCredentials`: true - Create unsigned bundle
- Google Play will sign it with the account's managed key

### 2. Why This Works

Google Play Console has **"Signing by Google Play"** enabled in App integrity settings:
- ✅ Google Play Console manages the signing key
- ✅ All apps on the same account use the same key
- ✅ We upload unsigned bundles, Google Play signs them
- ✅ Consistent signing across Citizenship, DKT, and MigrateAU apps

## Build & Upload Process

### Build
```bash
eas build --platform android --profile production --non-interactive
```

### Download
```bash
curl -L -o app-release.aab "https://expo.dev/artifacts/eas/[BUILD_ID].aab"
```

### Upload to Google Play
1. Go to [Google Play Console](https://play.google.com/console)
2. Select **MigrateAU** app
3. **Test and release** → **Internal testing** → **Create release**
4. Upload the unsigned AAB
5. Google Play will sign it automatically
6. No signature mismatch errors ✅

## Account Signing Configuration

All apps on **moataz.alsbak** account use:
- **Account Signing Key Fingerprint (SHA1):** `26:32:AE:71:04:6C:6E:79:45:9F:D5:56:D1:4C:88:82:4A:E2:AD:97`

**Apps configured:**
- ✅ Citizenship App
- ✅ DKT App  
- ✅ MigrateAU App (after this fix)

## Key Commits

- **e699757:** Added google-services.json to android/app
- **536c4de:** Disabled pre-signing for Google Play (set `withoutCredentials: true`)

## Related Documentation

- [Google Play App Signing](https://developer.android.com/studio/publish/app-signing)
- [Expo EAS Build Configuration](https://docs.expo.dev/eas/build/config/)
- [Google Play Console Setup](https://play.google.com/console/about/guides/releaseprograms/)
