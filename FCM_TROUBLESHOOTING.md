# FCM Notification System Troubleshooting Guide

## Notification Flow Architecture

```
Admin Dashboard
    ↓ (Approve notification)
    ↓
Firestore: notifications_draft → notifications
    ↓
Cloud Function: approveNotification
    ↓
Creates: fcm_triggers/{id}
    ↓
Cloud Function: processFcmTrigger (triggered on create)
    ↓
Firebase Cloud Messaging (FCM)
    ↓
APK via Firebase Messaging SDK
    ↓
Local notification display
```

## Issue: TestFlight Notifications Not Received

### Root Cause Analysis

#### 1. **FCM Token Not Obtained**
**Symptoms:**
- Notification permission granted but no notifications arrive
- App logs show no FCM token

**Verification:**
```bash
# Check console logs during app startup
# Look for: "[notifications] ✅ FCM token obtained:"
# If missing: "[notifications] ⚠️  FCM token is null/empty"
```

**Fixes:**
- Ensure `google-services.json` is included in the APK build
- Verify Firebase app is properly configured in app.json
- Check Firebase project has FCM enabled
- Try on device with Google Play Services installed

#### 2. **Notification Permission Denied**
**Symptoms:**
- Permission dialog appears but user taps "Don't Allow"
- Subsequent notifications don't arrive
- App logs show: "Permission denied"

**Verification:**
```
Device Settings → Apps → MigrateAU → Permissions → Notifications: [ON]
```

**Fixes:**
- Remove and reinstall app
- Go to Settings → Apps → MigrateAU → Permissions → Enable Notifications
- Tap notification permission in app again
- For TestFlight: Check iOS Settings → Notifications → MigrateAU

#### 3. **Topic Subscription Failed**
**Symptoms:**
- App logs show: "Failed to subscribe to topic"
- Notifications sent to topic don't arrive

**Verification:**
```bash
# Look for logs:
# ✅ "[notifications] Subscribed to global topics:"
# ✅ "[notifications] Subscribed to state topics:"
```

**Fixes:**
- Verify FCM token was obtained before subscription
- Check topic names match between app and Cloud Functions
- Verify Firebase project has Multiple Topics enabled
- Try unsubscribe + resubscribe manually

#### 4. **Notification Payload Issues**
**Symptoms:**
- FCM reports success but app doesn't display notification
- Silent notifications received but no sound/badge

**Verification:**
Look at Cloud Function logs for the notification payload:
```javascript
// Cloud Functions should send:
{
  topic,
  notification: {
    title: "...",
    body: "..."
  },
  data: { url: "..." },
  android: { notification: { channelId: "migration_news" } },
  apns: { payload: { aps: { sound: "default" } } }
}
```

**Fixes:**
- Verify notification title/body are not empty
- Check Android notification channel exists: `migration_news`
- iOS requires APS alert configuration
- Data payload should be flat (strings only)

#### 5. **Background/Foreground Handler Not Triggered**
**Symptoms:**
- Notification arrives on device but doesn't trigger action
- App doesn't navigate to intended route

**Verification:**
```bash
# Foreground: App open, notification arrives → should show
# Background: App closed, notification arrives → should show in tray
# Tap notification → app should launch and navigate
```

**Fixes:**
- Restart app to ensure handlers are registered
- Check `data.route` field is set correctly in notification
- Verify route exists in Expo Router configuration
- Test with notification directly from Firebase Console

## Notification Testing Procedure

### Step 1: Enable Debug Logging

The enhanced logging in `utils/notifications.ts` provides detailed diagnostics:

```
[notifications] 🚀 Starting initialization...
[notifications] ✅ Permission granted
[notifications] ✅ Global topics subscribed
[notifications] 📡 Getting FCM token...
[notifications] ✅ FCM token obtained: abc123...
[notifications] ✅ Watchlist device registered for userId: user123
```

### Step 2: Verify FCM Token Registration

