/**
 * InputField Component
 * Accessible text input with label, error, and hint support
 */

import React, { memo, forwardRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, touchTargets } from '@shared/styles/spacing';
import { FONT_SCALING } from '../constants';

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  hint?: string;
  height: number;
  fontSize: number;
  labelFontSize: number;
  captionFontSize: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  containerStyle?: ViewStyle;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export const InputField = memo(
  forwardRef<TextInput, InputFieldProps>(function InputField(
    {
      label,
      value,
      onChangeText,
      error,
      hint,
      height,
      fontSize,
      labelFontSize,
      captionFontSize,
      prefix,
      suffix,
      showPasswordToggle,
      showPassword,
      onTogglePassword,
      containerStyle,
      accessibilityLabel,
      accessibilityHint,
      ...textInputProps
    },
    ref
  ) {
    const hasError = !!error;

    const handleTogglePassword = useCallback(() => {
      onTogglePassword?.();
    }, [onTogglePassword]);

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Label */}
        <Text
          variant="bodySmall"
          color={colors.neutral.textPrimary}
          style={[styles.label, { fontSize: labelFontSize }]}
        >
          {label}
        </Text>

        {/* Input Wrapper */}
        <View
          style={[
            styles.inputWrapper,
            { height },
            hasError && styles.inputError,
          ]}
        >
          {/* Prefix (e.g., country code) */}
          {prefix}

          {/* Text Input */}
          <TextInput
            ref={ref}
            style={[styles.textInput, { fontSize }]}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={colors.neutral.placeholder}
            accessible
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: textInputProps.editable === false }}
            // G2-R-007: Limit font scaling to prevent layout breaking
            maxFontSizeMultiplier={FONT_SCALING.INPUT_MAX_MULTIPLIER}
            {...textInputProps}
          />

          {/* Suffix or Password Toggle */}
          {showPasswordToggle && (
            <Pressable
              onPress={handleTogglePassword}
              style={styles.passwordToggle}
              accessible
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.passwordToggleIcon}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </Pressable>
          )}
          {!showPasswordToggle && suffix}
        </View>

        {/* Error Message */}
        {hasError && (
          <View
            style={styles.errorContainer}
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>!</Text>
            </View>
            <Text
              variant="caption"
              color={colors.semantic.error}
              style={[styles.errorText, { fontSize: captionFontSize }]}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Hint (when no error) */}
        {!hasError && hint && (
          <Text
            variant="caption"
            color={colors.neutral.textSecondary}
            style={[styles.hint, { fontSize: captionFontSize }]}
          >
            {hint}
          </Text>
        )}
      </View>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.l,
  },
  label: {
    marginBottom: spacing.xs,
    fontWeight: '600',
    // Font size is set dynamically via labelFontSize prop
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.neutral.background,
    // Height is set dynamically via height prop (minimum 60px per design system)
    // Ensures 56-64px minimum for senior-friendly touch targets
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: colors.neutral.textPrimary,
    paddingHorizontal: spacing.m,
    paddingVertical: 0,
    // Font size is set dynamically via fontSize prop (minimum 20px per design system)
  },
  passwordToggle: {
    padding: spacing.m,
    // Ensuring 48px minimum touch target (WCAG AA)
    minWidth: touchTargets.standard,
    minHeight: touchTargets.standard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleIcon: {
    fontSize: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    // Ensure icon doesn't shrink on small screens
    flexShrink: 0,
    marginTop: 2,
  },
  errorIconText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    flex: 1,
    // Font size is set dynamically via captionFontSize prop
  },
  hint: {
    marginTop: spacing.xs,
    // Font size is set dynamically via captionFontSize prop
  },
});
