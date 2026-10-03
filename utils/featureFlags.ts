/**
 * Feature flag reader — SSOT for progressive rollout.
 *
 * Reads booleans (and later strings/numbers) from Firestore `app_data/flags`.
 * The read is cached in AsyncStorage for 5 minutes and served synchronously
 * from an in-memory snapshot once loaded, so callers can gate UI decisions
 * cheaply.
 *
 * Fallback order:
 *   1. In-memory snapshot from the last successful fetch.
 *   2. AsyncStorage cache (survives app restarts).
 *   3. Bundled defaults in DEFAULT_FLAGS.
 *
 * The API is intentionally minimal:
 *   - initFeatureFlags(): fire-and-forget in _layout.tsx; primes cache.
 *   - refreshFeatureFlags(): force refresh, useful on foreground.
 *   - isEnabled(name): sync boolean access anywhere in the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type KnownFlag =
  | 'newNavigation'
  | 'todayScreen'
  | 'referralLoop'
  | 'weeklyDigestOptIn'
  | 'shareablePointsCard';

export const DEFAULT_FLAGS: Record<KnownFlag, boolean> = {
  newNavigation: false,
  todayScreen: false,
  referralLoop: false,
  weeklyDigestOptIn: false,
  shareablePointsCard: false,
};

interface FlagsSnapshot {
  fetchedAt: number;
  flags: Record<string, boolean>;
}

const CACHE_KEY = '@migrate_au_feature_flags_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

let memory: Record<string, boolean> = { ...DEFAULT_FLAGS };
let lastFetchedAt = 0;
let inFlight: Promise<Record<string, boolean>> | null = null;

async function readCache(): Promise<FlagsSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlagsSnapshot;
  } catch {
    return null;
  }
}

async function writeCache(flags: Record<string, boolean>): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), flags }));
  } catch {
    // ignore
  }
}

async function fetchFlagsFromFirestore(): Promise<Record<string, boolean>> {
  try {
    if (Platform.OS === 'web') {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { initializeFirebaseWeb } = await import('./firebaseWeb');
      initializeFirebaseWeb();
      const snap = await getDoc(doc(getFirestore(), 'app_data', 'flags'));
      if (!snap.exists()) return {};
      return normalize(snap.data() as Record<string, unknown>);
    }
    const firestoreNs = await import('@react-native-firebase/firestore');
    const firestoreFn = (firestoreNs.default || firestoreNs) as any;
    const snap = await firestoreFn().collection('app_data').doc('flags').get();
    if (!snap.exists) return {};
    return normalize((snap.data() || {}) as Record<string, unknown>);
  } catch (err) {
    console.warn('[featureFlags] fetch failed:', err);
    return {};
  }
}

function normalize(raw: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') out[key] = value.toLowerCase() === 'true';
    else if (typeof value === 'number') out[key] = value !== 0;
  }
  return out;
}

/**
 * Prime the in-memory snapshot from cache. Safe to call multiple times.
 */
export async function initFeatureFlags(): Promise<void> {
  const cached = await readCache();
  if (cached?.flags) {
    memory = { ...DEFAULT_FLAGS, ...cached.flags };
    lastFetchedAt = cached.fetchedAt;
  }
  // Kick off a refresh in the background if the cache is stale.
  const stale = !cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS;
  if (stale) {
    void refreshFeatureFlags().catch(() => {});
  }
}

export async function refreshFeatureFlags(): Promise<Record<string, boolean>> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const fetched = await fetchFlagsFromFirestore();
    memory = { ...DEFAULT_FLAGS, ...fetched };
    lastFetchedAt = Date.now();
    await writeCache(memory);
    return memory;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Sync boolean access. Use inside components or utils. If the flag is unknown
 * it defaults to `false` (or the DEFAULT_FLAGS value).
 */
export function isEnabled(name: KnownFlag | string): boolean {
  const known = (DEFAULT_FLAGS as Record<string, boolean>)[name];
  if (memory[name] === undefined) return known ?? false;
  return !!memory[name];
}

export function getFeatureFlagsSnapshot(): Record<string, boolean> {
  return { ...DEFAULT_FLAGS, ...memory };
}

export function getFeatureFlagsFetchedAt(): number {
  return lastFetchedAt;
}
