/**
 * PrimaryButton Component
 * Animated gradient button with loading state
 */

import React, { memo, useRef, useCallback } from 'react';
import { Pressable, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { shadows } from '@shared/styles/spacing';
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
}: PrimaryButtonProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const isDisabled = loading || disabled;

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    safeHaptic(HapticType.Light);

    if (reduceMotion) {
      scaleValue.setValue(0.96);
    } else {
      Animated.spring(scaleValue, {
        toValue: 0.96,
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
    onPress();
  }, [isDisabled, onPress]);

  const gradientColors: string[] = isDisabled
    ? [colors.gray[400], colors.gray[500]]
    : [...colors.gradient.primaryButton]; // from-orange-500 to-orange-600

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            { height, borderRadius: 9999 }, // rounded-full
          ]}
        >
          <Text
            variant="button"
            color={colors.white}
            style={[styles.buttonText, { fontSize }]}
          >
            {loading ? (loadingTitle || title) : title}
          </Text>
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
    // Height is set dynamically via height prop (56-64px minimum per design system)
    // Border radius is calculated as height / 2 for pill-shaped button
    // Full width is enforced by parent container
  },
  buttonText: {
    fontWeight: '600',
    // Font size is set dynamically via fontSize prop
    // Minimum 18px body text, 20-22px recommended per design system
  },
});
