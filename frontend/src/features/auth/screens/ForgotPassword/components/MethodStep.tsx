/**
 * MethodStep Component
 * Step 1: Select reset method (Phone or Email) and enter contact
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
import { ForgotPasswordState, ForgotPasswordAction, ResponsiveSizes } from '../types';
import { A11Y_LABELS, VALIDATION } from '../constants';

interface MethodStepProps {
  state: ForgotPasswordState;
  dispatch: React.Dispatch<ForgotPasswordAction>;
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  onSendOTP: () => Promise<void>;
  onBackToLogin: () => void;
}

export const MethodStep = memo(function MethodStep({
  state,
  dispatch,
  sizes,
  isTablet,
  isLandscape,
  onSendOTP,
  onBackToLogin,
}: MethodStepProps) {
  const inputRef = useRef<TextInput>(null);

  const handleMethodChange = useCallback((method: 'phone' | 'email') => {
    dispatch({ type: 'SET_METHOD', payload: method });
  }, [dispatch]);

  const handlePhoneChange = useCallback((text: string) => {
    dispatch({ type: 'SET_PHONE', payload: text });
  }, [dispatch]);

  const handleEmailChange = useCallback((text: string) => {
    dispatch({ type: 'SET_EMAIL', payload: text });
  }, [dispatch]);

  const handleSendOTP = useCallback(async () => {
    await onSendOTP();
  }, [onSendOTP]);

  const tabFontSize = isLandscape ? Math.min(sizes.captionFontSize, 13) : (isTablet ? 16 : 14);

  // Memoize prefix to prevent unnecessary re-renders
  const phonePrefix = useMemo(() => (
    <CountryCodePrefix fontSize={sizes.inputFontSize} />
  ), [sizes.inputFontSize]);

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
            // G2-R-001: Responsive line height (1.5x font size)
            lineHeight: Math.round(sizes.bodyFontSize * 1.5),
          },
        ]}
      >
        How would you like to receive your reset code?
      </Text>

      {/* Method Selector */}
      <MethodSelector
        selectedMethod={state.method}
        onMethodChange={handleMethodChange}
        height={sizes.tabSelectorHeight}
        fontSize={tabFontSize}
        reduceMotion={state.reduceMotion}
        disabled={state.loading}
      />

      {/* Recommended Badge for Phone */}
      {state.method === 'phone' && (
        <View style={styles.recommendedBadge}>
          <Text
            variant="caption"
            color={colors.semantic.success}
            style={[styles.recommendedText, { fontSize: sizes.captionFontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {'✓ Recommended - Fast & secure'}
          </Text>
        </View>
      )}

      {/* Phone Input */}
      {state.method === 'phone' && (
        <InputField
          ref={inputRef}
          label="Mobile Number"
          value={state.phone}
          onChangeText={handlePhoneChange}
          error={state.error}
          hint="We'll send a 6-digit code via SMS"
          height={sizes.inputHeight}
          fontSize={sizes.inputFontSize}
          labelFontSize={sizes.labelFontSize}
          captionFontSize={sizes.captionFontSize}
          prefix={phonePrefix}
          placeholder="912 345 6789"
          keyboardType="phone-pad"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleSendOTP}
          maxLength={VALIDATION.MAX_INPUT_LENGTH.phone}
          accessibilityLabel={A11Y_LABELS.inputs.phone}
          accessibilityHint={A11Y_LABELS.inputs.phone_hint}
          editable={!state.loading}
        />
      )}

      {/* Email Input */}
      {state.method === 'email' && (
        <InputField
          ref={inputRef}
          label="Email Address"
          value={state.email}
          onChangeText={handleEmailChange}
          error={state.error}
          hint="We'll send a 6-digit code to your email"
          height={sizes.inputHeight}
          fontSize={sizes.inputFontSize}
          labelFontSize={sizes.labelFontSize}
          captionFontSize={sizes.captionFontSize}
          placeholder="juan@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={handleSendOTP}
          maxLength={VALIDATION.MAX_INPUT_LENGTH.email}
          accessibilityLabel={A11Y_LABELS.inputs.email}
          accessibilityHint={A11Y_LABELS.inputs.email_hint}
          editable={!state.loading}
        />
      )}

      {/* Send Code Button */}
      <PrimaryButton
        title="Send Code"
        loadingTitle="Sending..."
        onPress={handleSendOTP}
        loading={state.loading}
        height={sizes.buttonHeight}
        fontSize={isLandscape ? Math.min(sizes.bodyFontSize, 15) : (isTablet ? 20 : 18)}
        reduceMotion={state.reduceMotion}
        accessibilityLabel={A11Y_LABELS.buttons.send_code}
      />

      {/* Back to Login */}
      <View style={styles.backToLoginContainer}>
        <Text
          variant="body"
          color={colors.neutral.textSecondary}
          style={{ fontSize: sizes.linkFontSize }}
        >
          Remember your password?
        </Text>
        <Pressable
          onPress={onBackToLogin}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Back to Sign In"
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
  instruction: {
    textAlign: 'center',
    // lineHeight is set dynamically based on font size (1.5x)
    marginBottom: spacing.l,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.small,
    alignSelf: 'center',
    marginBottom: spacing.l,
    // Minimum touch target area for dismissible elements
    minHeight: 44,
    justifyContent: 'center',
  },
  recommendedText: {
    fontWeight: '600',
    // Font size is set dynamically via captionFontSize prop
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
    // Ensuring adequate touch target for the link
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInLink: {
    fontWeight: '700',
    // Font size is set dynamically via linkFontSize prop
  },
  pressed: {
    opacity: 0.7,
  },
});
