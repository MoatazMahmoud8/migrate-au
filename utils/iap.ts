/**
 * utils/iap.ts
 *
 * In-App Purchases via RevenueCat (Apple + Google)
 * Handles trial activation and subscription purchase
 */

import Purchases, {
  PurchasesPackage,
  PurchasesOffering,
  CustomerInfo,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { BillingCycle, PaymentMethod } from '../types/subscription';
import { convertTrialToPaid, startTrial, PRICING } from './billing';
import { saveProfile } from './storage';

// RevenueCat API keys — read from app.config.js extra (set via .env / EAS secrets)
const REVENUECAT_API_KEY_IOS: string     = Constants.expoConfig?.extra?.revenueCatKeyIos ?? '';
const REVENUECAT_API_KEY_ANDROID: string = Constants.expoConfig?.extra?.revenueCatKeyAndroid ?? '';

// RevenueCat entitlement ID — must match dashboard configuration
const ENTITLEMENT_ID = 'premium';

// RevenueCat package identifiers (from the "default" offering)
// These are RC's standard identifiers — they map to your store products in the dashboard
const PACKAGES = {
  monthly:  '$rc_monthly',   // → AUD $12.99 / month
  annual:   '$rc_annual',    // → AUD $79.99 / year
  lifetime: '$rc_lifetime',  // → AUD $199 one-time (amg-lifetime-199)
};

let rcInitialized = false;

/**
 * Get RevenueCat's anonymous app user ID (stable per-install)
 * Use this as userId everywhere instead of hardcoded strings
 */
export async function getRevenueCatUserId(): Promise<string> {
  try {
    return await Purchases.getAppUserID();
  } catch {
    return 'anonymous';
  }
}

/**
 * Sync RC entitlement → local AsyncStorage isPremium flag.
 * Call on app start and after any purchase/restore.
 */
export async function syncSubscriptionStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
    await saveProfile({ isPremium: isActive });
    console.log('[IAP] Subscription synced, isPremium:', isActive);
    return isActive;
  } catch (err) {
    console.warn('[IAP] syncSubscriptionStatus error:', err);
    return false;
  }
}

/**
 * Initialize RevenueCat (call once on app start)
 */
export async function initRevenueCat() {
  if (rcInitialized) return;

  try {
    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_IOS
      : REVENUECAT_API_KEY_ANDROID;

    await Purchases.configure({ apiKey });
    rcInitialized = true;
    console.log('[IAP] RevenueCat initialized on', Platform.OS);
  } catch (err) {
    console.warn('[IAP] RevenueCat init error:', err);
  }
}

/**
 * Get available offerings/packages
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (err) {
    console.warn('[IAP] Error fetching offerings:', err);
    return null;
  }
}

/**
 * Start a free trial (7 days)
 */
export async function startFreeTrialIAP(userId: string): Promise<boolean> {
  try {
    const offering = await getOfferings();
    if (!offering) throw new Error('No offerings available');

    // RC's "default" offering doesn't include a separate trial package — trials are
    // configured as an intro offer on the monthly/annual products in the store.
    // Use the annual package so the user lands on the best-value plan after trial.
    const trialPackage = offering.availablePackages.find(
      p => p.identifier === PACKAGES.annual
    ) || offering.annual || offering.monthly;

    if (!trialPackage) {
      console.warn('[IAP] Trial package not found');
      // Fallback: start trial in Firestore without IAP
      return await startTrial(userId);
    }

    // Purchase the trial package
    try {
      const purchaseResult = await Purchases.purchasePackage(trialPackage);
      const hasEntitlement = purchaseResult.customerInfo.entitlements.active[ENTITLEMENT_ID] != null;

      if (hasEntitlement) {
        // Update Firestore
        await startTrial(userId);
        return true;
      }
    } catch (err: any) {
      // If user cancels or error, just start trial in Firestore
      if (err.code !== 'PurchaseCancelledError') {
        throw err;
      }
      return await startTrial(userId);
    }

    return false;
  } catch (err) {
    console.warn('[IAP] Trial error:', err);
    return false;
  }
}

/**
 * Purchase a subscription (monthly, yearly, or lifetime)
 * Returns { success, cancelled, message } so caller can surface real errors.
 */
