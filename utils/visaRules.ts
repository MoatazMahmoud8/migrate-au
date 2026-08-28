/**
 * Dynamic Visa Rules — Firestore-based runtime data layer.
 *
 * Architecture:
 *   1. Firestore collections: `visa_fees`, `visa_processing_times`, `state_nomination_status`
 *   2. In-memory cache (React state) + AsyncStorage persistence
 *   3. TTL-based expiration (configurable, default 6 hours)
 *   4. Falls back to bundled constants if Firestore is unreachable
 *   5. Force-refresh on pull-to-refresh or app launch
 *
 * Collections schema:
 *   visa_fees/{subclass}:
 *     - fee: string (e.g., "AUD $6,140")
 *     - feeNote: string (optional)
 *     - updatedAt: timestamp
 *
 *   visa_processing_times/{subclass}:
 *     - name: string
 *     - category: string
 *     - streams: [{ name?, p50, p90 }]
 *     - conditions: string[]
 *     - updatedAt: timestamp
 *
 *   state_nomination_status/{stateCode}:
 *     - status: 'open' | 'paused' | 'closed' | 'limited'
 *     - quotaRemaining: number (optional)
 *     - updatedAt: timestamp
 *
 *   rules_version/current:
 *     - version: number
 *     - updatedAt: timestamp
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseWeb';
import { VISA_FEES, VisaFeeEntry } from '../constants/visaFees';
import { PROCESSING_TIMES, ProcessingTime } from '../constants/processingTimes';

// ─── Configuration ───────────────────────────────────────────────────────────
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds min between refreshes
const CACHE_KEY_FEES = '@migrate_au_firestore_visa_fees';
const CACHE_KEY_TIMES = '@migrate_au_firestore_processing_times';
const CACHE_KEY_STATES = '@migrate_au_firestore_state_status';
const CACHE_KEY_VERSION = '@migrate_au_rules_version';
const CACHE_KEY_LAST_FETCH = '@migrate_au_rules_last_fetch';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FirestoreVisaFee {
  subclass: string;
  fee: string;
  feeNote?: string;
  familyFeeAdult?: string;
  familyFeeChild?: string;
  updatedAt?: Timestamp | string;
}

export interface FirestoreProcessingTime {
  subclass: string;
  name: string;
  category: string;
  streams: Array<{ name?: string; p50: string; p90: string }>;
  conditions?: string[];
  icon?: string;
  color?: string;
  url?: string;
  updatedAt?: Timestamp | string;
}

export interface StateNominationStatus {
  state: string;
  status: 'open' | 'paused' | 'closed' | 'limited';
  statusNote?: string;
  quotaRemaining?: number;
  lastRoundDate?: string;
  nextRoundDate?: string;
  updatedAt?: Timestamp | string;
}

// ─── In-Memory Cache ─────────────────────────────────────────────────────────
let memoryFeesCache: FirestoreVisaFee[] | null = null;
let memoryTimesCache: FirestoreProcessingTime[] | null = null;
let memoryStatesCache: StateNominationStatus[] | null = null;
let memoryCacheTimestamp = 0;
let lastRefreshAttempt = 0;

// ─── Cache Helpers ───────────────────────────────────────────────────────────

function isCacheValid(): boolean {
  return memoryCacheTimestamp > 0 && Date.now() - memoryCacheTimestamp < CACHE_TTL_MS;
}

async function loadFromAsyncStorage(): Promise<{
  fees: FirestoreVisaFee[] | null;
  times: FirestoreProcessingTime[] | null;
  states: StateNominationStatus[] | null;
  timestamp: number;
}> {
  try {
    const [feesRaw, timesRaw, statesRaw, lastFetch] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY_FEES),
      AsyncStorage.getItem(CACHE_KEY_TIMES),
      AsyncStorage.getItem(CACHE_KEY_STATES),
      AsyncStorage.getItem(CACHE_KEY_LAST_FETCH),
    ]);
    return {
      fees: feesRaw ? JSON.parse(feesRaw) : null,
      times: timesRaw ? JSON.parse(timesRaw) : null,
      states: statesRaw ? JSON.parse(statesRaw) : null,
      timestamp: lastFetch ? parseInt(lastFetch, 10) : 0,
    };
  } catch (e) {
    console.warn('[visaRules] AsyncStorage read error:', e);
    return { fees: null, times: null, states: null, timestamp: 0 };
  }
}

async function saveToAsyncStorage(
  fees: FirestoreVisaFee[],
  times: FirestoreProcessingTime[],
  states: StateNominationStatus[]
): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEY_FEES, JSON.stringify(fees)),
      AsyncStorage.setItem(CACHE_KEY_TIMES, JSON.stringify(times)),
      AsyncStorage.setItem(CACHE_KEY_STATES, JSON.stringify(states)),
      AsyncStorage.setItem(CACHE_KEY_LAST_FETCH, Date.now().toString()),
    ]);
  } catch (e) {
    console.warn('[visaRules] AsyncStorage write error:', e);
  }
}

// ─── Firestore Fetching ──────────────────────────────────────────────────────

export async function checkRulesVersion(): Promise<{ hasUpdate: boolean; currentVersion: number }> {
  try {
    const cachedVersion = await AsyncStorage.getItem(CACHE_KEY_VERSION);
    const docRef = doc(db, 'rules_version', 'current');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { hasUpdate: false, currentVersion: 0 };
    
    const remoteVersion = snap.data()?.version ?? 0;
    const localVersion = cachedVersion ? parseInt(cachedVersion, 10) : 0;
    
    if (remoteVersion > localVersion) {
      await AsyncStorage.setItem(CACHE_KEY_VERSION, remoteVersion.toString());
      return { hasUpdate: true, currentVersion: remoteVersion };
    }
    return { hasUpdate: false, currentVersion: localVersion };
  } catch (e) {
    console.warn('[visaRules] version check failed:', e);
    return { hasUpdate: false, currentVersion: 0 };
  }
}

async function fetchFirestoreVisaFees(): Promise<FirestoreVisaFee[]> {
  const snap = await getDocs(collection(db, 'visa_fees'));
  return snap.docs.map((d) => ({ subclass: d.id, ...d.data() })) as FirestoreVisaFee[];
}

async function fetchFirestoreProcessingTimes(): Promise<FirestoreProcessingTime[]> {
  const snap = await getDocs(collection(db, 'visa_processing_times'));
  return snap.docs.map((d) => ({ subclass: d.id, ...d.data() })) as FirestoreProcessingTime[];
}

async function fetchFirestoreStateStatus(): Promise<StateNominationStatus[]> {
  const snap = await getDocs(collection(db, 'state_nomination_status'));
  return snap.docs.map((d) => ({ state: d.id, ...d.data() })) as StateNominationStatus[];
}

// ─── Main API ────────────────────────────────────────────────────────────────

export interface RefreshResult {
  updated: boolean;
  source: 'firestore' | 'cache' | 'fallback';
  fees: VisaFeeEntry[];
  processingTimes: ProcessingTime[];
  stateStatus: StateNominationStatus[];
}

export async function refreshVisaRules(opts: { force?: boolean } = {}): Promise<RefreshResult> {
  const now = Date.now();
  
  // Rate limit refreshes
  if (!opts.force && now - lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
    return getCachedOrFallback();
  }
  lastRefreshAttempt = now;
  
  // Check if cache is valid
  if (!opts.force && isCacheValid() && memoryFeesCache && memoryTimesCache) {
    return {
      updated: false,
      source: 'cache',
      fees: mergeFeesWithFallback(memoryFeesCache),
      processingTimes: mergeTimesWithFallback(memoryTimesCache),
      stateStatus: memoryStatesCache ?? [],
    };
  }
  
  // Try AsyncStorage first
  if (!memoryFeesCache || !memoryTimesCache) {
    const stored = await loadFromAsyncStorage();
    if (stored.fees && stored.times && now - stored.timestamp < CACHE_TTL_MS) {
      memoryFeesCache = stored.fees;
      memoryTimesCache = stored.times;
      memoryStatesCache = stored.states;
      memoryCacheTimestamp = stored.timestamp;
      
      if (!opts.force) {
        return {
          updated: false,
          source: 'cache',
          fees: mergeFeesWithFallback(stored.fees),
          processingTimes: mergeTimesWithFallback(stored.times),
          stateStatus: stored.states ?? [],
        };
      }
    }
  }
  
  // Fetch from Firestore
  try {
    const [fees, times, states] = await Promise.all([
      fetchFirestoreVisaFees(),
      fetchFirestoreProcessingTimes(),
      fetchFirestoreStateStatus(),
    ]);
    
    memoryFeesCache = fees;
    memoryTimesCache = times;
    memoryStatesCache = states;
    memoryCacheTimestamp = now;
    
    await saveToAsyncStorage(fees, times, states);
    
    return {
      updated: true,
      source: 'firestore',
      fees: mergeFeesWithFallback(fees),
      processingTimes: mergeTimesWithFallback(times),
      stateStatus: states,
    };
  } catch (e) {
    console.warn('[visaRules] Firestore fetch failed, using fallback:', e);
    return getCachedOrFallback();
  }
}

async function getCachedOrFallback(): Promise<RefreshResult> {
  if (memoryFeesCache && memoryTimesCache) {
    return {
      updated: false,
      source: 'cache',
      fees: mergeFeesWithFallback(memoryFeesCache),
      processingTimes: mergeTimesWithFallback(memoryTimesCache),
      stateStatus: memoryStatesCache ?? [],
    };
  }
  
  const stored = await loadFromAsyncStorage();
  if (stored.fees && stored.times) {
    memoryFeesCache = stored.fees;
    memoryTimesCache = stored.times;
    memoryStatesCache = stored.states;
    memoryCacheTimestamp = stored.timestamp;
    
    return {
      updated: false,
      source: 'cache',
      fees: mergeFeesWithFallback(stored.fees),
      processingTimes: mergeTimesWithFallback(stored.times),
      stateStatus: stored.states ?? [],
    };
  }
  
  return {
    updated: false,
    source: 'fallback',
    fees: VISA_FEES,
    processingTimes: PROCESSING_TIMES,
    stateStatus: [],
  };
}

// ─── Merge Helpers ───────────────────────────────────────────────────────────

function mergeFeesWithFallback(firestoreFees: FirestoreVisaFee[]): VisaFeeEntry[] {
  if (firestoreFees.length === 0) return VISA_FEES;
  
  const feeMap = new Map(VISA_FEES.map((f) => [f.subclass, f]));
  for (const ff of firestoreFees) {
    feeMap.set(ff.subclass, { subclass: ff.subclass, fee: ff.fee, note: ff.feeNote });
  }
  return Array.from(feeMap.values());
}

function mergeTimesWithFallback(firestoreTimes: FirestoreProcessingTime[]): ProcessingTime[] {
  if (firestoreTimes.length === 0) return PROCESSING_TIMES;
  
  const timeMap = new Map(PROCESSING_TIMES.map((t) => [t.subclass, t]));
  for (const ft of firestoreTimes) {
    const existing = timeMap.get(ft.subclass);
    timeMap.set(ft.subclass, {
      subclass: ft.subclass,
      name: ft.name || existing?.name || ft.subclass,
      category: (ft.category as ProcessingTime['category']) || existing?.category || 'Skilled',
      streams: ft.streams || existing?.streams || [],
      conditions: ft.conditions || existing?.conditions,
      icon: ft.icon || existing?.icon || 'document-outline',
      color: ft.color || existing?.color || '#00C2FF',
      url: ft.url || existing?.url || `https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/${ft.subclass}`,
    });
  }
  return Array.from(timeMap.values());
}

// ─── Real-Time Listener ──────────────────────────────────────────────────────

let versionUnsubscribe: Unsubscribe | null = null;

export function subscribeToRulesVersion(onVersionChange: (v: number) => void): Unsubscribe {
  if (versionUnsubscribe) versionUnsubscribe();
  
  const docRef = doc(db, 'rules_version', 'current');
  versionUnsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) onVersionChange(snap.data()?.version ?? 0);
  });
  return versionUnsubscribe;
}

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

export function getFeeForSubclass(fees: VisaFeeEntry[], subclass: string): VisaFeeEntry | undefined {
  return fees.find((f) => f.subclass === subclass);
}

export function getProcessingTimeForSubclass(times: ProcessingTime[], subclass: string): ProcessingTime | undefined {
  const codes = subclass.split(/[\/\s–-]+/).map((c) => c.trim()).filter(Boolean);
  return times.find((t) => codes.some((c) => t.subclass.replace(/[\/\s]/g, '').includes(c)));
}

export function getStateStatus(states: StateNominationStatus[], stateCode: string): StateNominationStatus | undefined {
  return states.find((s) => s.state === stateCode);
}

// ─── Clear Cache ─────────────────────────────────────────────────────────────

export async function clearVisaRulesCache(): Promise<void> {
  memoryFeesCache = null;
  memoryTimesCache = null;
  memoryStatesCache = null;
  memoryCacheTimestamp = 0;
  
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEY_FEES),
    AsyncStorage.removeItem(CACHE_KEY_TIMES),
    AsyncStorage.removeItem(CACHE_KEY_STATES),
    AsyncStorage.removeItem(CACHE_KEY_VERSION),
    AsyncStorage.removeItem(CACHE_KEY_LAST_FETCH),
  ]);
}
