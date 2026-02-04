/**
 * TANDER Orientation Lock Hook
 * Locks orientation to portrait on phones, allows all orientations on tablets
 */

import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

// Tablet breakpoint - lowered to 600dp to support more tablets
// Android uses 600dp as the standard tablet threshold (sw600dp)
// iPad Mini smallest dimension is 768dp
const TABLET_BREAKPOINT = 600;

/**
 * Determines if the device is a tablet based on screen dimensions
 * Uses the smaller dimension to handle both portrait and landscape initial states
 */
function isTabletDevice(): boolean {
  const screen = Dimensions.get('screen');
  const window = Dimensions.get('window');

  // Use screen dimensions (more reliable for device type detection)
  const { width, height, scale } = screen;
  // Use the smaller dimension to determine device type
  // This ensures correct detection regardless of initial orientation
  const smallerDimension = Math.min(width, height);

  // Also check the larger dimension - tablets typically have larger screens
  const largerDimension = Math.max(width, height);

  // A device is considered a tablet if:
  // 1. Smaller dimension >= 600dp (standard Android tablet threshold), OR
  // 2. Larger dimension >= 900dp AND smaller dimension >= 500dp (catches more tablets)
  const isTablet = smallerDimension >= TABLET_BREAKPOINT ||
                   (largerDimension >= 900 && smallerDimension >= 500);

  if (__DEV__) {
    console.log('[OrientationLock] Screen:', screen.width, 'x', screen.height, 'scale:', scale);
    console.log('[OrientationLock] Window:', window.width, 'x', window.height);
    console.log('[OrientationLock] Smaller dimension:', smallerDimension, 'dp');
    console.log('[OrientationLock] Larger dimension:', largerDimension, 'dp');
    console.log('[OrientationLock] Is tablet:', isTablet);
  }

  return isTablet;
}

/**
 * Locks orientation based on device type:
 * - Phones: Portrait only
 * - Tablets: All orientations allowed
 */
async function lockOrientationForDevice(): Promise<void> {
  try {
    const isTablet = isTabletDevice();

    if (isTablet) {
      // Tablets: Allow all orientations
      if (__DEV__) {
        console.log('[OrientationLock] Tablet detected - unlocking orientation');
      }
      await ScreenOrientation.unlockAsync();
    } else {
      // Phones: Lock to portrait only
      if (__DEV__) {
        console.log('[OrientationLock] Phone detected - locking to PORTRAIT');
      }
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
      if (__DEV__) {
        console.log('[OrientationLock] Successfully locked to portrait');
      }
    }
  } catch (error) {
    // Log error in dev mode
    if (__DEV__) {
      console.warn('[OrientationLock] Failed to set orientation:', error);
    }
  }
}

/**
 * Hook to apply orientation lock based on device type
 * Call this once at the app root level
 *
 * @example
 * ```typescript
 * function App() {
 *   useOrientationLock();
 *   return <RootNavigator />;
 * }
 * ```
 */
export function useOrientationLock(): void {
  useEffect(() => {
    // Small delay to ensure dimensions are available
    // Some devices report incorrect dimensions immediately on startup
    const timer = setTimeout(() => {
      lockOrientationForDevice();
    }, 100);

    // Also listen for dimension changes (handles split-screen, etc.)
    const subscription = Dimensions.addEventListener('change', () => {
      lockOrientationForDevice();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
}

/**
 * Utility function to manually apply orientation lock
 * Useful for non-component contexts
 */
export const applyOrientationLock = lockOrientationForDevice;

export default useOrientationLock;
