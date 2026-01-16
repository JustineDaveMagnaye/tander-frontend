/**
 * TANDER Typography System
 * Based on design_system2.md - Senior-friendly font scales
 * Minimum 18px for body text, scalable for accessibility
 */

import { Platform, TextStyle } from 'react-native';

// Font weights
export const fontWeights = {
  regular: '400' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// Font family based on platform
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

// Type scale following Major Third (1.250)
export const typography = {
  h1: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: fontWeights.bold,
    letterSpacing: 0,
  } as TextStyle,

  h2: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeights.bold,
    letterSpacing: 0,
  } as TextStyle,

  h3: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0,
  } as TextStyle,

  h4: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0,
  } as TextStyle,

  bodyLarge: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.02,
  } as TextStyle,

  body: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.02,
  } as TextStyle,

  bodySmall: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.02,
  } as TextStyle,

  caption: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.02,
  } as TextStyle,

  button: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0.02,
  } as TextStyle,

  buttonSmall: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0.02,
  } as TextStyle,
} as const;

// Font size multipliers for accessibility
export const fontSizeMultipliers = {
  small: 0.9,
  medium: 1.0, // Default
  large: 1.15,
  xlarge: 1.3,
} as const;

export type TypographyVariant = keyof typeof typography;
export type FontSizeMultiplier = keyof typeof fontSizeMultipliers;
