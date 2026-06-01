/**
 * Skilled Occupations — runtime refresh layer.
 *
 * Mirrors utils/processingTimes.ts:
 *  1. App ships with bundled data in constants/skilledOccupations.ts
 *  2. On launch (and at most once per day) we GET SKILL_OCCUPATIONS_REMOTE_URL.
 *  3. If the snapshotDate is newer we cache it and diff: every added or
 *     removed occupation becomes a local notification + Updates feed entry.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SKILLED_OCCUPATIONS,
  SKILL_OCCUPATIONS_SNAPSHOT_DATE,
  SkilledOccupation,
  StateCode,
  StateRequirement,
  occupationKey,
} from '../constants/skilledOccupations';
import { validateOccupationsSnapshot } from './remoteSchema';

// Schema: { snapshotDate: string, items: SkilledOccupation[] }
export const SKILL_OCCUPATIONS_REMOTE_URL =
  'https://swift-shore-238707.web.app/skilled-occupations.json';

/** Schema: { snapshotDate: string, items: SkilledOccupation[] }
 * Comprehensive ANZSCO occupations from Jobs and Skills Australia (~1,236 entries). */
export const ALL_ANZSCO_OCCUPATIONS_REMOTE_URL =
  'https://swift-shore-238707.web.app/all-anzsco-occupations.json';

/** Schema: { snapshotDate: string, requirements: { [anzsco]: { [StateCode]: StateRequirement } } } */
export const STATE_REQUIREMENTS_REMOTE_URL =
  'https://swift-shore-238707.web.app/state-occupation-requirements.json';

const CACHE_KEY = '@migrate_au_skilled_occupations';
const LAST_CHECK_KEY = '@migrate_au_skilled_occupations_last_check';
const ALL_ANZSCO_CACHE_KEY = '@migrate_au_all_anzsco_occupations';
const ALL_ANZSCO_LAST_CHECK_KEY = '@migrate_au_all_anzsco_last_check';
const STATE_REQ_CACHE_KEY = '@migrate_au_state_requirements_v2';
const STATE_REQ_LAST_CHECK_KEY = '@migrate_au_state_requirements_last_check_v2';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_FORCE_INTERVAL_MS = 30 * 1000; // throttle pull-to-refresh
const FETCH_TIMEOUT_MS = 15 * 1000;

export interface OccupationsSnapshot {
  snapshotDate: string;
  items: SkilledOccupation[];
}

export interface OccupationChange {
  type: 'added' | 'removed' | 'updated';
  anzsco: string;
  name: string;
  /** Lists the change affects (e.g. 'CSOL', 'MLTSSL'). */
  lists?: string[];
  /** For 'updated' rows: human-readable summary of what changed. */
  detail?: string;
}

/**
 * Read the current cached snapshot. Priority:
 *  1. Cached all-anzsco (comprehensive 1,236+) merged with federal list metadata
 *  2. Cached skilled-occupations (422, federal lists only)
 *  3. Bundled data (422, federal lists only)
 */
export async function getSkilledOccupations(): Promise<OccupationsSnapshot> {
  // Try all-anzsco cache first
  try {
    const raw = await AsyncStorage.getItem(ALL_ANZSCO_CACHE_KEY);
    if (raw) {
      const allAnzsco = JSON.parse(raw) as OccupationsSnapshot;
      // Also fetch skilled metadata to merge in federal list info
      const skilledRaw = await AsyncStorage.getItem(CACHE_KEY);
      if (skilledRaw) {
        const skilled = JSON.parse(skilledRaw) as OccupationsSnapshot;
        return mergeAllAnzscoWithSkilled(allAnzsco, skilled);
      }
      // Return all-anzsco with bundled skilled metadata
      const bundledSkilled: OccupationsSnapshot = {
        snapshotDate: SKILL_OCCUPATIONS_SNAPSHOT_DATE,
        items: SKILLED_OCCUPATIONS,
      };
      return mergeAllAnzscoWithSkilled(allAnzsco, bundledSkilled);
    }
  } catch {}

  // Fall back to skilled-occupations cache or bundled data
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as OccupationsSnapshot;
  } catch {}

  return {
    snapshotDate: SKILL_OCCUPATIONS_SNAPSHOT_DATE,
    items: SKILLED_OCCUPATIONS,
  };
}

