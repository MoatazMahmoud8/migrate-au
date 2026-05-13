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
import { validateProcessingTimesSnapshot } from './remoteSchema';
// Schema: { snapshotDate: string, items: ProcessingTime[] }
export const PROCESSING_TIMES_REMOTE_URL =
  'https://migrateau.jsmglobal.xyz/processing-times.json';

const CACHE_KEY = '@migrate_au_processing_times';
const LAST_CHECK_KEY = '@migrate_au_processing_times_last_check';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_FORCE_INTERVAL_MS = 30 * 1000;
const FETCH_TIMEOUT_MS = 15 * 1000;

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
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    if (!opts.force && age < ONE_DAY_MS) {
      return { updated: false, snapshot: await getProcessingTimes(), changes: [] };
    }
    if (opts.force && age < MIN_FORCE_INTERVAL_MS) {
      return { updated: false, snapshot: await getProcessingTimes(), changes: [] };
    }
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(PROCESSING_TIMES_REMOTE_URL, { method: 'GET', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength && contentLength > 2 * 1024 * 1024) {
      throw new Error('payload too large');
    }
    const json = await res.json();
    const remote = validateProcessingTimesSnapshot(json);

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

/**
 * Given a visa pathway code (e.g. '482', '820 / 801', '309/100'),
 * return all matching ProcessingTime entries from the current snapshot.
 *
 * Matching is done by extracting each numeric code segment and comparing
 * against the subclass field (ignoring spacing and slash variants).
 */
export function getTimesForCode(
  snapshot: { items: ProcessingTime[] },
  code: string
): ProcessingTime[] {
  // Extract individual subclass numbers: '820 / 801' → ['820', '801']
  const codes = code.split(/[\/\s–-]+/).map((c) => c.trim()).filter(Boolean);
  return snapshot.items.filter((p) =>
    codes.some((c) => p.subclass.replace(/[\/\s]/g, '').startsWith(c))
  );
}
