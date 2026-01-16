/**
 * useResponsiveSizes Hook for SignUp
 * Memoized responsive size calculations
 * Following ForgotPassword pattern for consistency
 */

import { useMemo } from 'react';
import { useResponsive } from '@shared/hooks/useResponsive';
import { touchTargets } from '@shared/styles/spacing';
import { ResponsiveSizes } from '../types';

// Maximum sizes to prevent oversized elements
const MAX_SIZES = {
  title: { phone: 34, tablet: 42, landscape: 28 },
  subtitle: { phone: 20, tablet: 26, landscape: 18 },
  inputHeight: { phone: 64, tablet: 72, landscape: 56 },
  buttonHeight: { phone: 64, tablet: 72, landscape: 56 },
  inputFontSize: { phone: 20, tablet: 24, landscape: 18 },
  labelFontSize: { phone: 17, tablet: 20, landscape: 16 },
  captionFontSize: { phone: 15, tablet: 18, landscape: 14 },
  bodyFontSize: { phone: 18, tablet: 22, landscape: 17 },
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
} as const;

export function useResponsiveSizes(): ResponsiveSizes & {
  isLandscape: boolean;
  isTablet: boolean;
  isSmallScreen: boolean;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
} {
  const { isLandscape, wp, hp, moderateScale, width, height } = useResponsive();

  // Detect tablet correctly even in landscape
  const minDimension = Math.min(width, height);
  const isActuallyTablet = minDimension >= 640;

  // Small screen detection (320px width phones)
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

    // Title size
    const titleSize = clamp(
      isLandscape
        ? Math.min(hp(7), wp(4))
        : isActuallyTablet
          ? moderateScale(36, 0.3)
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

    // Input height
    const inputHeight = clamp(
      isLandscape
        ? Math.min(hp(14), 52)
        : isActuallyTablet
          ? moderateScale(64, 0.2)
          : moderateScale(60, 0.3),
      Math.max(MIN_SIZES.inputHeight, touchTargets.standard),
      getMax('inputHeight')
    );

    // Button height
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
          ? moderateScale(18, 0.2)
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

    // Link font size
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

    // Max form width
    const maxFormWidth = Math.round(
      isActuallyTablet
        ? Math.min(wp(85), 700)
        : isLandscape
          ? Math.min(wp(65), 520)
          : isSmallScreen
            ? wp(100) - 16
            : wp(100) - 32
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
    };
  }, [isLandscape, isActuallyTablet, isSmallScreen, wp, hp, moderateScale]);

  return {
    ...sizes,
    isLandscape,
    isTablet: isActuallyTablet,
    isSmallScreen,
    wp,
    hp,
  };
}
