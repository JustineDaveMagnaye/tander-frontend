/**
 * TANDER Matches Responsive Hook
 * Extracts responsive calculations for the MatchesScreen
 *
 * Design System Compliance (design_system2.md):
 * - 56-64px minimum touch targets for seniors
 * - 16px minimum font size (18-20px preferred for body text)
 * - WCAG AA (4.5:1) minimum contrast
 * - Responsive across all devices (iPhone SE to iPad Pro)
 */

import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';

// Minimum font size for senior accessibility (WCAG compliance)
const MIN_FONT_SIZE = 16;
const MIN_TOUCH_TARGET = 56;

export interface MatchesFontSizes {
  headerTitle: number;
  headerSubtitle: number;
  sectionTitle: number;
  cardName: number;
  body: number;
  caption: number;
  badge: number;
  modalTitle: number;
  modalBody: number;
  filterTab: number;
  emptyTitle: number;
  emptyBody: number;
}

export interface MatchesSpacing {
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  cardGap: number;
  headerPaddingTop: number;
  headerPaddingBottom: number;
  filterTabGap: number;
  sectionGap: number;
  listHeaderMargin: number;
}

export interface CardDimensions {
  cardWidth: number;
  cardHeight: number;
  numColumns: number;
  cardGap: number;
}

/**
 * Calculate responsive font sizes based on screen dimensions
 */
