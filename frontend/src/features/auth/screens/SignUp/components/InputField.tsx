/**
 * InputField Component
 * Senior-friendly text input with label, error, and hint support
 *
 * Features:
 * - Large touch targets (56-64px minimum)
 * - High contrast for aging eyes
 * - Clear visual feedback
 * - Accessible labels and hints
 */

import React, { memo, forwardRef, useCallback, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Animated,
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
  /** Show character count for limited fields */
  showCharCount?: boolean;
  /** Whether this field is required */
  required?: boolean;
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
      showCharCount,
      required = false,
      maxLength,
      ...textInputProps
    },
    ref
  ) {
    const hasError = !!error;
    const [isFocused, setIsFocused] = useState(false);

    const handleTogglePassword = useCallback(() => {
      onTogglePassword?.();
    }, [onTogglePassword]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      textInputProps.onFocus?.({} as any);
    }, [textInputProps.onFocus]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      textInputProps.onBlur?.({} as any);
    }, [textInputProps.onBlur]);

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Label with optional required indicator */}
        <View style={styles.labelRow}>
          <Text
            variant="bodySmall"
            color={colors.neutral.textPrimary}
            style={[styles.label, { fontSize: labelFontSize }]}
          >
            {label}
            {required && <Text style={styles.requiredMark}> *</Text>}
          </Text>
          {/* Character count for limited fields */}
          {showCharCount && maxLength && (
            <Text
              variant="caption"
              color={value.length >= maxLength ? colors.semantic.error : colors.neutral.textSecondary}
              style={{ fontSize: captionFontSize - 1 }}
            >
              {value.length}/{maxLength}
            </Text>
          )}
        </View>

        {/* Input Wrapper with focus state */}
        <View
          style={[
            styles.inputWrapper,
            { height: Math.max(height, 56) }, // Minimum 56px for seniors
            isFocused && styles.inputFocused,
            hasError && styles.inputError,
          ]}
        >
          {/* Prefix (e.g., country code) */}
          {prefix}

          {/* Text Input */}
          <TextInput
            ref={ref}
            style={[styles.textInput, { fontSize: Math.max(fontSize, 16) }]} // Minimum 16px font
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.neutral.placeholder}
            accessible
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: textInputProps.editable === false }}
            maxFontSizeMultiplier={FONT_SCALING.INPUT_MAX_MULTIPLIER}
            maxLength={maxLength}
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.passwordToggleIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>
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
              style={[styles.errorText, { fontSize: Math.max(captionFontSize, 14) }]}
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
            style={[styles.hint, { fontSize: Math.max(captionFontSize, 14) }]}
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
    marginBottom: spacing.m,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontWeight: '700',
  },
  requiredMark: {
    color: colors.semantic.error,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    backgroundColor: colors.white,
  },
  inputFocused: {
    borderColor: colors.orange.primary,
    borderWidth: 2,
    // Add subtle shadow on focus for better visibility
    shadowColor: colors.orange.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.semantic.error,
    backgroundColor: 'rgba(244, 67, 54, 0.03)',
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: colors.neutral.textPrimary,
    paddingHorizontal: spacing.m,
    paddingVertical: 0,
    // Ensure readable text color contrast
    fontWeight: '500',
  },
  passwordToggle: {
    padding: spacing.m,
    minWidth: touchTargets.comfortable, // 56px for seniors
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleIcon: {
    fontSize: 24, // Larger icon for seniors
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  errorIconText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    flex: 1,
    lineHeight: 20,
  },
  hint: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
