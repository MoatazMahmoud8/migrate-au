/**
 * app_data manifest reader — SSOT entry point.
 *
 * Fetches the Firestore `app_data/manifest` document that lists every
 * dataset the app needs (occupations, visa fees, processing times, etc.)
 * with its live URL, sha, and updatedAt. Consumers can then decide whether
 * their locally cached copy is stale.
 *
 * This module is intentionally side-effect free: it does NOT rewire any
 * existing loader. It exposes a small API so screens/loaders can migrate
 * over one at a time.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CACHE_KEY = '@migrate_au_app_data_manifest_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ManifestDataset {
  url: string;
  sha?: string;
  updatedAt?: string;
  size?: number;
}

export interface AppDataManifest {
  generatedAt: string;
  updatedBy?: string;
  trigger?: string;
  datasets: Record<string, ManifestDataset>;
}

interface CachedManifest {
  fetchedAt: number;
  manifest: AppDataManifest;
}

let inFlight: Promise<AppDataManifest | null> | null = null;

async function readCachedManifest(): Promise<CachedManifest | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedManifest;
  } catch {
    return null;
  }
}

async function writeCachedManifest(manifest: AppDataManifest): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), manifest }),
    );
  } catch {
    // ignore
  }
}

async function fetchManifestFromFirestore(): Promise<AppDataManifest | null> {
  try {
    if (Platform.OS === 'web') {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { initializeFirebaseWeb } = await import('./firebaseWeb');
      initializeFirebaseWeb();
      const snap = await getDoc(doc(getFirestore(), 'app_data', 'manifest'));
      if (!snap.exists()) return null;
      return snap.data() as AppDataManifest;
    }

    const firestoreNs = await import('@react-native-firebase/firestore');
    const firestoreFn = (firestoreNs.default || firestoreNs) as any;
    const snap = await firestoreFn().collection('app_data').doc('manifest').get();
    if (!snap.exists) return null;
    return snap.data() as AppDataManifest;
  } catch (err) {
    console.warn('[appDataManifest] fetch failed:', err);
    return null;
  }
}

/**
 * Return the app_data manifest, using a short in-memory + AsyncStorage cache.
 * Falls back to the cached copy if the network fetch fails.
 */
export async function getAppDataManifest(options: { force?: boolean } = {}): Promise<AppDataManifest | null> {
  const cached = await readCachedManifest();
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  if (!options.force && fresh && cached) return cached.manifest;

  if (!inFlight) {
    inFlight = (async () => {
      const manifest = await fetchManifestFromFirestore();
      if (manifest) {
        await writeCachedManifest(manifest);
      }
      return manifest;
    })().finally(() => {
      inFlight = null;
    });
  }

  const manifest = await inFlight;
  if (manifest) return manifest;
  return cached ? cached.manifest : null;
}

export async function getDatasetUrl(datasetKey: string): Promise<string | null> {
  const manifest = await getAppDataManifest();
  const entry = manifest?.datasets?.[datasetKey];
  return entry?.url ?? null;
}

export async function getDatasetSha(datasetKey: string): Promise<string | null> {
  const manifest = await getAppDataManifest();
  const entry = manifest?.datasets?.[datasetKey];
  return entry?.sha ?? null;
}

export const APP_DATA_MANIFEST_CACHE_KEY = CACHE_KEY;
