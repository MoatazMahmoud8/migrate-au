/**
 * utils/usage.ts
 *
 * Tracks Free tier usage limits (calculations, AI messages, exports, etc.)
 * Enforces limits and provides upgrade prompts
 */

import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { UserSubscription, UsageLimit, SubscriptionTier } from '../types/subscription';

const USAGE_LIMITS: Record<SubscriptionTier, UsageLimit> = {
  free: {
    tier: 'free',
    calculations: 5,
    aiMessages: 5,
    exports: 2,
    anzscoSearches: 10,
    savedScenarios: 1,
    notificationHistoryDays: 7,
  },
  pro: {
    tier: 'pro',
    calculations: Infinity,
    aiMessages: Infinity,
    exports: Infinity,
    anzscoSearches: Infinity,
    savedScenarios: 10,
    notificationHistoryDays: 365,
  },
};

/**
 * Get current subscription & usage for a user
 */
export async function getSubscription(userId: string): Promise<UserSubscription | null> {
  if (Platform.OS === 'web') return null;
  const snap = await firestore()
    .collection('subscriptions')
    .doc(userId)
    .get();
  
  if (!snap.exists) return null;
  return snap.data() as UserSubscription;
}

/**
 * Record usage of a feature
 */
export async function recordUsage(
  userId: string,
  feature: 'calculation' | 'ai_message' | 'export' | 'anzsco_search'
): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const sub = await getSubscription(userId);
  if (!sub) {
    // First-time user → create free subscription
    await initializeSubscription(userId);
    return true;
  }

  // Check if usage is within limit for this month
  const limit = USAGE_LIMITS[sub.tier];
  const featureKey = `${feature}sUsed`;
  const currentUsage = sub[featureKey as keyof UserSubscription] as number;
  const featureLimitKey = feature === 'ai_message' ? 'aiMessages' : 
                         feature === 'anzsco_search' ? 'anzscoSearches' : 
                         feature === 'pdf_export' ? 'exports' : 'calculations';
  const monthlyLimit = limit[featureLimitKey as keyof UsageLimit] as number;

  // If Pro → always allow
  if (sub.tier === 'pro') return true;

  // If Free + at limit → deny
  if (currentUsage >= monthlyLimit) return false;

  // Increment counter
  const updateKey = `${feature}sUsed`;
  await firestore()
    .collection('subscriptions')
    .doc(userId)
    .update({
      [updateKey]: firestore.FieldValue.increment(1),
      updatedAt: Date.now(),
    });

  return true;
}

/**
 * Get remaining usage for a feature (Free tier only)
 */
export async function getRemainingUsage(
  userId: string,
  feature: 'calculation' | 'ai_message' | 'export' | 'anzsco_search'
): Promise<{ remaining: number; limit: number; tier: SubscriptionTier }> {
  if (Platform.OS === 'web') return { remaining: Infinity, limit: Infinity, tier: 'pro' };
  const sub = await getSubscription(userId);
  if (!sub) {
    // New user = free tier limits
    const freeLimit = USAGE_LIMITS.free;
    const featureKey = feature === 'ai_message' ? 'aiMessages' : 
                      feature === 'anzsco_search' ? 'anzscoSearches' : 
                      feature === 'pdf_export' ? 'exports' : 'calculations';
    return {
      remaining: freeLimit[featureKey as keyof UsageLimit] as number,
      limit: freeLimit[featureKey as keyof UsageLimit] as number,
      tier: 'free',
    };
  }

  const limit = USAGE_LIMITS[sub.tier];
  const featureKey = `${feature}sUsed`;
  const currentUsage = sub[featureKey as keyof UserSubscription] as number;
  const limitKey = feature === 'ai_message' ? 'aiMessages' : 
                  feature === 'anzsco_search' ? 'anzscoSearches' : 
                  feature === 'pdf_export' ? 'exports' : 'calculations';
  const monthlyLimit = limit[limitKey as keyof UsageLimit] as number;

  return {
    remaining: Math.max(0, monthlyLimit - currentUsage),
    limit: monthlyLimit,
    tier: sub.tier,
  };
}

/**
 * Check if feature is available (not locked by tier or limit)
 */
export async function canUseFeature(
  userId: string,
  feature: 'scenario_planner' | 'aria_pro' | 'state_alerts' | 'advanced_analytics' | 'pdf_export'
): Promise<{
  allowed: boolean;
  reason?: 'free_tier' | 'limit_reached';
  upgrade?: boolean;
}> {
  if (Platform.OS === 'web') return { allowed: true };
  const sub = await getSubscription(userId);
  if (!sub) return { allowed: feature === 'calculator', reason: 'free_tier' };

  // These features require Pro
  const proOnlyFeatures = ['scenario_planner', 'aria_pro', 'state_alerts', 'advanced_analytics'];
  if (proOnlyFeatures.includes(feature) && sub.tier === 'free') {
    return { allowed: false, reason: 'free_tier', upgrade: true };
  }

  // For Free tier, check monthly limits
  if (sub.tier === 'free' && feature === 'pdf_export') {
    if (sub.exportsUsed >= USAGE_LIMITS.free.exports) {
      return { allowed: false, reason: 'limit_reached', upgrade: true };
    }
  }

  return { allowed: true };
}

/**
 * Initialize subscription for a new user (free tier)
 */
async function initializeSubscription(userId: string) {
  const now = Date.now();
  const monthStart = getMonthStart(now);

  await firestore()
    .collection('subscriptions')
    .doc(userId)
    .set({
      userId,
      tier: 'free',
      trialUsed: false,
      usagePeriodStartedAt: monthStart,
      calculationsUsed: 0,
      aiMessagesUsed: 0,
      exportsUsed: 0,
      anzscoSearchesUsed: 0,
      createdAt: now,
      updatedAt: now,
    });
}

/**
 * Reset monthly usage counters if month has changed
 */
export async function resetMonthlyUsageIfNeeded(userId: string) {
  if (Platform.OS === 'web') return;
  const sub = await getSubscription(userId);
  if (!sub) return;

  const now = Date.now();
  const monthStart = getMonthStart(now);
  
  if (sub.usagePeriodStartedAt < monthStart) {
    await firestore()
      .collection('subscriptions')
      .doc(userId)
      .update({
        usagePeriodStartedAt: monthStart,
        calculationsUsed: 0,
        aiMessagesUsed: 0,
        exportsUsed: 0,
        anzscoSearchesUsed: 0,
        updatedAt: now,
      });
  }
}

function getMonthStart(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date.getTime();
}
