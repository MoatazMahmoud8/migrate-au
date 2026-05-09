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

export async function initNotifications(subscribedStates: string[] = []) {
  try {
    // 1. Request permission
    const granted = await requestPermission();
    if (!granted) return false;

    // 2. Subscribe to global topics
    await subscribeGlobalTopics();

    // 3. Subscribe to state-specific topics the user chose
    await subscribeStateTopics(subscribedStates);

    // 4. Register foreground handler
    registerForegroundHandler();

    // 5. Handle notifications that opened the app (background tap)
    registerBackgroundOpenHandler();

    console.log('[notifications] ✅ Initialised');
    return true;
  } catch (err) {
    console.warn('[notifications] Init error:', err);
    return false;
  }
}

// ─── Permission ──────────────────────────────────────────────────────────────

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ requires POST_NOTIFICATIONS runtime permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[notifications] Permission denied (Android)');
      return false;
    }
    // Also request Firebase messaging permission
    await messaging().requestPermission();
    return true;
  }

  // iOS
  const authStatus = await messaging().requestPermission();
  const allowed = [
    messaging.AuthorizationStatus.AUTHORIZED,
    messaging.AuthorizationStatus.PROVISIONAL,
  ].includes(authStatus);

  if (!allowed) {
    console.warn('[notifications] Permission denied (iOS)');
    return false;
  }
  return true;
}

// ─── Topic subscriptions ─────────────────────────────────────────────────────

async function subscribeGlobalTopics() {
  await Promise.all(
    GLOBAL_TOPICS.map(topic => messaging().subscribeToTopic(topic))
  );
  console.log('[notifications] Subscribed to global topics:', GLOBAL_TOPICS);
}

export async function subscribeStateTopics(stateCodes: string[]) {
  const topics = stateCodes
    .map(code => STATE_TOPICS[code])
    .filter(Boolean);

  await Promise.all(topics.map(topic => messaging().subscribeToTopic(topic)));
  if (topics.length) {
    console.log('[notifications] Subscribed to state topics:', topics);
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
    handleNotificationNavigation(remoteMessage.data);
  });

  // App was quit and launched by tapping notification
  messaging().getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      handleNotificationNavigation(remoteMessage.data);
    }
  });
}

function handleNotificationNavigation(data?: Record<string, string>) {
  if (!data) return;
  // Future: use expo-router to navigate to relevant screen
  // e.g. if data.category === 'State Nomination' → navigate to states tab
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
}

/**
 * Subscribe to the real-time Firestore notification feed.
 * Returns an unsubscribe function.
 */
export function subscribeToFeed(
  onUpdate: (notifications: AppNotification[]) => void,
  limit = 30
): () => void {
  return firestore()
    .collection('notifications')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .onSnapshot(
      snapshot => {
        const items: AppNotification[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<AppNotification, 'id'>),
        }));
        onUpdate(items);
      },
      err => console.warn('[notifications] Feed error:', err)
    );
}

/** Mark a notification as read in Firestore */
export async function markAsRead(notificationId: string) {
  await firestore()
    .collection('notifications')
    .doc(notificationId)
    .update({ read: true });
}

/** Count unread notifications */
export async function getUnreadCount(): Promise<number> {
  const snap = await firestore()
    .collection('notifications')
    .where('read', '==', false)
    .get();
  return snap.size;
}
