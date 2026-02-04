/**
 * TANDER Input Component
 * Elderly-friendly text input with large sizing
 * Based on system_design.md: px-5 py-4, text-lg, border-2, rounded-2xl
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  showClearButton?: boolean;
  containerStyle?: ViewStyle;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'search';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  showClearButton = false,
  containerStyle,
  required = false,
  value,
  onChangeText,
  placeholder,
  editable = true,
  leftIcon,
  rightIcon,
  variant = 'default',
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.semantic.error;
    if (isFocused) return colors.orange[400]; // focus:border-orange-400
    return colors.gray[200]; // border-gray-200
  };

  const handleClear = () => {
    onChangeText?.('');
  };

  const isSearchVariant = variant === 'search';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          isSearchVariant ? styles.searchInputContainer : styles.inputContainer,
          { borderColor: getBorderColor() },
          !editable && styles.disabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        {isSearchVariant && (
          <Feather name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            isSearchVariant ? styles.searchInput : styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
          ]}
          secureTextEntry={secureTextEntry && !showPassword}
          accessible
          accessibilityLabel={label || placeholder}
          accessibilityHint={hint}
          accessibilityState={{ disabled: !editable }}
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
            accessible
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        )}

        {showClearButton && value && value.length > 0 && !secureTextEntry && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessible
            accessibilityLabel="Clear input"
            accessibilityRole="button"
          >
            <Feather name="x" size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        )}

        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={14} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {hint && !error && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    marginBottom: 12, // mb-3
  },
  label: {
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: colors.gray[700], // text-gray-700
  },
  required: {
    color: colors.semantic.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16, // rounded-2xl
    borderWidth: 2, // border-2
    paddingHorizontal: 20, // px-5
    paddingVertical: 16, // py-4
    minHeight: 56,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50], // bg-gray-50
    borderRadius: 9999, // rounded-full
    borderWidth: 0,
    paddingHorizontal: 16, // pl-12 pr-4
    paddingVertical: 14, // py-3.5
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18, // text-lg
    color: colors.gray[900],
    padding: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16, // text-base
    color: colors.gray[900],
    padding: 0,
  },
  inputWithLeftIcon: {
    marginLeft: 8,
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  passwordToggle: {
    padding: 8,
    marginLeft: 4,
    marginRight: -8,
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: -8,
  },
  disabled: {
    backgroundColor: colors.gray[100],
    opacity: 0.6,
  },
  errorContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.semantic.error,
  },
  hintContainer: {
    marginTop: 8,
  },
  hintText: {
    fontSize: 14,
    color: colors.gray[500],
  },
});

export default Input;
