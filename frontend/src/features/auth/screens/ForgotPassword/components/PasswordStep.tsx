/**
 * PasswordStep Component - Premium iOS Edition
 * Step 3: Create new password
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  ForgotPasswordState,
  ForgotPasswordAction,
  ResponsiveSizes,
  PasswordRequirements as PasswordRequirementsType,
} from '../types';
import { iOS, A11Y_LABELS, VALIDATION } from '../constants';
import { FONT_SCALING } from '@shared/styles/fontScaling';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handlers
  const handleNewPasswordChange = useCallback((text: string) => {
    dispatch({ type: 'SET_NEW_PASSWORD', payload: text });
  }, [dispatch]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    dispatch({ type: 'SET_CONFIRM_PASSWORD', payload: text });
  }, [dispatch]);

  // Check if can proceed
  const canSubmit = passwordRequirements.isValid &&
    state.newPassword === state.confirmPassword &&
    state.confirmPassword.length > 0 &&
    !state.loading;

  return (
    <View>
      {/* Error Card */}
      {state.error && (
        <View style={styles.errorCard}>
          <Feather name="alert-circle" size={20} color={iOS.colors.error} />
          <Text style={styles.errorText} maxFontSizeMultiplier={FONT_SCALING.BODY}>{state.error}</Text>
        </View>
      )}

      {/* Password Requirements Card */}
      <View style={styles.requirementsCard}>
        <Text style={styles.requirementsTitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Password Requirements</Text>
        <View style={styles.requirementsList}>
          <View style={styles.requirementRow}>
            <Feather
              name={passwordRequirements.hasMinLength ? 'check-circle' : 'circle'}
              size={16}
              color={passwordRequirements.hasMinLength ? iOS.colors.teal : iOS.colors.tertiaryLabel}
            />
            <Text style={[
              styles.requirementText,
              passwordRequirements.hasMinLength && styles.requirementMet,
            ]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
              At least 8 characters
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Feather
              name={passwordRequirements.hasUppercase ? 'check-circle' : 'circle'}
              size={16}
              color={passwordRequirements.hasUppercase ? iOS.colors.teal : iOS.colors.tertiaryLabel}
            />
            <Text style={[
              styles.requirementText,
              passwordRequirements.hasUppercase && styles.requirementMet,
            ]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
              One uppercase letter
            </Text>
          </View>
          <View style={styles.requirementRow}>
            <Feather
              name={passwordRequirements.hasNumber ? 'check-circle' : 'circle'}
              size={16}
              color={passwordRequirements.hasNumber ? iOS.colors.teal : iOS.colors.tertiaryLabel}
            />
            <Text style={[
              styles.requirementText,
              passwordRequirements.hasNumber && styles.requirementMet,
            ]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
              One number
            </Text>
          </View>
        </View>
      </View>

      {/* New Password Input Card */}
      <View style={styles.inputCard}>
        <View style={styles.inputCardHeader}>
          <View style={[styles.inputIconCircle, state.newPassword.length > 0 && styles.inputIconCircleActive]}>
            <Feather
              name="lock"
              size={20}
              color={state.newPassword.length > 0 ? iOS.colors.orange : iOS.colors.tertiaryLabel}
            />
          </View>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.inputLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>New Password</Text>
            <Text style={styles.inputHint} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Create a strong password</Text>
          </View>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={passwordRef}
            style={[styles.textInput, styles.passwordInput]}
            value={state.newPassword}
            onChangeText={handleNewPasswordChange}
            placeholder="Enter new password"
            placeholderTextColor={iOS.colors.quaternaryLabel}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            editable={!state.loading}
            maxLength={VALIDATION.MAX_INPUT_LENGTH.password}
            accessibilityLabel={A11Y_LABELS.inputs.new_password}
            accessibilityHint={A11Y_LABELS.inputs.new_password_hint}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={A11Y_LABELS.buttons.toggle_password(showPassword)}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={iOS.colors.teal}
            />
          </Pressable>
        </View>
      </View>

      {/* Confirm Password Input Card */}
      <View style={styles.inputCard}>
        <View style={styles.inputCardHeader}>
          <View style={[styles.inputIconCircle, state.confirmPassword.length > 0 && styles.inputIconCircleActive]}>
            <Feather
              name="shield"
              size={20}
              color={state.confirmPassword.length > 0 ? iOS.colors.orange : iOS.colors.tertiaryLabel}
            />
          </View>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.inputLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>Confirm Password</Text>
            <Text style={styles.inputHint} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Re-enter to confirm</Text>
          </View>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={confirmPasswordRef}
            style={[styles.textInput, styles.passwordInput]}
            value={state.confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            placeholder="Confirm new password"
            placeholderTextColor={iOS.colors.quaternaryLabel}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={onResetPassword}
            editable={!state.loading}
            maxLength={VALIDATION.MAX_INPUT_LENGTH.password}
            accessibilityLabel={A11Y_LABELS.inputs.confirm_password}
            accessibilityHint={A11Y_LABELS.inputs.confirm_password_hint}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            accessibilityLabel={A11Y_LABELS.buttons.toggle_password(showConfirmPassword)}
          >
            <Feather
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color={iOS.colors.teal}
            />
          </Pressable>
        </View>

        {/* Password Match Indicator */}
        {state.confirmPassword.length > 0 && (
          <View style={styles.matchIndicator}>
            <Feather
              name={state.newPassword === state.confirmPassword ? 'check-circle' : 'x-circle'}
              size={16}
              color={state.newPassword === state.confirmPassword ? iOS.colors.teal : iOS.colors.error}
            />
            <Text style={[
              styles.matchText,
              { color: state.newPassword === state.confirmPassword ? iOS.colors.teal : iOS.colors.error },
            ]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
              {state.newPassword === state.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        )}
      </View>

      {/* Reset Password Button */}
      <Pressable
        style={({ pressed }) => [
          styles.continueButton,
          !canSubmit && styles.continueButtonDisabled,
          pressed && canSubmit && styles.continueButtonPressed,
        ]}
        onPress={onResetPassword}
        disabled={!canSubmit}
        accessibilityLabel={A11Y_LABELS.buttons.reset_password}
      >
        {state.loading ? (
          <ActivityIndicator color={iOS.colors.white} />
        ) : (
          <>
            <Text style={[styles.continueText, !canSubmit && styles.continueTextDisabled]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
              Reset Password
            </Text>
            <Feather
              name="check"
              size={22}
              color={canSubmit ? iOS.colors.white : iOS.colors.quaternaryLabel}
            />
          </>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  // Error Card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: iOS.spacing.md,
    borderRadius: iOS.radius.md,
    marginBottom: iOS.spacing.md,
    gap: iOS.spacing.sm,
  },
  errorText: {
    ...iOS.typography.subhead,
    color: iOS.colors.error,
    flex: 1,
  },

  // Requirements Card - Teal for met requirements
  requirementsCard: {
    backgroundColor: iOS.colors.tealLight,
    borderRadius: iOS.radius.lg,
    padding: iOS.spacing.md,
    marginBottom: iOS.spacing.md,
  },
  requirementsTitle: {
    ...iOS.typography.footnote,
    fontWeight: '600',
    color: iOS.colors.tealDark,
    marginBottom: iOS.spacing.sm,
  },
  requirementsList: {
    gap: iOS.spacing.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.sm,
  },
  requirementText: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
  },
  requirementMet: {
    color: iOS.colors.teal,
  },

  // Input Card
  inputCard: {
    backgroundColor: iOS.colors.white,
    borderRadius: iOS.radius.lg,
    padding: iOS.spacing.md,
    marginBottom: iOS.spacing.md,
    borderWidth: 1,
    borderColor: iOS.colors.separator,
    ...iOS.shadow.small,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: iOS.spacing.sm,
  },
  inputIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.md,
  },
  inputIconCircleActive: {
    backgroundColor: iOS.colors.orangeLight,
  },
  inputLabelContainer: {
    flex: 1,
  },
  inputLabel: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  inputHint: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: 2,
  },

  // Input Wrapper
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.tertiaryBackground,
    borderRadius: iOS.radius.md,
    paddingHorizontal: iOS.spacing.md,
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    ...iOS.typography.body,
    color: iOS.colors.label,
    paddingVertical: iOS.spacing.md,
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: iOS.spacing.sm,
    padding: iOS.spacing.sm,
  },

  // Match Indicator
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.xs,
    marginTop: iOS.spacing.sm,
    paddingLeft: iOS.spacing.xs,
  },
  matchText: {
    ...iOS.typography.footnote,
  },

  // Continue Button - Orange primary action
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.orange,
    height: 56,
    borderRadius: iOS.radius.pill,
    marginTop: iOS.spacing.lg,
    gap: iOS.spacing.sm,
    ...iOS.shadow.medium,
  },
  continueButtonDisabled: {
    backgroundColor: iOS.colors.tertiaryFill,
    ...iOS.shadow.small,
  },
  continueButtonPressed: {
    backgroundColor: iOS.colors.orangeDark,
    transform: [{ scale: 0.98 }],
  },
  continueText: {
    ...iOS.typography.headline,
    color: iOS.colors.white,
  },
  continueTextDisabled: {
    color: iOS.colors.quaternaryLabel,
  },
});
