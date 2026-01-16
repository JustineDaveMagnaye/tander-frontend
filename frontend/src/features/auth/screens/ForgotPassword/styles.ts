/**
 * ForgotPassword Screen Styles
 * Centralized StyleSheet for the ForgotPassword screen
 *
 * Responsive Testing Fixes Applied:
 * - G1-R-003: Reduced form card padding for small screens
 * - G5-R-009: Added RTL support for landscape mode
 * - Enhanced for FULL responsiveness across ALL devices
 * - Improved tablet and landscape layout handling
 * - Better form card sizing and spacing
 */

import { StyleSheet, I18nManager } from 'react-native';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';

// Check if RTL layout is enabled
const isRTL = I18nManager.isRTL;

export const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },

  // Portrait Header
  header: {
    paddingHorizontal: spacing.l,
    position: 'relative',
    overflow: 'hidden',
  },

  // Back Button
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -spacing.xxs,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backArrow: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
    marginLeft: -1,
    // RTL support: flip arrow direction
    transform: isRTL ? [{ scaleX: -1 }] : [],
  },

  // Header Content
  headerContent: {
    marginTop: spacing.m,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  headerDecoration: {
    position: 'absolute',
    bottom: -50,
    right: isRTL ? undefined : -30,
    left: isRTL ? -30 : undefined,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Form Container
  formContainer: {
    flex: 1,
    marginTop: -spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.l,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    ...shadows.large,
  },
  // Small screen form card (applied dynamically)
  formCardSmall: {
    padding: spacing.m,
  },

  // Landscape Layout
  landscapeContainer: {
    flex: 1,
    flexDirection: isRTL ? 'row-reverse' : 'row',
  },
  landscapeHeader: {
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    // RTL support: flip border radius
    borderTopRightRadius: isRTL ? 0 : borderRadius.xlarge,
    borderBottomRightRadius: isRTL ? 0 : borderRadius.xlarge,
    borderTopLeftRadius: isRTL ? borderRadius.xlarge : 0,
    borderBottomLeftRadius: isRTL ? borderRadius.xlarge : 0,
  },
  landscapeForm: {
    backgroundColor: colors.neutral.background,
    justifyContent: 'center',
  },
});

// Layout constants - Enhanced for better responsiveness
export const LAYOUT = {
  landscapeHeaderFlex: 0.35,
  landscapeFormFlex: 0.65,
  // Responsive padding values - Optimized for all screen sizes
  formPadding: {
    smallPhone: spacing.m,      // 320px screens (iPhone SE)
    phone: spacing.l,            // Standard phones (375-430px)
    tabletPortrait: spacing.xl,  // Tablets in portrait (768px+)
    tabletLandscape: spacing.l,  // Tablets in landscape (more horizontal space)
    landscape: spacing.m,        // Phones in landscape (limited vertical space)
  },
} as const;

// Helper to get responsive form padding - Enhanced logic
export const getResponsiveFormPadding = (
  isSmallScreen: boolean,
  isTablet: boolean,
  isLandscape: boolean = false
): number => {
  // Landscape mode always uses smaller padding due to limited vertical space
  if (isLandscape && !isTablet) return LAYOUT.formPadding.landscape;

  // Tablet landscape uses standard padding
  if (isLandscape && isTablet) return LAYOUT.formPadding.tabletLandscape;

  // Small screens (iPhone SE) use minimal padding
  if (isSmallScreen) return LAYOUT.formPadding.smallPhone;

  // Tablets in portrait use larger padding
  if (isTablet) return LAYOUT.formPadding.tabletPortrait;

  // Default for standard phones
  return LAYOUT.formPadding.phone;
};
