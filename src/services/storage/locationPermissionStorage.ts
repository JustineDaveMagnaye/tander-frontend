/**
 * Location Permission Storage
 * Tracks user's location permission prompt dismissals and preferences
 * Used to implement progressive prompting strategy (less pushy after multiple dismissals)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for location permission tracking
export const LOCATION_STORAGE_KEYS = {
  DISMISSAL_COUNT: '@tander/location_permission_dismissal_count',
  LAST_PROMPT_TIME: '@tander/location_permission_last_prompt',
  DONT_ASK_AGAIN: '@tander/location_permission_dont_ask',
  PERMISSION_GRANTED_AT: '@tander/location_permission_granted_at',
} as const;

// Minimum hours between re-prompting (to avoid being annoying)
export const MIN_HOURS_BETWEEN_PROMPTS = 24;

// Number of dismissals before showing "Don't ask again" option
export const DISMISSALS_BEFORE_DONT_ASK_OPTION = 3;

export interface LocationPermissionState {
  dismissalCount: number;
  lastPromptTime: number | null;
  dontAskAgain: boolean;
  permissionGrantedAt: number | null;
}

/**
 * Get the current dismissal count
 */
export async function getDismissalCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_STORAGE_KEYS.DISMISSAL_COUNT);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.warn('Error getting dismissal count:', error);
    return 0;
  }
}

/**
 * Increment the dismissal count when user dismisses the prompt
 * Also clears permissionGrantedAt so we don't keep detecting "Allow Once expired"
 */
export async function incrementDismissalCount(): Promise<number> {
  try {
    const currentCount = await getDismissalCount();
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(LOCATION_STORAGE_KEYS.DISMISSAL_COUNT, newCount.toString());
    await setLastPromptTime(Date.now());
    // Clear permissionGrantedAt so we don't keep showing "Allow Once expired" prompts
    // After dismissal, the regular time-based delay logic will apply
    await AsyncStorage.removeItem(LOCATION_STORAGE_KEYS.PERMISSION_GRANTED_AT);
    return newCount;
  } catch (error) {
    console.warn('Error incrementing dismissal count:', error);
    return 0;
  }
}

/**
 * Get the last time the prompt was shown
 */
export async function getLastPromptTime(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_STORAGE_KEYS.LAST_PROMPT_TIME);
    return value ? parseInt(value, 10) : null;
  } catch (error) {
    console.warn('Error getting last prompt time:', error);
    return null;
  }
}

/**
 * Set the last prompt time
 */
export async function setLastPromptTime(time: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEYS.LAST_PROMPT_TIME, time.toString());
  } catch (error) {
    console.warn('Error setting last prompt time:', error);
  }
}

/**
 * Check if user has selected "Don't ask again"
 */
export async function getDontAskAgain(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_STORAGE_KEYS.DONT_ASK_AGAIN);
    return value === 'true';
  } catch (error) {
    console.warn('Error getting dont ask again:', error);
    return false;
  }
}

/**
 * Set the "Don't ask again" preference
 */
export async function setDontAskAgain(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEYS.DONT_ASK_AGAIN, value.toString());
  } catch (error) {
    console.warn('Error setting dont ask again:', error);
  }
}

/**
 * Record when permission was granted (for analytics/debugging)
 */
export async function setPermissionGrantedAt(time: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEYS.PERMISSION_GRANTED_AT, time.toString());
    // Reset dismissal count when permission is granted
    await AsyncStorage.setItem(LOCATION_STORAGE_KEYS.DISMISSAL_COUNT, '0');
    await AsyncStorage.setItem(LOCATION_STORAGE_KEYS.DONT_ASK_AGAIN, 'false');
  } catch (error) {
    console.warn('Error setting permission granted at:', error);
  }
}

/**
 * Get the full location permission state
 */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    const [dismissalCount, lastPromptTime, dontAskAgain, permissionGrantedAt] = await Promise.all([
      getDismissalCount(),
      getLastPromptTime(),
      getDontAskAgain(),
      AsyncStorage.getItem(LOCATION_STORAGE_KEYS.PERMISSION_GRANTED_AT),
    ]);

    return {
      dismissalCount,
      lastPromptTime,
      dontAskAgain,
      permissionGrantedAt: permissionGrantedAt ? parseInt(permissionGrantedAt, 10) : null,
    };
  } catch (error) {
    console.warn('Error getting location permission state:', error);
    return {
      dismissalCount: 0,
      lastPromptTime: null,
      dontAskAgain: false,
      permissionGrantedAt: null,
    };
  }
}

/**
 * Check if enough time has passed since the last prompt
 */
export async function canShowPromptAgain(): Promise<boolean> {
  const lastPromptTime = await getLastPromptTime();

  if (!lastPromptTime) {
    return true; // Never prompted before
  }

  const hoursSinceLastPrompt = (Date.now() - lastPromptTime) / (1000 * 60 * 60);
  return hoursSinceLastPrompt >= MIN_HOURS_BETWEEN_PROMPTS;
}

/**
 * Determine if we should show the prompt based on all factors
 * @param permissionWasGranted - If true, permission was previously granted but now revoked (Allow Once expired)
 */
export async function shouldShowLocationPrompt(permissionWasGranted?: boolean): Promise<{
  shouldShow: boolean;
  reason: 'first_time' | 'time_elapsed' | 'dont_ask' | 'too_soon' | 'allow_once_expired';
  dismissalCount: number;
}> {
  const state = await getLocationPermissionState();

  // User has explicitly opted out
  if (state.dontAskAgain) {
    return { shouldShow: false, reason: 'dont_ask', dismissalCount: state.dismissalCount };
  }

  // IMPORTANT: If permission was previously granted but now isn't (Allow Once expired),
  // immediately show the prompt regardless of time delays
  if (permissionWasGranted || state.permissionGrantedAt !== null) {
    // Permission was granted before but now we're checking again
    // This means "Allow Once" expired - show immediately
    return { shouldShow: true, reason: 'allow_once_expired', dismissalCount: state.dismissalCount };
  }

  // First time prompting
  if (state.lastPromptTime === null) {
    return { shouldShow: true, reason: 'first_time', dismissalCount: 0 };
  }

  // Check if enough time has passed
  const hoursSinceLastPrompt = (Date.now() - state.lastPromptTime) / (1000 * 60 * 60);

  // Increase wait time based on dismissal count (progressive delay)
  // 1st dismissal: wait 24 hours
  // 2nd dismissal: wait 48 hours
  // 3rd+ dismissal: wait 72 hours
  const requiredHours = Math.min(
    MIN_HOURS_BETWEEN_PROMPTS * Math.max(1, state.dismissalCount),
    72 // Cap at 72 hours max
  );

  if (hoursSinceLastPrompt >= requiredHours) {
    return { shouldShow: true, reason: 'time_elapsed', dismissalCount: state.dismissalCount };
  }

  return { shouldShow: false, reason: 'too_soon', dismissalCount: state.dismissalCount };
}

/**
 * Reset all location permission storage (for testing/debugging)
 */
export async function resetLocationPermissionStorage(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(LOCATION_STORAGE_KEYS.DISMISSAL_COUNT),
      AsyncStorage.removeItem(LOCATION_STORAGE_KEYS.LAST_PROMPT_TIME),
      AsyncStorage.removeItem(LOCATION_STORAGE_KEYS.DONT_ASK_AGAIN),
      AsyncStorage.removeItem(LOCATION_STORAGE_KEYS.PERMISSION_GRANTED_AT),
    ]);
  } catch (error) {
    console.warn('Error resetting location permission storage:', error);
  }
}