const getResponsiveFontSizes = (
  width: number,
  height: number,
  isTablet: boolean,
  isLandscape: boolean,
  moderateScale: (size: number, factor?: number) => number
): MatchesFontSizes => {
  let headerTitle = 28;
  let headerSubtitle = 16;
  let sectionTitle = 22;
  let cardName = 18;
  let body = 18;
  let caption = 16;
  let badge = 14;
  let modalTitle = 32;
  let modalBody = 18;
  let filterTab = 16;
  let emptyTitle = 24;
  let emptyBody = 18;

  // Very small screens (iPhone SE)
  if (width < BREAKPOINTS.xs + 40) {
    headerTitle = 24;
    headerSubtitle = 16;
    sectionTitle = 18;
    cardName = 16;
    body = 16;
    caption = 16;
    badge = 16;
    modalTitle = 26;
    modalBody = 16;
    filterTab = 16;
    emptyTitle = 20;
    emptyBody = 16;
  }
  // Standard phones (375-414px)
  else if (width < 414) {
    headerTitle = 26;
    headerSubtitle = 16;
    sectionTitle = 20;
    cardName = 17;
    body = 17;
    caption = 16;
    badge = 16;
    modalTitle = 28;
    modalBody = 17;
    filterTab = 16;
    emptyTitle = 22;
    emptyBody = 17;
  }
  // Large phones (414-480px)
  else if (width < BREAKPOINTS.sm) {
    headerTitle = 28;
    headerSubtitle = 16;
    sectionTitle = 22;
    cardName = 18;
    body = 18;
    caption = 16;
    badge = 16;
    modalTitle = 30;
    modalBody = 18;
    filterTab = 16;
    emptyTitle = 24;
    emptyBody = 18;
  }
  // Small tablets (480-600px)
  else if (width < 600) {
    headerTitle = 30;
    headerSubtitle = 17;
    sectionTitle = 24;
    cardName = 19;
    body = 18;
    caption = 16;
    badge = 16;
    modalTitle = 32;
    modalBody = 19;
    filterTab = 17;
    emptyTitle = 26;
    emptyBody = 18;
  }
  // Tablets portrait (600-768px)
  else if (width < BREAKPOINTS.md) {
    headerTitle = moderateScale(32, 0.35);
    headerSubtitle = moderateScale(18, 0.35);
    sectionTitle = moderateScale(26, 0.35);
    cardName = moderateScale(20, 0.35);
    body = moderateScale(18, 0.35);
    caption = moderateScale(17, 0.35);
    badge = moderateScale(15, 0.35);
    modalTitle = moderateScale(36, 0.35);
    modalBody = moderateScale(20, 0.35);
    filterTab = moderateScale(18, 0.35);
    emptyTitle = moderateScale(28, 0.35);
    emptyBody = moderateScale(18, 0.35);
  }
  // Tablets (768-1024px)
  else if (width < BREAKPOINTS.lg) {
    headerTitle = moderateScale(34, 0.3);
    headerSubtitle = moderateScale(18, 0.3);
    sectionTitle = moderateScale(28, 0.3);
    cardName = moderateScale(22, 0.3);
    body = moderateScale(20, 0.3);
    caption = moderateScale(18, 0.3);
    badge = moderateScale(16, 0.3);
    modalTitle = moderateScale(40, 0.3);
    modalBody = moderateScale(22, 0.3);
    filterTab = moderateScale(18, 0.3);
    emptyTitle = moderateScale(30, 0.3);
    emptyBody = moderateScale(20, 0.3);
  }
  // Large tablets (1024-1280px)
  else if (width < BREAKPOINTS.xl) {
    headerTitle = moderateScale(36, 0.25);
    headerSubtitle = moderateScale(20, 0.25);
    sectionTitle = moderateScale(30, 0.25);
    cardName = moderateScale(24, 0.25);
    body = moderateScale(20, 0.25);
    caption = moderateScale(18, 0.25);
    badge = moderateScale(16, 0.25);
    modalTitle = moderateScale(42, 0.25);
    modalBody = moderateScale(24, 0.25);
    filterTab = moderateScale(20, 0.25);
    emptyTitle = moderateScale(32, 0.25);
    emptyBody = moderateScale(20, 0.25);
  }
  // Extra large tablets (1280px+)
  else {
    headerTitle = moderateScale(38, 0.2);
    headerSubtitle = moderateScale(20, 0.2);
    sectionTitle = moderateScale(32, 0.2);
    cardName = moderateScale(26, 0.2);
    body = moderateScale(22, 0.2);
    caption = moderateScale(20, 0.2);
    badge = moderateScale(18, 0.2);
    modalTitle = moderateScale(46, 0.2);
    modalBody = moderateScale(26, 0.2);
    filterTab = moderateScale(22, 0.2);
    emptyTitle = moderateScale(34, 0.2);
    emptyBody = moderateScale(22, 0.2);
  }

  // Landscape adjustments for phones
  if (isLandscape && !isTablet) {
    const maxTitle = Math.min(height * 0.055, 24);
    headerTitle = Math.min(headerTitle, maxTitle);
    headerSubtitle = Math.max(Math.min(headerSubtitle, 16), MIN_FONT_SIZE);
    sectionTitle = Math.min(sectionTitle, 18);
    body = Math.max(body, MIN_FONT_SIZE);
    modalTitle = Math.min(modalTitle, 26);
    filterTab = Math.max(Math.min(filterTab, 16), MIN_FONT_SIZE);
    emptyTitle = Math.min(emptyTitle, 20);
  }

  return {
    headerTitle,
    headerSubtitle,
    sectionTitle,
    cardName,
    body,
    caption,
    badge,
    modalTitle,
    modalBody,
    filterTab,
    emptyTitle,
    emptyBody,
  };
};

/**
 * Calculate responsive spacing based on screen dimensions
 */
