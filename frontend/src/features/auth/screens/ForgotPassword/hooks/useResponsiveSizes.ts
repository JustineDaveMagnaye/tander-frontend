/**
 * useResponsiveSizes Hook
 * Memoized responsive size calculations for ForgotPassword screen
 *
 * Responsive Testing Results Applied:
 * - Fixed tablet sizes being too large (G4-R-001, G4-R-002)
 * - Fixed landscape detection issues (G5-R-001)
 * - Added proper caps for all screen sizes
 * - Improved small screen handling (G1-R-002, G1-R-003)
 * - Enhanced for FULL responsiveness across ALL devices (iPhone SE to iPad Pro 12.9")
 * - Improved tablet portrait and landscape scaling
 * - Better OTP input sizing for all screen sizes
 */

import { useMemo } from 'react';
import { useResponsive } from '@shared/hooks/useResponsive';
import { touchTargets } from '@shared/styles/spacing';
import { ResponsiveSizes } from '../types';

// Maximum sizes to prevent oversized elements - Enhanced for tablets
const MAX_SIZES = {
  title: { phone: 34, tablet: 42, landscape: 28 },
  subtitle: { phone: 20, tablet: 26, landscape: 18 },
  inputHeight: { phone: 64, tablet: 72, landscape: 56 },
  buttonHeight: { phone: 64, tablet: 72, landscape: 56 },
  inputFontSize: { phone: 20, tablet: 24, landscape: 18 },
  labelFontSize: { phone: 17, tablet: 20, landscape: 16 },
  captionFontSize: { phone: 15, tablet: 18, landscape: 14 },
  bodyFontSize: { phone: 18, tablet: 22, landscape: 17 },
  otpBoxSize: { phone: 56, tablet: 72, landscape: 52 },
  otpFontSize: { phone: 28, tablet: 36, landscape: 26 },
} as const;

// Minimum sizes for accessibility (WCAG compliance)
const MIN_SIZES = {
  title: 24,
  subtitle: 16,
  inputHeight: 56,
  buttonHeight: 56,
  inputFontSize: 18,
  labelFontSize: 16,
  captionFontSize: 14,
  bodyFontSize: 18,
  otpBoxSize: 48,
  otpFontSize: 24,
} as const;

