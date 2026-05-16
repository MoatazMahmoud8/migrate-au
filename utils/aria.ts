/**
 * utils/aria.ts
 *
 * Client wrapper for the Aria chat Cloud Function.
 * Replaces the previous direct Google Generative AI SDK call so that:
 *   - The Gemini API key stays on the server (not in the app bundle).
 *   - Aria's system prompt stays server-side (proprietary IP).
 *   - Web builds bypass the CORS block on generativelanguage.googleapis.com.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PROJECT_ID = 'swift-shore-238707';
const REGION = 'us-central1';

// Default endpoint = deployed Firebase Function.
// Override via app.config.js → extra.ariaEndpoint for local emulator, staging, etc.
const ARIA_ENDPOINT: string =
  Constants.expoConfig?.extra?.ariaEndpoint ??
  `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/ariaChat`;

export interface AriaHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Best-effort fetch of the current user's Firebase ID token.
 * If the user is anonymous or not signed in, returns null and the
 * server may still respond (until REQUIRE_AUTH=true is set there).
 */
async function getIdToken(): Promise<string | null> {
  // @react-native-firebase/auth is a native module and is not available on web.
  // Skip token fetch on web to avoid bundler/runtime errors.
  if (Platform.OS === 'web') return null;
  try {
    // Lazy require so web bundles don't try to resolve native code at module load.
    const authModule = require('@react-native-firebase/auth').default;
    const user = authModule().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Send a message to Aria. Returns the assistant's reply text.
 * Throws on network / server errors so the caller can surface a friendly message.
 */
export async function sendAriaMessage(
  message: string,
  history: AriaHistoryMessage[] = []
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(ARIA_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    let serverMsg = '';
    try {
      const j = await res.json();
      serverMsg = j?.error || '';
    } catch {
      /* ignore body parse errors */
    }
    if (res.status === 429) {
      throw new Error(
        serverMsg || 'You are sending messages too quickly. Please slow down.'
      );
    }
    if (res.status === 401) {
      throw new Error(serverMsg || 'Please sign in to use Aria.');
    }
    throw new Error(
      serverMsg ||
        `Aria request failed (${res.status}). Please check your connection and try again.`
    );
  }

  const data = (await res.json()) as { reply?: string };
  if (!data?.reply) {
    throw new Error('Aria returned an empty response. Please try again.');
  }
  return data.reply;
}
