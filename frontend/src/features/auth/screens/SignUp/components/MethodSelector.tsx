/**
 * MethodSelector Component
 * Tab selector for choosing between Phone and Email registration
 * Following ForgotPassword pattern
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, Pressable, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { RegistrationMethod, A11Y_LABELS } from '../constants';
import { safeHaptic, HapticType } from '../utils';

interface MethodSelectorProps {
  selectedMethod: RegistrationMethod;
  onMethodChange: (method: RegistrationMethod) => void;
  height: number;
  fontSize: number;
  reduceMotion: boolean;
  disabled?: boolean;
  phoneDisabled?: boolean; // Phone option is visible but disabled (Coming Soon)
}

export const MethodSelector = memo(function MethodSelector({
  selectedMethod,
  onMethodChange,
  height,
  fontSize,
  reduceMotion,
  disabled = false,
  phoneDisabled = false,
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
        useNativeDriver: false,
      }).start();
    }
  }, [selectedMethod, reduceMotion, sliderPosition]);

  // Handle container layout to calculate slider width
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Handle method selection
  const handleSelectPhone = useCallback(() => {
    if (disabled || phoneDisabled || selectedMethod === 'phone') return;
    safeHaptic(HapticType.Selection);
    onMethodChange('phone');
  }, [disabled, phoneDisabled, selectedMethod, onMethodChange]);

  const handleSelectEmail = useCallback(() => {
    if (disabled || selectedMethod === 'email') return;
    safeHaptic(HapticType.Selection);
    onMethodChange('email');
  }, [disabled, selectedMethod, onMethodChange]);

  // Calculate slider dimensions
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
      accessibilityLabel="Registration method selection"
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
        style={[styles.tab, (disabled || phoneDisabled) && styles.tabDisabled]}
        accessible
        accessibilityRole="tab"
        accessibilityLabel={phoneDisabled ? 'Phone (Coming Soon)' : A11Y_LABELS.tabs.phone}
        accessibilityState={{ selected: selectedMethod === 'phone', disabled: disabled || phoneDisabled }}
        accessibilityHint={phoneDisabled ? 'Phone verification is not yet available' : undefined}
      >
        <View style={styles.tabContent}>
          <Text
            variant="buttonSmall"
            color={phoneDisabled ? colors.neutral.disabled : (selectedMethod === 'phone' ? colors.white : colors.neutral.textSecondary)}
            style={[styles.tabText, { fontSize }]}
          >
            Phone
          </Text>
          {phoneDisabled && (
            <Text
              variant="caption"
              color={colors.neutral.disabled}
              style={styles.comingSoonText}
            >
              Coming Soon
            </Text>
          )}
        </View>
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
          Email
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.large,
    padding: 4,
    marginBottom: spacing.l,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  slider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: colors.orange.primary,
    borderRadius: borderRadius.medium,
    ...shadows.medium,
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
    minHeight: touchTargets.standard,
    paddingHorizontal: spacing.xs,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabDisabled: {
    opacity: 0.6,
  },
  tabText: {
    fontWeight: '700',
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
