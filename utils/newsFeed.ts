/**
 * Fetch approved news items from Firestore to supplement the Alerts feed.
 *
 * These are MEDIA articles about migration. They are curated by admins at
 * /admin/actions and must be clearly labelled as news in the UI (not as laws
 * or official directions).
 */
import { Platform } from 'react-native';

export interface NewsSummary {
  whatChanged?: string;
  whoIsAffected?: string;
  actionRequired?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  /** Agent-grade structured headline — preferred over `title` for display. */
  headline?: string;
  summary?: string | NewsSummary;
  sourceUrl?: string;
  url?: string;
  /** Raw source id written by the scraper, e.g. "news_rss" — NOT a display name. */
  source?: string;
  category?: string;
  createdAt?: string;
  timestamp?: string;
  impactedVisas?: string[];
  effectiveDate?: string;
  is_official?: boolean;
  requires_verification?: boolean;
  references_official_instrument?: boolean;
  source_tier?: string;
  needs_manual_review?: boolean;
}

const NEWS_COLLECTION = 'news_items';

export async function getApprovedNews(limitCount = 10): Promise<NewsItem[]> {
  try {
    if (Platform.OS === 'web') {
      const { getFirestore, collection, query, where, orderBy, limit, getDocs } =
        await import('firebase/firestore');
      const { initializeFirebaseWeb } = await import('./firebaseWeb');
      initializeFirebaseWeb();
      const q = query(
        collection(getFirestore(), NEWS_COLLECTION),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }
    const firestoreNs = await import('@react-native-firebase/firestore');
    const firestoreFn = (firestoreNs.default || firestoreNs) as any;
    const snap = await firestoreFn()
      .collection(NEWS_COLLECTION)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
  } catch (err) {
    console.warn('[newsFeed] fetch failed:', err);
    return [];
  }
}

/**
 * Live subscription to approved news items so the Updates tab (and Home)
 * reflect "Approve & Send" from the Admin Action Center immediately, without
 * requiring a manual refresh.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToApprovedNews(
  onUpdate: (items: NewsItem[]) => void,
  limitCount = 50,
): () => void {
  let cancelled = false;
  let unsubFn: (() => void) | null = null;

  (async () => {
    try {
      if (Platform.OS === 'web') {
        const { getFirestore, collection, query, where, orderBy, limit, onSnapshot } =
          await import('firebase/firestore');
        const { initializeFirebaseWeb } = await import('./firebaseWeb');
        initializeFirebaseWeb();
        const q = query(
          collection(getFirestore(), NEWS_COLLECTION),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(limitCount),
        );
        const unsub = onSnapshot(q, (snap) => {
          if (cancelled) return;
          onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        }, (err) => console.warn('[newsFeed] live subscription failed:', err));
        if (cancelled) { unsub(); return; }
        unsubFn = unsub;
        return;
      }

      const firestoreNs = await import('@react-native-firebase/firestore');
      const firestoreFn = (firestoreNs.default || firestoreNs) as any;
      const unsub = firestoreFn()
        .collection(NEWS_COLLECTION)
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .onSnapshot(
          (snap: any) => {
            if (cancelled) return;
            onUpdate(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })));
          },
          (err: any) => console.warn('[newsFeed] live subscription failed:', err),
        );
      if (cancelled) { unsub(); return; }
      unsubFn = unsub;
    } catch (err) {
      console.warn('[newsFeed] subscribe failed:', err);
      onUpdate([]);
    }
  })();

  return () => {
    cancelled = true;
    try {
      unsubFn?.();
    } catch {}
  };
}