export function useResponsiveSizes(): ResponsiveSizes & {
  isLandscape: boolean;
  isTablet: boolean;
  isSmallScreen: boolean;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
  otpBoxSize: number;
  otpFontSize: number;
} {
  const { isLandscape, wp, hp, moderateScale, width, height } = useResponsive();

  // Fix G5-R-001: Detect tablet correctly even in landscape
  // Use the smaller dimension to determine if it's actually a tablet
  const minDimension = Math.min(width, height);
  const isActuallyTablet = minDimension >= 640; // Tablets have min dimension >= 640

  // Small screen detection (320px width phones) - Enhanced for iPhone SE
  const isSmallScreen = width < 360 || (isLandscape && height < 380);

  const sizes = useMemo((): ResponsiveSizes => {
    // Helper to clamp values between min and max
    const clamp = (value: number, min: number, max: number) =>
      Math.round(Math.max(min, Math.min(max, value)));

    // Get max size based on device type
    const getMax = (key: keyof typeof MAX_SIZES) => {
      if (isLandscape) return MAX_SIZES[key].landscape;
      if (isActuallyTablet) return MAX_SIZES[key].tablet;
      return MAX_SIZES[key].phone;
    };

    // Title size - responsive but capped
    const titleSize = clamp(
      isLandscape
        ? Math.min(hp(7), wp(4))
        : isActuallyTablet
          ? moderateScale(36, 0.3) // Lower scaling factor for tablets
          : moderateScale(32),
      MIN_SIZES.title,
      getMax('title')
    );

    // Subtitle size
    const subtitleSize = clamp(
      isLandscape
        ? Math.min(hp(4.5), wp(2.5))
        : isActuallyTablet
          ? moderateScale(20, 0.3)
          : moderateScale(18),
      MIN_SIZES.subtitle,
      getMax('subtitle')
    );

    // Input height - ensure minimum touch target, cap maximum
    const inputHeight = clamp(
      isLandscape
        ? Math.min(hp(14), 52)
        : isActuallyTablet
          ? moderateScale(64, 0.2) // Very low scaling for inputs
          : moderateScale(60, 0.3),
      Math.max(MIN_SIZES.inputHeight, touchTargets.standard),
      getMax('inputHeight')
    );

    // Button height - same as input
    const buttonHeight = clamp(
      isLandscape
        ? Math.min(hp(14), 52)
        : isActuallyTablet
          ? moderateScale(64, 0.2)
          : moderateScale(60, 0.3),
      Math.max(MIN_SIZES.buttonHeight, touchTargets.standard),
      getMax('buttonHeight')
    );

    // Input font size
    const inputFontSize = clamp(
      isLandscape
        ? Math.min(hp(4.5), 17)
        : isActuallyTablet
          ? moderateScale(18, 0.2) // Minimal scaling for text
          : moderateScale(18, 0.3),
      MIN_SIZES.inputFontSize,
      getMax('inputFontSize')
    );

    // Label font size
    const labelFontSize = clamp(
      isLandscape
        ? Math.min(hp(4), 15)
        : isActuallyTablet
          ? 17
          : 16,
      MIN_SIZES.labelFontSize,
      getMax('labelFontSize')
    );

    // Caption font size
    const captionFontSize = clamp(
      isLandscape
        ? Math.min(hp(3.5), 13)
        : isActuallyTablet
          ? 15
          : isSmallScreen ? 13 : 14,
      MIN_SIZES.captionFontSize,
      getMax('captionFontSize')
    );

    // Link font size - same as label
    const linkFontSize = labelFontSize;

    // Body font size
    const bodyFontSize = clamp(
      isLandscape
        ? Math.min(hp(4), 16)
        : isActuallyTablet
          ? 18
          : isSmallScreen ? 15 : 16,
      MIN_SIZES.bodyFontSize,
      getMax('bodyFontSize')
    );

    // Tab selector height
    const tabSelectorHeight = Math.round(
      Math.max(
        isLandscape
          ? Math.min(hp(13), 50)
          : isActuallyTablet
            ? 56
            : isSmallScreen ? 52 : 56,
        touchTargets.standard
      )
    );

    // Max form width - responsive to screen size
    // G3-R-001: Better form width for large screens
    // G4-R-004: Scale form width for tablets - ENHANCED
    const maxFormWidth = Math.round(
      isActuallyTablet
        ? Math.min(wp(85), 700) // Increased from 70% to 85%, max 700px for better tablet usage
        : isLandscape
          ? Math.min(wp(65), 520) // Increased from 60% to 65% for better landscape fill
          : isSmallScreen
            ? wp(100) - 16 // Reduced padding on small screens for more space
            : wp(100) - 32
    );

    // OTP box size - responsive to device and orientation
    const otpBoxSize = clamp(
      isLandscape
        ? Math.min(hp(14), 52)
        : isActuallyTablet
          ? moderateScale(68, 0.2) // Larger on tablets
          : isSmallScreen
            ? moderateScale(52, 0.3) // Smaller on small phones
            : moderateScale(56, 0.3),
      MIN_SIZES.otpBoxSize,
      getMax('otpBoxSize')
    );

    // OTP font size - responsive to box size
    const otpFontSize = clamp(
      isLandscape
        ? Math.min(hp(7), 26)
        : isActuallyTablet
          ? moderateScale(34, 0.2)
          : isSmallScreen
            ? moderateScale(26, 0.3)
            : moderateScale(28, 0.3),
      MIN_SIZES.otpFontSize,
      getMax('otpFontSize')
    );

    return {
      titleSize,
      subtitleSize,
      inputHeight,
      buttonHeight,
      inputFontSize,
      labelFontSize,
      captionFontSize,
      linkFontSize,
      bodyFontSize,
      tabSelectorHeight,
      maxFormWidth,
      otpBoxSize,
      otpFontSize,
    };
  }, [isLandscape, isActuallyTablet, isSmallScreen, wp, hp, moderateScale]);

  return {
    ...sizes,
    isLandscape,
    isTablet: isActuallyTablet,
    isSmallScreen,
    wp,
    hp,
    otpBoxSize: sizes.otpBoxSize,
    otpFontSize: sizes.otpFontSize,
  };
}
