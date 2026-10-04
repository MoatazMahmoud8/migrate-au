import { UserProfile, UsageLimits } from '../constants/types';

const MONTH_FORMAT = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const PAYWALL_LIMITS = {
  calculatorUses: 3,
  aiMessages: 3,
  anzscoSearches: 10,
  journeyEntries: 1,
  stateSubscriptions: 2,
  notificationHistoryDays: 7,      // Free: last 7 days; Premium: full
  realtimeAlerts: false,             // Free: no real-time; Premium: yes
  pdfExport: false,                  // Free: no; Premium: yes
  darkMode: false,                   // Free: no; Premium: yes
};

/**
 * Check if monthly usage limits need to be reset
 */
export function shouldResetMonthlyLimits(lastResetMonth: string | undefined): boolean {
  const currentMonth = MONTH_FORMAT();
  return !lastResetMonth || lastResetMonth !== currentMonth;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check if the rolling 24h window for aiMessages has elapsed.
 */
export function shouldResetDailyAiLimit(aiMessagesResetAt: string | undefined): boolean {
  if (!aiMessagesResetAt) return true;
  const resetAt = new Date(aiMessagesResetAt).getTime();
  if (Number.isNaN(resetAt)) return true;
  return Date.now() - resetAt >= DAY_MS;
}

/**
 * Get fresh usage limits for current month
 */
export function getFreshUsageLimits(): UsageLimits {
  return {
    calculatorUses: 0,
    aiMessages: 0,
    anzscoSearches: 0,
    lastResetMonth: MONTH_FORMAT(),
    aiMessagesResetAt: new Date().toISOString(),
  };
}

/**
 * Ensure usage limits are initialized and reset if needed.
 *
 * calculatorUses / anzscoSearches reset monthly; aiMessages resets on its
 * own rolling 24h window (independent of the calendar month) since Aria's
 * free quota is "3 messages per 24 hours", not "3 per month".
 */
export function ensureUsageLimits(profile: UserProfile): UsageLimits {
  if (!profile.usageLimits || shouldResetMonthlyLimits(profile.usageLimits.lastResetMonth)) {
    return getFreshUsageLimits();
  }

  let limits = profile.usageLimits;
  if (shouldResetDailyAiLimit(limits.aiMessagesResetAt)) {
    limits = { ...limits, aiMessages: 0, aiMessagesResetAt: new Date().toISOString() };
  }
  return limits;
}

/**
 * Check if user has exceeded limit for a feature
 */
export function hasExceededLimit(
  feature: 'calculator' | 'aiMessages' | 'anzscoSearches',
  profile: UserProfile
): boolean {
  if (profile.isPremium) return false; // Premium users have unlimited

  const limits = ensureUsageLimits(profile);
  const key = feature === 'calculator' ? 'calculatorUses' : feature === 'aiMessages' ? 'aiMessages' : 'anzscoSearches';
  
  return limits[key] >= PAYWALL_LIMITS[key];
}

/**
 * Check if user can add another journey entry
 */
export function canAddJourneyEntry(profile: UserProfile): boolean {
  if (profile.isPremium) return true; // Premium: up to 10 entries
  return (profile.journeyEntries?.length ?? 0) < PAYWALL_LIMITS.journeyEntries;
}

/**
 * Check if user can add another state subscription
 */
export function canAddStateSubscription(profile: UserProfile): boolean {
  if (profile.isPremium) return true; // Premium: unlimited
  return (profile.subscribedStates?.length ?? 0) < PAYWALL_LIMITS.stateSubscriptions;
}

/**
 * Check if user has access to real-time alerts
 */
export function hasRealtimeAlerts(profile: UserProfile): boolean {
  return profile.isPremium; // Only premium users get real-time
}

/**
 * Check if user can export to PDF
 */
export function canExportPDF(profile: UserProfile): boolean {
  return profile.isPremium; // Only premium users
}

/**
 * Check if user has dark mode
 */
export function hasDarkMode(profile: UserProfile): boolean {
  return profile.isPremium; // Only premium users
}

/**
 * Get notification history limit in days
 */
export function getNotificationHistoryDays(profile: UserProfile): number {
  return profile.isPremium ? 365 * 1.5 : PAYWALL_LIMITS.notificationHistoryDays; // 18 months vs 7 days
}

/**
 * Get remaining uses for a feature
 */
export function getRemainingUses(
  feature: 'calculator' | 'aiMessages' | 'anzscoSearches',
  profile: UserProfile
): number | null {
  if (profile.isPremium) return null; // Unlimited

  const limits = ensureUsageLimits(profile);
  const key = feature === 'calculator' ? 'calculatorUses' : feature === 'aiMessages' ? 'aiMessages' : 'anzscoSearches';
  
  return Math.max(0, PAYWALL_LIMITS[key] - limits[key]);
}

/**
 * Increment usage and save
 */
export function incrementUsage(
  feature: 'calculator' | 'aiMessages' | 'anzscoSearches',
  profile: UserProfile
): UserProfile {
  if (profile.isPremium) return profile; // No tracking for premium

  const limits = ensureUsageLimits(profile);
  const key = feature === 'calculator' ? 'calculatorUses' : feature === 'aiMessages' ? 'aiMessages' : 'anzscoSearches';
  
  return {
    ...profile,
    usageLimits: {
      ...limits,
      [key]: limits[key] + 1,
    },
  };
}
