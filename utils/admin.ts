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
  changeId?: string;
  draftCreated?: boolean;
  draftId?: string | null;
  alreadyApproved?: boolean;
  alreadyRejected?: boolean;
  appliedFeesCount?: number;
}

type AdminCallableName =
  | 'approveNotification'
  | 'rejectNotification'
  | 'editDraftNotification'
  | 'approveContentChange'
  | 'rejectContentChange';

async function callAdminFunction(
  name: AdminCallableName,
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
 * Get pending content changes (source items awaiting admin approval before
 * their linked notification draft can be published).
 */
export async function getPendingContentChanges(): Promise<any[]> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { getDocs: webGetDocs, query: webQuery, orderBy: webOrderBy } = await import('firebase/firestore');
    const q = webQuery(webCollection(webDb, 'pending_content_changes'), webOrderBy('createdAt', 'desc'));
    const snap = await webGetDocs(q);
    return snap.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((change: any) => change.status === 'pending' || !change.status);
  } else {
    const db = firestore();
    const snap = await db.collection('pending_content_changes').orderBy('createdAt', 'desc').get();
    return snap.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((change: any) => change.status === 'pending' || !change.status);
  }
}

/**
 * Approve a pending content change through the backend. This flips the change
 * status to `approved` and, for non fee changes, creates or unlocks the linked
 * notification draft so it can be published from the drafts queue.
 */
export async function approvePendingContentChange(changeId: string, notes?: string): Promise<CallableResult> {
  const result = await callAdminFunction('approveContentChange', {
    changeId,
    ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
  });
  if (!result.success) throw new Error(result.message || 'Content change approval failed');
  return result;
}

export async function rejectPendingContentChange(changeId: string, reason?: string): Promise<CallableResult> {
  const result = await callAdminFunction('rejectContentChange', {
    changeId,
    ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
  });
  if (!result.success) throw new Error(result.message || 'Content change rejection failed');
  return result;
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

/**
 * Get admin intel items (competitor site changes)
 */
export async function getAdminIntel(): Promise<any[]> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { getDocs: webGetDocs, query: webQuery, orderBy: webOrderBy, limit: webLimit } = await import('firebase/firestore');
    const q = webQuery(webCollection(webDb, 'admin_intel'), webOrderBy('detectedAt', 'desc'), webLimit(50));
    const snap = await webGetDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    const db = firestore();
    const snap = await db.collection('admin_intel').orderBy('detectedAt', 'desc').limit(50).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

/**
 * Mark intel item as reviewed
 */
export async function markIntelReviewed(intelId: string): Promise<void> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { updateDoc: webUpdateDoc } = await import('firebase/firestore');
    const docRef = webDoc(webCollection(webDb, 'admin_intel'), intelId);
    await webUpdateDoc(docRef, { status: 'reviewed', reviewedAt: new Date().toISOString() });
  } else {
    const db = firestore();
    await db.collection('admin_intel').doc(intelId).update({ 
      status: 'reviewed', 
      reviewedAt: new Date().toISOString() 
    });
  }
}

/**
 * Dismiss intel item
 */
export async function dismissIntel(intelId: string): Promise<void> {
  if (Platform.OS === 'web') {
    initializeFirebaseWeb();
    const webDb = getWebFirestore();
    const { updateDoc: webUpdateDoc } = await import('firebase/firestore');
    const docRef = webDoc(webCollection(webDb, 'admin_intel'), intelId);
    await webUpdateDoc(docRef, { status: 'dismissed', dismissedAt: new Date().toISOString() });
  } else {
    const db = firestore();
    await db.collection('admin_intel').doc(intelId).update({ 
      status: 'dismissed', 
      dismissedAt: new Date().toISOString() 
    });
  }
}

/**
 * Get processing times monitoring status
 */
export async function getProcessingTimesStatus(): Promise<{
  homeAffairs: { lastChecked: string | null; lastChanged: string | null; contentPreview: string };
  smartVisa: { lastChecked: string | null; lastChanged: string | null; contentPreview: string };
}> {
  const defaultStatus = {
    homeAffairs: { lastChecked: null, lastChanged: null, contentPreview: '' },
    smartVisa: { lastChecked: null, lastChanged: null, contentPreview: '' },
  };

  try {
    if (Platform.OS === 'web') {
      initializeFirebaseWeb();
      const webDb = getWebFirestore();
      const { getDoc: webGetDoc } = await import('firebase/firestore');
      
      const haRef = webDoc(webCollection(webDb, '_scraper_meta'), 'processing_times_global');
      const svRef = webDoc(webCollection(webDb, '_scraper_meta'), 'intel_smartvisa_processing');
      
      const [haSnap, svSnap] = await Promise.all([webGetDoc(haRef), webGetDoc(svRef)]);
      
      const haData = haSnap.exists() ? haSnap.data() : {};
      const svData = svSnap.exists() ? svSnap.data() : {};
      
      return {
        homeAffairs: {
          lastChecked: haData?.last_checked || null,
          lastChanged: haData?.last_changed || null,
          contentPreview: (haData?.content_preview || '').slice(0, 500),
        },
        smartVisa: {
          lastChecked: svData?.last_checked || null,
          lastChanged: svData?.last_changed || null,
          contentPreview: (svData?.content_preview || '').slice(0, 500),
        },
      };
    } else {
      const db = firestore();
      const [haSnap, svSnap] = await Promise.all([
        db.collection('_scraper_meta').doc('processing_times_global').get(),
        db.collection('_scraper_meta').doc('intel_smartvisa_processing').get(),
      ]);
      
      const haData = haSnap.exists() ? haSnap.data() : {};
      const svData = svSnap.exists() ? svSnap.data() : {};
      
      return {
        homeAffairs: {
          lastChecked: haData?.last_checked || null,
          lastChanged: haData?.last_changed || null,
          contentPreview: (haData?.content_preview || '').slice(0, 500),
        },
        smartVisa: {
          lastChecked: svData?.last_checked || null,
          lastChanged: svData?.last_changed || null,
          contentPreview: (svData?.content_preview || '').slice(0, 500),
        },
      };
    }
  } catch (err) {
    console.error('[admin] getProcessingTimesStatus error:', err);
    return defaultStatus;
  }
}
