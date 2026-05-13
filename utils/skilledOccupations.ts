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
  occupationKey,
} from '../constants/skilledOccupations';

// Schema: { snapshotDate: string, items: SkilledOccupation[] }
export const SKILL_OCCUPATIONS_REMOTE_URL =
  'https://migrateau.jsmglobal.xyz/skilled-occupations.json';

const CACHE_KEY = '@migrate_au_skilled_occupations';
const LAST_CHECK_KEY = '@migrate_au_skilled_occupations_last_check';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

/** Read the current cached snapshot, falling back to the bundled one. */
export async function getSkilledOccupations(): Promise<OccupationsSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as OccupationsSnapshot;
  } catch {}
  return {
    snapshotDate: SKILL_OCCUPATIONS_SNAPSHOT_DATE,
    items: SKILLED_OCCUPATIONS,
  };
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
  if (!opts.force && last) {
    const age = Date.now() - new Date(last).getTime();
    if (age < ONE_DAY_MS) {
      return {
        updated: false,
        snapshot: await getSkilledOccupations(),
        changes: [],
      };
    }
  }

  try {
    const res = await fetch(SKILL_OCCUPATIONS_REMOTE_URL, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = (await res.json()) as OccupationsSnapshot;
    if (!remote?.snapshotDate || !Array.isArray(remote.items)) {
      throw new Error('Invalid snapshot shape');
    }

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

    // Updated (lists or visas changed)
    for (const [key, next] of remoteMap) {
      const prev = currentMap.get(key);
      if (!prev) continue;
      const listsChanged =
        prev.lists.slice().sort().join(',') !== next.lists.slice().sort().join(',');
      const visasChanged =
        prev.visas.slice().sort().join(',') !== next.visas.slice().sort().join(',');
      if (listsChanged || visasChanged) {
        const parts: string[] = [];
        if (listsChanged) {
          parts.push(`lists: ${prev.lists.join('/')} → ${next.lists.join('/')}`);
        }
        if (visasChanged) {
          parts.push(`visas: ${prev.visas.join(',')} → ${next.visas.join(',')}`);
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
 * Search occupations by free text. Matches against ANZSCO code, name, visa
 * subclass, list code, or assessing authority. Returns up to `limit` results.
 */
export function searchOccupations(
  items: SkilledOccupation[],
  query: string,
  limit = 200
): SkilledOccupation[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, limit);
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