1. Open app
2. Check console for FCM token log
3. Open [Firebase Console](https://console.firebase.google.com)
4. Go to Firestore → Collection: `user_devices` or `watchlist`
5. Verify document exists for current user with FCM token

### Step 3: Send Test Notification

#### Via Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Create new campaign
3. Select audience: "By Topic"
4. Enter topic: `au_migration` (global test)
5. Title: "Test Notification"
6. Body: "If you see this, notifications work!"
7. Send now

#### Via Cloud Functions (cURL):

```bash
curl -X POST https://region-project.cloudfunctions.net/approveNotification \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "notificationId": "test-123",
      "editedTitle": "Test Notification",
      "editedBody": "Testing FCM flow"
    }
  }'
```

#### Directly via Firebase Messaging API:

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/swift-shore-238707/messages:send \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "topic": "au_migration",
      "notification": {
        "title": "Test Notification",
        "body": "Testing FCM"
      },
      "data": {
        "test": "true"
      }
    }
  }'
```

### Step 4: Monitor Logs

**Real-time Firebase Logs:**
```bash
firebase functions:log --only processFcmTrigger
```

**Expected successful flow:**
```
[fcm_triggers] Document created: trigger-abc123
[processFcmTrigger] Processing trigger...
[processFcmTrigger] FCM sent to topic 'au_migration': messageId=xyz
[processFcmTrigger] ✓ Trigger marked as sent
```

**Error patterns:**
```
❌ No topics in trigger document — skipping FCM send
❌ FCM failed for topic 'au_migration': Permission denied
❌ Error approving notification: Admin access required
```

## Common FCM Errors

### "Topic not found"
- Topic name doesn't exist or is misspelled
- Firebase project doesn't have topic enabled
- **Fix:** Use correct topic name, re-subscribe

### "Authentication error" / "Invalid API key"
- API key is invalid or expired
- Service account has insufficient permissions
- **Fix:** Regenerate credentials, check IAM permissions

### "Device not found" / "No subscribers"
- FCM token is invalid or expired
- Device unsubscribed from topic
- Device has revoked notification permission
- **Fix:** Re-subscribe, reinstall app, check permissions

### "Invalid notification payload"
- Notification object has invalid structure
- String values expected but objects provided
- Title or body too long (max 240 chars for title, 240 for body)
- **Fix:** Validate payload structure, shorten strings

## TestFlight-Specific Issues

### Issue: Notifications Work on Dev, Not on TestFlight

**Causes:**
1. `google-services.json` not included in TestFlight build
2. Firebase project ID mismatch between dev and production
3. APK doesn't have Firebase Messaging SDK
4. TestFlight user hasn't granted notification permission

**Fixes:**
1. Verify `google-services.json` in `app.json` or `app.config.js`:
   ```javascript
   android: {
     googleServicesFile: './google-services.json'
   }
   ```

2. Check `eas.json` includes Firebase setup:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "GOOGLE_SERVICES_JSON": "$GOOGLE_SERVICES_JSON"
         }
       }
     }
   }
   ```

3. Rebuild with EAS:
   ```bash
   eas build --platform ios --profile production
   ```

4. User must grant notification permission:
   - First app launch → tap "Allow" in permission dialog
   - Or: Settings → Notifications → MigrateAU → ON

### Issue: TestFlight Users Can't See Latest Notification Config

**Cause:** Build cached old configuration

**Fix:**
1. Increment version in `app.json`
2. Rebuild with EAS
3. Upload new build to TestFlight
4. Users reinstall from TestFlight

## Monitoring & Alerts

### Set Up Cloud Monitoring

```bash
# Create alert for FCM send failures
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="FCM Send Failures" \
  --condition-display-name="FCM failures > 5 per minute" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s
```

### Cloud Function Logs Query

```bash
# See all processFcmTrigger invocations
gcloud functions logs read processFcmTrigger --limit 50

# Filter by errors
gcloud functions logs read processFcmTrigger --limit 50 | grep -i error

# Monitor in real-time
gcloud functions logs read processFcmTrigger --limit 50 --follow
```

## Verification Checklist

After implementing notification system changes:

- [ ] Notification permission request works
- [ ] FCM token obtained successfully  
- [ ] Console logs show "✅ Notifications initialized"
- [ ] Topic subscriptions show "✅ All topics subscribed"
- [ ] Test notification sent via Firebase Console arrives on device
- [ ] Notification displays with correct title/body
- [ ] Notification is clickable (navigates to correct route)
- [ ] Foreground notification shows when app is open
- [ ] Background notification shows when app is closed
- [ ] Cloud Function logs show successful FCM send
- [ ] TestFlight user receives notifications
- [ ] No console errors related to FCM
