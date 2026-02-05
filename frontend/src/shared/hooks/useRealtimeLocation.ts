/**
 * TANDER useRealtimeLocation Hook
 * Combines real-time location tracking with permission prompt logic
 *
 * This is the main hook to use in screens that need location.
 * It provides:
 * - Real-time location updates
 * - Permission status and prompt management
 * - Distance calculation utilities
 * - Auto-start tracking when permission is granted
 */

import { useEffect, useCallback, useMemo } from 'react';
import { Linking, Platform } from 'react-native';
import {
  useLocationStore,
  selectCurrentLocation,
  selectPermissionStatus,
  selectIsTracking,
  selectLastUpdated,
  selectTrackingError,
  selectIsLocationRecent,
  selectWasPermissionGrantedThisSession,
  selectCanAskAgain,
  selectAllowOnceExpired,
  getDistanceKm,
  LocationCoordinates,
} from '@store/locationStore';
import {
  setPermissionGrantedAt,
} from '@services/storage/locationPermissionStorage';
import { useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface UseRealtimeLocationReturn {
  // Location data
  location: LocationCoordinates | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdated: number | null;
  isLocationRecent: boolean;

  // Permission & tracking state
  permissionStatus: 'granted' | 'denied' | 'limited' | 'undetermined' | 'checking';
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;

  // Permission prompt state
  shouldShowPrompt: boolean;
  isFirstTimeAsking: boolean;
  dismissalCount: number;
  showDontAskOption: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  startTracking: (highAccuracy?: boolean) => Promise<boolean>;
  stopTracking: () => void;
  refreshLocation: () => Promise<LocationCoordinates | null>;
  openSettings: () => Promise<void>;
  dismissPrompt: () => Promise<void>;
  handleDontAskAgain: () => Promise<void>;

  // Utilities
  getDistanceTo: (lat: number, lon: number) => number | null;
  getDistanceToFormatted: (lat: number, lon: number) => string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useRealtimeLocation(): UseRealtimeLocationReturn {
  // Store state
  const currentLocation = useLocationStore(selectCurrentLocation);
  const permissionStatus = useLocationStore(selectPermissionStatus);
  const isTracking = useLocationStore(selectIsTracking);
  const lastUpdated = useLocationStore(selectLastUpdated);
  const trackingError = useLocationStore(selectTrackingError);
  const isLocationRecent = useLocationStore(selectIsLocationRecent);
  const isCheckingPermission = useLocationStore((s) => s.isCheckingPermission);
  // Session-based tracking for "Allow Once" detection
  const wasPermissionGrantedThisSession = useLocationStore(selectWasPermissionGrantedThisSession);
  const canAskAgain = useLocationStore(selectCanAskAgain);
  const allowOnceExpiredInSession = useLocationStore(selectAllowOnceExpired);

  // Store actions
  const checkPermission = useLocationStore((s) => s.checkPermission);
  const storeRequestPermission = useLocationStore((s) => s.requestPermission);
  const startTrackingStore = useLocationStore((s) => s.startTracking);
  const stopTrackingStore = useLocationStore((s) => s.stopTracking);
  const getCurrentLocation = useLocationStore((s) => s.getCurrentLocation);

  // Local state for prompt management
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isFirstTimeAsking, setIsFirstTimeAsking] = useState(true);
  const [dismissalCount, setDismissalCount] = useState(0);
  const [promptChecked, setPromptChecked] = useState(false);

  // =============================================================================
  // PROMPT EVALUATION
  // =============================================================================

  const evaluatePromptVisibility = useCallback(async () => {
    // MANDATORY MODAL: Always show when permission is not granted
    // Users must enable location or leave the app - no dismiss option
    if (permissionStatus === 'granted') {
      setShouldShowPrompt(false);
      setPromptChecked(true);
      console.log(`[Location] Permission granted on ${Platform.OS} - hiding modal`);
      return;
    }

    // Permission not granted - show the mandatory modal
    setShouldShowPrompt(true);
    setPromptChecked(true);

    // Log for debugging
    console.log(`[Location] Permission not granted on ${Platform.OS} - showing mandatory modal`);
    if (allowOnceExpiredInSession) {
      console.log(`[Location] "Allow Once" expired - user must re-enable location`);
    }
  }, [permissionStatus, allowOnceExpiredInSession]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Check permission and evaluate prompt on mount
  useEffect(() => {
    const init = async () => {
      await checkPermission();
    };
    init();
  }, [checkPermission]);

  // Evaluate prompt visibility when permission status changes
  useEffect(() => {
    if (permissionStatus !== 'checking') {
      evaluatePromptVisibility();
    }
  }, [permissionStatus, evaluatePromptVisibility]);

  // Auto-start tracking when permission is granted
  useEffect(() => {
    if (permissionStatus === 'granted' && !isTracking) {
      startTrackingStore();
    }
  }, [permissionStatus, isTracking, startTrackingStore]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await storeRequestPermission();
    if (granted) {
      setShouldShowPrompt(false);
    } else {
      await evaluatePromptVisibility();
    }
    return granted;
  }, [storeRequestPermission, evaluatePromptVisibility]);

  const startTracking = useCallback(
    async (highAccuracy = false): Promise<boolean> => {
      return startTrackingStore(highAccuracy);
    },
    [startTrackingStore]
  );

  const stopTracking = useCallback(() => {
    stopTrackingStore();
  }, [stopTrackingStore]);

  const refreshLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    return getCurrentLocation();
  }, [getCurrentLocation]);

  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (err) {
      console.warn('Error opening settings:', err);
    }
  }, []);

  // DEPRECATED: Modal is now mandatory - these are no-ops for backwards compatibility
  const dismissPrompt = useCallback(async () => {
    // No-op: Modal cannot be dismissed
    console.log('[Location] Dismiss attempted but modal is mandatory');
  }, []);

  const handleDontAskAgain = useCallback(async () => {
    // No-op: "Don't ask again" option removed
    console.log('[Location] Don\'t ask again attempted but modal is mandatory');
  }, []);

  // =============================================================================
  // UTILITIES
  // =============================================================================

  const getDistanceTo = useCallback(
    (lat: number, lon: number): number | null => {
      if (!currentLocation) return null;
      return getDistanceKm(
        currentLocation.latitude,
        currentLocation.longitude,
        lat,
        lon
      );
    },
    [currentLocation]
  );

  const getDistanceToFormatted = useCallback(
    (lat: number, lon: number): string => {
      const distance = getDistanceTo(lat, lon);
      if (distance === null) return 'Unknown';
      if (distance < 1) {
        return `${Math.round(distance * 1000)}m away`;
      }
      return `${distance.toFixed(1)}km away`;
    },
    [getDistanceTo]
  );

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  // DEPRECATED: "Don't ask again" option removed - always false
  const showDontAskOption = useMemo(() => false, []);

  const isLoading = useMemo(
    () => isCheckingPermission || (permissionStatus === 'checking'),
    [isCheckingPermission, permissionStatus]
  );

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Location data
    location: currentLocation,
    latitude: currentLocation?.latitude ?? null,
    longitude: currentLocation?.longitude ?? null,
    accuracy: currentLocation?.accuracy ?? null,
    lastUpdated,
    isLocationRecent,

    // Permission & tracking state
    permissionStatus,
    isTracking,
    isLoading,
    error: trackingError,

    // Permission prompt state
    shouldShowPrompt: promptChecked ? shouldShowPrompt : false,
    isFirstTimeAsking,
    dismissalCount,
    showDontAskOption,

    // Actions
    requestPermission,
    startTracking,
    stopTracking,
    refreshLocation,
    openSettings,
    dismissPrompt,
    handleDontAskAgain,

    // Utilities
    getDistanceTo,
    getDistanceToFormatted,
  };
}

export default useRealtimeLocation;
