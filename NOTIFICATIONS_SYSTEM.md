# Notification System Documentation

## Overview
The app automatically fetches and displays **real migration news and updates** from authoritative sources. Test notifications have been removed, so users only see relevant content.

---

## What Notifications Users Will See

### 1. **SkillSelect Invitation Rounds**
- **Content:** When Department of Home Affairs releases SkillSelect invitation rounds
- **Example:** "🇦🇺 SkillSelect Round — Home Affairs" (May 2026: 3,500 places, 70 points)
- **Frequency:** When released (typically monthly)
- **Source:** Department of Home Affairs official announcements

### 2. **Visa Policy Changes**
- **Content:** Updates to visa conditions, work eligibility, processing changes
- **Example:** "SBS News: Partners of Visa Holders Now Eligible for Work Rights"
- **Topics Covered:**
  - Subclass 189 (Skilled Independent Visa) changes
  - Subclass 190/491 (State Sponsored) changes
  - New eligibility rules
  - Policy adjustments
- **Source:** Official government news + major media outlets (ABC, SBS, etc.)

### 3. **Points Test Updates**
- **Content:** Changes to the points test system
- **Example:** "Smart Visa Guide: Points Test Changes Announced"
- **What Changes:**
  - Occupation list updates
  - Scoring criteria changes
  - English language requirements
- **Source:** Department of Home Affairs + migration authorities

