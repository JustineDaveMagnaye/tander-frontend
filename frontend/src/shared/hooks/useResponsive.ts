/**
 * TANDER Responsive Hook
 * Provides responsive utilities for all screen sizes, orientations, and platforms
 * Supports: iOS, Android (all versions), phones, tablets, portrait, landscape
 */

import { useCallback } from 'react';
import {
  Dimensions,
  Platform,
  PixelRatio,
  ScaledSize,
  useWindowDimensions,
} from 'react-native';

// Device type definitions
export type DeviceType = 'phone' | 'tablet';
export type Orientation = 'portrait' | 'landscape';
export type ScreenSize = 'small' | 'medium' | 'large' | 'xlarge';

// Breakpoints (in dp) - Aligned with design_system2.md
export const BREAKPOINTS = {
  // Width breakpoints (matches design system)
  xs: 320,            // Small phones (iPhone SE, small Android)
  sm: 480,            // Large phones, phones landscape
  md: 768,            // Tablets portrait, iPad Mini (design system requirement)
  lg: 1024,           // Tablets landscape, iPad landscape
  xl: 1280,           // Large tablets, desktop

  // Legacy aliases for backward compatibility
  smallPhone: 320,    // iPhone SE, small Android
  phone: 375,         // iPhone 8, standard phones
  largePhone: 414,    // iPhone Plus, large phones
  tablet: 768,        // Updated from 640 to 768 per design system (catches iPad Mini at 768px)
  largeTablet: 1024,  // iPad Pro, large tablets

  // Height breakpoints for landscape detection
  shortHeight: 400,
} as const;

// Maximum scale factor to prevent oversized elements on large displays (4K, desktop, etc.)
const MAX_SCALE_FACTOR = 2.0;

// Maximum font scale to prevent oversized text (caps accessibility font scaling)
const MAX_FONT_SCALE = 2.5;

// Screen size categories - Updated to match design system breakpoints
export const SCREEN_CATEGORIES = {
  small: { min: 0, max: 479 },           // Small phones (xs)
  medium: { min: 480, max: 767 },        // Large phones (sm)
  large: { min: 768, max: 1023 },        // Tablets portrait (md)
  xlarge: { min: 1024, max: Infinity },  // Tablets landscape+ (lg, xl)
} as const;

export interface ResponsiveInfo {
  // Dimensions
  width: number;
  height: number;

  // Device info
  deviceType: DeviceType;
  orientation: Orientation;
  screenSize: ScreenSize;

  // Platform
  isIOS: boolean;
  isAndroid: boolean;
  platformVersion: number;

  // Booleans for easy checking
  isPhone: boolean;
  isTablet: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isSmallScreen: boolean;
  isLargeScreen: boolean;

  // Pixel ratio for high-density displays
  pixelRatio: number;
  fontScale: number;

  // Responsive scaling functions
  wp: (percentage: number) => number;  // Width percentage
  hp: (percentage: number) => number;  // Height percentage
  normalize: (size: number) => number; // Normalize font/spacing
  moderateScale: (size: number, factor?: number) => number;

  // NEW: Responsive helper functions
  getScreenMargin: () => number;        // Returns responsive screen margin (24/32/40px)
  getResponsiveFontSize: (baseSize: number) => number; // Returns capped font size
  getInputHeight: () => number;         // Returns responsive input height (56-64px)
  getButtonHeight: () => number;        // Returns responsive button height (56-64px)
  getTouchTargetSize: (variant?: 'minimum' | 'standard' | 'comfortable' | 'large') => number;
}

// Get device type based on screen width
const getDeviceType = (width: number): DeviceType => {
  return width >= BREAKPOINTS.tablet ? 'tablet' : 'phone';
};

// Get orientation
const getOrientation = (width: number, height: number): Orientation => {
  return height >= width ? 'portrait' : 'landscape';
};

// Get screen size category
const getScreenSize = (width: number): ScreenSize => {
  if (width < SCREEN_CATEGORIES.small.max) return 'small';
  if (width < SCREEN_CATEGORIES.medium.max) return 'medium';
  if (width < SCREEN_CATEGORIES.large.max) return 'large';
  return 'xlarge';
};

// Get platform version
const getPlatformVersion = (): number => {
  const version = Platform.Version;
  if (typeof version === 'string') {
    return parseFloat(version);
  }
  return version;
};

// Base dimension for scaling (iPhone 8 as reference)
const BASE_WIDTH = 375;

