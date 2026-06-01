/**
 * Salaries — runtime fetch + cache layer.
 *
 * The remote snapshot is produced daily by
 * scripts/salaries_scraper.py and published to Firebase Hosting at
 * https://migrateau.jsmglobal.xyz/salaries.json. Each entry is the median
 * weekly / annual earnings for an ANZSCO code, sourced from
 * Jobs and Skills Australia (jobsandskills.gov.au).
 *
 * For most 6-digit ANZSCO codes JSA only publishes earnings at the 4-digit
 * unit-group level. The scraper transparently falls back to the parent
 * unit group and tags the entry with ``sourceLevel: '4-digit'``.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SALARIES_REMOTE_URL =
  'https://swift-shore-238707.web.app/salaries.json';

const CACHE_KEY = '@migrate_au_salaries';
const LAST_CHECK_KEY = '@migrate_au_salaries_last_check';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15 * 1000;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

export interface SalaryEntry {
  weeklyEarnings: number;
  annualSalary: number;
  currency: 'AUD';
  occupationName?: string;
  sourceUrl: string;
  /** '6-digit' when the value is for the exact ANZSCO unit, '4-digit' when JSA only publishes it at the parent unit-group level. */
  sourceLevel?: '6-digit' | '4-digit';
}

export interface SalariesSnapshot {
  snapshotDate: string;
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
  salaries: Record<string, SalaryEntry>;
}

const EMPTY: SalariesSnapshot = {
  snapshotDate: '1970-01-01',
  salaries: {},
};

/** Read the current cached snapshot, falling back to an empty snapshot. */
export async function getSalaries(): Promise<SalariesSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as SalariesSnapshot;
  } catch {}
  return EMPTY;
}

/**
 * Fetch the remote snapshot if a day has passed and cache it. Silent on
 * failure — the app keeps using the previous cache (or the empty fallback).
 */
export async function refreshSalaries(
  opts: { force?: boolean } = {}
): Promise<SalariesSnapshot> {
  if (!opts.force) {
    try {
      const last = await AsyncStorage.getItem(LAST_CHECK_KEY);
      if (last && Date.now() - new Date(last).getTime() < ONE_DAY_MS) {
        return await getSalaries();
      }
    } catch {}
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(SALARIES_REMOTE_URL, { method: 'GET', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength && contentLength > MAX_PAYLOAD_BYTES) {
      throw new Error('payload too large');
    }
    const json = (await res.json()) as unknown;

    if (
      !json ||
      typeof json !== 'object' ||
      typeof (json as SalariesSnapshot).snapshotDate !== 'string' ||
      typeof (json as SalariesSnapshot).salaries !== 'object'
    ) {
      throw new Error('invalid snapshot shape');
    }
    const snapshot = json as SalariesSnapshot;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    return snapshot;
  } catch (err) {
    console.warn('[salaries] refresh failed:', err);
    return await getSalaries();
  }
}

/** Format an annual AUD salary as "$131k" for compact UI labels. */
export function formatAnnualShort(annual: number): string {
  if (!Number.isFinite(annual) || annual <= 0) return '';
  if (annual >= 1_000_000) return `$${(annual / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(annual / 1000)}k`;
}

/** Format an annual AUD salary as "$131,924" for detail views. */
export function formatAnnualFull(annual: number): string {
  if (!Number.isFinite(annual) || annual <= 0) return '';
  return `$${Math.round(annual).toLocaleString('en-AU')}`;
}

/**
 * Look up the salary for an ANZSCO code, transparently falling back to the
 * 4-digit unit-group code so the UI works for 6-digit codes that don't have
 * a dedicated entry.
 */
export function getSalaryFor(
  snapshot: SalariesSnapshot,
  anzsco: string
): SalaryEntry | undefined {
  if (!anzsco) return undefined;
  const direct = snapshot.salaries[anzsco];
  if (direct) return direct;
  if (anzsco.length >= 4) {
    return snapshot.salaries[anzsco.slice(0, 4)];
  }
  return undefined;
}
