/**
 * NOTIFICATION UX FLOW - IMPLEMENTATION GUIDE
 * 
 * This document describes the 3-step UX flow for notifications/news on the Updates screen.
 * The implementation keeps users in-app for maximum retention and maintains credibility
 * through official source attribution.
 */

# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION UX FLOW - 3 STEPS
# ═══════════════════════════════════════════════════════════════════════════════

## FLOW OVERVIEW

### Step 1: Tap Notification Card → In-App Detail Screen
**Location:** [app/(tabs)/notifications.tsx] + [components/NotificationDetail.tsx]

When a user taps a notification card on the Updates screen:
- ✅ Navigation does NOT launch external browser
- ✅ Detail screen displays in full-screen format
- ✅ User stays within AMG app ecosystem
- ✅ Unread notification marked as read

**Content Displayed on Detail Screen:**
- Category badge with timestamp (e.g., "Visa Change · 2h ago")
- Full news headline (bold, prominent)
- Source attribution with color dot (e.g., "Source: ABC News")
- Full body text/summary (wrapped, readable)
- Professionally styled "Read Official Source" button

**Component Files:**
- `components/NotificationDetail.tsx` - Handles detail screen rendering
- State management in `app/(tabs)/notifications.tsx` via `selectedNotification` state
- Smooth transitions between notification list and detail view


### Step 2: The Official Source Button
**Location:** [components/NotificationDetail.tsx] line 82-90

At the bottom of the detail screen, a prominent action button:
- **Label:** "Read Official Source"
- **Color:** Primary brand color (blue)
- **Icon:** Arrow forward (→)
- **Behavior:** 
  - Only shows if `notification.sourceUrl` exists (safe URLs only)
  - Tapping button transitions to in-app browser
  - No external app launches
  - Legal compliance: All content backed by official source


### Step 3: Smart External Linking via In-App Browser
**Location:** [components/InAppBrowser.tsx]

When user taps "Read Official Source":

**On Native Platforms (iOS/Android):**
- Uses `react-native-webview` component
- Embeds external URL in a native WebView
- User sees loading indicator
- Back button available (if `canGoBack` is true)
- Close button (X) available in header
- URL fully visible in header bar (transparency)

**On Web Platform:**
- Uses `<iframe>` element with sandbox attributes
- Same visual/UX pattern as native
- Sandbox restrictions: allow-same-origin, allow-scripts, allow-forms

**Navigation Flow:**
```
Updates Tab
  ↓ (tap notification)
Detail Screen
  ↓ (tap "Read Official Source")
In-App Browser (WebView/iframe)
  ↓ (tap close/back)
Returns to Detail Screen
  ↓ (tap back button)
Updates Tab
```

**Key Design Principles:**
- User never leaves the app
- Official source fully accessible within app
- Close button always visible in header
- One-tap navigation back to detail screen
- Transparent, trustworthy flow


# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENT ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════

## 1. NotificationDetail Component
**File:** [components/NotificationDetail.tsx]
**Purpose:** Display full notification details with source attribution

**Key Features:**
- Responsive layout with SafeAreaView
- Scrollable content area
- Category badge with color coding
- Relative timestamp formatting ("2h ago", "1d ago", etc.)
- Source attribution with visual indicator
- Full body text support
- Conditional "Read Official Source" button
- Close button in header
- State management for transitioning to InAppBrowser

**Props:**
```typescript
interface NotificationDetailProps {
  notification: AppNotification;  // Full notification data
  onClose: () => void;           // Callback to close detail screen
}
```

**Styling Notes:**
- Uses theme colors from `constants/theme`
- Font hierarchy: headline (xl), body (base), metadata (sm/xs)
- Spacing follows 8px grid system
- Border colors for visual separation


## 2. InAppBrowser Component  
**File:** [components/InAppBrowser.tsx]
**Purpose:** Render external URLs within the app without leaving

**Platform Differences:**
- **Native (iOS/Android):** Uses `react-native-webview` package
- **Web:** Uses `<iframe>` with sandbox restrictions

**Key Features:**
- Loading indicator during page load
- Responsive header with title + close button
- Back button (enabled only if content supports it)
- Error fallback UI
- Security-focused sandbox attributes on web
- JavaScript and DOM storage enabled (as needed)

**Props:**
```typescript
interface InAppBrowserProps {
  url: string;           // URL to display
  onClose: () => void;   // Callback when user closes
  title?: string;        // Optional header title
}
```

**Security Settings:**
```html
<!-- Web iframe sandbox -->
<iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
```


## 3. Updated NotificationsScreen
**File:** [app/(tabs)/notifications.tsx]
**Changes:**
- Added `selectedNotification` state
- `onTap` callback on NotificationCard → sets selectedNotification
- Conditional rendering: shows detail when `selectedNotification !== null`
- `handleCloseDetail` callback clears selection
- NotificationCard component updated to use `onTap` instead of direct URL opening

