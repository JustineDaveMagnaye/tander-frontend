/**
 * TANDER Platform Hook
 * Provides platform-specific utilities for iOS and Android compatibility
 * Handles version-specific features and fallbacks
 */

import { Platform, StatusBar } from 'react-native';

// Minimum supported versions
export const MIN_SUPPORTED_VERSIONS = {
  ios: 13,      // iOS 13+
  android: 24,  // Android 7.0 (API 24)+
} as const;

// Feature availability by platform version
export const FEATURE_SUPPORT = {
  // iOS features
  ios: {
    darkMode: 13,          // iOS 13+
    haptics: 10,           // iOS 10+
    faceId: 11,            // iOS 11+
    swipeToGoBack: 7,      // iOS 7+
    safeArea: 11,          // iOS 11+
    dynamicType: 10,       // iOS 10+
  },
  // Android features
  android: {
    darkMode: 29,          // Android 10 (API 29)+
    haptics: 26,           // Android 8 (API 26)+
    fingerprint: 23,       // Android 6 (API 23)+
    gestureNavigation: 29, // Android 10+
    edgeToEdge: 30,        // Android 11+
    materialYou: 31,       // Android 12+
  },
} as const;

export interface PlatformInfo {
  // Platform basics
  os: 'ios' | 'android';
  version: number;
  isIOS: boolean;
  isAndroid: boolean;

  // Version checks
  isModernOS: boolean;        // iOS 14+ or Android 10+
  isLegacyOS: boolean;        // Below modern threshold
  supportsMinVersion: boolean;

  // Feature support
  supportsDarkMode: boolean;
  supportsHaptics: boolean;
  supportsBiometrics: boolean;
  supportsGestureNavigation: boolean;
  supportsSafeArea: boolean;

  // UI adjustments
  statusBarHeight: number;
  hasNotch: boolean;
  hasDynamicIsland: boolean;

  // Utilities
  select: <T>(options: { ios: T; android: T; default?: T }) => T;
  versionAtLeast: (version: number) => boolean;
}

// Get platform version as number
const getPlatformVersion = (): number => {
  const version = Platform.Version;
  if (typeof version === 'string') {
    return parseFloat(version);
  }
  return version;
};

// Check for notch (iPhone X+)
const checkHasNotch = (): boolean => {
  if (Platform.OS !== 'ios') return false;

  // For simplicity, assume modern iOS devices (13+) with SafeAreaView support likely have notch
  // This is a safe assumption as SafeAreaView handles it automatically
  return true; // Let SafeAreaView handle it
};

// Check for Dynamic Island (iPhone 14 Pro+)
const checkHasDynamicIsland = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  // Dynamic Island devices have iOS 16+ and specific hardware
  // SafeAreaView handles this automatically
  return getPlatformVersion() >= 16;
};

// Get status bar height
const getStatusBarHeight = (): number => {
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight || 24;
  }
  // iOS - will be handled by SafeAreaView
  return 0;
};

/**
 * Main platform hook
 */
export function usePlatform(): PlatformInfo {
  const os = Platform.OS as 'ios' | 'android';
  const version = getPlatformVersion();
  const isIOS = os === 'ios';
  const isAndroid = os === 'android';

  // Version thresholds
  const isModernOS = isIOS ? version >= 14 : version >= 29;
  const isLegacyOS = isIOS ? version < 13 : version < 26;
  const supportsMinVersion = isIOS
    ? version >= MIN_SUPPORTED_VERSIONS.ios
    : version >= MIN_SUPPORTED_VERSIONS.android;

  // Feature support
  const supportsDarkMode = isIOS
    ? version >= FEATURE_SUPPORT.ios.darkMode
    : version >= FEATURE_SUPPORT.android.darkMode;

  const supportsHaptics = isIOS
    ? version >= FEATURE_SUPPORT.ios.haptics
    : version >= FEATURE_SUPPORT.android.haptics;

  const supportsBiometrics = isIOS
    ? version >= FEATURE_SUPPORT.ios.faceId
    : version >= FEATURE_SUPPORT.android.fingerprint;

  const supportsGestureNavigation = isIOS
    ? true // iOS always supports swipe back
    : version >= FEATURE_SUPPORT.android.gestureNavigation;

  const supportsSafeArea = isIOS
    ? version >= FEATURE_SUPPORT.ios.safeArea
    : true; // Android uses StatusBar

  // UI properties
  const statusBarHeight = getStatusBarHeight();
  const hasNotch = checkHasNotch();
  const hasDynamicIsland = checkHasDynamicIsland();

  // Utility functions
  const select = <T>(options: { ios: T; android: T; default?: T }): T => {
    if (isIOS && options.ios !== undefined) return options.ios;
    if (isAndroid && options.android !== undefined) return options.android;
    return options.default ?? options.ios;
  };

  const versionAtLeast = (targetVersion: number): boolean => {
    return version >= targetVersion;
  };

  return {
    os,
    version,
    isIOS,
    isAndroid,
    isModernOS,
    isLegacyOS,
    supportsMinVersion,
    supportsDarkMode,
    supportsHaptics,
    supportsBiometrics,
    supportsGestureNavigation,
    supportsSafeArea,
    statusBarHeight,
    hasNotch,
    hasDynamicIsland,
    select,
    versionAtLeast,
  };
}

/**
 * Static platform utilities
 */
export const platform = {
  os: Platform.OS as 'ios' | 'android',
  version: getPlatformVersion(),
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',

  select: Platform.select,

  // Version check
  versionAtLeast: (version: number): boolean => {
    return getPlatformVersion() >= version;
  },

  // Feature checks
  supportsDarkMode: (): boolean => {
    return Platform.OS === 'ios'
      ? getPlatformVersion() >= 13
      : getPlatformVersion() >= 29;
  },

  supportsHaptics: (): boolean => {
    return Platform.OS === 'ios'
      ? getPlatformVersion() >= 10
      : getPlatformVersion() >= 26;
  },
};

export default usePlatform;
