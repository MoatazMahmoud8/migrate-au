/**
 * In-app rating prompt.
 *
 * Uses Apple's SKStoreReviewController on iOS and Google Play's
 * In-App Review on Android via expo-store-review. On web (or where
 * the native prompt is unavailable) we fall back to opening the
 * store listing in the browser.
 *
 * Public API:
 *   - askToRate(force?)           manual trigger (e.g. Profile → "Rate")
 *   - recordEngagement(reason)    bump engagement counter
 *   - maybePromptForRating()      auto-prompt if thresholds met
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Alert, Linking, Platform } from 'react-native';

const APP_STORE_ID = '6767216706';
const ANDROID_PACKAGE = 'com.jsmglobal.migration_au';

const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const WEB_FEEDBACK_URL = PLAY_STORE_URL;

const ENGAGEMENT_KEY = '@migrate_au_rating_engagement';
const LAST_PROMPT_KEY = '@migrate_au_rating_last_prompt';
const RATED_KEY = '@migrate_au_rating_done';
const DECLINED_KEY = '@migrate_au_rating_declined_at';

const MIN_ENGAGEMENTS = 5;
const MIN_DAYS_BETWEEN_PROMPTS = 30;
const MIN_DAYS_AFTER_DECLINE = 60;

async function openStoreListing(): Promise<void> {
  const url = Platform.OS === 'ios' ? APP_STORE_URL : Platform.OS === 'android' ? PLAY_STORE_URL : WEB_FEEDBACK_URL;
  try {
    await Linking.openURL(url);
  } catch {
    // swallow — user can try again later
  }
}

/**
 * Show the native in-app review prompt if available. Falls back to
 * opening the store listing. Pass `force=true` from a settings row
 * to skip the engagement threshold.
 */
export async function askToRate(force = false): Promise<void> {
  if (!force) {
    const rated = await AsyncStorage.getItem(RATED_KEY);
    if (rated) {
      await openStoreListing();
      return;
    }
  }

  try {
    const available = await StoreReview.isAvailableAsync();
    const hasAction = await StoreReview.hasAction();
    if (available && hasAction) {
      await StoreReview.requestReview();
      await AsyncStorage.setItem(LAST_PROMPT_KEY, new Date().toISOString());
      // Native prompt doesn't tell us the outcome — assume positive intent
      // and don't keep nagging the user.
      await AsyncStorage.setItem(RATED_KEY, '1');
      return;
    }
  } catch {
    // fall through to manual flow
  }

  // Fallback: confirm then open the store
  if (Platform.OS === 'web') {
    await openStoreListing();
    return;
  }

  Alert.alert(
    'Enjoying MigrateAU?',
    'Would you mind taking a moment to rate us in the store? It really helps other migrants find the app.',
    [
      { text: 'Not now', style: 'cancel', onPress: () => AsyncStorage.setItem(DECLINED_KEY, new Date().toISOString()) },
      {
        text: 'Rate now',
        onPress: async () => {
          await AsyncStorage.setItem(RATED_KEY, '1');
          await openStoreListing();
        },
      },
    ],
  );
}

/**
 * Record a meaningful user action (e.g. saved an occupation,
 * completed the points calculator). Auto-prompts when the user
 * has been engaged enough and we haven't asked recently.
 */
export async function recordEngagement(_reason?: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ENGAGEMENT_KEY);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(ENGAGEMENT_KEY, String(count));
    await maybePromptForRating();
  } catch {
    // ignore storage errors
  }
}

export async function maybePromptForRating(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(RATED_KEY)) return;

    const countRaw = await AsyncStorage.getItem(ENGAGEMENT_KEY);
    const count = countRaw ? parseInt(countRaw, 10) : 0;
    if (count < MIN_ENGAGEMENTS) return;

    const lastPrompt = await AsyncStorage.getItem(LAST_PROMPT_KEY);
    if (lastPrompt) {
      const days = (Date.now() - new Date(lastPrompt).getTime()) / 86400000;
      if (days < MIN_DAYS_BETWEEN_PROMPTS) return;
    }

    const declined = await AsyncStorage.getItem(DECLINED_KEY);
    if (declined) {
      const days = (Date.now() - new Date(declined).getTime()) / 86400000;
      if (days < MIN_DAYS_AFTER_DECLINE) return;
    }

    await askToRate(true);
  } catch {
    // ignore
  }
}
