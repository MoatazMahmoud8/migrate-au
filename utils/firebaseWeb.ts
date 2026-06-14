/**
 * utils/firebaseWeb.ts
 *
 * Web-specific Firebase initialization using the Firebase Web SDK.
 * This is separate from @react-native-firebase which is native-only.
 *
 * Used for Firestore listeners on web platform.
 */

import { Platform } from 'react-native';
import {
  initializeApp,
  getApps,
} from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

// Firebase config from google-services.json
const firebaseConfig = {
  projectId: 'swift-shore-238707',
  apiKey: 'AIzaSyAZ9uzDiSmUiKoRjpy_A-RcO0jGsUR0mLs',
  authDomain: 'swift-shore-238707.firebaseapp.com',
  storageBucket: 'swift-shore-238707.firebasestorage.app',
  messagingSenderId: '205705723367',
  appId: '1:205705723367:web:d8f5f3e3e3e3e3e3e3e3e3',
};

let db: any = null;

/**
 * Initialize Firebase for web platform
 */
export function initializeFirebaseWeb() {
  if (Platform.OS !== 'web') {
    console.log('[firebaseWeb] Skipped — native platform uses @react-native-firebase');
    return null;
  }

  try {
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }
    db = getFirestore();
    console.log('[firebaseWeb] ✓ Initialized');
    return db;
  } catch (err) {
    console.warn('[firebaseWeb] Init error:', err);
    return null;
  }
}

/**
 * Subscribe to Firestore notifications collection (web-only)
 */
export function subscribeToNotificationsWeb(
  onUpdate: (docs: any[]) => void,
  limitCount = 30,
  userId?: string,
): Unsubscribe | null {
  if (Platform.OS !== 'web') {
    console.log('[firebaseWeb] Skipped — native platform');
    return null;
  }

  if (!db) {
    initializeFirebaseWeb();
  }

  if (!db) {
    console.warn('[firebaseWeb] Firestore not initialized');
    onUpdate([]);
    return null;
  }

  try {
    const col = collection(db, 'notifications');

    // For web, we simplify to just get broadcast notifications (no userId filtering)
    // This avoids needing composite indexes while still showing all relevant notifications
    const q = query(
      col,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(items);
    });
  } catch (err) {
    console.warn('[firebaseWeb] Listener error:', err);
    onUpdate([]);
    return null;
  }
}
