/**
 * Admin utilities for MigrateAU
 * Handles admin authentication and permissions
 */

import { Platform } from 'react-native';
import { getRevenueCatUserId } from './iap';
import { getFirestore } from '@react-native-firebase/firestore';
import { initializeFirebaseWeb } from './firebaseWeb';
import {
  getFirestore as getWebFirestore,
  collection as webCollection,
  doc as webDoc,
  setDoc as webSetDoc,
  getDoc as webGetDoc,
} from 'firebase/firestore';

// Admin user IDs (can be set via environment or Firestore)
const ADMIN_USER_IDS = [
  'moataz', // Test admin
  'admin@migrateAU.app',
];

/**
 * Check if user is an admin
 * @param userId - RevenueCat user ID or email
 * @returns true if admin
 */
export async function isUserAdmin(userId?: string): Promise<boolean> {
  try {
    // If no userId provided, get from RevenueCat
    let uid = userId || (await getRevenueCatUserId().catch(() => undefined));
    
    console.log('[admin] isUserAdmin check - uid:', uid, 'DEV:', __DEV__);
    
    // DEV MODE: If no user ID or 'anonymous', default to 'moataz'
    // (RevenueCat returns 'anonymous' on web when not initialized)
    if ((!uid || uid === 'anonymous') && __DEV__) {
      console.log('[admin] Using dev mode fallback');
      uid = 'moataz';
    }
    
    if (!uid) {
      console.log('[admin] No user ID after checks');
      return false;
    }

    // Check local admin list
    if (ADMIN_USER_IDS.includes(uid)) {
      console.log('[admin] User found in ADMIN_USER_IDS:', uid);
      return true;
    }

    // Check Firestore admin list
    try {
      const db = getFirestore();
      const adminDoc = await db.collection('admin_users').doc(uid).get();
      const result = adminDoc.exists && adminDoc.data()?.isAdmin === true;
      console.log('[admin] Firestore check result:', result);
      return result;
    } catch (err) {
      // Firestore not available (offline), use local list only
      console.error('[admin] Firestore check error:', err);
      return false;
    }
  } catch (err) {
    console.error('[admin] isUserAdmin error:', err);
    return false;
  }
}

/**
 * Create a notification in Firestore
 * @param notification - Notification object to create
 * @returns notification ID
 */
export async function createNotification(notification: {
  title: string;
  body: string;
  category: string;
  source?: string;
  imageUrl?: string;
  link?: string;
}): Promise<string> {
  try {
    console.log('[admin] createNotification called with:', {
      title: notification.title?.substring(0, 50),
      body: notification.body?.substring(0, 50),
      category: notification.category,
      platform: Platform.OS,
    });

    // Map category to topic (required field)
    const topic = notification.category.toLowerCase().replace(/\s+/g, '_');
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const docData = {
      id: notifId,
      title: notification.title,
      body: notification.body,
      category: notification.category,
      topic: topic,
      url: notification.link || 'https://migrateau.jsmglobal.xyz',
      timestamp: new Date().toISOString(),
      read: false,
      source: notification.source || 'Admin',
      sourceUrl: notification.link || '',
    };

    if (Platform.OS === 'web') {
      // Use Firebase Web SDK on web platform
      console.log('[admin] Using Firebase Web SDK');
      initializeFirebaseWeb();
      const webDb = getWebFirestore();
      const docRef = webDoc(webCollection(webDb, 'notifications'), notifId);
      await webSetDoc(docRef, docData);
      console.log('[admin] ✅ Web: Notification created:', notifId);
    } else {
      // Use native Firebase on mobile
      console.log('[admin] Using native Firebase');
      const db = getFirestore();
      const newRef = db.collection('notifications').doc(notifId);
      await newRef.set(docData);
      console.log('[admin] ✅ Native: Notification created:', notifId);
    }

    return notifId;
  } catch (err: any) {
    console.error('[admin] createNotification failed:', {
      message: err?.message,
      code: err?.code,
    });
    throw new Error(`Failed to create notification: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Get notification categories
 */
export const NOTIFICATION_CATEGORIES = [
  'SkillSelect Round',
  'Policy Update',
  'Visa Change',
  'State Nomination',
  'Processing Time',
  'Points Test',
  'ANZSCO Occupation List',
  'News',
  'Government Update',
];

/**
 * Validate notification
 */
export function validateNotification(notif: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!notif.title?.trim()) errors.push('Title is required');
  if (!notif.body?.trim()) errors.push('Body is required');
  if (!notif.category) errors.push('Category is required');

  if (notif.title?.length > 100) errors.push('Title must be under 100 characters');
  if (notif.body?.length > 500) errors.push('Body must be under 500 characters');

  return {
    valid: errors.length === 0,
    errors,
  };
}
