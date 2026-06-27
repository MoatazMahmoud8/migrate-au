/**
 * notifications.ts
 *
 * Handles everything notification-related for MigrateAU:
 *  - Requesting permission
 *  - Registering the FCM token with Firebase
 *  - Subscribing to FCM topics (migration + states user cares about)
 *  - Foreground notification handler
 *  - Background/tap notification handler
 *  - Firestore-based in-app notification feed
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import app from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWatchlistDevice } from './watchlist';

// Verify Firebase is initialized
if (Platform.OS !== 'web') {
  try {
    const currentApp = app.app();
    console.log('[notifications] Firebase app is initialized:', currentApp?.name);
  } catch (err) {
    console.warn('[notifications] Firebase not yet initialized, will be auto-initialized on first use');
  }
}

// ─── FCM Topics ──────────────────────────────────────────────────────────────

/** Always-subscribed global topics */
const GLOBAL_TOPICS = [
  'au_migration',      // Home Affairs policy / visa changes
  'skillselect',       // SkillSelect invitation rounds
  'anzsco',            // Occupation list changes
  'processing_times',  // Processing time updates
];

/** One topic per state/territory */
export const STATE_TOPICS: Record<string, string> = {
  NSW: 'state_NSW',
  VIC: 'state_VIC',
  QLD: 'state_QLD',
  WA:  'state_WA',
  SA:  'state_SA',
  TAS: 'state_TAS',
  ACT: 'state_ACT',
  NT:  'state_NT',
};

// ─── Notification display behaviour ──────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Initialisation (call once on app start) ─────────────────────────────────

export async function initNotifications(subscribedStates: string[] = [], userId?: string) {
  // Native-only: @react-native-firebase/messaging has no web implementation.
  if (Platform.OS === 'web') {
    console.log('[notifications] skipped on web');
    return false;
  }
  try {
    console.log('[notifications] 🚀 Starting initialization...');
    
    // 1. Request permission
    const granted = await requestPermission();
    if (!granted) {
      console.warn('[notifications] ⚠️  Permission not granted - notifications disabled');
      return false;
    }
    console.log('[notifications] ✅ Permission granted');

    // 2. Subscribe to global topics
    await subscribeGlobalTopics();
    console.log('[notifications] ✅ Global topics subscribed');

    // 3. Subscribe to state-specific topics the user chose
    await subscribeStateTopics(subscribedStates);
    console.log('[notifications] ✅ State topics subscribed:', subscribedStates);

    // 4. Register foreground handler
    registerForegroundHandler();
    console.log('[notifications] ✅ Foreground handler registered');

    // 5. Handle notifications that opened the app (background tap)
    registerBackgroundOpenHandler();
    console.log('[notifications] ✅ Background handler registered');

    // 6. Register this device's FCM token against the user's watchlist doc
    //    so the backend can push targeted occupation alerts.
    if (userId) {
      try {
        console.log('[notifications] 📡 Getting FCM token...');
        const token = await messaging().getToken();
        if (token) {
          console.log('[notifications] ✅ FCM token obtained:', token.substring(0, 20) + '...');
          await registerWatchlistDevice(userId, token);
          console.log('[notifications] ✅ Watchlist device registered for userId:', userId);
        } else {
          console.warn('[notifications] ⚠️  FCM token is null/empty - device may not be registered');
        }
      } catch (e) {
        console.warn('[notifications] ⚠️  FCM token registration failed:', e);
      }
    } else {
      console.log('[notifications] ℹ️  No userId provided - skipping watchlist device registration');
    }

    console.log('[notifications] ✅ Initialised successfully');
    return true;
  } catch (err) {
    console.error('[notifications] ❌ Init error:', err);
    return false;
  }
}

