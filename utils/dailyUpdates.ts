/**
 * Fetches the latest visa metadata (cost, processing cutoff, next invitation
 * round) from Firebase Hosting. Backed by daily_monitor.py running on a
 * schedule. Cached in AsyncStorage for 12 h.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const URL = 'https://swift-shore-238707.web.app/daily-updates.json';
const CACHE_KEY = '@daily_updates_v1';
const TTL_MS = 12 * 60 * 60 * 1000;

export interface VisaMeta {
  code: string;
  cost: string | null;
  processingCutoffLabel: string | null;
  stayDuration: string | null;
}

export interface NextRound {
  subclass: string;
  date: string | null;
  raw: string;
}

export interface DailyUpdates {
  generatedAt: string;
  date: string;
  currentRound: {
    date: string | null;
    sc189Total: number;
    sc189TieBreak: string | null;
    sc491FamilyTotal: number;
    sc491FamilyTieBreak: string | null;
  } | null;
  nextRound: NextRound | null;
  communityFeed: {
    source: string;
    dailyReportDate: string | null;
    recentGrants: string[];
  };
  visaSummary: VisaMeta[];
}

// Sensible defaults used until live data arrives
export const DEFAULT_VISA_META: Record<string, VisaMeta> = {
  '189': { code: '189', cost: 'AUD $4,885', processingCutoffLabel: null, stayDuration: 'Permanent' },
  '190': { code: '190', cost: 'AUD $4,885', processingCutoffLabel: 'Feb 2025', stayDuration: 'Permanent' },
  '491': { code: '491', cost: 'AUD $4,910', processingCutoffLabel: 'Jan 2025', stayDuration: '5 Years' },
  '482': { code: '482', cost: 'AUD $3,210', processingCutoffLabel: null, stayDuration: '1–4 Years' },
};

export async function getDailyUpdates(): Promise<DailyUpdates | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < TTL_MS) return data;
    }
  } catch {}

  try {
    const res = await fetch(URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as DailyUpdates;
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() }),
    );
    return data;
  } catch {
    return null;
  }
}

export function buildVisaMetaMap(updates: DailyUpdates | null): Record<string, VisaMeta> {
  const map: Record<string, VisaMeta> = { ...DEFAULT_VISA_META };
  if (updates?.visaSummary) {
    for (const v of updates.visaSummary) {
      map[v.code] = { ...map[v.code], ...v };
    }
  }
  return map;
}