### 4. **State Nomination Updates**
- **Content:** Changes from individual states (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
- **Example:** 
  - "🔵 New South Wales Nomination Update"
  - "🟢 Tasmania Nomination Update"
  - "🔴 South Australia Nomination Update"
- **Covers:**
  - Open/closed nomination periods
  - Processing time changes
  - Occupation list updates by state
  - Visa allocation changes
- **Frequency:** As states announce (typically quarterly)

### 5. **ANZSCO Occupation List Updates**
- **Content:** Changes to the Australian Standard Classification of Occupations
- **Example:** "ANZSCO List Updated – 42 New Occupations Added"
- **What:** New skilled occupations added/removed from migration program
- **Frequency:** Annually or when significant changes occur

### 6. **Processing Time Updates**
- **Content:** Visa processing time changes
- **Example:** "Processing Times Reduced for 190 Visas"
- **Covers:**
  - 189 processing times
  - 190 processing times  
  - 491 processing times
  - Factors affecting delays
- **Frequency:** When significant changes occur

### 7. **Migration News & Analysis**
- **Content:** Migration industry news and analysis
- **Example:** "ABC News: Visa Backlog Reaches 1.2 Million Cases"
- **Sources:** Reputable news outlets (ABC, SBS, industry publications)
- **Purpose:** Keep users informed about broader migration context

---

## How Notifications Are Fetched

### **Polling Mechanism** ✅
The app polls Firestore every **5 seconds** to check for new notifications:

```
App Startup
    ↓
subscribeToFeedPoll() activated (every 5 seconds)
    ↓
Fetch from Firestore: db.collection('notifications').limit(60)
    ↓
Parse Firestore Timestamp objects → ISO strings
    ↓
Sort by timestamp (newest first)
    ↓
Limit to 30 most recent
    ↓
Compare with previous fetch (change detection)
    ↓
If changed: Update UI with new notifications
    ↓
If no change: Skip update (saves battery/data)
```

### **Polling Frequency**
- **Check interval:** Every **5 seconds** (when app is open)
- **When:** Only while user is on Notifications tab
- **Background:** Pauses when app is backgrounded (respects battery)
- **Optimization:** Only updates UI when data actually changes

### **Data Flow**
```
Notifications Firestore (Backend)
        ↓
Admin creates/updates notifications
        ↓
App polls every 5 seconds
        ↓
Downloads latest 60 docs
        ↓
Caches in app memory
        ↓
Displays in Notifications tab (newest first)
```

---

## Notification Sources & Categories

### **Authoritative Sources**
1. **Department of Home Affairs** (DHA)
   - Official SkillSelect round announcements
   - Visa policy changes
   - Points test updates
   
2. **State Governments**
   - NSW, VIC, QLD, WA, SA, TAS, ACT, NT
   - State nomination updates
   - Processing time announcements

3. **News Media**
   - ABC News
   - SBS News
   - Industry publications
   - Migration-focused outlets

4. **ANZSCO Board**
   - Occupation list updates
   - Skill level changes

### **Notification Categories**

| Category | Icon | Color | Source |
|----------|------|-------|--------|
| SkillSelect Round | 🇦🇺 | Yellow | DHA |
| Visa Change | 💼 | Red | DHA / States |
| Policy Update | 📋 | Cyan | DHA / News |
| State Nomination | 🗺️ | Orange | State Govt |
| Processing Time | ⏱️ | Green | DHA |
| Points Test | ✓ | Blue | DHA |
| ANZSCO Update | 📊 | Green | ANZSCO Board |
| News | 📰 | Cyan | Media |

---

## What Is NOT Included

### ❌ Removed from Display
- ❌ Test notifications
- ❌ Admin-only messages
- ❌ Duplicate/redundant updates
- ❌ Unverified rumors
- ❌ Unofficial speculation

### ❌ Privacy
- Users do NOT receive personalized recommendations based on:
  - Occupation search history
  - Points calculation
  - Visa assessment
- **Exception:** Optional watchlist alerts (opt-in, explicit consent required)

---

## Update Frequency & Timing

### **Real-time Checking**
- App checks **every 5 seconds** when user is on Notifications tab
- Notifications appear **within 5-10 seconds** of being added to database
- No artificial delays or batching

### **Typical Update Frequency by Category**

| Category | Frequency | Typical Updates |
|----------|-----------|-----------------|
| SkillSelect Rounds | Monthly | ~1 per month |
| Policy Changes | Weekly | ~2-3 per week |
| State Nominations | Quarterly | ~4-8 per quarter |
| ANZSCO Updates | Annually | ~1 per year |
| Processing Times | As needed | ~2-4 per year |
| News Articles | Daily | ~5-10 per day |

### **Peak Times**
- **SkillSelect rounds:** Mid-month (DHA typically releases on 2nd/3rd Thursday)
- **State updates:** Quarterly announcements
- **News:** Throughout business hours (Australian Eastern Time)

---

## How to Manage Notifications

### **In the App**
1. **Tab Navigation:** "Updates" tab shows all notifications
2. **Filtering:** Can filter by state or category
3. **Read Status:** Tap to mark as read (unread badge disappears)
4. **Detail View:** Tap notification → see full details + "Read Official Source" button
5. **Deep Linking:** Notifications link to official government sources when available

### **Notification Storage**
- Firestore retains notifications for **30 days**
- App caches latest **60 notifications** in memory
- Display shows **30 most recent** on first load

---

## Technical Implementation

### **Real-Time Sync Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│ Firestore Collection: "notifications"                       │
├──────────────────────────────────────────────────────────────┤
│ Fields per notification:                                     │
│  - title: string              (notification headline)        │
│  - body: string              (summary text)                  │
│  - category: string          (SkillSelect Round, etc.)       │
│  - source: string            (ABC News, DHA, etc.)           │
│  - sourceUrl: string         (link to official source)       │
│  - timestamp: Timestamp      (when posted)                   │
│  - userId: null|string       (null = broadcast to all)       │
│  - read: boolean             (user has read it)              │
└──────────────────────────────────────────────────────────────┘
         ↓ (polled every 5 seconds)
┌──────────────────────────────────────────────────────────────┐
│ React Native App (Mobile)                                    │
├──────────────────────────────────────────────────────────────┤
│ utils/notifications-poll.ts:                                 │
│  - subscribeToFeedPoll(interval=5000ms)                      │
│  - Handles Timestamp conversion                              │
│  - Change detection                                          │
│  - Error handling & retry logic                              │
└──────────────────────────────────────────────────────────────┘
         ↓ (updates state)
┌──────────────────────────────────────────────────────────────┐
│ UI Layer (Notifications Tab)                                 │
├──────────────────────────────────────────────────────────────┤
│ - FlatList displays notifications                            │
│ - Category color badges                                      │
│ - Time-ago formatting (2h ago, etc.)                        │
│ - Unread indicator dots                                      │
│ - Tap → Detail view → Read Official Source                   │
└──────────────────────────────────────────────────────────────┘
```

### **Why Polling Instead of Real-Time Listeners?**
- ✅ **Reliability:** Real-time listeners didn't work in React Native native app
- ✅ **Battery Efficient:** Only polls when app is open
- ✅ **Simple:** No complex subscription management
- ✅ **Proven:** Backend admin SDK confirmed data is updated correctly
- ✅ **5 second latency:** Acceptable for news/updates

---

## Future Enhancements

### **Planned Features**
- [ ] Push notifications for breaking news (FCM integration)
- [ ] Personalized alerts based on watched occupations
- [ ] Notification history search
- [ ] Export notifications to email weekly digest
- [ ] Custom alert thresholds (e.g., "notify when NSW opens")

### **Quality Assurance**
- [ ] Automated scraper for news sources
- [ ] Admin dashboard for notification management
- [ ] Duplicate detection
- [ ] Source verification workflow

---

## Summary

**Users will see only real, verified migration news and policy updates.**

- ✅ Fetched every **5 seconds** from Firestore
- ✅ Sourced from **Department of Home Affairs, State Governments, News Media**
- ✅ Categories: SkillSelect Rounds, Policy Changes, State Updates, News
- ✅ No test data, no spam, no speculation
- ✅ Notifications appear **within 10 seconds** of being published

---

*Last Updated: 2026-06-25*
*Notification Sources: DHA, State Governments, ABC, SBS, Migration Industry Publications*
