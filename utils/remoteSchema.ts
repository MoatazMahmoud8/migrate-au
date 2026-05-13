/**
 * Lightweight runtime schema validators for remote JSON snapshots.
 *
 * We deliberately avoid pulling in zod to keep bundle size small. These
 * validators reject malformed shapes, type-confusion attempts, and obvious
 * abuse (e.g. an attacker-controlled CDN serving objects with a million
 * entries or 10 MB strings).
 */
import type { ProcessingTime } from '../constants/processingTimes';
import type { SkilledOccupation, SkillList } from '../constants/skilledOccupations';

// --- Hard limits ----------------------------------------------------------
const MAX_ITEMS = 5000;          // sane upper bound for either feed
const MAX_STR = 200;             // any single string field
const MAX_DETAIL_STR = 2000;     // assessing authority text, etc.
const MAX_LISTS = 10;
const MAX_VISAS = 20;
const MAX_STATE_VISAS = 10;

const ALLOWED_LISTS = new Set<SkillList>(['CSOL', 'MLTSSL', 'STSOL', 'ROL']);
const ALLOWED_STATES = new Set([
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
]);

// --- Helpers --------------------------------------------------------------
function isStr(v: unknown, max = MAX_STR): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}
function isOptStr(v: unknown, max = MAX_STR): v is string | undefined {
  return v === undefined || (typeof v === 'string' && v.length <= max);
}
function isStrArray(v: unknown, max: number, perItemMax = 50): v is string[] {
  if (!Array.isArray(v) || v.length > max) return false;
  return v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= perItemMax);
}
function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 30) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

// --- Skilled Occupations --------------------------------------------------
export interface ValidatedOccupationsSnapshot {
  snapshotDate: string;
  items: SkilledOccupation[];
}

export function validateOccupationsSnapshot(
  raw: unknown
): ValidatedOccupationsSnapshot {
  if (!raw || typeof raw !== 'object') throw new Error('snapshot: not an object');
  const obj = raw as Record<string, unknown>;
  if (!isIsoDate(obj.snapshotDate)) throw new Error('snapshot: bad snapshotDate');
  if (!Array.isArray(obj.items)) throw new Error('snapshot: items not array');
  if (obj.items.length > MAX_ITEMS) throw new Error('snapshot: too many items');

  const items: SkilledOccupation[] = [];
  const seenKeys = new Set<string>();
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;

    if (!isStr(o.anzsco, 12)) continue;
    if (!isStr(o.name)) continue;
    if (!isStr(o.group)) continue;
    if (!isStrArray(o.lists, MAX_LISTS, 16)) continue;
    if (!isStrArray(o.visas, MAX_VISAS, 16)) continue;
    if (!isOptStr(o.assessingAuthority, MAX_DETAIL_STR)) continue;

    // List values must be from the allowed set
    const lists = (o.lists as string[]).filter((l) =>
      ALLOWED_LISTS.has(l as SkillList)
    ) as SkillList[];

    // States: optional Record<StateCode, string[]>
    let states: SkilledOccupation['states'] | undefined;
    if (o.states !== undefined) {
      if (!o.states || typeof o.states !== 'object' || Array.isArray(o.states)) continue;
      const s = o.states as Record<string, unknown>;
      const cleaned: Record<string, string[]> = {};
      let ok = true;
      for (const code of Object.keys(s)) {
        if (!ALLOWED_STATES.has(code)) continue;
        if (!isStrArray(s[code], MAX_STATE_VISAS, 16)) { ok = false; break; }
        cleaned[code] = s[code] as string[];
      }
      if (!ok) continue;
      states = cleaned as SkilledOccupation['states'];
    }

    // Dedupe by ANZSCO key
    if (seenKeys.has(o.anzsco as string)) continue;
    seenKeys.add(o.anzsco as string);

    items.push({
      anzsco: o.anzsco as string,
      name: o.name as string,
      group: o.group as string,
      lists,
      visas: o.visas as string[],
      assessingAuthority: o.assessingAuthority as string | undefined,
      states,
    });
  }

  if (items.length === 0) throw new Error('snapshot: no valid items');
  return { snapshotDate: obj.snapshotDate, items };
}

// --- Processing Times -----------------------------------------------------
export interface ValidatedProcessingTimesSnapshot {
  snapshotDate: string;
  items: ProcessingTime[];
}

export function validateProcessingTimesSnapshot(
  raw: unknown
): ValidatedProcessingTimesSnapshot {
  if (!raw || typeof raw !== 'object') throw new Error('snapshot: not an object');
  const obj = raw as Record<string, unknown>;
  if (!isIsoDate(obj.snapshotDate)) throw new Error('snapshot: bad snapshotDate');
  if (!Array.isArray(obj.items)) throw new Error('snapshot: items not array');
  if (obj.items.length > MAX_ITEMS) throw new Error('snapshot: too many items');

  const items: ProcessingTime[] = [];
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;

    if (!isStr(p.subclass, 32)) continue;
    if (!isStr(p.name)) continue;
    if (!isStr(p.p50, 32)) continue;
    if (!isStr(p.p90, 32)) continue;
    if (!isStr(p.category, 64)) continue;
    if (!isStr(p.icon, 64)) continue;
    if (!isStr(p.color, 32)) continue;
    if (!isStr(p.url, 500)) continue;
    if (!isOptStr(p.stream, 64)) continue;

    // Reject non-https URLs (no javascript:, data:, file:)
    if (!(p.url as string).startsWith('https://')) continue;

    items.push({
      subclass: p.subclass as string,
      name: p.name as string,
      p50: p.p50 as string,
      p90: p.p90 as string,
      category: p.category as ProcessingTime['category'],
      icon: p.icon as string,
      color: p.color as string,
      url: p.url as string,
      stream: p.stream as string | undefined,
    });
  }

  if (items.length === 0) throw new Error('snapshot: no valid items');
  return { snapshotDate: obj.snapshotDate, items };
}
