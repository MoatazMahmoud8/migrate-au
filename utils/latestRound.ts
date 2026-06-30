/**
 * latestRound.ts
 *
 * Provides real-time access to the latest SkillSelect invitation round.
 * Fetches from local cache or remote data source and updates the "At a Glance" card.
 * Automatically refreshes data on app startup.
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
const REMOTE_URL = 'https://swift-shore-238707.web.app/invitation-rounds.json';
const CACHE_HOURS = 6;

/**
 * Get the latest invitation round data from remote source, cache, or fallback
 * Always tries to refresh if cache is stale
 */
export async function getLatestRound(): Promise<LatestRound> {
  try {
    const ts = await AsyncStorage.getItem(CACHE_TS_KEY);
    const stale = !ts || (Date.now() - parseInt(ts)) / 3600000 >= CACHE_HOURS;
    
    // If cache is stale, try to fetch fresh data
    if (stale) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(REMOTE_URL, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          // Cache the fresh data
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
          await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
          
          if (data.currentRound) {
            const round = data.currentRound;
            console.log('[latestRound] Fetched fresh data:', round.date);
            return {
              date: round.date,
              label: formatRoundDate(round.date),
              minPoints: round.sc189?.total || round.sc189Total || 65,
              tieBreak: round.sc189?.tieBreak || round.sc189TieBreak,
            };
          }
        }
      } catch (err) {
        console.warn('[latestRound] Failed to fetch remote data:', err);
        // Fall through to cached data
      }
    }
    
    // Try to get from cache
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.currentRound) {
          const round = data.currentRound;
          console.log('[latestRound] Using cached data:', round.date);
          return {
            date: round.date,
            label: formatRoundDate(round.date),
            minPoints: round.sc189?.total || round.sc189Total || 65,
            tieBreak: round.sc189?.tieBreak || round.sc189TieBreak,
          };
        }
      } catch (e) {
        console.warn('[latestRound] Failed to parse cached rounds:', e);
      }
    }
  } catch (e) {
    console.warn('[latestRound] Failed to get cached rounds:', e);
  }

  // Fallback to most recent known data (will be updated as new rounds happen)
  console.log('[latestRound] Using fallback data');
  return {
    date: '2026-06-04',
    label: 'Jun 2026',
    minPoints: 65,
    tieBreak: '2026-06',
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
 * Force refresh the rounds data from remote source
 * Called on app startup to ensure latest data is cached
 */
export async function refreshLatestRound(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(REMOTE_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      
      if (data.currentRound) {
        console.log('[latestRound] ✅ Refreshed data - Latest round:', data.currentRound.label);
      }
    }
  } catch (err) {
    console.warn('[latestRound] ⚠️ Failed to refresh data:', err);
    // Silent fail - will use cache or fallback
  }
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
