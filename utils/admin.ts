/**
 * Admin utilities for MigrateAU
 * Handles admin authentication and permissions
 */

import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { isNotificationVisible } from './notificationVisibility';
import functions from '@react-native-firebase/functions';
import { initializeFirebaseWeb } from './firebaseWeb';
import {
  getFirestore as getWebFirestore,
  collection as webCollection,
  doc as webDoc,
  setDoc as webSetDoc,
} from 'firebase/firestore';
import {
  getFunctions as getWebFunctions,
  httpsCallable as webHttpsCallable,
} from 'firebase/functions';

/**
 * Check if user is an admin
 * @returns true if admin
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const user = auth().currentUser;
    if (!user) return false;
    const token = await user.getIdTokenResult(true);
    return token.claims.admin === true;
  } catch (err) {
    console.error('[admin] isUserAdmin error:', err);
    return false;
  }
}

interface CallableResult {
  success: boolean;
  message: string;
  notificationId?: string;
  alreadyPublished?: boolean;
  notification?: Record<string, unknown>;
}

async function callAdminFunction(
  name: 'approveNotification' | 'rejectNotification' | 'editDraftNotification',
  payload: Record<string, unknown>,
): Promise<CallableResult> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const callable = webHttpsCallable<Record<string, unknown>, CallableResult>(getWebFunctions(), name);
    const result = await callable(payload);
    return result.data;
  }

  const callable = functions().httpsCallable(name);
  const result = await callable(payload);
  return result.data as CallableResult;
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

/**
 * Save notification as draft (not visible to users yet)
 */
export async function saveDraft(notification: {
  title: string;
  body: string;
  category: string;
  source?: string;
  link?: string;
}): Promise<string> {
  const topic = notification.category.toLowerCase().replace(/\s+/g, '_');
  const notifId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const docData = {
    id: notifId,
    title: notification.title,
    body: notification.body,
    category: notification.category,
    topic,
    url: notification.link || '',
    timestamp: new Date().toISOString(),
    source: notification.source || 'Admin',
    status: 'draft',
  };

  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const docRef = webDoc(webCollection(webDb, 'notifications_draft'), notifId);
    await webSetDoc(docRef, docData);
  } else {
    const db = firestore();
    await db.collection('notifications_draft').doc(notifId).set(docData);
  }

  return notifId;
}

/** Approve a draft through the backend, which publishes, audits, and triggers FCM atomically. */
export async function approveDraft(draftId: string): Promise<string> {
  const result = await callAdminFunction('approveNotification', { notificationId: draftId });
  if (!result.success || !result.notificationId) throw new Error(result.message || 'Approval failed');
  return result.notificationId;
}

export async function rejectDraft(draftId: string, reason?: string): Promise<void> {
  const result = await callAdminFunction('rejectNotification', {
    notificationId: draftId,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  });
  if (!result.success) throw new Error(result.message || 'Rejection failed');
}

export async function editDraft(
  draftId: string,
  updates: { title: string; body: string; category: string },
): Promise<void> {
  const result = await callAdminFunction('editDraftNotification', {
    notificationId: draftId,
    title: updates.title,
    body: updates.body,
    category: updates.category,
  });
  if (!result.success) throw new Error(result.message || 'Edit failed');
}

/**
 * Delete a published notification (remove from all users)
 */
export async function deleteNotification(notifId: string): Promise<void> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { deleteDoc: webDeleteDoc } = await import('firebase/firestore');
    const docRef = webDoc(webCollection(webDb, 'notifications'), notifId);
    await webDeleteDoc(docRef);
  } else {
    const db = firestore();
    await db.collection('notifications').doc(notifId).delete();
  }
}

/**
 * Delete a draft notification
 */
export async function deleteDraft(draftId: string): Promise<void> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { deleteDoc: webDeleteDoc } = await import('firebase/firestore');
    const docRef = webDoc(webCollection(webDb, 'notifications_draft'), draftId);
    await webDeleteDoc(docRef);
  } else {
    const db = firestore();
    await db.collection('notifications_draft').doc(draftId).delete();
  }
}

/**
 * Get all draft notifications
 */
export async function getDrafts(): Promise<any[]> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { getDocs: webGetDocs, query: webQuery, orderBy: webOrderBy } = await import('firebase/firestore');
    const q = webQuery(webCollection(webDb, 'notifications_draft'), webOrderBy('timestamp', 'desc'));
    const snap = await webGetDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    const db = firestore();
    const snap = await db.collection('notifications_draft').orderBy('timestamp', 'desc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

/**
 * Get published notifications (for admin management)
 */
export async function getPublishedNotifications(): Promise<any[]> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { getDocs: webGetDocs, query: webQuery, orderBy: webOrderBy, limit: webLimit } = await import('firebase/firestore');
    const q = webQuery(webCollection(webDb, 'notifications'), webOrderBy('timestamp', 'desc'), webLimit(30));
    const snap = await webGetDocs(q);
    return snap.docs
      .filter(doc => isNotificationVisible(doc.data()))
      .map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    const db = firestore();
    const snap = await db.collection('notifications').orderBy('timestamp', 'desc').limit(30).get();
    return snap.docs
      .filter(doc => isNotificationVisible(doc.data()))
      .map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
