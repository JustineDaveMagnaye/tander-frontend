/**
 * TANDER Card Component
 * Container component with consistent styling
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { colors } from '@shared/styles/colors';
import { componentSpacing, shadows } from '@shared/styles/spacing';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  style,
  ...props
}) => {
  const getPaddingValue = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return 12;
      case 'medium':
        return componentSpacing.card.padding;
      case 'large':
        return 28;
      default:
        return componentSpacing.card.padding;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.neutral.surface,
          ...shadows.medium,
        };
      case 'outlined':
        return {
          backgroundColor: colors.neutral.surface,
          borderWidth: 1,
          borderColor: colors.neutral.border,
        };
      case 'filled':
        return {
          backgroundColor: colors.neutral.background,
        };
      default:
        return {};
    }
  };

  return (
    <View
      style={[
        styles.card,
        getVariantStyle(),
        { padding: getPaddingValue() },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: componentSpacing.card.borderRadius,
    overflow: 'hidden',
  },
});

export default Card;
