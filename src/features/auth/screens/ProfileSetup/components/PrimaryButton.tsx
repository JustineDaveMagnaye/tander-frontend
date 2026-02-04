/**
 * PrimaryButton Component
 * Animated gradient button following SignUp pattern
 */

import React, { memo, useRef, useCallback } from 'react';
import { Pressable, Animated, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { shadows } from '@shared/styles/spacing';

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
}: PrimaryButtonProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const isDisabled = loading || disabled;

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
    : [...colors.gradient.primaryButton];

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
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
          style={[styles.button, { height, borderRadius: 9999 }]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text
                variant="button"
                color={colors.white}
                style={[styles.buttonText, { fontSize }]}
              >
                {loadingTitle || title}
              </Text>
            </View>
          ) : (
            <Text
              variant="button"
              color={colors.white}
              style={[styles.buttonText, { fontSize }]}
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