export async function purchaseSubscription(
  userId: string,
  billingCycle: BillingCycle
): Promise<{ success: boolean; cancelled: boolean; message?: string }> {
  try {
    const offering = await getOfferings();
    if (!offering) {
      return { success: false, cancelled: false, message: 'Subscriptions are not configured yet. Please try again later.' };
    }

    // Map our internal billing cycle → RC package identifier
    const packageId =
      billingCycle === 'monthly'  ? PACKAGES.monthly  :
      billingCycle === 'yearly'   ? PACKAGES.annual   :
      PACKAGES.lifetime;

    // Prefer explicit RC helpers (offering.monthly / .annual / .lifetime)
    // and fall back to identifier match for safety.
    const pkg =
      (billingCycle === 'monthly'  && offering.monthly) ||
      (billingCycle === 'yearly'   && offering.annual)  ||
      (billingCycle === 'lifetime' && offering.lifetime) ||
      offering.availablePackages.find(p => p.identifier === packageId);

    if (!pkg) {
      console.warn(`[IAP] Package ${packageId} not found in offering "${offering.identifier}"`);
      return { success: false, cancelled: false, message: `This plan (${billingCycle}) is not available right now. Please try the other option or contact support.` };
    }

    const purchaseResult = await Purchases.purchasePackage(pkg);
    const hasEntitlement = purchaseResult.customerInfo.entitlements.active[ENTITLEMENT_ID] != null;

    if (hasEntitlement) {
      // Extract payment method from package
      const paymentMethod: PaymentMethod =
        purchaseResult.customerInfo.originalAppUserId.includes('$google') ? 'google' : 'apple';

      // Use original purchase date as a receipt identifier (RC handles validation server-side)
      const receiptId = purchaseResult.customerInfo.originalPurchaseDate || '';

      // Update Firestore with paid subscription (non-critical — RC is source of truth)
      try {
        const externalIds: Record<string, string> = {};
        if (paymentMethod === 'apple' && receiptId) externalIds.appleReceiptId = receiptId;
        if (paymentMethod === 'google' && receiptId) externalIds.googleReceiptId = receiptId;

        await convertTrialToPaid(userId, billingCycle, paymentMethod, externalIds);
      } catch (fsErr) {
        console.warn('[IAP] Firestore subscription write failed (non-critical):', fsErr);
      }

      // Always update local premium status from RC entitlement
      await saveProfile({ isPremium: true });

      return { success: true, cancelled: false };
    }

    return { success: false, cancelled: false, message: 'Purchase did not activate the subscription. Please contact support.' };
  } catch (err: any) {
    if (err?.userCancelled || err?.code === 'PurchaseCancelledError' || err?.code === '1') {
      console.log('[IAP] Purchase cancelled by user');
      return { success: false, cancelled: true };
    }
    console.warn('[IAP] Purchase error:', err);
    return { success: false, cancelled: false, message: err?.message || 'Purchase failed. Please try again.' };
  }
}

/**
 * Check if user has active entitlement (subscription valid)
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
  } catch (err) {
    console.warn('[IAP] Error checking entitlement:', err);
    return false;
  }
}

/**
 * Get customer info from RevenueCat
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('[IAP] Error fetching customer info:', err);
    return null;
  }
}

/**
 * Restore purchases (for users reinstalling or on new device)
 * Updates local isPremium flag if entitlement found
 */
export async function restorePurchases(): Promise<{ restored: boolean; message: string }> {
  if (Platform.OS === 'web') {
    return { restored: false, message: 'Restore is only available in the mobile app.' };
  }
  if (!REVENUECAT_API_KEY_ANDROID && !REVENUECAT_API_KEY_IOS) {
    return { restored: false, message: 'Billing is not configured in this build. Please reinstall the latest version.' };
  }
  if (!rcInitialized) {
    await initRevenueCat();
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;

    if (hasEntitlement) {
      await saveProfile({ isPremium: true });
      console.log('[IAP] Purchases restored — isPremium: true');
      // Non-critical Firestore sync
      try {
        const uid = await getRevenueCatUserId();
        await convertTrialToPaid(uid, 'monthly', 'google', {});
      } catch (e) {
        console.warn('[IAP] Firestore sync on restore failed (non-critical):', e);
      }
      return { restored: true, message: 'Your subscription has been restored!' };
    }

    return { restored: false, message: 'No active subscription found for this account.' };
  } catch (err: any) {
    console.warn('[IAP] Restore error:', err);
    return {
      restored: false,
      message: err?.message || 'Restore failed. Please check your internet connection and try again.',
    };
  }
}

/**
 * Get formatted price display
 */
export function getFormattedPrice(billingCycle: BillingCycle): {
  amount: string;
  currency: string;
  cycle: string;
} {
  const amount =
    billingCycle === 'monthly' ? `AUD $${PRICING.monthly}` :
    billingCycle === 'yearly'  ? `AUD $${PRICING.yearly}`  :
    `AUD $${PRICING.lifetime}`;
  const cycle =
    billingCycle === 'monthly' ? '/month' :
    billingCycle === 'yearly'  ? '/year'  :
    'one-time';
  return { amount, currency: 'AUD', cycle };
}

/**
 * Calculate savings for yearly plan vs monthly
 */
export function getYearlySavings(): {
  percent: number;
  amount: string;
} {
  const monthlyAnnual = PRICING.monthly * 12;
  const savings = monthlyAnnual - PRICING.yearly;
  const percent = Math.round((savings / monthlyAnnual) * 100);

  return {
    percent,
    amount: `AUD $${savings.toFixed(2)}`,
  };
}

/**
 * Calculate savings for lifetime plan vs 3 years of yearly
 */
export function getLifetimeSavings(): {
  percent: number;
  amount: string;
  comparedTo: string;
} {
  // Compare lifetime to 3 years of yearly subscription
  const threeYears = PRICING.yearly * 3;
  const savings = threeYears - PRICING.lifetime;
  const percent = Math.round((savings / threeYears) * 100);

  return {
    percent: Math.max(0, percent),
    amount: `AUD $${Math.max(0, savings).toFixed(2)}`,
    comparedTo: '3yr',
  };
}
