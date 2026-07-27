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
import type { VisaFeeEntry } from '../constants/visaFees';

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
  schemaVersion: number;
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
  if (obj.schemaVersion !== undefined &&
      (!Number.isInteger(obj.schemaVersion) || (obj.schemaVersion as number) < 1)) {
    throw new Error('snapshot: bad schemaVersion');
  }

  const inferredSchemaVersion = obj.items.every((item) =>
    !!item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).streams)
  ) ? 2 : 1;
  const schemaVersion = (obj.schemaVersion as number | undefined) ?? inferredSchemaVersion;

  const items: ProcessingTime[] = [];
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;

    if (!isStr(p.subclass, 32)) continue;
    if (!isStr(p.name)) continue;
    if (!isStr(p.category, 64)) continue;
    if (!isStr(p.icon, 64)) continue;
    if (!isStr(p.color, 32)) continue;
    if (!isStr(p.url, 500)) continue;

    // Reject non-https URLs
    if (!(p.url as string).startsWith('https://')) continue;

    // Resolve streams: support new format (streams[]) and legacy format (p50/p90/stream)
    let streams: ProcessingTime['streams'] = [];
    if (Array.isArray(p.streams)) {
      for (const s of p.streams) {
        if (!s || typeof s !== 'object') continue;
        const sv = s as Record<string, unknown>;
        if (!isStr(sv.p50, 32) || !isStr(sv.p90, 32)) continue;
        streams.push({ name: isStr(sv.name, 64) ? sv.name as string : undefined, p50: sv.p50 as string, p90: sv.p90 as string });
      }
    } else if (isStr(p.p50, 32) && isStr(p.p90, 32)) {
      // Legacy single-stream format
      streams = [{ name: isOptStr(p.stream, 64) ? p.stream as string : undefined, p50: p.p50 as string, p90: p.p90 as string }];
    }
    if (streams.length === 0) continue;

    items.push({
      subclass: p.subclass as string,
      name: p.name as string,
      category: p.category as ProcessingTime['category'],
      icon: p.icon as string,
      color: p.color as string,
      url: p.url as string,
      streams,
      fee: isOptStr(p.fee, 64) ? p.fee as string : undefined,
      familyFeeAdult: isOptStr(p.familyFeeAdult, 64) ? p.familyFeeAdult as string : undefined,
      familyFeeChild: isOptStr(p.familyFeeChild, 64) ? p.familyFeeChild as string : undefined,
      conditions: Array.isArray(p.conditions)
        ? (p.conditions as unknown[]).filter((c): c is string => typeof c === 'string' && c.length < 300).slice(0, 10)
        : undefined,
    });
  }

  if (items.length === 0) throw new Error('snapshot: no valid items');
  return { schemaVersion, snapshotDate: obj.snapshotDate, items };
}

// --- Visa Fees ------------------------------------------------------------
export interface ValidatedVisaFeesSnapshot {
  snapshotDate: string;
  items: VisaFeeEntry[];
}

const MAX_FEES = 200;
// Only allow numeric subclass codes, 2–4 digits
const SUBCLASS_RE = /^\d{2,4}$/;

export function validateVisaFeesSnapshot(
  raw: unknown
): ValidatedVisaFeesSnapshot {
  if (!raw || typeof raw !== 'object') throw new Error('fees snapshot: not an object');
  const obj = raw as Record<string, unknown>;
  if (!isIsoDate(obj.snapshotDate)) throw new Error('fees snapshot: bad snapshotDate');
  if (!Array.isArray(obj.items)) throw new Error('fees snapshot: items not array');
  if (obj.items.length > MAX_FEES) throw new Error('fees snapshot: too many items');

  const items: VisaFeeEntry[] = [];
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;

    if (!isStr(f.subclass, 8)) continue;
    if (!SUBCLASS_RE.test(f.subclass as string)) continue;
    if (!isStr(f.fee, 80)) continue;
    if (!isOptStr(f.note, 120)) continue;

    items.push({
      subclass: f.subclass as string,
      fee: f.fee as string,
      note: f.note as string | undefined,
    });
  }

  if (items.length === 0) throw new Error('fees snapshot: no valid items');
  return { snapshotDate: obj.snapshotDate as string, items };
}
