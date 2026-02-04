/**
 * TANDER useLocationPermission Hook
 * Manages location permission state, checking, and prompting logic
 *
 * Features:
 * - Checks current permission status (foreground & background)
 * - Determines when to show the permission prompt modal
 * - Handles permission requests and settings navigation
 * - Progressive prompting strategy (less pushy after multiple dismissals)
 *
 * Permission States:
 * - 'granted': User has allowed location access
 * - 'denied': User has denied location access
 * - 'limited': User allowed "Allow Once" (iOS) - needs upgrade
 * - 'undetermined': Permission not yet requested
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import {
  shouldShowLocationPrompt,
  incrementDismissalCount,
  setDontAskAgain,
  setPermissionGrantedAt,
  getDismissalCount,
  DISMISSALS_BEFORE_DONT_ASK_OPTION,
} from '@services/storage/locationPermissionStorage';

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'limited'
  | 'undetermined'
  | 'checking';

export interface LocationPermissionState {
  /** Current permission status */
  status: LocationPermissionStatus;
  /** Whether the permission prompt modal should be shown */
  shouldShowPrompt: boolean;
  /** Whether this is the first time asking */
  isFirstTimeAsking: boolean;
  /** Number of times user has dismissed the prompt */
  dismissalCount: number;
  /** Whether to show "Don't ask again" option */
  showDontAskOption: boolean;
  /** Whether we're currently checking permission */
  isChecking: boolean;
  /** Last known location (if available) */
  lastLocation: Location.LocationObject | null;
  /** Error message if any */
  error: string | null;
}

export interface UseLocationPermissionReturn extends LocationPermissionState {
  /** Request foreground location permission from the OS */
  requestPermission: () => Promise<boolean>;
  /** Open device settings for the app */
  openSettings: () => Promise<void>;
  /** Dismiss the prompt (increments dismissal count) */
  dismissPrompt: () => Promise<void>;
  /** User selected "Don't ask again" */
  handleDontAskAgain: () => Promise<void>;
  /** Re-check the current permission status */
  refreshPermissionStatus: () => Promise<void>;
  /** Reset the prompt state (useful after permission granted) */
  resetPromptState: () => void;
}

/**
 * Main hook for managing location permissions
 */
export function useLocationPermission(): UseLocationPermissionReturn {
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isFirstTimeAsking, setIsFirstTimeAsking] = useState(true);
  const [dismissalCount, setDismissalCount] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert expo-location permission status to our simplified status
   */
  const mapPermissionStatus = useCallback(
    (permissionResponse: Location.LocationPermissionResponse): LocationPermissionStatus => {
      if (!permissionResponse.granted) {
        if (permissionResponse.canAskAgain) {
          return 'undetermined';
        }
        return 'denied';
      }

      // On iOS, check if it's "Allow Once" which gives limited access
      // iOS returns granted: true even for "Allow Once", but we can detect it
      // by checking if background permission is denied while foreground is granted
      // For simplicity, we treat all granted as 'granted' and rely on the modal
      // being shown when the user hasn't granted "Always" or "While Using"
      return 'granted';
    },
    []
  );

  /**
   * Check the current permission status
   */
  const checkPermissionStatus = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      const { status: foregroundStatus } =
        await Location.getForegroundPermissionsAsync();

      if (foregroundStatus === Location.PermissionStatus.GRANTED) {
        return 'granted';
      } else if (foregroundStatus === Location.PermissionStatus.DENIED) {
        return 'denied';
      } else {
        return 'undetermined';
      }
    } catch (err) {
      console.warn('Error checking location permission:', err);
      setError('Unable to check location permission');
      return 'undetermined';
    }
  }, []);

  /**
   * Determine if we should show the prompt modal
   */
  const evaluatePromptVisibility = useCallback(
    async (currentStatus: LocationPermissionStatus) => {
      // Don't show prompt if permission is already granted
      if (currentStatus === 'granted') {
        setShouldShowPrompt(false);
        return;
      }

      // Check our storage-based logic for when to show the prompt
      const promptCheck = await shouldShowLocationPrompt();

      setDismissalCount(promptCheck.dismissalCount);
      setIsFirstTimeAsking(promptCheck.reason === 'first_time');
      setShouldShowPrompt(promptCheck.shouldShow);
    },
    []
  );

  /**
   * Refresh the permission status (called on app foreground)
   */
  const refreshPermissionStatus = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    const currentStatus = await checkPermissionStatus();
    setStatus(currentStatus);

    // If permission was granted, record it and reset prompts
    if (currentStatus === 'granted') {
      await setPermissionGrantedAt(Date.now());
      setShouldShowPrompt(false);

      // Try to get location
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLastLocation(location);
      } catch (locationError) {
        console.warn('Could not get current location:', locationError);
      }
    } else {
      await evaluatePromptVisibility(currentStatus);
    }

    // Update dismissal count for UI
    const count = await getDismissalCount();
    setDismissalCount(count);

    setIsChecking(false);
  }, [checkPermissionStatus, evaluatePromptVisibility]);

  /**
   * Request foreground permission from the OS
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsChecking(true);
      setError(null);

      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus === Location.PermissionStatus.GRANTED) {
        setStatus('granted');
        setShouldShowPrompt(false);
        await setPermissionGrantedAt(Date.now());

        // Try to get location
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLastLocation(location);
        } catch (locationError) {
          console.warn('Could not get current location:', locationError);
        }

        setIsChecking(false);
        return true;
      } else {
        setStatus('denied');
        await evaluatePromptVisibility('denied');
        setIsChecking(false);
        return false;
      }
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      setError('Failed to request location permission');
      setIsChecking(false);
      return false;
    }
  }, [evaluatePromptVisibility]);

  /**
   * Open device settings for the app
   */
  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (err) {
      console.warn('Error opening settings:', err);
      setError('Could not open settings');
    }
  }, []);

  /**
   * Handle user dismissing the prompt
   */
  const dismissPrompt = useCallback(async () => {
    const newCount = await incrementDismissalCount();
    setDismissalCount(newCount);
    setShouldShowPrompt(false);
  }, []);

  /**
   * Handle user selecting "Don't ask again"
   */
  const handleDontAskAgain = useCallback(async () => {
    await setDontAskAgain(true);
    await incrementDismissalCount();
    setShouldShowPrompt(false);
  }, []);

  /**
   * Reset prompt state (called when user grants permission)
   */
  const resetPromptState = useCallback(() => {
    setShouldShowPrompt(false);
    setDismissalCount(0);
    setIsFirstTimeAsking(true);
  }, []);

  /**
   * Initial permission check and app state listener
   */
  useEffect(() => {
    // Check permission on mount
    refreshPermissionStatus();

    // Re-check when app comes to foreground (user might have changed settings)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshPermissionStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refreshPermissionStatus]);

  return {
    status,
    shouldShowPrompt,
    isFirstTimeAsking,
    dismissalCount,
    showDontAskOption: dismissalCount >= DISMISSALS_BEFORE_DONT_ASK_OPTION,
    isChecking,
    lastLocation,
    error,
    requestPermission,
    openSettings,
    dismissPrompt,
    handleDontAskAgain,
    refreshPermissionStatus,
    resetPromptState,
  };
}

export default useLocationPermission;
