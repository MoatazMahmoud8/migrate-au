/**
 * Visa fees — runtime refresh layer.
 *
 * Strategy:
 *  1. App ships with bundled fees in constants/visaFees.ts
 *  2. Every 3 days we try to GET VISA_FEES_REMOTE_URL which returns a JSON
 *     snapshot { snapshotDate: string, items: VisaFeeEntry[] }.
 *  3. When the snapshot is newer we cache it in AsyncStorage and serve the
 *     updated fees. Repealed/historical visas are excluded from the remote file.
 *
 * The remote JSON lives at the Firebase Hosting URL below and is updated
 * manually (or via a future scraper cron) whenever DHA changes fees.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VISA_FEES,
  VISA_FEES_SNAPSHOT_DATE,
  VisaFeeEntry,
} from '../constants/visaFees';
import { validateVisaFeesSnapshot } from './remoteSchema';

export const VISA_FEES_REMOTE_URL =
  'https://swift-shore-238707.web.app/visa-fees.json';

const CACHE_KEY       = '@migrate_au_visa_fees';
const LAST_CHECK_KEY  = '@migrate_au_visa_fees_last_check';
const THREE_DAYS_MS   = 3 * 24 * 60 * 60 * 1000;
const MIN_FORCE_MS    = 30 * 1000;
const FETCH_TIMEOUT_MS = 15 * 1000;

interface FeeSnapshot {
  snapshotDate: string;
  items: VisaFeeEntry[];
}

/** Returns cached fees or the bundled fallback. */
export async function getVisaFees(): Promise<FeeSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as FeeSnapshot;
  } catch {}
  return { snapshotDate: VISA_FEES_SNAPSHOT_DATE, items: VISA_FEES };
}

/** Lookup a single fee entry by subclass code from the given snapshot. */
export function getFeeForCode(
  snapshot: FeeSnapshot,
  code: string
): VisaFeeEntry | undefined {
  return snapshot.items.find((e) => e.subclass === code);
}

/** ISO timestamp of the last successful remote check. */
export async function getFeesLastCheckedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_CHECK_KEY);
  } catch {
    return null;
  }
}

/**
 * Attempt to refresh visa fees from the remote snapshot.
 * Skips if last check was within 3 days (unless force = true).
 * Always falls back silently on network errors.
 */
export async function refreshVisaFees(
  opts: { force?: boolean } = {}
): Promise<{ updated: boolean; snapshot: FeeSnapshot }> {
  const last = await getFeesLastCheckedAt();
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    if (!opts.force && age < THREE_DAYS_MS) {
      return { updated: false, snapshot: await getVisaFees() };
    }
    if (opts.force && age < MIN_FORCE_MS) {
      return { updated: false, snapshot: await getVisaFees() };
    }
  }

  try {
    const ctrl   = new AbortController();
    const timer  = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(VISA_FEES_REMOTE_URL, { method: 'GET', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > 512 * 1024) throw new Error('payload too large');

    const json   = await res.json();
    const remote = validateVisaFeesSnapshot(json);

    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

    const current = await getVisaFees();
    if (remote.snapshotDate !== current.snapshotDate) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      return { updated: true, snapshot: remote };
    }
    return { updated: false, snapshot: current };
  } catch (err) {
    console.warn('[visaFees] refresh failed:', err);
    return { updated: false, snapshot: await getVisaFees() };
  }
}
