/**
 * Growth loop helpers.
 *
 *  - Shareable points card (native share sheet).
 *  - Referral link with a stable per-user code + UTM.
 *  - Store install links with UTM so acquisition can be measured later.
 *
 * All copy is designed to (a) validate the reader's next step and (b) end in
 * a single install CTA, so the share text itself acts as marketing.
 */
import { Platform, Share } from 'react-native';
import auth from '@react-native-firebase/auth';

const APP_STORE_URL = 'https://apps.apple.com/app/id6771335489';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.jsmglobal.migration_au';
const LANDING_URL = 'https://migrateau-admin-205705.web.app/get';

export interface UtmParams {
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

function withUtm(url: string, utm: UtmParams): string {
  const params = new URLSearchParams();
  params.set('utm_source', utm.source);
  params.set('utm_medium', utm.medium || 'share');
  params.set('utm_campaign', utm.campaign || 'growth');
  if (utm.content) params.set('utm_content', utm.content);
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${params.toString()}`;
}

export function buildStoreLink(utm: UtmParams): string {
  const target = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  return withUtm(target, utm);
}

/**
 * Return the landing page URL — safe on any platform including web.
 */
export function buildLandingUrl(utm: UtmParams): string {
  return withUtm(LANDING_URL, utm);
}

/**
 * Deterministic referral code from the current Firebase uid. Falls back to
 * a short random code for anonymous / logged-out users so the share sheet is
 * never blocked.
 */
export function getReferralCode(): string {
  try {
    const uid = auth().currentUser?.uid;
    if (uid) {
      // Take a stable 8-char slice; avoids leaking full uid but keeps it unique.
      const clean = uid.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return clean.slice(0, 8) || fallbackCode();
    }
  } catch {}
  return fallbackCode();
}

function fallbackCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function buildReferralUrl(): string {
  const code = getReferralCode();
  return withUtm(LANDING_URL, {
    source: 'referral',
    medium: 'share',
    campaign: 'user_referral',
    content: code,
  }) + `&ref=${code}`;
}

/**
 * Build a shareable "points card" message. Keeps the copy short so it renders
 * cleanly in WhatsApp, Messages, and X-style clients.
 */
export function shareablePointsCardMessage(input: {
  total: number;
  eligibleThreshold?: number;
  occupationName?: string | null;
}): string {
  const threshold = input.eligibleThreshold ?? 65;
  const status = input.total >= threshold
    ? `I'm at ${input.total}/${threshold} points — above the indicative threshold ✅`
    : `I'm at ${input.total}/${threshold} points — ${threshold - input.total} to go 💪`;
  const occ = input.occupationName ? ` (${input.occupationName})` : '';
  // Use the landing URL so the recipient is redirected to the right store
  // based on their own device (not the sender's).
  const install = buildLandingUrl({
    source: 'points_card',
    medium: 'share',
    campaign: 'growth',
    content: `total_${input.total}`,
  });
  return [
    `Just checked my Australian PR points${occ} on MigrateAU.`,
    status,
    '',
    `Try it: ${install}`,
  ].join('\n');
}

async function shareViaBestChannel(message: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Prefer Web Share API (Chrome mobile, Safari) — opens native share sheet.
    try {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && typeof nav.share === 'function') {
        await nav.share({ text: message });
        return;
      }
    } catch {}
    // Desktop fallback: copy to clipboard + open a mailto composer so the
    // user still has a real path to send the message.
    try {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        await nav.clipboard.writeText(message);
      }
    } catch {}
    try {
      const subject = 'Have you seen MigrateAU?';
      const body = encodeURIComponent(message);
      if (typeof window !== 'undefined') {
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
      }
    } catch {}
    try {
      if (typeof alert === 'function') {
        alert('Message copied to clipboard and an email draft was opened.');
      }
    } catch {}
    return;
  }
  try {
    await Share.share({ message });
  } catch {}
}

export async function sharePointsCard(input: {
  total: number;
  eligibleThreshold?: number;
  occupationName?: string | null;
}): Promise<void> {
  await shareViaBestChannel(shareablePointsCardMessage(input));
}

export async function shareReferral(): Promise<void> {
  const url = buildReferralUrl();
  const message = [
    'I\'ve been using MigrateAU to track my Australia migration — invitation rounds, state programs and fees all in one place.',
    '',
    `Install with my link: ${url}`,
  ].join('\n');
  await shareViaBestChannel(message);
}
