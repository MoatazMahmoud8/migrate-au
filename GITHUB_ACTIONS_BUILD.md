# GitHub Actions Android Build Setup

This GitHub Actions workflow builds your MigrateAU app locally without relying on EAS Build's free tier concurrency limits.

## Quick Start

The workflow will run automatically on every push to `main`. No additional setup needed for basic builds!

## For Signed Release Builds (Play Store Upload)

To generate signed AAB files for Google Play, you need to configure signing credentials:

### Step 1: Get Your Keystore

You have two options:

#### Option A: Export from EAS (Recommended if already set up)
```bash
# This exports your existing EAS keystore
eas credentials show --platform android
```

#### Option B: Create a new keystore
```bash
keytool -genkey -v -keystore migrate-au-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias migrate-au-key
```

### Step 2: Encode Keystore as Base64

```bash
base64 -w 0 migrate-au-keystore.jks > keystore-base64.txt
cat keystore-base64.txt
```

### Step 3: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/MoatazMahmoud8/migrate-au
2. Settings → Secrets and variables → Actions
3. Add these 5 secrets:

| Secret Name | Value |
|---|---|
| `KEYSTORE_FILE_PATH` | `android/app/keystore.jks` |
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_ALIAS` | `migrate-au-key` (or your alias) |
| `KEY_PASSWORD` | Your key password |
| `KEYSTORE_BASE64` | Output from step 2 |

### Step 4: Update Workflow

The workflow will use these secrets automatically.

## Build Outputs

Successful builds create:
- **AAB** (Android App Bundle) - for Google Play Store
- **APK** (Android Package) - for direct installation
- **Mapping file** - for crash reporting in Firebase

All artifacts are available in the GitHub Actions run, and a GitHub Release is created automatically.

## Benefits vs EAS Build

| Feature | EAS Build | GitHub Actions |
|---------|-----------|-----------------|
| Free tier concurrency | 1 limited slot | Unlimited (with GitHub free tier) |
| Build time | 8-12 min + queue | 8-12 min (no queue) |
| Cost | Free tier limited | Free |
| Local debugging | Not possible | Yes, run workflow locally |
| Customization | Limited | Full control |

## Monitoring Builds

1. Go to Actions tab in your GitHub repo
2. Click the latest workflow run
3. Watch real-time logs
4. Download artifacts when complete

## Troubleshooting

### Build fails with "Gradle build failed"
- Check Java version is 17: `java -version`
- Clear gradle cache: `./gradlew clean`
- Check Android SDK versions match `app.json`

### APK won't install
- Ensure signing is configured correctly
- Check package name: `xyz.jsmglobal.migrateur`
- Try unsigned APK first for testing

### AAB rejected by Google Play
- Verify signing certificate matches uploaded keystore
- Check version code is incrementing: should be 105+
- Review Play Console for specific error

## Local Testing

Test the build locally before pushing:

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
```

## Next Steps

1. ✅ Workflow created and ready
2. ⏳ Add signing secrets (optional, for Play Store)
3. 🚀 Push to main and watch it build!
