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

/**
 * Get fresh usage limits for current month
 */
export function getFreshUsageLimits(): UsageLimits {
  return {
    calculatorUses: 0,
    aiMessages: 0,
    anzscoSearches: 0,
    lastResetMonth: MONTH_FORMAT(),
  };
}

/**
 * Ensure usage limits are initialized and reset if needed
 */
export function ensureUsageLimits(profile: UserProfile): UsageLimits {
  if (!profile.usageLimits || shouldResetMonthlyLimits(profile.usageLimits.lastResetMonth)) {
    return getFreshUsageLimits();
  }
  return profile.usageLimits;
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
