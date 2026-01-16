/**
 * TANDER Theme Configuration
 * Combines colors, typography, and spacing into a unified theme
 */

import { colors } from './colors';
import { typography, fontWeights } from './typography';
import { spacing, borderRadius, touchTargets, shadows, componentSpacing } from './spacing';

export const lightTheme = {
  mode: 'light' as const,
  colors: {
    primary: colors.orange.primary,
    primaryLight: colors.orange.light,
    primaryDark: colors.orange.dark,
    secondary: colors.teal.primary,
    secondaryLight: colors.teal.light,
    secondaryDark: colors.teal.dark,
    background: colors.neutral.background,
    surface: colors.neutral.surface,
    text: colors.neutral.textPrimary,
    textSecondary: colors.neutral.textSecondary,
    border: colors.neutral.border,
    disabled: colors.neutral.disabled,
    placeholder: colors.neutral.placeholder,
    success: colors.semantic.success,
    error: colors.semantic.error,
    warning: colors.semantic.warning,
    info: colors.semantic.info,
    gradient: colors.gradient,
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
  },
  typography,
  fontWeights,
  spacing,
  borderRadius,
  touchTargets,
  shadows,
  componentSpacing,
};

export const darkTheme = {
  mode: 'dark' as const,
  colors: {
    primary: colors.orange.light, // Lighter for dark backgrounds
    primaryLight: colors.orange.primary,
    primaryDark: colors.orange.dark,
    secondary: '#4ECDC4', // More vibrant teal for dark mode
    secondaryLight: colors.teal.primary,
    secondaryDark: colors.teal.dark,
    background: '#1A1D2E',
    surface: '#252839',
    text: '#F0F0F0',
    textSecondary: '#B0B0B0',
    border: '#3A3D4E',
    disabled: '#5A5A5A',
    placeholder: '#7A7A7A',
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFCA28',
    info: '#42A5F5',
    gradient: colors.gradient,
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
  },
  typography,
  fontWeights,
  spacing,
  borderRadius,
  touchTargets,
  shadows,
  componentSpacing,
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark';

// Default export
export const theme = lightTheme;
