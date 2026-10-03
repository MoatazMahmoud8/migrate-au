/**
 * Fetch approved news items from Firestore to supplement the Alerts feed.
 *
 * These are MEDIA articles about migration. They are curated by admins at
 * /admin/news and must be clearly labelled as news in the UI (not as laws
 * or official directions).
 */
import { Platform } from 'react-native';

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  summary?: string;
  sourceUrl?: string;
  url?: string;
  source?: string;
  category?: string;
  createdAt?: string;
  timestamp?: string;
}

export async function getApprovedNews(limitCount = 10): Promise<NewsItem[]> {
  try {
    if (Platform.OS === 'web') {
      const { getFirestore, collection, query, where, orderBy, limit, getDocs } =
        await import('firebase/firestore');
      const { initializeFirebaseWeb } = await import('./firebaseWeb');
      initializeFirebaseWeb();
      const q = query(
        collection(getFirestore(), 'news_items'),
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
      .collection('news_items')
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
