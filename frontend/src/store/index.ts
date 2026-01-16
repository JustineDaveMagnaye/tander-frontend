/**
 * Store exports
 * Central export point for all Zustand stores
 */

export * from './authStore';
export {
  usePresenceStore,
  selectIsUserOnline,
  selectOnlineCount,
  selectLastUpdated,
  selectIsInitialized as selectPresenceInitialized,
} from './presenceStore';
export { useToastStore, toast } from './toastStore';
export type { ToastType, ToastConfig } from './toastStore';

export {
  useLocationStore,
  selectCurrentLocation,
  selectPermissionStatus,
  selectIsTracking,
  selectLastUpdated as selectLocationLastUpdated,
  selectTrackingError,
  selectIsLocationRecent,
  selectLocationHistory,
  selectWasPermissionGrantedThisSession,
  selectCanAskAgain,
  selectAllowOnceExpired,
  getDistanceKm,
} from './locationStore';
export type {
  LocationStore,
  LocationCoordinates,
  LocationPermissionStatus as LocationStorePermissionStatus,
} from './locationStore';
