/**
 * AccountStep Component
 * Step 1: Select method (Phone or Email), enter contact and password
 * Following ForgotPassword MethodStep pattern
 */

import React, { memo, useCallback, useRef, useMemo } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { StepIndicator } from './StepIndicator';
import { MethodSelector } from './MethodSelector';
import { InputField } from './InputField';
import { CountryCodePrefix } from './CountryCodePrefix';
import { PrimaryButton } from './PrimaryButton';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { SignUpState, SignUpAction, ResponsiveSizes } from '../types';
import { A11Y_LABELS, VALIDATION, ERROR_MESSAGES } from '../constants';

interface AccountStepProps {
  state: SignUpState;
  dispatch: React.Dispatch<SignUpAction>;
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  onContinue: () => Promise<void>;
  onBackToLogin: () => void;
}

export const AccountStep = memo(function AccountStep({
  state,
  dispatch,
  sizes,
  isTablet,
  isLandscape,
  onContinue,
  onBackToLogin,
}: AccountStepProps) {
  type FieldErrors = {
    username?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  };

  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleMethodChange = useCallback((method: 'phone' | 'email') => {
    dispatch({ type: 'SET_METHOD', payload: method });
  }, [dispatch]);

  const handleUsernameChange = useCallback((text: string) => {
    dispatch({ type: 'SET_USERNAME', payload: text });
  }, [dispatch]);

  const handlePhoneChange = useCallback((text: string) => {
    dispatch({ type: 'SET_PHONE', payload: text });
  }, [dispatch]);

  const handleEmailChange = useCallback((text: string) => {
    dispatch({ type: 'SET_EMAIL', payload: text });
  }, [dispatch]);

  const handlePasswordChange = useCallback((text: string) => {
    dispatch({ type: 'SET_PASSWORD', payload: text });
  }, [dispatch]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    dispatch({ type: 'SET_CONFIRM_PASSWORD', payload: text });
  }, [dispatch]);

  const handleTogglePassword = useCallback(() => {
    dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' });
  }, [dispatch]);

  const handleToggleConfirmPassword = useCallback(() => {
    dispatch({ type: 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY' });
  }, [dispatch]);

  const handleContinue = useCallback(async () => {
    await onContinue();
  }, [onContinue]);

  const tabFontSize = isLandscape ? Math.min(sizes.captionFontSize, 13) : (isTablet ? 16 : 14);
  const hasUsername = state.username.trim().length > 0;
  const hasPassword = state.password.length > 0;
  const hasConfirmPassword = state.confirmPassword.length > 0;
  const hasPhone = state.phone.replace(/\D/g, '').length > 0;
  const hasEmail = state.email.trim().length > 0;
  const canContinue = !state.loading
    && hasUsername
    && (state.method === 'phone' ? hasPhone : hasEmail)
    && hasPassword
    && hasConfirmPassword;

  // Memoize prefix to prevent unnecessary re-renders
  const phonePrefix = useMemo(() => (
    <CountryCodePrefix fontSize={sizes.inputFontSize} />
  ), [sizes.inputFontSize]);

  const fieldErrors = useMemo<FieldErrors>(() => {
    if (!state.error) return {};
    const error = state.error;

    if (Object.values(ERROR_MESSAGES.username).includes(error)) {
      return { username: error };
    }
    if (Object.values(ERROR_MESSAGES.phone).includes(error)) {
      return { phone: error };
    }
    if (Object.values(ERROR_MESSAGES.email).includes(error)) {
      return { email: error };
    }
    if (Object.values(ERROR_MESSAGES.password).includes(error)) {
      if (error === ERROR_MESSAGES.password.mismatch) {
        return { confirmPassword: error };
      }
      return { password: error };
    }
    if (Object.values(ERROR_MESSAGES.network).includes(error)) {
      return { form: error };
    }

    return { form: error };
  }, [state.error]);

  const globalError = fieldErrors.form;

  return (
    <View>
      <StepIndicator
        currentStep={state.step}
        captionFontSize={sizes.captionFontSize}
        isTablet={isTablet}
      />

      {globalError && (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorTitle}>Could not create your account</Text>
          <Text style={styles.errorText}>{globalError}</Text>
        </View>
      )}

      {/* Instruction */}
      <Text
        variant="body"
        color={colors.neutral.textSecondary}
        style={[
          styles.instruction,
          {
            fontSize: sizes.bodyFontSize,
            lineHeight: Math.round(sizes.bodyFontSize * 1.5),
          },
        ]}
      >
        How would you like to create your account?
      </Text>

      {/* Method Selector - Phone/Email Toggle */}
      <MethodSelector
        selectedMethod={state.method}
        onMethodChange={handleMethodChange}
        height={sizes.tabSelectorHeight}
        fontSize={tabFontSize}
        reduceMotion={state.reduceMotion}
        disabled={state.loading}
        phoneDisabled={false} // Phone OTP is now available via Twilio
      />

      {/* Username Input */}
      <InputField
        ref={usernameRef}
        label="Username"
        value={state.username}
        onChangeText={handleUsernameChange}
        error={fieldErrors.username || null}
        hint="Choose a unique username (3-20 characters)"
        height={sizes.inputHeight}
        fontSize={sizes.inputFontSize}
        labelFontSize={sizes.labelFontSize}
        captionFontSize={sizes.captionFontSize}
        placeholder="your_username"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        autoComplete="username"
        importantForAutofill="yes"
        returnKeyType="next"
        onSubmitEditing={() => state.method === 'phone' ? phoneRef.current?.focus() : emailRef.current?.focus()}
        maxLength={VALIDATION.MAX_INPUT_LENGTH.username}
        accessibilityLabel={A11Y_LABELS.inputs.username}
        accessibilityHint={A11Y_LABELS.inputs.username_hint}
        editable={!state.loading}
        showCharCount
        required
      />

      {/* Phone Input */}
      {state.method === 'phone' && (
        <InputField
          ref={phoneRef}
          label="Mobile Number"
          value={state.phone}
          onChangeText={handlePhoneChange}
          error={fieldErrors.phone || null}
          hint="We'll send a verification code via SMS"
          height={sizes.inputHeight}
          fontSize={sizes.inputFontSize}
          labelFontSize={sizes.labelFontSize}
          captionFontSize={sizes.captionFontSize}
          prefix={phonePrefix}
          placeholder="912 345 6789"
          keyboardType="phone-pad"
          autoCapitalize="none"
          textContentType="telephoneNumber"
          autoComplete="tel"
          importantForAutofill="yes"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          maxLength={VALIDATION.MAX_INPUT_LENGTH.phone}
          accessibilityLabel={A11Y_LABELS.inputs.phone}
          accessibilityHint={A11Y_LABELS.inputs.phone_hint}
          editable={!state.loading}
          required
        />
      )}

      {/* Email Input */}
      {state.method === 'email' && (
        <InputField
          ref={emailRef}
          label="Email Address"
          value={state.email}
          onChangeText={handleEmailChange}
          error={fieldErrors.email || null}
          hint="We'll send a verification code to your email"
          height={sizes.inputHeight}
          fontSize={sizes.inputFontSize}
          labelFontSize={sizes.labelFontSize}
          captionFontSize={sizes.captionFontSize}
          placeholder="juan@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          importantForAutofill="yes"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          maxLength={VALIDATION.MAX_INPUT_LENGTH.email}
          accessibilityLabel={A11Y_LABELS.inputs.email}
          accessibilityHint={A11Y_LABELS.inputs.email_hint}
          editable={!state.loading}
          required
        />
      )}

      {/* Password Input */}
      <InputField
        ref={passwordRef}
        label="Password"
        value={state.password}
        onChangeText={handlePasswordChange}
        error={fieldErrors.password || null}
        height={sizes.inputHeight}
        fontSize={sizes.inputFontSize}
        labelFontSize={sizes.labelFontSize}
        captionFontSize={sizes.captionFontSize}
        placeholder="Create a password"
        secureTextEntry={!state.showPassword}
        textContentType="newPassword"
        autoComplete="new-password"
        importantForAutofill="yes"
        returnKeyType="next"
        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        maxLength={VALIDATION.MAX_INPUT_LENGTH.password}
        showPasswordToggle
        showPassword={state.showPassword}
        onTogglePassword={handleTogglePassword}
        accessibilityLabel={A11Y_LABELS.inputs.password}
        accessibilityHint={A11Y_LABELS.inputs.password_hint}
        editable={!state.loading}
        required
      />

      {/* Password Strength Indicator */}
      {state.password.length > 0 && (
        <PasswordStrengthIndicator
          password={state.password}
          fontSize={sizes.captionFontSize}
        />
      )}

      {/* Confirm Password Input */}
      <InputField
        ref={confirmPasswordRef}
        label="Confirm Password"
        value={state.confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        error={fieldErrors.confirmPassword || null}
        hint="Must match your password"
        height={sizes.inputHeight}
        fontSize={sizes.inputFontSize}
        labelFontSize={sizes.labelFontSize}
        captionFontSize={sizes.captionFontSize}
        placeholder="Re-enter your password"
        secureTextEntry={!state.showConfirmPassword}
        textContentType="newPassword"
        autoComplete="new-password"
        importantForAutofill="yes"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
        maxLength={VALIDATION.MAX_INPUT_LENGTH.password}
        showPasswordToggle
        showPassword={state.showConfirmPassword}
        onTogglePassword={handleToggleConfirmPassword}
        accessibilityLabel={A11Y_LABELS.inputs.confirm_password}
        accessibilityHint={A11Y_LABELS.inputs.confirm_password_hint}
        editable={!state.loading}
      />

      {/* Continue Button */}
      <PrimaryButton
        title="Continue"
        loadingTitle="Creating Account..."
        onPress={handleContinue}
        loading={state.loading}
        disabled={!canContinue}
        height={sizes.buttonHeight}
        fontSize={isLandscape ? Math.min(sizes.bodyFontSize, 15) : (isTablet ? 20 : 18)}
        reduceMotion={state.reduceMotion}
        accessibilityLabel={A11Y_LABELS.buttons.continue}
      />

      {/* Back to Login */}
      <View style={styles.backToLoginContainer}>
        <Text
          variant="body"
          color={colors.neutral.textSecondary}
          style={{ fontSize: sizes.linkFontSize }}
        >
          Already have an account?
        </Text>
        <Pressable
          onPress={onBackToLogin}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sign In"
          style={({ pressed }) => [
            styles.signInLinkButton,
            pressed && styles.pressed,
          ]}
        >
          <Text
            variant="button"
            color={colors.orange.primary}
            style={[styles.signInLink, { fontSize: sizes.linkFontSize }]}
          >
            Sign In
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
  },
  errorTitle: {
    color: colors.semantic.error,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  instruction: {
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  backToLoginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  signInLinkButton: {
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInLink: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
