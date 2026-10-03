/**
 * newsDisplay.ts
 *
 * Shared presentation helpers for rendering `news_items` (media-sourced
 * migration news) consistently across the Home screen and Updates tab.
 *
 * CRITICAL RULE: never render a raw competitor URL as a headline. Always
 * fall back to a safe generic label instead.
 */
import { NewsItem } from './newsFeed';

const URL_PATTERN = /^https?:\/\//i;

// IMPORTANT: competitor migration-agency blogs (VisaEnvoy, SeekVisa,
// Pathway to Aus, Iscah, Smart Visa Guide, Australia Visa, etc.) are
// deliberately NOT named here — naming them acts as free advertising for
// competing agencies. They fall through to the generic "Media Report" label.
// Only official government domains and neutral press outlets are named.
const KNOWN_SOURCES: Record<string, string> = {
  'theguardian.com': 'The Guardian Australia',
  'www.theguardian.com': 'The Guardian Australia',
  'sbs.com.au': 'SBS News',
  'www.sbs.com.au': 'SBS News',
  'abc.net.au': 'ABC News',
  'www.abc.net.au': 'ABC News',
  'immi.homeaffairs.gov.au': 'Department of Home Affairs',
  'homeaffairs.gov.au': 'Department of Home Affairs',
  'legislation.gov.au': 'Federal Register of Legislation',
  'www.legislation.gov.au': 'Federal Register of Legislation',
};

function hostnameOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Safe headline for a news card. NEVER falls back to a raw URL — if nothing
 * usable is present, returns a neutral generic label instead.
 */
export function getNewsHeadline(item: NewsItem): string {
  const candidate = (item as any).headline || item.title;
  if (candidate && !URL_PATTERN.test(candidate.trim())) {
    return candidate;
  }
  return 'Migration Policy Update';
}

/** Clean, human-readable source attribution — never a raw link. */
export function getNewsSourceLabel(item: NewsItem): string {
  const isOfficial = Boolean((item as any).is_official);
  if (isOfficial) return 'Official Government Update';
  const host = hostnameOf(item.sourceUrl || item.url);
  if (host && KNOWN_SOURCES[host]) return KNOWN_SOURCES[host];
  return 'Media Report';
}

export interface SummaryBullet {
  label: string;
  text: string;
}

/** Structured 3-bullet summary (whatChanged / whoIsAffected / actionRequired). */
export function getNewsSummaryBullets(item: NewsItem): SummaryBullet[] {
  const summary = (item as any).summary;
  if (!summary || typeof summary !== 'object') return [];
  const bullets: SummaryBullet[] = [];
  if (summary.whatChanged) bullets.push({ label: 'What changed', text: summary.whatChanged });
  if (summary.whoIsAffected) bullets.push({ label: 'Who is affected', text: summary.whoIsAffected });
  if (summary.actionRequired) bullets.push({ label: 'Action required', text: summary.actionRequired });
  return bullets;
}

/** Visa subclass pills, e.g. ["500", "482"]. */
export function getNewsVisaPills(item: NewsItem): string[] {
  const visas = (item as any).impactedVisas;
  if (!Array.isArray(visas)) return [];
  return visas.filter((v) => typeof v === 'string' && v.trim().length > 0);
}

export function getNewsUrl(item: NewsItem): string | undefined {
  return item.url || item.sourceUrl;
}

export function requiresVerification(item: NewsItem): boolean {
  return Boolean((item as any).requires_verification) && !(item as any).is_official;
}
