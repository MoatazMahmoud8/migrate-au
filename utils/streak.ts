/**
 * Simple daily-open streak.
 *
 * On each cold start we record today's local date. If the previous recorded
 * date is yesterday, the streak increments; if it's earlier, the streak
 * resets to 1. If it's today, we no-op.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@migrate_au_streak_v1';

interface StreakState {
  lastOpenLocalDate: string; // YYYY-MM-DD in local time
  streakDays: number;
  longestStreak: number;
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isYesterday(prevIso: string, todayIso: string): boolean {
  if (!prevIso) return false;
  const prev = new Date(prevIso + 'T00:00:00');
  const today = new Date(todayIso + 'T00:00:00');
  const diff = today.getTime() - prev.getTime();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000 + 1000;
}

export async function tickStreak(): Promise<StreakState> {
  const today = todayLocal();
  let state: StreakState = { lastOpenLocalDate: '', streakDays: 0, longestStreak: 0 };
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { ...state, ...(JSON.parse(raw) as StreakState) };
  } catch {}

  if (state.lastOpenLocalDate === today) return state;

  const newDays = isYesterday(state.lastOpenLocalDate, today)
    ? state.streakDays + 1
    : 1;

  const next: StreakState = {
    lastOpenLocalDate: today,
    streakDays: newDays,
    longestStreak: Math.max(state.longestStreak || 0, newDays),
  };

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {}

  return next;
}

export async function getStreak(): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { lastOpenLocalDate: '', streakDays: 0, longestStreak: 0 };
    const parsed = JSON.parse(raw) as StreakState;
    const defaults = { lastOpenLocalDate: '', streakDays: 0, longestStreak: 0 };
    return { ...defaults, ...parsed };
  } catch {
    return { lastOpenLocalDate: '', streakDays: 0, longestStreak: 0 };
  }
}
