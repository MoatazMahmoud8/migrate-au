/**
 * types/subscription.ts
 *
 * Subscription & billing types for MigrateAU
 */

export type SubscriptionTier = 'free' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentMethod = 'stripe' | 'apple' | 'google';

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  
  // Billing info
  billingCycle?: BillingCycle;          // 'monthly' | 'yearly'
  paymentMethod?: PaymentMethod;        // 'stripe' | 'apple' | 'google'
  
  // Trial & renewal
  trialStartedAt?: number;              // timestamp
  trialExpiresAt?: number;              // timestamp
  trialUsed: boolean;
  
  // Subscription lifecycle
  subscribedAt?: number;                // when they first paid
  renewsAt?: number;                    // next auto-renewal timestamp
  expiresAt?: number;                   // when subscription ends
  cancelledAt?: number;                 // if cancelled (but still active until expiresAt)
  
  // External IDs
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  appleReceiptId?: string;
  googleReceiptId?: string;
  
  // Usage tracking (per calendar month, resets monthly)
  usagePeriodStartedAt: number;         // timestamp of month start
  calculationsUsed: number;             // 0-5 for free, unlimited for pro
  aiMessagesUsed: number;               // 0-5 for free, unlimited for pro
  exportsUsed: number;                  // 0-2 for free, unlimited for pro
  anzscoSearchesUsed: number;           // 0-10 for free, unlimited for pro
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface UsageLimit {
  tier: SubscriptionTier;
  calculations: number;
  aiMessages: number;
  exports: number;
  anzscoSearches: number;
  savedScenarios: number;
  notificationHistoryDays: number;
}

export interface UpgradePrompt {
  id: string;
  type: 'limit_reached' | 'feature_gate' | 'soft_nudge' | 'pain_point' | 'fomo';
  feature: string;                      // 'scenarios' | 'ai' | 'pdf_export' etc.
  message: string;
  cta: string;                          // 'upgrade' | 'trial' | 'learn_more'
  dismissible: boolean;
  showFrequency: 'once' | 'per_limit' | 'recurring';
}
