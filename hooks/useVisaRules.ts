/**
 * useVisaRules — React hook for dynamic visa rules from Firestore.
 *
 * Usage:
 *   const { fees, processingTimes, stateStatus, isLoading, refresh } = useVisaRules();
 *
 * Features:
 *   - Automatically loads on mount
 *   - Caches data in memory + AsyncStorage
 *   - Falls back to bundled constants offline
 *   - Supports force refresh via refresh(true)
 *   - Subscribes to version changes for real-time updates (optional)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ProcessingTime } from '../constants/processingTimes';
import { VisaFeeEntry } from '../constants/visaFees';
import {
  refreshVisaRules,
  RefreshResult,
  StateNominationStatus,
  subscribeToRulesVersion,
  getFeeForSubclass,
  getProcessingTimeForSubclass,
  getStateStatus,
} from '../utils/visaRules';

export interface UseVisaRulesResult {
  /** All visa fees (merged Firestore + fallback) */
  fees: VisaFeeEntry[];
  /** All processing times (merged Firestore + fallback) */
  processingTimes: ProcessingTime[];
  /** State nomination status (open/closed/etc) */
  stateStatus: StateNominationStatus[];
  /** True while initial load or refresh is in progress */
  isLoading: boolean;
  /** Data source: 'firestore' | 'cache' | 'fallback' */
  source: RefreshResult['source'] | null;
  /** Last error if any */
  error: Error | null;
  /** Manually trigger refresh (pass true to force bypass cache) */
  refresh: (force?: boolean) => Promise<void>;
  /** Get fee for a specific subclass */
  getFee: (subclass: string) => VisaFeeEntry | undefined;
  /** Get processing time for a specific subclass */
  getTime: (subclass: string) => ProcessingTime | undefined;
  /** Get state status for a specific state code */
  getState: (stateCode: string) => StateNominationStatus | undefined;
}

export interface UseVisaRulesOptions {
  /** Subscribe to real-time version changes (default: false) */
  subscribeToUpdates?: boolean;
  /** Refresh when app comes to foreground (default: true) */
  refreshOnForeground?: boolean;
}

export function useVisaRules(options: UseVisaRulesOptions = {}): UseVisaRulesResult {
  const { subscribeToUpdates = false, refreshOnForeground = true } = options;
  
  const [fees, setFees] = useState<VisaFeeEntry[]>([]);
  const [processingTimes, setProcessingTimes] = useState<ProcessingTime[]>([]);
  const [stateStatus, setStateStatus] = useState<StateNominationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<RefreshResult['source'] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const versionRef = useRef(0);

  const refresh = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await refreshVisaRules({ force });
      
      if (mountedRef.current) {
        setFees(result.fees);
        setProcessingTimes(result.processingTimes);
        setStateStatus(result.stateStatus);
        setSource(result.source);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refresh(false);
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Refresh on app foreground
  useEffect(() => {
    if (!refreshOnForeground) return;
    
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refresh(false);
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refresh, refreshOnForeground]);

  // Subscribe to version changes
  useEffect(() => {
    if (!subscribeToUpdates) return;
    
    const unsubscribe = subscribeToRulesVersion((newVersion) => {
      if (newVersion > versionRef.current) {
        versionRef.current = newVersion;
        refresh(true);
      }
    });
    
    return () => unsubscribe();
  }, [subscribeToUpdates, refresh]);

  // Lookup helpers
  const getFee = useCallback(
    (subclass: string) => getFeeForSubclass(fees, subclass),
    [fees]
  );

  const getTime = useCallback(
    (subclass: string) => getProcessingTimeForSubclass(processingTimes, subclass),
    [processingTimes]
  );

  const getState = useCallback(
    (stateCode: string) => getStateStatus(stateStatus, stateCode),
    [stateStatus]
  );

  return {
    fees,
    processingTimes,
    stateStatus,
    isLoading,
    source,
    error,
    refresh,
    getFee,
    getTime,
    getState,
  };
}

/**
 * useVisaRulesForSubclass — Convenience hook for a single visa subclass.
 *
 * Usage:
 *   const { fee, processingTime, isLoading } = useVisaRulesForSubclass('189');
 */
export function useVisaRulesForSubclass(subclass: string) {
  const { fees, processingTimes, isLoading, source, refresh } = useVisaRules();
  
  const fee = getFeeForSubclass(fees, subclass);
  const processingTime = getProcessingTimeForSubclass(processingTimes, subclass);
  
  return {
    fee,
    processingTime,
    isLoading,
    source,
    refresh,
  };
}

export default useVisaRules;
