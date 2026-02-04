/**
 * PrimaryButton Component
 * Senior-friendly animated gradient button with loading state
 *
 * Features:
 * - Minimum 56px height for senior accessibility
 * - High contrast gradient
 * - Clear loading and disabled states
 * - Haptic feedback
 */

import React, { memo, useRef, useCallback } from 'react';
import { Pressable, Animated, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { shadows, touchTargets } from '@shared/styles/spacing';
import { safeHaptic, HapticType } from '../utils';

interface PrimaryButtonProps {
  title: string;
  loadingTitle?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  height: number;
  fontSize: number;
  reduceMotion: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  /** Use secondary (teal) gradient instead of primary (orange) */
  variant?: 'primary' | 'secondary';
}

export const PrimaryButton = memo(function PrimaryButton({
  title,
  loadingTitle,
  onPress,
  loading = false,
  disabled = false,
  height,
  fontSize,
  reduceMotion,
  accessibilityLabel,
  accessibilityHint,
  style,
  variant = 'primary',
}: PrimaryButtonProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const isDisabled = loading || disabled;

  // Ensure minimum 56px height for senior accessibility
  const buttonHeight = Math.max(height, touchTargets.comfortable);
  // Ensure minimum 16px font for readability
  const buttonFontSize = Math.max(fontSize, 16);

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    safeHaptic(HapticType.Light);

    if (reduceMotion) {
      scaleValue.setValue(0.97);
    } else {
      Animated.spring(scaleValue, {
        toValue: 0.97,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [isDisabled, reduceMotion, scaleValue]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) {
      scaleValue.setValue(1);
    } else {
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [reduceMotion, scaleValue]);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    safeHaptic(HapticType.Medium);
    onPress();
  }, [isDisabled, onPress]);

  // Determine gradient colors based on variant and disabled state
  const gradientColors: string[] = isDisabled
    ? [colors.gray[400], colors.gray[500]]
    : variant === 'secondary'
      ? [colors.teal[400], colors.teal[500]]
      : [...colors.gradient.primaryButton];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={loading ? (loadingTitle || title) : accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            { height: buttonHeight, borderRadius: buttonHeight / 2 },
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text
                variant="button"
                color={colors.white}
                style={[styles.buttonText, { fontSize: buttonFontSize }]}
              >
                {loadingTitle || title}
              </Text>
            </View>
          ) : (
            <Text
              variant="button"
              color={colors.white}
              style={[styles.buttonText, { fontSize: buttonFontSize }]}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  buttonText: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
