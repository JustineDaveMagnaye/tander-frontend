/**
 * MethodSelector Component
 * Tab selector for choosing between Phone and Email reset methods
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, Pressable, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { ResetMethod, A11Y_LABELS } from '../constants';
import { safeHaptic, HapticType } from '../utils';

interface MethodSelectorProps {
  selectedMethod: ResetMethod;
  onMethodChange: (method: ResetMethod) => void;
  height: number;
  fontSize: number;
  reduceMotion: boolean;
  disabled?: boolean;
}

export const MethodSelector = memo(function MethodSelector({
  selectedMethod,
  onMethodChange,
  height,
  fontSize,
  reduceMotion,
  disabled = false,
}: MethodSelectorProps) {
  const sliderPosition = useRef(new Animated.Value(selectedMethod === 'phone' ? 0 : 1)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  // Animate slider when method changes
  useEffect(() => {
    const toValue = selectedMethod === 'phone' ? 0 : 1;

    if (reduceMotion) {
      sliderPosition.setValue(toValue);
    } else {
      Animated.spring(sliderPosition, {
        toValue,
        tension: 60,
        friction: 10,
        useNativeDriver: false, // Must be false for layout-dependent animations
      }).start();
    }
  }, [selectedMethod, reduceMotion, sliderPosition]);

  // Handle container layout to calculate slider width
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Handle method selection
  const handleSelectPhone = useCallback(() => {
    if (disabled || selectedMethod === 'phone') return;
    safeHaptic(HapticType.Selection);
    onMethodChange('phone');
  }, [disabled, selectedMethod, onMethodChange]);

  const handleSelectEmail = useCallback(() => {
    if (disabled || selectedMethod === 'email') return;
    safeHaptic(HapticType.Selection);
    onMethodChange('email');
  }, [disabled, selectedMethod, onMethodChange]);

  // Calculate slider width (48% of container minus padding)
  const sliderWidth = containerWidth > 0 ? (containerWidth - 8) * 0.48 : 0;
  const maxTranslate = containerWidth > 0 ? containerWidth - sliderWidth - 8 : 0;

  // Animated slider left position
  const sliderLeft = sliderPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [4, Math.max(4, maxTranslate)],
  });

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={handleLayout}
      accessible
      accessibilityRole="tablist"
      accessibilityLabel="Reset method selection"
    >
      {/* Animated Slider Background */}
      <Animated.View
        style={[
          styles.slider,
          {
            left: sliderLeft,
            width: sliderWidth > 0 ? sliderWidth : '48%',
          },
          disabled && styles.sliderDisabled,
        ]}
      />

      {/* Phone Tab */}
      <Pressable
        onPress={handleSelectPhone}
        style={[styles.tab, disabled && styles.tabDisabled]}
        accessible
        accessibilityRole="tab"
        accessibilityLabel={A11Y_LABELS.tabs.phone}
        accessibilityState={{ selected: selectedMethod === 'phone', disabled }}
      >
        <Text
          variant="buttonSmall"
          color={selectedMethod === 'phone' ? colors.white : colors.neutral.textSecondary}
          style={[styles.tabText, { fontSize }]}
        >
          {'📱 Phone'}
        </Text>
      </Pressable>

      {/* Email Tab */}
      <Pressable
        onPress={handleSelectEmail}
        style={[styles.tab, disabled && styles.tabDisabled]}
        accessible
        accessibilityRole="tab"
        accessibilityLabel={A11Y_LABELS.tabs.email}
        accessibilityState={{ selected: selectedMethod === 'email', disabled }}
      >
        <Text
          variant="buttonSmall"
          color={selectedMethod === 'email' ? colors.white : colors.neutral.textSecondary}
          style={[styles.tabText, { fontSize }]}
        >
          {'✉️ Email'}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.background,
    borderRadius: borderRadius.medium,
    padding: 4,
    marginBottom: spacing.m,
    position: 'relative',
    // Height is set dynamically via height prop
    // Ensures proper scaling for tablets and phones
  },
  slider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: colors.teal.primary,
    borderRadius: borderRadius.small,
    ...shadows.small,
    // Width and left position are calculated dynamically
  },
  sliderDisabled: {
    backgroundColor: colors.neutral.disabled,
  },
  tab: {
    flex: 1,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    // Ensuring 48px minimum touch target (WCAG AA)
    minHeight: touchTargets.standard,
    // Adequate horizontal padding for comfortable tapping
    paddingHorizontal: spacing.xs,
  },
  tabDisabled: {
    opacity: 0.5,
  },
  tabText: {
    fontWeight: '600',
    // Font size is set dynamically via fontSize prop
    // Scales appropriately for tablets and landscape mode
  },
});
