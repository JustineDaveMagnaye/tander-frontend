/**
 * TANDER Text Component
 * Accessible, themeable text with senior-friendly defaults
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography, TypographyVariant } from '@shared/styles/typography';
import { colors } from '@shared/styles/colors';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
  children: React.ReactNode;
  /** Maximum font scale multiplier for accessibility (default: 1.4 for readability without breaking layouts) */
  maxFontSizeMultiplier?: number;
}

/** Default max font size multiplier - allows scaling up to 140% for accessibility while preventing layout breaks */
const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.4;

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