/**
 * Merge all-anzsco with skilled list metadata. For each occupation in all-anzsco:
 *  - If it exists in skilled lists, use that version (with full metadata)
 *  - Otherwise, use the minimal version from all-anzsco
 */
function mergeAllAnzscoWithSkilled(
  allAnzsco: OccupationsSnapshot,
  skilled: OccupationsSnapshot
): OccupationsSnapshot {
  const skilledMap = new Map(skilled.items.map((o) => [o.anzsco, o] as const));
  const merged = allAnzsco.items.map((o) => skilledMap.get(o.anzsco) ?? o);
  // Use the newer snapshot date
  const snapshotDate =
    new Date(allAnzsco.snapshotDate) > new Date(skilled.snapshotDate)
      ? allAnzsco.snapshotDate
      : skilled.snapshotDate;
  return { snapshotDate, items: merged };
}

/** Returns ISO timestamp of when we last successfully checked for updates. */
export async function getOccupationsLastCheckedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_CHECK_KEY);
  } catch {
    return null;
  }
}

/**
 * Refresh the bundled list from the remote scraper, diff against the cache,
 * and return any added / removed / updated occupations.
 */
export async function refreshSkilledOccupations(
  opts: { force?: boolean } = {}
): Promise<{
  updated: boolean;
  snapshot: OccupationsSnapshot;
  changes: OccupationChange[];
}> {
  const last = await getOccupationsLastCheckedAt();
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    // Always honour the daily cache window
    if (!opts.force && age < ONE_DAY_MS) {
      return {
        updated: false,
        snapshot: await getSkilledOccupations(),
        changes: [],
      };
    }
    // Even when forced, throttle to avoid hammering the endpoint
    if (opts.force && age < MIN_FORCE_INTERVAL_MS) {
      return {
        updated: false,
        snapshot: await getSkilledOccupations(),
        changes: [],
      };
    }
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(SKILL_OCCUPATIONS_REMOTE_URL, { method: 'GET', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Refuse oversize payloads (defence-in-depth against malicious CDN)
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength && contentLength > 2 * 1024 * 1024) {
      throw new Error('payload too large');
    }
    const json = await res.json();
    const remote = validateOccupationsSnapshot(json);

    const current = await getSkilledOccupations();
    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

    const currentMap = new Map(current.items.map((o) => [occupationKey(o), o] as const));
    const remoteMap = new Map(remote.items.map((o) => [occupationKey(o), o] as const));

    const changes: OccupationChange[] = [];

    // Added
    for (const [key, next] of remoteMap) {
      if (!currentMap.has(key)) {
        changes.push({
          type: 'added',
          anzsco: next.anzsco,
          name: next.name,
          lists: next.lists,
        });
      }
    }

    // Removed
    for (const [key, prev] of currentMap) {
      if (!remoteMap.has(key)) {
        changes.push({
          type: 'removed',
          anzsco: prev.anzsco,
          name: prev.name,
          lists: prev.lists,
        });
      }
    }

    // Updated (lists, visas, or state coverage changed)
    for (const [key, next] of remoteMap) {
      const prev = currentMap.get(key);
      if (!prev) continue;
      const listsChanged =
        prev.lists.slice().sort().join(',') !== next.lists.slice().sort().join(',');
      const visasChanged =
        prev.visas.slice().sort().join(',') !== next.visas.slice().sort().join(',');

      // State coverage diff — compare each state's eligible visa array
      const stateChanges: string[] = [];
      const prevStates = prev.states ?? {};
      const nextStates = next.states ?? {};
      const allCodes = new Set([
        ...Object.keys(prevStates),
        ...Object.keys(nextStates),
      ]);
      for (const code of allCodes) {
        const a = (prevStates as any)[code] as string[] | undefined;
        const b = (nextStates as any)[code] as string[] | undefined;
        const aKey = (a ?? []).slice().sort().join('/');
        const bKey = (b ?? []).slice().sort().join('/');
        if (aKey === bKey) continue;
        if (!a && b) stateChanges.push(`${code} added (${b.join('/')})`);
        else if (a && !b) stateChanges.push(`${code} removed`);
        else stateChanges.push(`${code}: ${aKey || '—'} → ${bKey || '—'}`);
      }

      if (listsChanged || visasChanged || stateChanges.length > 0) {
        const parts: string[] = [];
        if (listsChanged) {
          parts.push(`lists: ${prev.lists.join('/')} → ${next.lists.join('/')}`);
        }
        if (visasChanged) {
          parts.push(`visas: ${prev.visas.join(',')} → ${next.visas.join(',')}`);
        }
        if (stateChanges.length > 0) {
          parts.push(`states: ${stateChanges.join(', ')}`);
        }
        changes.push({
          type: 'updated',
          anzsco: next.anzsco,
          name: next.name,
          lists: next.lists,
          detail: parts.join(' · '),
        });
      }
    }

    if (remote.snapshotDate !== current.snapshotDate || changes.length > 0) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      return { updated: true, snapshot: remote, changes };
    }

    return { updated: false, snapshot: current, changes: [] };
  } catch (err) {
    console.warn('[skilledOccupations] refresh failed:', err);
    return {
      updated: false,
      snapshot: await getSkilledOccupations(),
      changes: [],
    };
  }
}