const getResponsiveSpacing = (
  width: number,
  height: number,
  isTablet: boolean,
  isLandscape: boolean,
  getScreenMargin: () => number
): MatchesSpacing => {
  const baseMargin = getScreenMargin();
  const isVerySmall = width < BREAKPOINTS.xs + 40;

  let xs = 8;
  let s = 12;
  let m = 16;
  let l = baseMargin;
  let xl = 32;

  if (isVerySmall) {
    xs = 6;
    s = 10;
    m = 14;
    xl = 24;
  } else if (isTablet) {
    xs = 12;
    s = 16;
    m = 20;
    xl = 48;
  }

  const cardGap = isVerySmall ? 10 : isTablet ? 20 : 16;
  const headerPaddingTop = isLandscape && !isTablet ? Math.max(8, height * 0.02) : 20;
  const headerPaddingBottom = isLandscape && !isTablet ? Math.max(8, height * 0.02) : 16;
  const filterTabGap = isVerySmall ? 6 : isTablet ? 14 : 10;
  const sectionGap = isLandscape && !isTablet ? 12 : isTablet ? 28 : 20;
  const listHeaderMargin = isLandscape && !isTablet ? 10 : 20;

  return {
    xs,
    s,
    m,
    l,
    xl,
    cardGap,
    headerPaddingTop,
    headerPaddingBottom,
    filterTabGap,
    sectionGap,
    listHeaderMargin,
  };
};

/**
 * Calculate optimal column count based on screen dimensions
 */
const getColumnCount = (
  width: number,
  isLandscape: boolean,
  isTablet: boolean
): number => {
  if (width < BREAKPOINTS.xs + 40) return 1;
  if (width < 375) return isLandscape ? 2 : 2;
  if (width < 414) return isLandscape ? 2 : 2;
  if (width < BREAKPOINTS.sm) return isLandscape ? (width < 500 ? 2 : 3) : 2;
  if (width < 600) return isLandscape ? 3 : 2;
  if (width < BREAKPOINTS.md) return isLandscape ? 3 : 2;
  if (width < BREAKPOINTS.lg) {
    if (isTablet && !isLandscape) return 2;
    return isLandscape ? 4 : 2;
  }
  if (width < BREAKPOINTS.xl) {
    if (isTablet && !isLandscape) return 3;
    return isLandscape ? 5 : 3;
  }
  if (isTablet && !isLandscape) return 3;
  return Math.min(6, Math.max(4, Math.floor(width / 280)));
};

/**
 * Calculate optimal card dimensions
 *
 * UltraPremiumMatchCard Design:
 * - INFO_SECTION_HEIGHT: 115px fixed (increased to prevent clipping)
 * - Photo takes remaining space after info section
 * - Photo aspect ratio: 4:5 portrait (height = width * 1.25)
 */
const INFO_SECTION_HEIGHT = 115;
const COMPACT_INFO_HEIGHT = 100;
const TABLET_INFO_HEIGHT = 120;
const PHOTO_ASPECT_RATIO = 1.25; // 4:5 portrait

const getCardDimensions = (
  width: number,
  screenHeight: number,
  isLandscape: boolean,
  isTablet: boolean,
  horizontalPadding: number,
  cardGap: number,
  insets: { left: number; right: number }
): CardDimensions => {
  const numColumns = getColumnCount(width, isLandscape, isTablet);
  const totalInsets = insets.left + insets.right;
  const availableWidth = width - horizontalPadding * 2 - totalInsets;
  const totalGaps = (numColumns - 1) * cardGap;
  const cardWidth = Math.floor((availableWidth - totalGaps) / numColumns);

  // Determine info section height based on device/mode
  const isCompactMode = isLandscape && !isTablet;
  const infoHeight = isCompactMode ? COMPACT_INFO_HEIGHT : isTablet ? TABLET_INFO_HEIGHT : INFO_SECTION_HEIGHT;

  // Calculate photo height based on aspect ratio
  let photoRatio = PHOTO_ASPECT_RATIO;
  if (isCompactMode) {
    // Landscape phones need shorter photos
    photoRatio = 0.85;
  } else if (isTablet && isLandscape) {
    // Tablet landscape: optimize to fit more cards on screen
    photoRatio = 1.0;
  } else if (isTablet) {
    // Tablet portrait: slightly shorter for better fit
    photoRatio = 1.15;
  }

  // Calculate card width limits
  const minCardWidth = width < BREAKPOINTS.xs + 40 ? 280 : 155;
  const maxCardWidth = isTablet ? 340 : 220;
  const finalCardWidth = Math.min(Math.max(cardWidth, minCardWidth), maxCardWidth);

  // Calculate photo height and total card height
  const photoHeight = finalCardWidth * photoRatio;

  // Apply height constraints - optimized for better fit
  let maxPhotoHeight: number;
  if (isCompactMode) {
    maxPhotoHeight = Math.min(screenHeight * 0.55, 180);
  } else if (isTablet && isLandscape) {
    // Tablet landscape: shorter to fit more cards
    maxPhotoHeight = Math.min(screenHeight * 0.45, 280);
  } else if (isTablet) {
    // Tablet portrait: moderate height
    maxPhotoHeight = Math.min(screenHeight * 0.32, 340);
  } else {
    maxPhotoHeight = Math.min(screenHeight * 0.35, 320);
  }

  const minPhotoHeight = isCompactMode ? 120 : isTablet ? 200 : 180;
  const finalPhotoHeight = Math.max(Math.min(photoHeight, maxPhotoHeight), minPhotoHeight);

  // Total card height = photo + info section
  const finalCardHeight = finalPhotoHeight + infoHeight;

  return {
    cardWidth: finalCardWidth,
    cardHeight: finalCardHeight,
    numColumns,
    cardGap,
  };
};

