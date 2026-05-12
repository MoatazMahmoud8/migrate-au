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
  BILLING_ENTITLEMENT_ID,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { BillingCycle, PaymentMethod } from '../types/subscription';
import { convertTrialToPaid, startTrial, PRICING } from './billing';
import { saveProfile } from './storage';

// RevenueCat API keys — read from app.config.js extra (set via .env / EAS secrets)
const REVENUECAT_API_KEY_IOS: string     = Constants.expoConfig?.extra?.revenueCatKeyIos ?? '';
const REVENUECAT_API_KEY_ANDROID: string = Constants.expoConfig?.extra?.revenueCatKeyAndroid ?? '';

// Revenue Cat product IDs
const PRODUCTS = {
  trialPro: 'migrate_au_trial_7d',      // Free trial, 7 days
  monthlyPro: 'migrate_au_monthly',     // $19.99 AUD / month
  yearlyPro: 'migrate_au_yearly',       // $199 AUD / year
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
    const isActive = customerInfo.entitlements.active['pro'] != null;
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

    const trialPackage = offering.availablePackages.find(
      p => p.product.identifier === PRODUCTS.trialPro
    );

    if (!trialPackage) {
      console.warn('[IAP] Trial package not found');
      // Fallback: start trial in Firestore without IAP
      return await startTrial(userId);
    }

    // Purchase the trial package
    try {
      const purchaseResult = await Purchases.purchasePackage(trialPackage);
      const hasEntitlement = purchaseResult.customerInfo.entitlements.active['pro'] != null;

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
 * Purchase a subscription (monthly or yearly)
 */
export async function purchaseSubscription(
  userId: string,
  billingCycle: 'monthly' | 'yearly'
): Promise<boolean> {
  try {
    const offering = await getOfferings();
    if (!offering) throw new Error('No offerings available');

    const productId = billingCycle === 'monthly' ? PRODUCTS.monthlyPro : PRODUCTS.yearlyPro;
    const pkg = offering.availablePackages.find(p => p.product.identifier === productId);

    if (!pkg) {
      console.warn(`[IAP] Package ${productId} not found`);
      return false;
    }

    const purchaseResult = await Purchases.purchasePackage(pkg);
    const hasEntitlement = purchaseResult.customerInfo.entitlements.active['pro'] != null;

    if (hasEntitlement) {
      // Extract payment method from package
      const paymentMethod: PaymentMethod =
        purchaseResult.customerInfo.originalAppUserId.includes('$google') ? 'google' : 'apple';

      // Store the receipt for validation
      const receiptId =
        purchaseResult.customerInfo.originalPurchaseDate || 
        purchaseResult.receipt;

      // Update Firestore with paid subscription
      await convertTrialToPaid(userId, billingCycle, paymentMethod, {
        appleReceiptId: paymentMethod === 'apple' ? receiptId : undefined,
        googleReceiptId: paymentMethod === 'google' ? receiptId : undefined,
      });

      return true;
    }

    return false;
  } catch (err: any) {
    if (err.code === 'PurchaseCancelledError') {
      console.log('[IAP] Purchase cancelled by user');
      return false;
    }
    console.warn('[IAP] Purchase error:', err);
    return false;
  }
}

/**
 * Check if user has active entitlement (subscription valid)
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] != null;
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
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasEntitlement = customerInfo.entitlements.active['pro'] != null;

    if (hasEntitlement) {
      await saveProfile({ isPremium: true });
      console.log('[IAP] Purchases restored — isPremium: true');
      return { restored: true, message: 'Your subscription has been restored!' };
    }

    return { restored: false, message: 'No active subscription found for this account.' };
  } catch (err) {
    console.warn('[IAP] Restore error:', err);
    return { restored: false, message: 'Restore failed. Please check your internet connection and try again.' };
  }
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
  return {
    amount: billingCycle === 'monthly' ? `$${PRICING.monthly}` : `$${PRICING.yearly}`,
    currency: 'AUD',
    cycle: billingCycle === 'monthly' ? '/month' : '/year',
  };
}

/**
 * Calculate savings for yearly plan
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
    amount: `$${savings.toFixed(2)}`,
  };
}
