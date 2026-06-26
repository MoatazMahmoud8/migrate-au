/**
 * Admin utilities for MigrateAU
 * Handles admin authentication and permissions
 */

import { getRevenueCatUserId } from './iap';
import { getFirestore } from '@react-native-firebase/firestore';

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
    const uid = userId || (await getRevenueCatUserId().catch(() => undefined));
    if (!uid) return false;

    // Check local admin list
    if (ADMIN_USER_IDS.includes(uid)) return true;

    // Check Firestore admin list
    try {
      const db = getFirestore();
      const adminDoc = await db.collection('admin_users').doc(uid).get();
      return adminDoc.exists && adminDoc.data()?.isAdmin === true;
    } catch {
      // Firestore not available (offline), use local list only
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
    const db = getFirestore();
    const newRef = db.collection('notifications').doc();
    
    await newRef.set({
      id: newRef.id,
      ...notification,
      timestamp: new Date().toISOString(),
      read: false,
      createdAt: new Date(),
      createdBy: await getRevenueCatUserId().catch(() => 'admin'),
    });

    return newRef.id;
  } catch (err) {
    console.error('[admin] createNotification error:', err);
    throw err;
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
