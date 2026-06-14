/**
 * latestRound.ts
 *
 * Provides real-time access to the latest SkillSelect invitation round.
 * Fetches from local cache or remote data source and updates the "At a Glance" card.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LatestRound {
  date: string;
  label: string;
  minPoints: number | null;
  tieBreak?: string;
}

const CACHE_KEY = 'rounds_v2';
const CACHE_TS_KEY = 'rounds_v2_ts';

/**
 * Get the latest invitation round data from cache or fallback
 */
export async function getLatestRound(): Promise<LatestRound> {
  try {
    // Try to get from cache first
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.currentRound) {
          // Extract SC189 data (main skilled independent visa)
          const round = data.currentRound;
          return {
            date: round.date,
            label: formatRoundDate(round.date),
            minPoints: round.sc189Total || 65,
            tieBreak: round.sc189TieBreak,
          };
        }
      } catch (e) {
        console.warn('[latestRound] Failed to parse cached rounds:', e);
      }
    }
  } catch (e) {
    console.warn('[latestRound] Failed to get cached rounds:', e);
  }

  // Fallback to hardcoded latest
  return {
    date: '2025-11-13',
    label: 'Nov 2025',
    minPoints: 65,
    tieBreak: '2025-11',
  };
}

/**
 * Convert date string (YYYY-MM-DD) to short month/year format
 * Examples: "2025-11-13" -> "Nov 2025", "2025-02-20" -> "Feb 2025"
 */
function formatRoundDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Extract minimum points from tie-break format
 * Tie-breaks often include the month (e.g., "2025-11" → 65 pts for that month)
 * This is a simplified extraction; full data comes from sc189Total
 */
function extractMinPointsFromTieBreak(tieBreak: string | undefined): number {
  if (!tieBreak) return 65;
  // Default: SC189 requires 65 points minimum
  return 65;
}

/**
 * Watch for changes to the latest round
 * Subscribe to updates and call callback when round changes
 */
export function subscribeToLatestRound(
  callback: (round: LatestRound) => void
): () => void {
  let isUnsubscribed = false;

  // Initial fetch
  getLatestRound().then(round => {
    if (!isUnsubscribed) {
      callback(round);
    }
  });

  // Check for updates every 6 hours (matching the rounds data cache)
  const interval = setInterval(async () => {
    if (!isUnsubscribed) {
      const round = await getLatestRound();
      callback(round);
    }
  }, 6 * 60 * 60 * 1000);

  // Cleanup function
  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
  };
}