/**
 * Refresh the comprehensive all-anzsco occupations list from Firebase.
 * This is called on app startup and daily to load the full ANZSCO dataset.
 * Does not trigger change notifications (these are for skilled-occupations only).
 */
export async function refreshAllAnzscoOccupations(
  opts: { force?: boolean } = {}
): Promise<{ updated: boolean; snapshot: OccupationsSnapshot }> {
  const last = await getAllAnzscoLastCheckedAt();
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    if (!opts.force && age < ONE_DAY_MS) {
      return {
        updated: false,
        snapshot: await getSkilledOccupations(),
      };
    }
    if (opts.force && age < MIN_FORCE_INTERVAL_MS) {
      return {
        updated: false,
        snapshot: await getSkilledOccupations(),
      };
    }
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(ALL_ANZSCO_OCCUPATIONS_REMOTE_URL, {
        method: 'GET',
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength && contentLength > 5 * 1024 * 1024) {
      throw new Error('payload too large');
    }
    const json = await res.json();
    const remote = validateOccupationsSnapshot(json);
    await AsyncStorage.setItem(ALL_ANZSCO_LAST_CHECK_KEY, new Date().toISOString());
    await AsyncStorage.setItem(ALL_ANZSCO_CACHE_KEY, JSON.stringify(remote));
    return { updated: true, snapshot: remote };
  } catch (err) {
    console.warn('[allAnzsco] refresh failed:', err);
    return {
      updated: false,
      snapshot: await getSkilledOccupations(),
    };
  }
}

/** Returns ISO timestamp of when we last successfully checked for all-anzsco updates. */
async function getAllAnzscoLastCheckedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ALL_ANZSCO_LAST_CHECK_KEY);
  } catch {
    return null;
  }
}

/**
 * Search occupations by free text. Matches against ANZSCO code, name, visa
 * subclass, list code, or assessing authority. Returns up to `limit` results.
 */
export function searchOccupations(
  items: SkilledOccupation[],
  query: string,
  limit = 200
): SkilledOccupation[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;  // Return all items without limit when no query
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches = items.filter((o) => {
    const haystack = [
      o.anzsco,
      o.name.toLowerCase(),
      o.group.toLowerCase(),
      o.lists.join(' ').toLowerCase(),
      o.visas.join(' '),
      (o.assessingAuthority ?? '').toLowerCase(),
    ].join(' ');
    return tokens.every((t) => haystack.includes(t));
  });
  return matches.slice(0, limit);
}

// ─── State Requirements ───────────────────────────────────────────────────

export interface StateRequirementsSnapshot {
  snapshotDate: string;
  /** Map of ANZSCO code → state code → visa type → requirements (nested for visa-specific) */
  requirements: Record<string, Partial<Record<StateCode, Record<string, StateRequirement>>>>;
}

/**
 * Check if cached state requirements use the new visa-specific format.
 * Old format: requirements[anzsco][state] = StateRequirement
 * New format: requirements[anzsco][state][visa] = StateRequirement
 */