// ─── Permission ──────────────────────────────────────────────────────────────

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    console.log('[notifications] Requesting Android permissions...');
    // Android 13+ requires POST_NOTIFICATIONS runtime permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[notifications] ❌ Android permission denied - status:', status);
      return false;
    }
    console.log('[notifications] ✅ Android permissions granted');
    
    // Also request Firebase messaging permission
    try {
      const authStatus = await messaging().requestPermission();
      console.log('[notifications] ✅ Firebase messaging permission - status:', authStatus);
      return true;
    } catch (e) {
      console.warn('[notifications] ⚠️  Firebase messaging permission request failed:', e);
      // Still return true since expo-notifications permission was granted
      return true;
    }
  }

  // iOS
  console.log('[notifications] Requesting iOS permissions...');
  try {
    const authStatus = await messaging().requestPermission();
    console.log('[notifications] iOS permission status:', authStatus);
    
    const allowed = authStatus === messaging.AuthorizationStatus.AUTHORIZED || 
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!allowed) {
      console.warn('[notifications] ❌ iOS permission denied - status:', authStatus);
      return false;
    }
    
    console.log('[notifications] ✅ iOS permissions granted');
    return true;
  } catch (e) {
    console.warn('[notifications] ⚠️  iOS Firebase permission request failed:', e);
    // Don't crash - allow app to continue
    return false;
  }
}

// ─── Topic subscriptions ─────────────────────────────────────────────────────

async function subscribeGlobalTopics() {
  console.log('[notifications] 📌 Subscribing to global topics:', GLOBAL_TOPICS);
  const results = await Promise.allSettled(
    GLOBAL_TOPICS.map(async (topic) => {
      try {
        await messaging().subscribeToTopic(topic);
        console.log('[notifications] ✅ Subscribed to topic:', topic);
        return { topic, success: true };
      } catch (e) {
        console.error('[notifications] ❌ Failed to subscribe to topic:', topic, e);
        return { topic, success: false, error: e };
      }
    })
  );
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
  if (failed.length > 0) {
    console.warn('[notifications] ⚠️  Some global topics failed:', failed);
  }
}

export async function subscribeStateTopics(stateCodes: string[]) {
  const topics = stateCodes
    .map(code => STATE_TOPICS[code])
    .filter(Boolean);

  if (topics.length === 0) {
    console.log('[notifications] ℹ️  No state topics to subscribe to');
    return;
  }

  console.log('[notifications] 📌 Subscribing to state topics:', topics);
  const results = await Promise.allSettled(
    topics.map(async (topic) => {
      try {
        await messaging().subscribeToTopic(topic);
        console.log('[notifications] ✅ Subscribed to state topic:', topic);
        return { topic, success: true };
      } catch (e) {
        console.error('[notifications] ❌ Failed to subscribe to state topic:', topic, e);
        return { topic, success: false, error: e };
      }
    })
  );
  
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
  if (failed.length > 0) {
    console.warn('[notifications] ⚠️  Some state topics failed:', failed);
  } else {
    console.log('[notifications] ✅ All state topics subscribed');
  }
}

export async function unsubscribeStateTopics(stateCodes: string[]) {
  const topics = stateCodes
    .map(code => STATE_TOPICS[code])
    .filter(Boolean);

  await Promise.all(topics.map(topic => messaging().unsubscribeFromTopic(topic)));
}

// ─── Foreground handler ───────────────────────────────────────────────────────

function registerForegroundHandler() {
  // Firebase message arrives while app is in foreground
  messaging().onMessage(async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (!notification?.title) return;

    // Show a local notification (Firebase doesn't auto-display in foreground)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body ?? '',
        data: data ?? {},
        sound: 'default',
      },
      trigger: null, // show immediately
    });
  });
}

// ─── Background / quit tap handler ───────────────────────────────────────────

function registerBackgroundOpenHandler() {
  // App was in background and user tapped the notification
  messaging().onNotificationOpenedApp((remoteMessage) => {
    handleNotificationNavigation(remoteMessage.data as Record<string, string> | undefined);
  });

  // App was quit and launched by tapping notification
  messaging().getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      handleNotificationNavigation(remoteMessage.data as Record<string, string> | undefined);
    }
  });
}

function handleNotificationNavigation(data?: Record<string, string>) {
  if (!data) return;
  try {
    const route = (data as any).route as string | undefined;
    if (route) {
      // Lazy import to avoid circular deps at module load
      const { router } = require('expo-router');
      router.push(route);
      return;
    }
  } catch (e) {
    console.warn('[notifications] navigation failed:', e);
  }
  console.log('[notifications] Opened from notification:', data);
}

