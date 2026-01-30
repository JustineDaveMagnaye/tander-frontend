/**
 * TANDER Text Component
 * Accessible, themeable text with senior-friendly defaults
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography, TypographyVariant } from '@shared/styles/typography';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
  children: React.ReactNode;
  /** Maximum font scale multiplier for accessibility (default: 1.35 for readability without breaking layouts) */
  maxFontSizeMultiplier?: number;
}

/**
 * Default max font size multiplier - matches global default in App.tsx
 * Allows scaling up to 35% for accessibility while preventing layout breaks
 * See src/shared/styles/fontScaling.ts for detailed documentation
 */
const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = FONT_SCALING.DEFAULT;

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = colors.neutral.textPrimary,
  center = false,
  maxFontSizeMultiplier = DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
  style,
  children,
  ...props
}) => {
  const textStyle = typography[variant];

  return (
    <RNText
      style={[textStyle, { color }, center && styles.center, style]}
      accessible
      accessibilityRole="text"
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
});

export default Text;
