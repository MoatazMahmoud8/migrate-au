/**
 * utils/billing.ts
 *
 * Handles trial activation, upgrade flows, and subscription management
 * Works with Stripe (web) and Apple/Google IAP (mobile)
 */

import firestore from '@react-native-firebase/firestore';
import { UserSubscription, BillingCycle, PaymentMethod } from '../types/subscription';

export const PRICING = {
  monthly: 12.99,    // AUD / month
  yearly: 79.99,     // AUD / year (~$6.67/mo — 49% discount)
  lifetime: 199.99,  // AUD one-time
};

const TRIAL_DAYS = 7;

/**
 * Start a free trial for a user
 */
export async function startTrial(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);

  // Check if trial already used
  if (sub && sub.trialUsed) {
    console.warn('[billing] Trial already used for this user');
    return false;
  }

  const now = Date.now();
  const trialExpiresAt = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;

  await firestore()
    .collection('subscriptions')
    .doc(userId)
    .set(
      {
        tier: 'pro',
        trialStartedAt: now,
        trialExpiresAt,
        trialUsed: false,  // Not marked as "used" until trial ends without conversion
        renewsAt: trialExpiresAt,
        updatedAt: now,
      },
      { merge: true }
    );

  return true;
}

/**
 * Convert trial to paid subscription (activate)
 */
export async function convertTrialToPaid(
  userId: string,
  billingCycle: BillingCycle,
  paymentMethod: PaymentMethod,
  externalIds?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    appleReceiptId?: string;
    googleReceiptId?: string;
  }
): Promise<boolean> {
  const now = Date.now();
  const renewsAt = calculateRenewalDate(now, billingCycle);

  await firestore()
    .collection('subscriptions')
    .doc(userId)
    .set(
      {
        tier: 'pro',
        billingCycle,
        paymentMethod,
        subscribedAt: now,
        renewsAt,
        expiresAt: renewsAt,
        trialUsed: true,
        ...(externalIds || {}),
        updatedAt: now,
      },
      { merge: true }
    );

  return true;
}

/**
 * Handle trial expiration (downgrade to free if no payment)
 */
export async function expireTrialIfPassed(userId: string): Promise<'active' | 'expired'> {
  const sub = await getSubscription(userId);
  if (!sub || sub.tier === 'free') return 'expired';

  // If trial hasn't expired yet
  if (sub.trialExpiresAt && sub.trialExpiresAt > Date.now()) {
    return 'active';
  }

  // If trial expired and no paid subscription
  if (!sub.subscribedAt) {
    await firestore()
      .collection('subscriptions')
      .doc(userId)
      .update({
        tier: 'free',
        trialUsed: true,
        updatedAt: Date.now(),
      });
    return 'expired';
  }

  return 'active';
}

/**
 * Check if subscription needs renewal (auto-renewal or manual prompt)
 */
export async function checkRenewalStatus(userId: string): Promise<{
  status: 'active' | 'expiring_soon' | 'expired';
  daysUntilExpiry?: number;
}> {
  const sub = await getSubscription(userId);
  if (!sub || sub.tier === 'free') return { status: 'expired' };

  const now = Date.now();
  const expiresAt = sub.expiresAt || sub.renewsAt;

  if (!expiresAt) return { status: 'active' };

  const daysUntilExpiry = Math.floor((expiresAt - now) / (24 * 60 * 60 * 1000));

  if (daysUntilExpiry <= 0) {
    return { status: 'expired', daysUntilExpiry: 0 };
  }

  if (daysUntilExpiry <= 7) {
    return { status: 'expiring_soon', daysUntilExpiry };
  }

  return { status: 'active', daysUntilExpiry };
}

/**
 * Cancel subscription (user-initiated)
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  if (!sub) return false;

  const now = Date.now();

  // If already past expiry, already free
  if (sub.expiresAt && sub.expiresAt < now) {
    return true;
  }

  // Mark as cancelled, but keep active until expiresAt
  await firestore()
    .collection('subscriptions')
    .doc(userId)
    .update({
      cancelledAt: now,
      updatedAt: now,
      // Tier stays 'pro' until expiresAt; then manual check downgrades to 'free'
    });

  return true;
}

/**
 * Update subscription after successful payment (called by backend webhook)
 */
export async function updateSubscriptionAfterPayment(
  userId: string,
  billingCycle: BillingCycle,
  paymentMethod: PaymentMethod
): Promise<boolean> {
  const now = Date.now();
  const renewsAt = calculateRenewalDate(now, billingCycle);

  await firestore()
    .collection('subscriptions')
    .doc(userId)
    .update({
      tier: 'pro',
      billingCycle,
      paymentMethod,
      renewsAt,
      expiresAt: renewsAt,
      cancelledAt: null,  // Reactivate if was cancelled
      updatedAt: now,
    });

  return true;
}

/**
 * Get subscription (reused from usage.ts)
 */
async function getSubscription(userId: string): Promise<UserSubscription | null> {
  const snap = await firestore()
    .collection('subscriptions')
    .doc(userId)
    .get();

  if (!snap.exists) return null;
  return snap.data() as UserSubscription;
}

/**
 * Calculate next renewal date
 */
function calculateRenewalDate(now: number, billingCycle: BillingCycle): number {
  const date = new Date(now);

  if (billingCycle === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // Lifetime — set very far future (year 9999) to denote never-expires
    date.setFullYear(9999);
  }

  return date.getTime();
}
