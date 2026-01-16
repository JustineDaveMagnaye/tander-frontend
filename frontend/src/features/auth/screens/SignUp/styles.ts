/**
 * SignUp Screen Styles
 * Centralized StyleSheet following ForgotPassword pattern
 *
 * Responsive Design:
 * - iPhone SE (320px) to iPad Pro 12.9" (1024px+)
 * - All Android phones (360px+) and tablets (768px+)
 * - Portrait AND landscape orientations
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

  // Back Button - Senior-friendly 56px minimum touch target
  backButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -spacing.xxs,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
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
    transform: isRTL ? [{ scaleX: -1 }] : [],
  },

  // Header Content
  headerContent: {
    marginTop: spacing.m,
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    opacity: 0.9,
    lineHeight: 24,
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
  formWrapper: {
    flex: 1,
    marginTop: -spacing.xl,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...shadows.large,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray[200],
    marginTop: spacing.m,
    marginBottom: spacing.m,
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
  formCardFlat: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
  },
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

// Layout constants
export const LAYOUT = {
  landscapeHeaderFlex: 0.35,
  landscapeFormFlex: 0.65,
  formPadding: {
    smallPhone: spacing.m,
    phone: spacing.l,
    tabletPortrait: spacing.xl,
    tabletLandscape: spacing.l,
    landscape: spacing.m,
  },
} as const;

// Helper to get responsive form padding
export const getResponsiveFormPadding = (
  isSmallScreen: boolean,
  isTablet: boolean,
  isLandscape: boolean = false
): number => {
  if (isLandscape && !isTablet) return LAYOUT.formPadding.landscape;
  if (isLandscape && isTablet) return LAYOUT.formPadding.tabletLandscape;
  if (isSmallScreen) return LAYOUT.formPadding.smallPhone;
  if (isTablet) return LAYOUT.formPadding.tabletPortrait;
  return LAYOUT.formPadding.phone;
};
