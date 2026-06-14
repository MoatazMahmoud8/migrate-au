/**
 * sourceValidator.ts
 *
 * Implements sourcing and content curation rules for news and migration updates:
 * - Enforces attribution to official government sources
 * - Prevents linking to competitors (JSM Global, other migration agents)
 * - Manages in-app vs external URL handling
 * - Validates source credibility for App Store compliance
 */

// ─── Approved Sources (Government + Neutral Media) ───────────────────────────

const APPROVED_SOURCES = {
  // Official Australian Government
  DEPARTMENT_HOME_AFFAIRS: 'Department of Home Affairs',
  SKILLSELECT: 'SkillSelect',
  IMMI_ACCOUNT: 'ImmiAccount',
  
  // State Migration Bodies
  MIGRATION_QUEENSLAND: 'Migration Queensland',
  LIVE_IN_MELBOURNE: 'Live in Melbourne',
  SKILLED_WA: 'Skilled WA',
  MIGRATION_SA: 'Migration SA',
  MIGRATION_TASMANIA: 'Migration Tasmania',
  MIGRATION_ACT: 'Migration ACT',
  NORTHERN_TERRITORY: 'Invest NT',
  
  // Neutral Australian Media
  ABC_NEWS: 'ABC News',
  SBS_NEWS: 'SBS News',
  GUARDIAN_AU: 'The Guardian Australia',
  
  // In-House Analysis
  AMG_ANALYSIS: 'AMG Analysis',
  AMG_IMMIGRATION_NETWORK: 'AMG Immigration Network',
};

// ─── Blocked Competitors & Agents ────────────────────────────────────────────

const BLOCKED_DOMAINS = [
  'jsmglobal.com',
  'jsmglobal.xyz',
  'jsmglobal.com.au',
  'jsmglobal.au',
  'migrationagent.com.au',
  'migrationlawyer.com',
  'immiassist.com',
  'e-migrate.com.au',
  'visaassistance.com.au',
  'immigrationaustralia.com.au',
  'myimmiagent.com',
  'smartvisaguide.com',
  'smartvisaguide.com.au',
  'smartvisa.com',
  'smartvisa.com.au',
];

const BLOCKED_KEYWORDS = [
  'migration agent',
  'migration lawyer',
  'visa lawyer',
  'migration assistant',
  'migration specialist',
];

// ─── Safe URL Domains (Open in InAppBrowser) ────────────────────────────────

const SAFE_URL_DOMAINS = [
  'immi.homeaffairs.gov.au',
  'immicount.homeaffairs.gov.au',
  'skillselect.gov.au',
  'homeaffairs.gov.au',
  'australia.gov.au',
  'abc.net.au',
  'sbs.com.au',
  'theguardian.com/australia',
  'qld.gov.au',
  'vic.gov.au',
  'nsw.gov.au',
  'wa.gov.au',
  'sa.gov.au',
  'tas.gov.au',
  'act.gov.au',
  'nt.gov.au',
];

/**
 * Validates if a source is approved and credible
 */
export function isApprovedSource(source: string): boolean {
  return Object.values(APPROVED_SOURCES).some(
    (approved) => approved.toLowerCase() === source.toLowerCase()
  );
}

/**
 * Validates if a URL is safe to link to (no competitor links)
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // Block competitor domains
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked)) {
        console.warn(`[sourceValidator] Blocked competitor URL: ${url}`);
        return false;
      }
    }

    // Allow only safe government/media domains
    return SAFE_URL_DOMAINS.some((safe) => hostname.includes(safe));
  } catch (e) {
    console.warn(`[sourceValidator] Invalid URL: ${url}`);
    return false;
  }
}

/**
 * Sanitizes and validates a notification URL
 * Returns null if URL is unsafe or to a competitor
 */
export function sanitizeNotificationUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!isSafeUrl(url)) return null;
  return url;
}

/**
 * Checks if content mentions competitors (for moderation)
 */
export function containsCompetitorMentions(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

/**
 * Gets a sanitized source attribution
 * Falls back to AMG Analysis if source is invalid
 */
export function getSafeSource(source: string | null | undefined): string {
  if (!source) return APPROVED_SOURCES.AMG_ANALYSIS;
  if (isApprovedSource(source)) return source;
  
  // Unknown source: default to AMG Analysis to avoid crediting competitors
  console.warn(`[sourceValidator] Unknown source "${source}" - defaulting to AMG Analysis`);
  return APPROVED_SOURCES.AMG_ANALYSIS;
}

/**
 * Maps government announcements to official source attribution
 * This ensures we always credit the original source, not the intermediary
 */
export const SOURCE_MAPPING = {
  // Visa announcements → Department of Home Affairs
  'visa change': APPROVED_SOURCES.DEPARTMENT_HOME_AFFAIRS,
  'visa subclass': APPROVED_SOURCES.DEPARTMENT_HOME_AFFAIRS,
  'processing time': APPROVED_SOURCES.DEPARTMENT_HOME_AFFAIRS,
  'policy update': APPROVED_SOURCES.DEPARTMENT_HOME_AFFAIRS,
  
  // Invitation rounds → SkillSelect
  'skillselect round': APPROVED_SOURCES.SKILLSELECT,
  'invitation round': APPROVED_SOURCES.SKILLSELECT,
  
  // Occupation list → Department of Home Affairs
  'anzsco': APPROVED_SOURCES.DEPARTMENT_HOME_AFFAIRS,
  'occupation list': APPROVED_SOURCES.DEPARTMENT_HOME_AFFAIRS,
  
  // State nominations → State bodies
  'state nomination': 'State Migration Authority',
};

/**
 * Gets the primary source based on category
 */
export function getPrimarySourceForCategory(category: string): string {
  const lowerCategory = category.toLowerCase();
  for (const [key, source] of Object.entries(SOURCE_MAPPING)) {
    if (lowerCategory.includes(key)) {
      return source;
    }
  }
  return APPROVED_SOURCES.AMG_ANALYSIS;
}

export const SourceValidator = {
  isApprovedSource,
  isSafeUrl,
  sanitizeNotificationUrl,
  containsCompetitorMentions,
  getSafeSource,
  getPrimarySourceForCategory,
  APPROVED_SOURCES,
  BLOCKED_DOMAINS,
};