/**
 * Main hook for matches responsive values
 */
export const useMatchesResponsive = () => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isTablet,
    isLandscape,
    isPhone,
    moderateScale,
    getScreenMargin,
  } = useResponsive();

  const fontSizes = useMemo(
    () => getResponsiveFontSizes(width, height, isTablet, isLandscape, moderateScale),
    [width, height, isTablet, isLandscape, moderateScale]
  );

  const spacing = useMemo(
    () => getResponsiveSpacing(width, height, isTablet, isLandscape, getScreenMargin),
    [width, height, isTablet, isLandscape, getScreenMargin]
  );

  const cardDimensions = useMemo(
    () =>
      getCardDimensions(
        width,
        height,
        isLandscape,
        isTablet,
        spacing.l,
        spacing.cardGap,
        { left: insets.left, right: insets.right }
      ),
    [width, height, isLandscape, isTablet, spacing.l, spacing.cardGap, insets.left, insets.right]
  );

  const isCompactMode = isLandscape && isPhone;
  const isVerySmallScreen = width < BREAKPOINTS.xs + 40;

  // Button and tab heights with minimum touch targets
  const buttonHeight = Math.max(
    MIN_TOUCH_TARGET,
    isTablet ? 72 : isCompactMode ? Math.min(height * 0.11, 50) : 64
  );
  const filterTabHeight = Math.max(
    MIN_TOUCH_TARGET - 8, // 48px minimum for filter tabs
    isTablet ? 62 : isCompactMode ? Math.min(height * 0.1, 46) : 54
  );

  // Header icon sizing
  const headerIconSize = isCompactMode
    ? Math.min(26, height * 0.065)
    : isTablet
      ? 34
      : 30;
  const headerIconContainerSize = isCompactMode
    ? Math.min(48, height * 0.11)
    : isTablet
      ? 68
      : 60;

  // Safe padding for landscape
  const safePaddingLeft = isLandscape ? Math.max(insets.left, 8) : 0;
  const safePaddingRight = isLandscape ? Math.max(insets.right, 8) : 0;

  return {
    // Screen dimensions
    width,
    height,
    insets,

    // Device type
    isTablet,
    isLandscape,
    isPhone,
    isCompactMode,
    isVerySmallScreen,

    // Calculated values
    fontSizes,
    spacing,
    cardDimensions,
    buttonHeight,
    filterTabHeight,
    headerIconSize,
    headerIconContainerSize,
    safePaddingLeft,
    safePaddingRight,

    // Utilities
    moderateScale,
  };
};

export type UseMatchesResponsiveReturn = ReturnType<typeof useMatchesResponsive>;

export default useMatchesResponsive;