**Updated Components:**
```typescript
// Before: NotificationCard directly opened URL
handlePress = async () => {
  if (safeUrl) {
    WebBrowser.openBrowserAsync(safeUrl);  // ❌ Leaves app
  }
}

// After: NotificationCard navigates to detail
handlePress = () => {
  onTap(item);  // ✅ Shows detail screen
}
```


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURE & FIELDS
# ═══════════════════════════════════════════════════════════════════════════════

**AppNotification Interface** [utils/notifications.ts]:
```typescript
export interface AppNotification {
  id: string;              // Unique notification ID
  title: string;           // Headline (displayed prominently)
  body: string;            // Full summary/content
  url: string;             // Direct URL (deprecated, use sourceUrl)
  sourceUrl?: string;      // ✅ Official source URL (validated)
  category: string;        // Category for color coding
  topic: string;           // Firebase topic
  state?: string;          // State filter (NSW, VIC, etc.)
  timestamp: string;       // ISO 8601 timestamp
  read: boolean;           // Read status
  userId?: string | null;  // Owner (null for broadcasts)
  anzsco?: string;         // Occupation code (if applicable)
  visaSubclass?: string;   // Visa subclass (if applicable)
  source?: string;         // Attribution source (e.g., "ABC News")
}
```

**Important Fields for UX:**
- `title` → Displayed as headline on detail screen
- `body` → Full summary/content in scrollable area
- `sourceUrl` → Used for "Read Official Source" button
- `source` → Attribution line ("Source: ABC News")
- `category` → Color-coded badge
- `timestamp` → Relative time display


# ═══════════════════════════════════════════════════════════════════════════════
# TESTING INSTRUCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

## Native Platform Testing (Recommended)
```bash
# Android
cd /home/moataz/work/migration-app/expo-app
npm run android

# iOS
npm run ios
```

**Test Flow:**
1. App launches → Navigate to Updates tab
2. See notification list with 8 test notifications
3. Tap any notification card
4. ✅ Detail screen appears (full headline, body, metadata)
5. Tap "Read Official Source" button
6. ✅ In-app browser opens with external URL
7. Tap X (close) button
8. ✅ Returns to detail screen
9. Tap back button
10. ✅ Returns to notification list


## Web Platform Testing
```bash
# Start dev server
cd /home/moataz/work/migration-app/expo-app
npm start -- --web

# Open http://localhost:8081
# Navigate to Updates tab
```

**Note:** Web platform has click detection limitations with React Native Web.
For testing, you may need to:
- Use browser dev tools to manually trigger click handlers
- Or test primarily on native platforms (more reliable)
- Or modify to use web-specific event handling if needed


# ═══════════════════════════════════════════════════════════════════════════════
# COMPLIANCE & CREDIBILITY
# ═══════════════════════════════════════════════════════════════════════════════

**Why This UX Flow Works:**

✅ **User Retention:** 
- Keeps users within the app ecosystem
- No external browser launches = higher engagement
- Smooth, in-app transitions = better UX

✅ **Credibility & Trust:**
- Source attribution always visible (e.g., "ABC News")
- Users can verify against official source directly
- Legal compliance: all content backed by official URLs
- No competitor links or questionable sources

✅ **App Store Compliance:**
- No external app launches (Apple/Google best practice)
- In-app browser usage is standard pattern
- Source validation prevents flagged content
- Maintains app ecosystem closure

**For App Store Submission:**
Include in privacy policy:
> "News and updates are sourced from official government bodies and media outlets. Users can review the original source via the in-app browser feature."


# ═══════════════════════════════════════════════════════════════════════════════
# FILES CREATED/MODIFIED
# ═══════════════════════════════════════════════════════════════════════════════

**New Files:**
1. `components/NotificationDetail.tsx` - Detail screen component
2. `components/InAppBrowser.tsx` - In-app browser component
3. This guide document

**Modified Files:**
1. `app/(tabs)/notifications.tsx`
   - Added `NotificationDetail` import
   - Added `selectedNotification` state
   - Added `handleNotificationTap` callback
   - Added `handleCloseDetail` callback
   - Conditional rendering for detail screen
   - Updated `NotificationCard` component signature
   - Updated `renderItem` to pass `onTap` prop

2. `utils/notifications.ts`
   - No changes (already has `sourceUrl` field)

3. `constants/theme.ts`
   - No changes (uses existing theme colors)


# ═══════════════════════════════════════════════════════════════════════════════
# FUTURE ENHANCEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

Potential improvements for Phase 2:
- [ ] Share notification to WhatsApp/email/social
- [ ] Save notification for offline reading
- [ ] Advanced in-app browser: zoom, print, text selection
- [ ] Notification history/archive
- [ ] Smart categorization and filtering
- [ ] Push notifications with deep links to detail
- [ ] Analytics tracking (which sources users read)
- [ ] Related/similar notifications recommendations

