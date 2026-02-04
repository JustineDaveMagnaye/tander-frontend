/**
 * TANDER Location Store
 * Zustand store for real-time location tracking across the app
 *
 * Features:
 * - Real-time location updates via watchPositionAsync
 * - Permission status tracking
 * - Location history for accuracy
 * - Automatic re-checking when app comes to foreground
 * - Battery-efficient tracking modes
 */

import { create } from 'zustand';
import * as Location from 'expo-location';
import { AppState, AppStateStatus, Platform } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'limited'
  | 'undetermined'
  | 'checking';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface LocationState {
  // Permission
  permissionStatus: LocationPermissionStatus;
  isCheckingPermission: boolean;
  /** Tracks if permission was granted in this session (for "Allow Once" detection) */
  wasPermissionGrantedThisSession: boolean;
  /** Can we ask for permission again (not permanently denied) */
  canAskAgain: boolean;

  // Location data
  currentLocation: LocationCoordinates | null;
  lastUpdated: number | null;
  isTracking: boolean;
  trackingError: string | null;

  // Location history (last 5 positions for smoothing)
  locationHistory: LocationCoordinates[];

  // Subscription reference (internal)
  _watchSubscription: Location.LocationSubscription | null;
  _appStateSubscription: { remove: () => void } | null;
}

export interface LocationActions {
  // Permission actions
  checkPermission: () => Promise<LocationPermissionStatus>;
  requestPermission: () => Promise<boolean>;

  // Tracking actions
  startTracking: (highAccuracy?: boolean) => Promise<boolean>;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<LocationCoordinates | null>;

  // Utility
  clearError: () => void;
  reset: () => void;

  // Internal
  _setLocation: (location: Location.LocationObject) => void;
  _handleAppStateChange: (state: AppStateStatus) => void;
  _initAppStateListener: () => void;
  _cleanupAppStateListener: () => void;
}

export type LocationStore = LocationState & LocationActions;

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_HISTORY_LENGTH = 5;
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
const LOCATION_DISTANCE_INTERVAL = 10; // 10 meters

// =============================================================================
// STORE
// =============================================================================

