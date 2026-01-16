/**
 * VerifyStep Component
 * Step 2: Enter and verify OTP code
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, AccessibilityInfo } from 'react-native';
import { Text, OTPInput } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { StepIndicator } from './StepIndicator';
import { PrimaryButton } from './PrimaryButton';
import { ForgotPasswordState, ForgotPasswordAction, ResponsiveSizes } from '../types';
import { A11Y_LABELS, VALIDATION } from '../constants';

interface VerifyStepProps {
  state: ForgotPasswordState;
  dispatch: React.Dispatch<ForgotPasswordAction>;
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  maskedContact: string;
  onVerifyOTP: () => Promise<void>;
  onResendOTP: () => Promise<void>;
  onTryDifferentMethod: () => void;
}

export const VerifyStep = memo(function VerifyStep({
  state,
  dispatch,
  sizes,
  isTablet,
  isLandscape,
  maskedContact,
  onVerifyOTP,
  onResendOTP,
  onTryDifferentMethod,
}: VerifyStepProps) {
  const hasAutoSubmitted = useRef(false);

  // Handle OTP change
  const handleOTPChange = useCallback((value: string) => {
    dispatch({ type: 'SET_OTP', payload: value });
  }, [dispatch]);

  // Auto-submit when OTP is complete (with protection against double submission)
  useEffect(() => {
    if (
      state.otp.length === VALIDATION.OTP_LENGTH &&
      !state.loading &&
      !hasAutoSubmitted.current
    ) {
      hasAutoSubmitted.current = true;
      onVerifyOTP();
    }
  }, [state.otp, state.loading, onVerifyOTP]);

  // Reset auto-submit flag when OTP changes
  useEffect(() => {
    if (state.otp.length < VALIDATION.OTP_LENGTH) {
      hasAutoSubmitted.current = false;
    }
  }, [state.otp]);

  // Handle resend
  const handleResend = useCallback(async () => {
    if (state.resendTimer > 0) return;
    await onResendOTP();
  }, [state.resendTimer, onResendOTP]);

  // Announce success message to screen readers
  useEffect(() => {
    if (state.successMessage) {
      AccessibilityInfo.announceForAccessibility(state.successMessage);
    }
  }, [state.successMessage]);

  const canVerify = state.otp.length === VALIDATION.OTP_LENGTH && !state.loading;

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
        Enter the 6-digit code we sent to
      </Text>
      <Text
        variant="body"
        color={colors.neutral.textPrimary}
        style={styles.maskedContact}
      >
        {maskedContact}
      </Text>

      {/* What is OTP help text for seniors */}
      <Text
        variant="caption"
        color={colors.neutral.textSecondary}
        style={styles.helpText}
      >
        Check your {state.method === 'phone' ? 'text messages (SMS)' : 'email inbox'} for the code
      </Text>

      {/* OTP Input - Enhanced with responsive sizing */}
      <View style={styles.otpContainer}>
        <OTPInput
          value={state.otp}
          onChange={handleOTPChange}
          error={!!state.error}
          autoFocus
          disabled={state.loading}
          boxSize={sizes.otpBoxSize}
          fontSize={sizes.otpFontSize}
        />
      </View>

      {/* Success Message */}
      {state.successMessage && (
        <View
          style={styles.successContainer}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text
            variant="caption"
            color={colors.semantic.success}
            style={styles.successText}
          >
            {'✓ '}{state.successMessage}
          </Text>
        </View>
      )}

      {/* Error */}
      {state.error && (
        <View
          style={styles.errorContainer}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
          <Text variant="caption" color={colors.semantic.error}>
            {state.error}
          </Text>
        </View>
      )}

      {/* Resend Section */}
      <View style={styles.resendSection}>
        <Text
          variant="caption"
          color={colors.neutral.textSecondary}
          style={{ fontSize: sizes.captionFontSize }}
        >
          {"Didn't receive the code?"}
        </Text>
        <Pressable
          onPress={handleResend}
          disabled={state.resendTimer > 0}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            state.resendTimer > 0
              ? A11Y_LABELS.timer.resend_wait(state.resendTimer)
              : A11Y_LABELS.timer.resend_available
          }
          accessibilityState={{ disabled: state.resendTimer > 0 }}
          style={({ pressed }) => [
            styles.resendButton,
            pressed && state.resendTimer === 0 && styles.pressed,
          ]}
        >
          <Text
            variant="caption"
            color={state.resendTimer > 0 ? colors.neutral.disabled : colors.teal.primary}
            style={[styles.resendText, { fontSize: sizes.captionFontSize }]}
          >
            {state.resendTimer > 0
              ? `Resend in ${state.resendTimer} ${state.resendTimer === 1 ? 'second' : 'seconds'}`
              : '🔄 Resend Code'}
          </Text>
        </Pressable>
      </View>

      {/* Verify Button */}
      <PrimaryButton
        title="Verify Code"
        loadingTitle="Verifying..."
        onPress={onVerifyOTP}
        loading={state.loading}
        disabled={!canVerify}
        height={sizes.buttonHeight}
        fontSize={isLandscape ? Math.min(sizes.bodyFontSize, 15) : (isTablet ? 20 : 18)}
        reduceMotion={state.reduceMotion}
        accessibilityLabel={A11Y_LABELS.buttons.verify}
        style={styles.verifyButton}
      />

      {/* Try different method */}
      <Pressable
        onPress={onTryDifferentMethod}
        style={styles.differentMethod}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Try a different method"
      >
        <Text
          variant="caption"
          color={colors.teal.primary}
          center
          style={{ fontSize: sizes.linkFontSize }}
        >
          Try a different method
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  instruction: {
    textAlign: 'center',
    marginBottom: spacing.s,
    // Font size and line height set dynamically via sizes prop
  },
  maskedContact: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.s,
  },
  helpText: {
    textAlign: 'center',
    marginBottom: spacing.l,
    fontStyle: 'italic',
    // Font size set dynamically via sizes.captionFontSize
  },
  otpContainer: {
    marginBottom: spacing.l,
    // OTP box size and font size are passed as props to OTPInput
    // Ensures proper scaling across all devices
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  successText: {
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: spacing.m,
    gap: spacing.xs,
  },
  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  errorIconText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  resendSection: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  resendButton: {
    // Ensuring adequate touch target for resend link
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontWeight: '600',
    // Font size set dynamically via captionFontSize
  },
  verifyButton: {
    marginTop: spacing.l,
  },
  differentMethod: {
    marginTop: spacing.l,
    // Ensuring adequate touch target for link
    minHeight: 44,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
