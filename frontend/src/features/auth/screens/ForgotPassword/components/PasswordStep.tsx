/**
 * PasswordStep Component
 * Step 3: Create new password
 */

import React, { memo, useCallback, useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { StepIndicator } from './StepIndicator';
import { InputField } from './InputField';
import { PasswordRequirements } from './PasswordRequirements';
import { PrimaryButton } from './PrimaryButton';
import {
  ForgotPasswordState,
  ForgotPasswordAction,
  ResponsiveSizes,
  PasswordRequirements as PasswordRequirementsType,
} from '../types';
import { A11Y_LABELS, VALIDATION } from '../constants';

interface PasswordStepProps {
  state: ForgotPasswordState;
  dispatch: React.Dispatch<ForgotPasswordAction>;
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  passwordRequirements: PasswordRequirementsType;
  onResetPassword: () => Promise<void>;
}

export const PasswordStep = memo(function PasswordStep({
  state,
  dispatch,
  sizes,
  isTablet,
  isLandscape,
  passwordRequirements,
  onResetPassword,
}: PasswordStepProps) {
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Handlers
  const handleNewPasswordChange = useCallback((text: string) => {
    dispatch({ type: 'SET_NEW_PASSWORD', payload: text });
  }, [dispatch]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    dispatch({ type: 'SET_CONFIRM_PASSWORD', payload: text });
  }, [dispatch]);

  const handleTogglePassword = useCallback(() => {
    dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' });
  }, [dispatch]);

  const handlePasswordSubmit = useCallback(() => {
    confirmPasswordRef.current?.focus();
  }, []);

  // Password icon prefix
  const PasswordIcon = (
    <View style={styles.passwordIcon}>
      <Text style={styles.passwordIconText}>{'🔒'}</Text>
    </View>
  );

  const canSubmit = passwordRequirements.isValid &&
    state.newPassword === state.confirmPassword &&
    !state.loading;

  return (
    <View>
      <StepIndicator
        currentStep={state.step}
        captionFontSize={sizes.captionFontSize}
        isTablet={isTablet}
      />

      {/* Instruction */}
      <Text
        variant="body"
        color={colors.neutral.textSecondary}
        style={[
          styles.instruction,
          {
            fontSize: sizes.bodyFontSize,
            // G2-R-001: Responsive line height
            lineHeight: Math.round(sizes.bodyFontSize * 1.5),
          },
        ]}
      >
        Create a new password that you'll remember
      </Text>

      {/* Password Requirements */}
      <PasswordRequirements
        requirements={passwordRequirements}
        captionFontSize={sizes.captionFontSize}
      />

      {/* New Password Input */}
      <InputField
        ref={passwordRef}
        label="New Password"
        value={state.newPassword}
        onChangeText={handleNewPasswordChange}
        height={sizes.inputHeight}
        fontSize={sizes.inputFontSize}
        labelFontSize={sizes.labelFontSize}
        captionFontSize={sizes.captionFontSize}
        prefix={PasswordIcon}
        placeholder="Enter new password"
        secureTextEntry={!state.showPassword}
        autoCapitalize="none"
        autoComplete="password-new"
        returnKeyType="next"
        onSubmitEditing={handlePasswordSubmit}
        maxLength={VALIDATION.MAX_INPUT_LENGTH.password}
        showPasswordToggle
        showPassword={state.showPassword}
        onTogglePassword={handleTogglePassword}
        accessibilityLabel={A11Y_LABELS.inputs.new_password}
        accessibilityHint={A11Y_LABELS.inputs.new_password_hint}
        editable={!state.loading}
      />

      {/* Confirm Password Input */}
      <InputField
        ref={confirmPasswordRef}
        label="Confirm Password"
        value={state.confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        error={state.error}
        height={sizes.inputHeight}
        fontSize={sizes.inputFontSize}
        labelFontSize={sizes.labelFontSize}
        captionFontSize={sizes.captionFontSize}
        prefix={PasswordIcon}
        placeholder="Confirm new password"
        secureTextEntry={!state.showPassword}
        autoCapitalize="none"
        autoComplete="password-new"
        returnKeyType="done"
        onSubmitEditing={onResetPassword}
        maxLength={VALIDATION.MAX_INPUT_LENGTH.password}
        accessibilityLabel={A11Y_LABELS.inputs.confirm_password}
        accessibilityHint={A11Y_LABELS.inputs.confirm_password_hint}
        editable={!state.loading}
      />

      {/* Reset Password Button */}
      <PrimaryButton
        title="Reset Password"
        loadingTitle="Resetting..."
        onPress={onResetPassword}
        loading={state.loading}
        disabled={!canSubmit}
        height={sizes.buttonHeight}
        fontSize={isLandscape ? Math.min(sizes.bodyFontSize, 15) : (isTablet ? 20 : 18)}
        reduceMotion={state.reduceMotion}
        accessibilityLabel={A11Y_LABELS.buttons.reset_password}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  instruction: {
    textAlign: 'center',
    // lineHeight is set dynamically based on font size (1.5x)
    marginBottom: spacing.l,
  },
  passwordIcon: {
    paddingLeft: spacing.m,
    paddingRight: spacing.xs,
    justifyContent: 'center',
    // Icon emoji scales with input size
  },
  passwordIconText: {
    fontSize: 18,
    // Fixed size for consistent icon appearance
  },
});
