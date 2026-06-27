/**
 * Alternative notification fetching using polling instead of listeners
 * This is a fallback approach if real-time listeners don't work on React Native
 */

import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';

interface PollSubscription {
  unsubscribe: () => void;
  isActive: boolean;
}

/**
 * Poll-based alternative to real-time listeners
 * More compatible with React Native but less efficient
 */
export function subscribeToFeedPoll(
  onUpdate: (notifications: any[]) => void,
  limit = 30,
  userId?: string,
  pollIntervalMs = 5000, // Poll every 5 seconds
): () => void {
  // Native-only
  if (Platform.OS === 'web') {
    console.log('[subscribeToFeedPoll] Skipping on web platform');
    onUpdate([]);
    return () => {};
  }

  const subscription: PollSubscription = {
    unsubscribe: () => { subscription.isActive = false; },
    isActive: true,
  };

  let lastFetch = 0;
  let lastIds = new Set<string>();

  const poll = async () => {
    if (!subscription.isActive) return;

    try {
      const now = Date.now();
      if (now - lastFetch < pollIntervalMs) {
        setTimeout(poll, pollIntervalMs - (now - lastFetch));
        return;
      }

      const fs = firestore();
      const col = fs.collection('notifications');

      let query = col.limit(limit * 2);
      if (userId) {
        // Get both broadcasts (no userId field or userId=null) and personal notifications
        const [broadcasts, personal] = await Promise.all([
          col.orderBy('timestamp', 'desc').limit(limit * 2).get(),
          col.where('userId', '==', userId).limit(limit * 2).get(),
        ]);

        // Merge and deduplicate
        const seenIds = new Set<string>();
        const allDocs = [...broadcasts.docs, ...personal.docs].filter(doc => {
          if (seenIds.has(doc.id)) return false;
          seenIds.add(doc.id);
          return true;
        });
        const items = allDocs
          .map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp;
            const isoTimestamp = typeof timestamp === 'string' ? timestamp : (timestamp?.toDate?.().toISOString() || '');
            return { id: doc.id, ...data, timestamp: isoTimestamp };
          })
          .sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''))
          .slice(0, limit);

        const currentIds = new Set(items.map(item => item.id));
        const changed = 
          currentIds.size !== lastIds.size || 
          [...currentIds].some(id => !lastIds.has(id));

        if (changed) {
          console.log('[subscribeToFeedPoll] 📡 Poll found updates:', items.length);
          lastIds = currentIds;
          onUpdate(items);
        }
      } else {
        // Simple case: no userId
        const snap = await col.limit(limit * 2).get();
        const items = snap.docs
          .map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp;
            const isoTimestamp = typeof timestamp === 'string' ? timestamp : (timestamp?.toDate?.().toISOString() || '');
            return { id: doc.id, ...data, timestamp: isoTimestamp };
          })
          .sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''))
          .slice(0, limit);

        const currentIds = new Set(items.map(item => item.id));
        const changed = 
          currentIds.size !== lastIds.size || 
          [...currentIds].some(id => !lastIds.has(id));

        if (changed) {
          console.log('[subscribeToFeedPoll] 📡 Poll found updates:', items.length);
          lastIds = currentIds;
          onUpdate(items);
        }
      }

      lastFetch = now;
    } catch (err) {
      console.error('[subscribeToFeedPoll] Poll error:', err);
    }

    if (subscription.isActive) {
      setTimeout(poll, pollIntervalMs);
    }
  };

  // Start polling
  console.log('[subscribeToFeedPoll] Starting poll-based subscription');
  poll();

  return () => {
    console.log('[subscribeToFeedPoll] Unsubscribing');
    subscription.unsubscribe();
  };
}