// ─── Firestore in-app feed ────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  category: string;
  topic: string;
  state?: string;
  timestamp: string;
  read: boolean;
  /** Owning user (RC user id) — null for broadcasts, set for watchlist hits. */
  userId?: string | null;
  /** Watchlist hits also carry the matched occupation for UI labelling. */
  anzsco?: string;
  visaSubclass?: string;
  /** Source attribution: government body, media outlet, or AMG analysis */
  source?: string;
  /** Source URL - only official sources, no competitor links */
  sourceUrl?: string;
}

/**
 * Subscribe to the real-time Firestore notification feed.
 *
 * If `userId` is supplied, the listener merges two streams:
 *   1. broadcast notifications (userId == null)
 *   2. personal watchlist notifications (userId == <this user>)
 *
 * If `userId` is omitted, the legacy "everything" stream is returned (kept
 * for callers that only need the global feed, e.g. badge counts).
 *
 * Returns an unsubscribe function.
 */
export function subscribeToFeed(
  onUpdate: (notifications: AppNotification[]) => void,
  limit = 30,
  userId?: string,
): () => void {
  // Native-only: @react-native-firebase/firestore has no web implementation.
  if (Platform.OS === 'web') {
    console.log('[subscribeToFeed] Skipping on web platform');
    onUpdate([]);
    return () => {};
  }

  console.log('[subscribeToFeed] ==========================================');
  console.log('[subscribeToFeed] Starting subscription setup - userId:', userId);
  console.log('[subscribeToFeed] Platform:', Platform.OS);
  console.log('[subscribeToFeed] Time:', new Date().toISOString());
  
  let unsubscribed = false;
  let testQueryCompleted = false;
  let testQueryTimeout: NodeJS.Timeout | null = null;

  try {
    // Get Firestore instance
    const fs = firestore();
    console.log('[subscribeToFeed] ✅ Firestore instance obtained - Type:', typeof fs);

    // Get collection reference
    const col = fs.collection('notifications');
    console.log('[subscribeToFeed] ✅ Collection reference created');

    // Test: First do a simple get() to verify access works
    const testQueryStart = Date.now();
    console.log('[subscribeToFeed] 🧪 Starting test query...');
    
    // Set a timeout for the test query
    testQueryTimeout = setTimeout(() => {
      if (!testQueryCompleted && !unsubscribed) {
        console.warn('[subscribeToFeed] 🧪 Test query timeout (30s) - query may be hanging');
      }
    }, 30000);

    col.limit(1).get()
      .then(snap => {
        testQueryCompleted = true;
        if (testQueryTimeout) clearTimeout(testQueryTimeout);
        const elapsed = Date.now() - testQueryStart;
        
        if (!unsubscribed) {
          console.log(`[subscribeToFeed] 🧪 Test query returned: ${snap.size} documents (${elapsed}ms)`);
        }
      })
      .catch(err => {
        testQueryCompleted = true;
        if (testQueryTimeout) clearTimeout(testQueryTimeout);
        const elapsed = Date.now() - testQueryStart;
        
        console.error(`[subscribeToFeed] 🧪 Test query FAILED after ${elapsed}ms:`, err instanceof Error ? err.message : err);
        if (err instanceof Error && err.stack) {
          console.error('[subscribeToFeed] Stack:', err.stack);
        }
      });

    // ── Path 1: no userId — return everything
    if (!userId) {
      console.log('[subscribeToFeed] Setting up Path 1 listener (no userId)');
      const unsubListener = col
        .limit(limit * 2)
        .onSnapshot(
          async snapshot => {
            if (unsubscribed) {
              console.log('[subscribeToFeed] Ignoring snapshot (already unsubscribed)');
              return;
            }
            try {
              console.log('[subscribeToFeed] 📬 Snapshot received:', snapshot.docs.length, 'docs');
              const readIds = await getReadIds();
              const items: AppNotification[] = snapshot.docs
                .map(doc => {
                  const data = doc.data() as Omit<AppNotification, 'id'>;
                  // Convert Firestore Timestamp to ISO string if needed
                  const timestamp = data.timestamp;
                  const isoTimestamp = typeof timestamp === 'string' ? timestamp : (timestamp?.toDate?.().toISOString() || '');
                  return { id: doc.id, ...data, timestamp: isoTimestamp, read: readIds.has(doc.id) };
                })
                .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
                .slice(0, limit);
              
              console.log('[subscribeToFeed] 📤 Calling onUpdate with', items.length, 'items');
              onUpdate(items);
            } catch (err) {
              console.error('[subscribeToFeed] Error processing snapshot:', err);
            }
          },
          err => {
            if (unsubscribed) return;
            console.error('[subscribeToFeed] ❌ Snapshot error:', err);
          }
        );
      
      console.log('[subscribeToFeed] ✅ Listener attached successfully');
      return () => {
        console.log('[subscribeToFeed] Unsubscribing from Path 1');
        unsubscribed = true;
        unsubListener();
      };
    }

    // ── Path 2: with userId — merge broadcast + personal
    console.log('[subscribeToFeed] Setting up Path 2 listener (with userId)');
    let broadcasts: AppNotification[] = [];
    let personal: AppNotification[] = [];

    const emit = () => {
      try {
        const merged = [...broadcasts, ...personal]
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
          .slice(0, limit);
        console.log('[subscribeToFeed] 📤 Emitting merged:', merged.length, 'items (broadcasts:', broadcasts.length, 'personal:', personal.length + ')');
        onUpdate(merged);
      } catch (err) {
        console.error('[subscribeToFeed] Error in emit:', err);
      }
    };

    const unsub1 = col
      .where('userId', '==', null)
      .limit(limit * 2)
      .onSnapshot(
        snap => {
          if (unsubscribed) return;
          try {
            console.log('[subscribeToFeed] Broadcast snapshot:', snap.docs.length, 'docs');
            broadcasts = snap.docs
              .map(d => {
                const data = d.data() as Omit<AppNotification, 'id'>;
                const timestamp = data.timestamp;
                const isoTimestamp = typeof timestamp === 'string' ? timestamp : (timestamp?.toDate?.().toISOString() || '');
                return { id: d.id, ...data, timestamp: isoTimestamp };
              })
              .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            emit();
          } catch (err) {
            console.error('[subscribeToFeed] Error processing broadcast:', err);
          }
        },
        err => {
          if (unsubscribed) return;
          console.error('[subscribeToFeed] Broadcast listener error:', err);
        }
      );

    const unsub2 = col
      .where('userId', '==', userId)
      .limit(limit * 2)
      .onSnapshot(
        snap => {
          if (unsubscribed) return;
          try {
            console.log('[subscribeToFeed] Personal snapshot:', snap.docs.length, 'docs');
            personal = snap.docs
              .map(d => {
                const data = d.data() as Omit<AppNotification, 'id'>;
                const timestamp = data.timestamp;
                const isoTimestamp = typeof timestamp === 'string' ? timestamp : (timestamp?.toDate?.().toISOString() || '');
                return { id: d.id, ...data, timestamp: isoTimestamp };
              })
              .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            emit();
          } catch (err) {
            console.error('[subscribeToFeed] Error processing personal:', err);
          }
        },
        err => {
          if (unsubscribed) return;
          console.error('[subscribeToFeed] Personal listener error:', err);
        }
      );

    console.log('[subscribeToFeed] ✅ Both listeners attached successfully');
    return () => {
      console.log('[subscribeToFeed] Unsubscribing from Path 2');
      unsubscribed = true;
      unsub1();
      unsub2();
    };
  } catch (err) {
    console.error('[subscribeToFeed] ❌ FATAL ERROR:', err);
    if (err instanceof Error) {
      console.error('[subscribeToFeed] Message:', err.message);
      console.error('[subscribeToFeed] Stack:', err.stack);
    }
    onUpdate([]);
    return () => {};
  }
}

const READ_IDS_KEY = '@migrate_au_read_notification_ids';

/** Get locally stored read notification IDs */
export async function getReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** Mark a notification as read (local storage) */
export async function markAsRead(notificationId: string) {
  try {
    const readIds = await getReadIds();
    readIds.add(notificationId);
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...readIds]));
  } catch {
    // ignore storage errors
  }
}

/** Count unread notifications */
export async function getUnreadCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const readIds = await getReadIds();
  const snap = await firestore()
    .collection('notifications')
    .limit(30)
    .get();
  return snap.docs.filter(doc => !readIds.has(doc.id)).length;
}
