/**
 * InputField Component
 * Modern card-based text input with icon support for senior-friendly UI
 */

import React, { memo, forwardRef } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { FONT_SCALING } from '../constants';

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string | null;
  height: number;
  fontSize: number;
  labelFontSize: number;
  captionFontSize: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export const InputField = memo(
  forwardRef<TextInput, InputFieldProps>(function InputField(
    {
      label,
      value,
      onChangeText,
      hint,
      error,
      height,
      fontSize,
      labelFontSize,
      captionFontSize,
      accessibilityLabel,
      accessibilityHint,
      icon = 'user',
      ...textInputProps
    },
    ref
  ) {
    const hasError = !!error;
    const hasValue = value.length > 0;

    return (
      <View style={styles.cardContainer}>
        {/* Card Header with Icon and Label */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, hasValue && styles.iconContainerActive]}>
            <Feather
              name={icon}
              size={20}
              color={hasValue ? colors.orange.primary : colors.gray[400]}
            />
          </View>
          <View style={styles.labelContainer}>
            <Text
              variant="bodySmall"
              color={colors.neutral.textPrimary}
              style={[styles.label, { fontSize: labelFontSize }]}
            >
              {label}
            </Text>
            {hint && !hasError && (
              <Text
                variant="caption"
                color={colors.gray[400]}
                style={{ fontSize: captionFontSize - 1 }}
              >
                {hint}
              </Text>
            )}
          </View>
        </View>

        {/* Input Area */}
        <View
          style={[
            styles.inputWrapper,
            { minHeight: height },
            hasError && styles.inputError,
            hasValue && styles.inputActive,
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.textInput, { fontSize }]}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={colors.gray[400]}
            accessible
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            maxFontSizeMultiplier={FONT_SCALING.INPUT_MAX_MULTIPLIER}
            {...textInputProps}
          />
        </View>

        {/* Error Message */}
        {hasError && (
          <View
            style={styles.errorContainer}
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Feather name="alert-circle" size={16} color={colors.semantic.error} />
            <Text
              variant="caption"
              color={colors.semantic.error}
              style={[styles.errorText, { fontSize: captionFontSize }]}
            >
              {error}
            </Text>
          </View>
        )}
      </View>
    );
  })
);

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  iconContainerActive: {
    backgroundColor: colors.orange[50],
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: '600',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputActive: {
    borderColor: colors.orange[200],
    backgroundColor: colors.orange[50],
  },
  inputError: {
    borderColor: colors.semantic.error,
    backgroundColor: colors.red?.[50] || '#FEF2F2',
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: colors.neutral.textPrimary,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.s,
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
  },
});