export const useLocationStore = create<LocationStore>((set, get) => ({
  // Initial state
  permissionStatus: 'checking',
  isCheckingPermission: true,
  wasPermissionGrantedThisSession: false,
  canAskAgain: true,
  currentLocation: null,
  lastUpdated: null,
  isTracking: false,
  trackingError: null,
  locationHistory: [],
  _watchSubscription: null,
  _appStateSubscription: null,

  // =============================================================================
  // PERMISSION ACTIONS
  // =============================================================================

  checkPermission: async () => {
    set({ isCheckingPermission: true });

    try {
      const response = await Location.getForegroundPermissionsAsync();
      const { status, canAskAgain: canAsk } = response;
      const { wasPermissionGrantedThisSession } = get();

      let permissionStatus: LocationPermissionStatus;

      if (status === Location.PermissionStatus.GRANTED) {
        permissionStatus = 'granted';
        // Track that we had permission this session (for "Allow Once" detection)
        set({
          permissionStatus,
          isCheckingPermission: false,
          wasPermissionGrantedThisSession: true,
          canAskAgain: true,
        });
      } else if (status === Location.PermissionStatus.DENIED) {
        // On Android, DENIED + canAskAgain=false means "permanently denied"
        // On iOS, DENIED usually means user denied but can be asked again via settings
        // If canAskAgain is true, treat as undetermined (can still prompt)
        if (canAsk) {
          permissionStatus = 'undetermined';
        } else {
          permissionStatus = 'denied';
        }
        set({
          permissionStatus,
          isCheckingPermission: false,
          canAskAgain: canAsk ?? true,
        });
      } else {
        permissionStatus = 'undetermined';
        set({
          permissionStatus,
          isCheckingPermission: false,
          canAskAgain: canAsk ?? true,
        });
      }

      // Log for debugging on both platforms
      console.log(`[Location] Platform: ${Platform.OS}, Status: ${permissionStatus}, CanAskAgain: ${canAsk}, WasGrantedThisSession: ${wasPermissionGrantedThisSession}`);

      return permissionStatus;
    } catch (error) {
      console.warn('Error checking location permission:', error);
      set({
        permissionStatus: 'undetermined',
        isCheckingPermission: false,
        trackingError: 'Failed to check permission',
        canAskAgain: true,
      });
      return 'undetermined';
    }
  },

  requestPermission: async () => {
    set({ isCheckingPermission: true });

    try {
      const response = await Location.requestForegroundPermissionsAsync();
      const { status, canAskAgain: canAsk } = response;

      if (status === Location.PermissionStatus.GRANTED) {
        set({
          permissionStatus: 'granted',
          isCheckingPermission: false,
          wasPermissionGrantedThisSession: true,
          canAskAgain: true,
        });

        console.log(`[Location] Permission granted on ${Platform.OS}`);

        // Auto-start tracking when permission is granted
        await get().startTracking();
        return true;
      } else {
        const permissionStatus = canAsk ? 'undetermined' : 'denied';
        set({
          permissionStatus,
          isCheckingPermission: false,
          canAskAgain: canAsk ?? true,
        });
        console.log(`[Location] Permission denied on ${Platform.OS}, canAskAgain: ${canAsk}`);
        return false;
      }
    } catch (error) {
      console.warn('Error requesting location permission:', error);
      set({
        isCheckingPermission: false,
        trackingError: 'Failed to request permission',
      });
      return false;
    }
  },

  // =============================================================================
  // TRACKING ACTIONS
  // =============================================================================

  startTracking: async (highAccuracy = false) => {
    const { permissionStatus, _watchSubscription } = get();

    // Don't start if already tracking
    if (_watchSubscription) {
      console.log('Location tracking already active');
      return true;
    }

    // Check permission first
    if (permissionStatus !== 'granted') {
      const newStatus = await get().checkPermission();
      if (newStatus !== 'granted') {
        set({ trackingError: 'Location permission not granted' });
        return false;
      }
    }

    try {
      set({ isTracking: true, trackingError: null });

      // Get initial location immediately
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        });
        get()._setLocation(initialLocation);
      } catch (initialError) {
        console.warn('Could not get initial location:', initialError);
      }

      // Start watching location
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_INTERVAL,
        },
        (location) => {
          get()._setLocation(location);
        }
      );

      set({ _watchSubscription: subscription });

      // Initialize app state listener
      get()._initAppStateListener();

      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.warn('Error starting location tracking:', error);
      set({
        isTracking: false,
        trackingError: 'Failed to start location tracking',
      });
      return false;
    }
  },

  stopTracking: () => {
    const { _watchSubscription } = get();

    if (_watchSubscription) {
      _watchSubscription.remove();
    }

    get()._cleanupAppStateListener();

    set({
      isTracking: false,
      _watchSubscription: null,
    });

    console.log('Location tracking stopped');
  },

  getCurrentLocation: async () => {
    const { permissionStatus } = get();

    if (permissionStatus !== 'granted') {
      const newStatus = await get().checkPermission();
      if (newStatus !== 'granted') {
        return null;
      }
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };

      set({
        currentLocation: coords,
        lastUpdated: location.timestamp,
        trackingError: null,
      });

      return coords;
    } catch (error) {
      console.warn('Error getting current location:', error);
      set({ trackingError: 'Failed to get current location' });
      return null;
    }
  },

  // =============================================================================
  // UTILITY ACTIONS
  // =============================================================================

  clearError: () => {
    set({ trackingError: null });
  },

  reset: () => {
    get().stopTracking();
    set({
      permissionStatus: 'checking',
      isCheckingPermission: false,
      wasPermissionGrantedThisSession: false,
      canAskAgain: true,
      currentLocation: null,
      lastUpdated: null,
      isTracking: false,
      trackingError: null,
      locationHistory: [],
    });
  },

  // =============================================================================
  // INTERNAL ACTIONS
  // =============================================================================

  _setLocation: (location: Location.LocationObject) => {
    const coords: LocationCoordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
    };

    // Update history
    const { locationHistory } = get();
    const newHistory = [coords, ...locationHistory].slice(0, MAX_HISTORY_LENGTH);

    set({
      currentLocation: coords,
      lastUpdated: location.timestamp,
      locationHistory: newHistory,
      trackingError: null,
    });
  },

  _handleAppStateChange: async (nextAppState: AppStateStatus) => {
    const { isTracking, permissionStatus } = get();

    if (nextAppState === 'active') {
      // Re-check permission when app becomes active
      const newStatus = await get().checkPermission();

      // If permission was revoked, stop tracking
      if (newStatus !== 'granted' && isTracking) {
        get().stopTracking();
        return;
      }

      // If permission was granted and we were tracking, restart
      if (newStatus === 'granted' && !isTracking && permissionStatus === 'granted') {
        await get().startTracking();
      }

      // If permission newly granted, try to get location
      if (newStatus === 'granted' && permissionStatus !== 'granted') {
        await get().getCurrentLocation();
      }
    }
  },

  _initAppStateListener: () => {
    const { _appStateSubscription } = get();

    // Don't add duplicate listeners
    if (_appStateSubscription) return;

    const subscription = AppState.addEventListener('change', (state) => {
      get()._handleAppStateChange(state);
    });

    set({ _appStateSubscription: subscription });
  },

  _cleanupAppStateListener: () => {
    const { _appStateSubscription } = get();

    if (_appStateSubscription) {
      _appStateSubscription.remove();
      set({ _appStateSubscription: null });
    }
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectCurrentLocation = (state: LocationStore) => state.currentLocation;
export const selectPermissionStatus = (state: LocationStore) => state.permissionStatus;
export const selectIsTracking = (state: LocationStore) => state.isTracking;
export const selectLastUpdated = (state: LocationStore) => state.lastUpdated;
export const selectTrackingError = (state: LocationStore) => state.trackingError;
export const selectLocationHistory = (state: LocationStore) => state.locationHistory;
export const selectWasPermissionGrantedThisSession = (state: LocationStore) => state.wasPermissionGrantedThisSession;
export const selectCanAskAgain = (state: LocationStore) => state.canAskAgain;

// Helper to check if location is recent (within last 5 minutes)
export const selectIsLocationRecent = (state: LocationStore) => {
  if (!state.lastUpdated) return false;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return state.lastUpdated > fiveMinutesAgo;
};

// Helper to detect "Allow Once" expired scenario
// Returns true if permission was granted this session but is no longer granted
export const selectAllowOnceExpired = (state: LocationStore) => {
  return state.wasPermissionGrantedThisSession && state.permissionStatus !== 'granted';
};

// Helper to get distance between two coordinates (Haversine formula)
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default useLocationStore;
