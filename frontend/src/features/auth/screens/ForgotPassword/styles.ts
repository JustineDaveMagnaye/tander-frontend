/**
 * ForgotPassword Screen Styles
 * Centralized StyleSheet for backward compatibility
 * Note: Most styles are now embedded directly in components using the iOS design system
 */

import { StyleSheet } from 'react-native';
import { iOS } from './constants';

// Layout constants for responsive design
export const LAYOUT = {
  landscapeHeaderFlex: 0.35,
  landscapeFormFlex: 0.65,
  formPadding: {
    smallPhone: iOS.spacing.md,
    phone: iOS.spacing.lg,
    tabletPortrait: iOS.spacing.xl,
    tabletLandscape: iOS.spacing.lg,
    landscape: iOS.spacing.md,
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

// Minimal shared styles (most styles are now in components)
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.background,
  },
});
