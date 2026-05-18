/**
 * utils/watchlist.ts
 *
 * Personalised occupation watchlists (Pro feature).
 *
 * Lets a Pro user say:
 *   "Notify me as soon as a SkillSelect round invites my occupation (261313)
 *    for subclass 189 at or below 75 points."
 *
 * Data shape (Firestore):
 *   watchlists/{userId}                            -> { fcmToken, updatedAt }
 *   watchlists/{userId}/items/{itemId}             -> WatchlistItem
 *
 *   userId  = RevenueCat anonymous app user ID (stable per install)
 *   itemId  = `${anzsco}_${visaSubclass}` for natural de-dup
 *
 * Why this shape:
 *   - Subcollection keeps per-user data isolated for security rules later.
 *   - Top-level doc carries the device FCM token so the backend dispatcher
 *     can push directly without re-querying users.
 */

import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export interface WatchlistItem {
  /** Stable id — `${anzsco}_${visaSubclass}` */
  id: string;
  /** ANZSCO 6-digit code */
  anzsco: string;
  /** Occupation title (denormalised for display in notifications) */
  anzscoTitle: string;
  /** Visa subclass to watch (189, 190, 491, etc.) */
  visaSubclass: string;
  /**
   * Minimum points the round cutoff must be *at or below* to trigger.
   * Use the user's own EOI points so they only get pinged when realistically eligible.
   */
  minPoints: number;
  /** Optional state filter for 190/491 (only fires for these states). */
  states?: string[];
  /** ISO timestamp */
  createdAt: string;
}

export interface WatchlistDoc {
  fcmToken?: string;
  platform?: 'ios' | 'android' | 'web';
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function itemId(anzsco: string, visaSubclass: string): string {
  return `${anzsco}_${visaSubclass}`;
}

function userRef(userId: string) {
  return firestore().collection('watchlists').doc(userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register / refresh this device's FCM token on the user's watchlist doc.
 * Call from notifications.ts after we obtain a token.
 */
export async function registerWatchlistDevice(
  userId: string,
  fcmToken: string,
): Promise<void> {
  if (Platform.OS === 'web' || !userId || !fcmToken) return;
  await userRef(userId).set(
    {
      fcmToken,
      platform: Platform.OS,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/** List the user's current watchlist (oldest → newest). */
export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (Platform.OS === 'web' || !userId) return [];
  const snap = await userRef(userId)
    .collection('items')
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((d) => d.data() as WatchlistItem);
}

/** Real-time subscription — returns unsubscribe. */
export function subscribeWatchlist(
  userId: string,
  onChange: (items: WatchlistItem[]) => void,
): () => void {
  if (Platform.OS === 'web' || !userId) {
    onChange([]);
    return () => {};
  }
  return userRef(userId)
    .collection('items')
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      (snap) => onChange(snap.docs.map((d) => d.data() as WatchlistItem)),
      (err) => console.warn('[watchlist] subscribe error', err),
    );
}

/** Add or update a watchlist item. Returns the saved item. */
export async function saveWatchlistItem(
  userId: string,
  partial: Omit<WatchlistItem, 'id' | 'createdAt'> & { createdAt?: string },
): Promise<WatchlistItem> {
  const id = itemId(partial.anzsco, partial.visaSubclass);
  const item: WatchlistItem = {
    id,
    anzsco: partial.anzsco,
    anzscoTitle: partial.anzscoTitle,
    visaSubclass: partial.visaSubclass,
    minPoints: partial.minPoints,
    states: partial.states && partial.states.length ? partial.states : undefined,
    createdAt: partial.createdAt ?? new Date().toISOString(),
  };
  await userRef(userId).collection('items').doc(id).set(item);
  return item;
}

/** Remove an item from the watchlist. */
export async function removeWatchlistItem(
  userId: string,
  id: string,
): Promise<void> {
  await userRef(userId).collection('items').doc(id).delete();
}

/** Convenience — current count (used for free-tier paywall gate). */
export async function getWatchlistCount(userId: string): Promise<number> {
  const items = await listWatchlist(userId);
  return items.length;
}
