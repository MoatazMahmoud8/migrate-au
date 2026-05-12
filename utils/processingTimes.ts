/**
 * Processing times — runtime refresh layer.
 *
 * Strategy:
 *  1. App ships with bundled data in constants/processingTimes.ts
 *  2. On launch (and once per day) we try to GET PROCESSING_TIMES_REMOTE_URL
 *     which returns a JSON snapshot { snapshotDate, items }.
 *  3. If the snapshotDate is newer than what we have locally, we cache it in
 *     AsyncStorage and compare diffs. Each changed visa fires a local
 *     notification + adds an entry to the in-app Updates feed.
 *
 * The remote JSON is produced by the scraper at backend/scraper (Cloud Run /
 * Cloud Functions cron) — schema below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PROCESSING_SNAPSHOT_DATE,
  PROCESSING_TIMES,
  ProcessingTime,
} from '../constants/processingTimes';

// Replace with your published JSON URL once the scraper is deployed.
// Schema: { snapshotDate: string, items: ProcessingTime[] }
export const PROCESSING_TIMES_REMOTE_URL =
  'https://migrateau.jsmglobal.xyz/processing-times.json';

const CACHE_KEY = '@migrate_au_processing_times';
const LAST_CHECK_KEY = '@migrate_au_processing_times_last_check';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface Snapshot {
  snapshotDate: string;
  items: ProcessingTime[];
}

/** Read the current cached snapshot, falling back to the bundled one. */
export async function getProcessingTimes(): Promise<Snapshot> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Snapshot;
  } catch {}
  return { snapshotDate: PROCESSING_SNAPSHOT_DATE, items: PROCESSING_TIMES };
}

/** Returns ISO timestamp of when we last successfully checked for updates. */
export async function getLastCheckedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_CHECK_KEY);
  } catch {
    return null;
  }
}

function keyOf(p: ProcessingTime): string {
  return `${p.subclass}|${p.stream ?? ''}`;
}

export interface ProcessingTimeChange {
  subclass: string;
  stream?: string;
  name: string;
  before: { p50: string; p90: string };
  after: { p50: string; p90: string };
}

/**
 * Fetch the remote snapshot if a day has passed, replace the cache when newer,
 * and return any per-visa diffs.
 */
export async function refreshProcessingTimes(
  opts: { force?: boolean } = {}
): Promise<{
  updated: boolean;
  snapshot: Snapshot;
  changes: ProcessingTimeChange[];
}> {
  const last = await getLastCheckedAt();
  if (!opts.force && last) {
    const age = Date.now() - new Date(last).getTime();
    if (age < ONE_DAY_MS) {
      return { updated: false, snapshot: await getProcessingTimes(), changes: [] };
    }
  }

  try {
    const res = await fetch(PROCESSING_TIMES_REMOTE_URL, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = (await res.json()) as Snapshot;
    if (!remote?.snapshotDate || !Array.isArray(remote.items)) {
      throw new Error('Invalid snapshot shape');
    }

    const current = await getProcessingTimes();
    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

    // Diff
    const currentMap = new Map(current.items.map((p) => [keyOf(p), p] as const));
    const changes: ProcessingTimeChange[] = [];
    for (const next of remote.items) {
      const prev = currentMap.get(keyOf(next));
      if (!prev) continue;
      if (prev.p50 !== next.p50 || prev.p90 !== next.p90) {
        changes.push({
          subclass: next.subclass,
          stream: next.stream,
          name: next.name,
          before: { p50: prev.p50, p90: prev.p90 },
          after: { p50: next.p50, p90: next.p90 },
        });
      }
    }

    if (remote.snapshotDate !== current.snapshotDate || changes.length > 0) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      return { updated: true, snapshot: remote, changes };
    }

    return { updated: false, snapshot: current, changes: [] };
  } catch (err) {
    console.warn('[processingTimes] refresh failed:', err);
    return { updated: false, snapshot: await getProcessingTimes(), changes: [] };
  }
}
