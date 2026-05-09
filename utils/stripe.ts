/**
 * utils/stripe.ts
 *
 * Stripe integration for web subscriptions
 * Uses Stripe Checkout (hosted)
 */

import { BillingCycle } from '../types/subscription';
import { PRICING } from './billing';

// Stripe Publishable Key (get from Stripe Dashboard)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY'; // Replace with real key
const STRIPE_API_BASE = 'https://your-backend.com/api'; // Your backend URL

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

/**
 * Create a Stripe Checkout session (for trial-to-paid conversion)
 * User lands on hosted Stripe page to enter payment info
 */
export async function createTrialCheckoutSession(
  userId: string,
  billingCycle: BillingCycle
): Promise<StripeCheckoutSession | null> {
  try {
    const response = await fetch(`${STRIPE_API_BASE}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        billingCycle,
        priceId: getPriceId(billingCycle),
        // Don't include trial here since they already had 7-day free trial
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const session = await response.json();
    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (err) {
    console.warn('[Stripe] Checkout session error:', err);
    return null;
  }
}

/**
 * Create a customer portal session (manage subscription, billing, cancel)
 */
export async function createCustomerPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string } | null> {
  try {
    const response = await fetch(`${STRIPE_API_BASE}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn('[Stripe] Portal session error:', err);
    return null;
  }
}

/**
 * Map billing cycle to Stripe Price ID
 */
function getPriceId(billingCycle: BillingCycle): string {
  // These come from your Stripe Dashboard
  const priceIds: Record<BillingCycle, string> = {
    monthly: 'price_1234567890', // Replace with real Stripe Price ID
    yearly: 'price_0987654321',   // Replace with real Stripe Price ID
  };

  return priceIds[billingCycle];
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