function isVisaSpecificFormat(req: any): boolean {
  if (!req || !req.requirements) return false;
  // Check first occupation
  const firstAnzsco = Object.keys(req.requirements)[0];
  if (!firstAnzsco) return false;
  const firstOcc = req.requirements[firstAnzsco];
  // Check first state
  const firstState = Object.keys(firstOcc)[0];
  if (!firstState) return false;
  const stateReq = firstOcc[firstState];
  // If it's a dict with visa keys ('190', '491', '482'), it's visa-specific
  return typeof stateReq === 'object' && ('190' in stateReq || '491' in stateReq || '482' in stateReq);
}

/**
 * Return the cached state requirements snapshot, or an empty one if
 * nothing is cached yet. Invalidates cache if it's in old (non-visa-specific) format.
 */
export async function getStateRequirements(): Promise<StateRequirementsSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STATE_REQ_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StateRequirementsSnapshot;
      // Check if cache is in old (non-visa-specific) format
      if (!isVisaSpecificFormat(parsed)) {
        // Invalidate old cache — force refresh on next call
        console.warn('[stateRequirements] old cache format detected, invalidating...');
        await AsyncStorage.removeItem(STATE_REQ_CACHE_KEY);
        await AsyncStorage.removeItem(STATE_REQ_LAST_CHECK_KEY);
        return { snapshotDate: '', requirements: {} };
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[stateRequirements] cache parse error:', err);
  }
  return { snapshotDate: '', requirements: {} };
}

/**
 * Fetch the latest state requirements from the remote endpoint (at most
 * once per day unless force=true) and cache them locally.
 * Returns the merged list of SkilledOccupations with stateRequirements
 * injected from the remote data.
 */
export async function refreshStateRequirements(
  opts: { force?: boolean } = {}
): Promise<{ updated: boolean; snapshot: StateRequirementsSnapshot }> {
  // First, check if cached data is in old (non-visa-specific) format
  // If so, invalidate it and force a fresh fetch
  try {
    const raw = await AsyncStorage.getItem(STATE_REQ_CACHE_KEY).catch(() => null);
    if (raw) {
      const parsed = JSON.parse(raw) as StateRequirementsSnapshot;
      if (!isVisaSpecificFormat(parsed)) {
        console.warn('[stateRequirements] old cache format detected, forcing refresh...');
        await AsyncStorage.removeItem(STATE_REQ_CACHE_KEY);
        await AsyncStorage.removeItem(STATE_REQ_LAST_CHECK_KEY);
        opts = { force: true };
      }
    }
  } catch {}

  const last = await AsyncStorage.getItem(STATE_REQ_LAST_CHECK_KEY).catch(() => null);
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    if (!opts.force && age < ONE_DAY_MS) {
      return { updated: false, snapshot: await getStateRequirements() };
    }
    if (opts.force && age < MIN_FORCE_INTERVAL_MS) {
      return { updated: false, snapshot: await getStateRequirements() };
    }
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(STATE_REQUIREMENTS_REMOTE_URL, { method: 'GET', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength && contentLength > 25 * 1024 * 1024) {
      throw new Error('state-requirements payload too large');
    }
    const json = (await res.json()) as StateRequirementsSnapshot;
    if (
      typeof json !== 'object' ||
      typeof json.snapshotDate !== 'string' ||
      typeof json.requirements !== 'object'
    ) {
      throw new Error('invalid state-requirements schema');
    }

    await AsyncStorage.setItem(STATE_REQ_LAST_CHECK_KEY, new Date().toISOString());
    await AsyncStorage.setItem(STATE_REQ_CACHE_KEY, JSON.stringify(json));
    return { updated: true, snapshot: json };
  } catch (err) {
    console.warn('[stateRequirements] refresh failed:', err);
    return { updated: false, snapshot: await getStateRequirements() };
  }
}

/**
 * Merge a StateRequirementsSnapshot into an array of SkilledOccupations,
 * injecting `stateRequirements` per occupation in-place (returns new array).
 */
export function mergeStateRequirements(
  occupations: SkilledOccupation[],
  snapshot: StateRequirementsSnapshot
): SkilledOccupation[] {
  if (!snapshot.requirements || Object.keys(snapshot.requirements).length === 0) {
    return occupations;
  }
  return occupations.map((occ) => {
    const reqs = snapshot.requirements[occ.anzsco];
    if (!reqs) return occ;
    return { ...occ, stateRequirements: reqs };
  });
}