/**
 * Main responsive hook - use in components
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const deviceType = getDeviceType(width);
  const orientation = getOrientation(width, height);
  const screenSize = getScreenSize(width);
  const pixelRatio = PixelRatio.get();
  const rawFontScale = PixelRatio.getFontScale();
  // Cap font scale to prevent oversized text (accessibility + usability)
  const fontScale = Math.min(rawFontScale, MAX_FONT_SCALE);
  const platformVersion = getPlatformVersion();

  // Width percentage
  const wp = useCallback((percentage: number): number => {
    return PixelRatio.roundToNearestPixel((width * percentage) / 100);
  }, [width]);

  // Height percentage
  const hp = useCallback((percentage: number): number => {
    return PixelRatio.roundToNearestPixel((height * percentage) / 100);
  }, [height]);

  // Normalize size based on screen width
  const normalize = useCallback((size: number): number => {
    const scale = width / BASE_WIDTH;
    const newSize = size * scale;

    if (Platform.OS === 'ios') {
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }, [width]);

  // Moderate scale - more controlled scaling with maximum constraint
  // Prevents oversized elements on large displays (4K, desktop, Mac Catalyst)
  const moderateScale = useCallback((size: number, factor: number = 0.5): number => {
    const scale = width / BASE_WIDTH;
    // Clamp scale to prevent excessive scaling on very large screens
    const clampedScale = Math.min(scale, MAX_SCALE_FACTOR);
    return PixelRatio.roundToNearestPixel(size + (clampedScale - 1) * size * factor);
  }, [width]);

  // NEW: Get responsive screen margin based on device size (design system: 24/32/40px)
  const getScreenMargin = useCallback((): number => {
    // Small/Standard phones (320-414px) -> 24px
    if (width <= BREAKPOINTS.largePhone) return 24;
    // Large phones (415-767px) -> 32px
    if (width < BREAKPOINTS.tablet) return 32;
    // Tablets (768px+) -> 40px
    return 40;
  }, [width]);

  // NEW: Get responsive font size with proper capping for accessibility
  const getResponsiveFontSize = useCallback((baseSize: number): number => {
    // Apply font scale but respect maximum to prevent UI breakage
    const scaledSize = baseSize * fontScale;
    // Cap at 2.5x base size (same as MAX_FONT_SCALE)
    const cappedSize = Math.min(scaledSize, baseSize * MAX_FONT_SCALE);
    return Math.round(cappedSize);
  }, [fontScale]);

  // NEW: Get responsive input height (design system: 56-60px for seniors)
  const getInputHeight = useCallback((): number => {
    // Tablet: 64px for extra comfort
    if (deviceType === 'tablet') return 64;
    // Phone: 60px (matches design system form fields)
    return 60;
  }, [deviceType]);

  // NEW: Get responsive button height (design system: 56-64px)
  const getButtonHeight = useCallback((): number => {
    // Tablet: 72px for extra touch comfort
    if (deviceType === 'tablet') return moderateScale(72);
    // Phone landscape: slightly smaller to fit content
    if (orientation === 'landscape') return Math.min(hp(12), 52);
    // Phone portrait: 64px (comfortable for seniors)
    return moderateScale(64);
  }, [deviceType, orientation, hp, moderateScale]);

  // NEW: Get touch target size based on variant (WCAG compliance)
  const getTouchTargetSize = useCallback((
    variant: 'minimum' | 'standard' | 'comfortable' | 'large' = 'comfortable'
  ): number => {
    const sizes = {
      minimum: 44,      // WCAG minimum
      standard: 48,     // Android standard
      comfortable: 56,  // Recommended for seniors (default)
      large: 64,        // Primary actions
    };
    return sizes[variant];
  }, []);

  return {
    width,
    height,
    deviceType,
    orientation,
    screenSize,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    platformVersion,
    isPhone: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isSmallScreen: screenSize === 'small',
    isLargeScreen: screenSize === 'xlarge',
    pixelRatio,
    fontScale,
    wp,
    hp,
    normalize,
    moderateScale,
    // NEW helper functions
    getScreenMargin,
    getResponsiveFontSize,
    getInputHeight,
    getButtonHeight,
    getTouchTargetSize,
  };
}

/**
 * Static responsive utilities (for use outside components)
 */
