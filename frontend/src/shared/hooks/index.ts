/**
 * TANDER Shared Hooks
 * Central export for all shared hooks
 */

export {
  useResponsive,
  useOrientation,
  useDeviceType,
  responsive,
  BREAKPOINTS,
  SCREEN_CATEGORIES,
  type DeviceType,
  type Orientation,
  type ScreenSize,
  type ResponsiveInfo,
} from './useResponsive';

export {
  usePlatform,
  platform,
  MIN_SUPPORTED_VERSIONS,
  FEATURE_SUPPORT,
  type PlatformInfo,
} from './usePlatform';

export { usePresence } from './usePresence';

export {
  useLocationPermission,
  type LocationPermissionStatus,
  type LocationPermissionState,
  type UseLocationPermissionReturn,
} from './useLocationPermission';

export {
  useRealtimeLocation,
  type UseRealtimeLocationReturn,
} from './useRealtimeLocation';
