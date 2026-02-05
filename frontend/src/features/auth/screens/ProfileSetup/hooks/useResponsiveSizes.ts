/**
 * useResponsiveSizes Hook
 * Provides responsive sizes for ProfileSetup screen
 */

import { useMemo } from 'react';
import { useResponsive } from '@shared/hooks/useResponsive';

export interface ResponsiveSizes {
  // Screen info
  isLandscape: boolean;
  isTablet: boolean;
  isSmallScreen: boolean;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;

  // Font sizes
  titleSize: number;
  subtitleSize: number;
  labelFontSize: number;
  inputFontSize: number;
  captionFontSize: number;
  buttonFontSize: number;

  // Element sizes
  inputHeight: number;
  buttonHeight: number;
  photoSize: number;
  chipPaddingH: number;
  chipPaddingV: number;

  // Layout
  maxFormWidth: number;
}

export const useResponsiveSizes = (): ResponsiveSizes => {
  const { isTablet, isLandscape, wp, hp, moderateScale } = useResponsive();

  return useMemo(() => {
    const isSmallScreen = wp(100) < 375;

    // Font sizes
    const titleSize = isLandscape
      ? Math.min(hp(8), wp(4), 28)
      : isTablet
      ? moderateScale(32)
      : moderateScale(28);

    const subtitleSize = isLandscape
      ? Math.min(hp(4), wp(2.5), 16)
      : isTablet
      ? moderateScale(18)
      : moderateScale(16);

    const labelFontSize = isLandscape
      ? Math.min(hp(4), 15)
      : isTablet
      ? 17
      : 16;

    const inputFontSize = isLandscape
      ? Math.min(hp(4.5), 18)
      : isTablet
      ? moderateScale(18)
      : moderateScale(17);

    const captionFontSize = isLandscape
      ? Math.min(hp(3.5), 13)
      : isTablet
      ? 14
      : 13;

    const buttonFontSize = isLandscape
      ? Math.min(hp(4), 16)
      : isTablet
      ? 18
      : 17;

    // Element sizes
    const inputHeight = isLandscape
      ? Math.max(Math.min(hp(14), 56), 48)
      : isTablet
      ? moderateScale(60)
      : moderateScale(56);

    const buttonHeight = isLandscape
      ? Math.max(Math.min(hp(14), 56), 48)
      : isTablet
      ? moderateScale(60)
      : moderateScale(56);

    const photoSize = isTablet ? 140 : 120;

    const chipPaddingH = isTablet ? 24 : 20;
    const chipPaddingV = isTablet ? 14 : 12;

    // Layout
    const maxFormWidth = isTablet ? 500 : isLandscape ? wp(55) : wp(100);

    return {
      isLandscape,
      isTablet,
      isSmallScreen,
      wp,
      hp,
      titleSize,
      subtitleSize,
      labelFontSize,
      inputFontSize,
      captionFontSize,
      buttonFontSize,
      inputHeight,
      buttonHeight,
      photoSize,
      chipPaddingH,
      chipPaddingV,
      maxFormWidth,
    };
  }, [isTablet, isLandscape, wp, hp, moderateScale]);
};