export const responsive = {
  // Get current window dimensions
  getDimensions: (): ScaledSize => Dimensions.get('window'),

  // Check if tablet
  isTablet: (): boolean => {
    const { width } = Dimensions.get('window');
    return width >= BREAKPOINTS.tablet;
  },

  // Check if landscape
  isLandscape: (): boolean => {
    const { width, height } = Dimensions.get('window');
    return width > height;
  },

  // Width percentage
  wp: (percentage: number): number => {
    const { width } = Dimensions.get('window');
    return PixelRatio.roundToNearestPixel((width * percentage) / 100);
  },

  // Height percentage
  hp: (percentage: number): number => {
    const { height } = Dimensions.get('window');
    return PixelRatio.roundToNearestPixel((height * percentage) / 100);
  },

  // Normalize size
  normalize: (size: number): number => {
    const { width } = Dimensions.get('window');
    const scale = width / BASE_WIDTH;
    const newSize = size * scale;

    if (Platform.OS === 'ios') {
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  },

  // Moderate scale - with maximum constraint for large displays
  moderateScale: (size: number, factor: number = 0.5): number => {
    const { width } = Dimensions.get('window');
    const scale = width / BASE_WIDTH;
    // Clamp scale to prevent excessive scaling on very large screens
    const clampedScale = Math.min(scale, MAX_SCALE_FACTOR);
    return PixelRatio.roundToNearestPixel(size + (clampedScale - 1) * size * factor);
  },

  // Get responsive value based on device type
  select: <T>(options: { phone: T; tablet: T }): T => {
    return responsive.isTablet() ? options.tablet : options.phone;
  },

  // Get responsive value based on orientation
  selectOrientation: <T>(options: { portrait: T; landscape: T }): T => {
    return responsive.isLandscape() ? options.landscape : options.portrait;
  },

  // NEW: Get responsive screen margin (static version)
  getScreenMargin: (): number => {
    const { width } = Dimensions.get('window');
    if (width <= BREAKPOINTS.largePhone) return 24;
    if (width < BREAKPOINTS.tablet) return 32;
    return 40;
  },

  // NEW: Get responsive font size with capping (static version)
  getResponsiveFontSize: (baseSize: number): number => {
    const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
    const scaledSize = baseSize * fontScale;
    const cappedSize = Math.min(scaledSize, baseSize * MAX_FONT_SCALE);
    return Math.round(cappedSize);
  },

  // NEW: Get responsive input height (static version)
  getInputHeight: (): number => {
    const { width } = Dimensions.get('window');
    return width >= BREAKPOINTS.tablet ? 64 : 60;
  },

  // NEW: Get responsive button height (static version)
  getButtonHeight: (): number => {
    const { width, height } = Dimensions.get('window');
    const isTablet = width >= BREAKPOINTS.tablet;
    const isLandscape = width > height;

    if (isTablet) return responsive.moderateScale(72);
    if (isLandscape) return Math.min(responsive.hp(12), 52);
    return responsive.moderateScale(64);
  },

  // NEW: Get touch target size (static version)
  getTouchTargetSize: (variant: 'minimum' | 'standard' | 'comfortable' | 'large' = 'comfortable'): number => {
    const sizes = {
      minimum: 44,
      standard: 48,
      comfortable: 56,
      large: 64,
    };
    return sizes[variant];
  },
};

/**
 * Hook for orientation changes
 */
export function useOrientation(): Orientation {
  const { width, height } = useWindowDimensions();
  return height >= width ? 'portrait' : 'landscape';
}

/**
 * Hook for device type
 */
export function useDeviceType(): DeviceType {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINTS.tablet ? 'tablet' : 'phone';
}

/**
 * USAGE EXAMPLES
 *
 * 1. Basic responsive layout:
 * ```typescript
 * const { isTablet, getScreenMargin } = useResponsive();
 * const containerStyle = {
 *   paddingHorizontal: getScreenMargin(), // 24px on small phones, 32px on large phones, 40px on tablets
 * };
 * ```
 *
 * 2. Responsive button with proper touch targets:
 * ```typescript
 * const { getButtonHeight, getTouchTargetSize } = useResponsive();
 * const buttonStyle = {
 *   height: getButtonHeight(), // 52-72px depending on device/orientation
 *   minHeight: getTouchTargetSize('comfortable'), // Ensures 56px minimum
 * };
 * ```
 *
 * 3. Responsive font sizes that respect accessibility settings:
 * ```typescript
 * const { getResponsiveFontSize } = useResponsive();
 * const textStyle = {
 *   fontSize: getResponsiveFontSize(20), // Scales with user font size, capped at 2.5x
 * };
 * ```
 *
 * 4. Responsive input fields for seniors:
 * ```typescript
 * const { getInputHeight } = useResponsive();
 * const inputStyle = {
 *   height: getInputHeight(), // 60px on phones, 64px on tablets
 * };
 * ```
 *
 * 5. Landscape-safe layouts:
 * ```typescript
 * const { isLandscape, hp, wp } = useResponsive();
 * const logoSize = isLandscape
 *   ? Math.min(hp(18), wp(15)) // Constrained in landscape
 *   : moderateScale(100);       // Scaled in portrait
 * ```
 *
 * 6. Breakpoint-based rendering:
 * ```typescript
 * const { width } = useResponsive();
 * const columns = width >= BREAKPOINTS.xl ? 4
 *                : width >= BREAKPOINTS.lg ? 3
 *                : width >= BREAKPOINTS.md ? 2
 *                : 1;
 * ```
 *
 * 7. Static usage outside components:
 * ```typescript
 * import { responsive, BREAKPOINTS } from '@/shared/hooks/useResponsive';
 *
 * const margin = responsive.getScreenMargin();
 * const isTablet = responsive.isTablet();
 * const inputHeight = responsive.getInputHeight();
 * ```
 *
 * DESIGN SYSTEM COMPLIANCE:
 * - All breakpoints match design_system2.md (xs: 320, sm: 480, md: 768, lg: 1024, xl: 1280)
 * - Screen margins follow design spec (24/32/40px)
 * - Touch targets meet senior-friendly standards (56-64px)
 * - Font scaling is capped at 2.5x to prevent UI breakage
 * - Input/button heights optimized for 60+ age group
 *
 * PLATFORM COMPATIBILITY:
 * - iOS 13+ (minimum deployment target)
 * - Android API 24+ (Android 7.0+)
 * - Handles all orientations (portrait & landscape)
 * - Supports devices from 320px (iPhone SE) to 1280px+ (large tablets)
 */

export default useResponsive;
