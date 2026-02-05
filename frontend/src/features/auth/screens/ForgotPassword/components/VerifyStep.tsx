/**
 * VerifyStep Component - Premium iOS Edition
 * Step 2: Enter OTP verification code
 * Design matches OTPVerificationScreen from registration flow
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ForgotPasswordState,
  ForgotPasswordAction,
  ResponsiveSizes,
} from '../types';
import { iOS, A11Y_LABELS, VALIDATION } from '../constants';
import { FONT_SCALING } from '@shared/styles/fontScaling';

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

// ============================================================================
// OTP BOX COMPONENT - Matches OTPVerificationScreen
// ============================================================================
interface OTPBoxProps {
  digit: string;
  isFocused: boolean;
  hasError: boolean;
}

const OTPBox: React.FC<OTPBoxProps> = ({ digit, isFocused, hasError }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Pop animation when digit enters
  useEffect(() => {
    if (digit) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [digit, scaleAnim]);

  // Cursor blink animation
  useEffect(() => {
    if (isFocused && !digit) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      cursorOpacity.setValue(1);
    }
  }, [isFocused, digit, cursorOpacity]);

  const boxStyle = [
    styles.otpBox,
    isFocused && styles.otpBoxFocused,
    digit && !hasError && styles.otpBoxFilled,
    hasError && digit && styles.otpBoxError,
  ];

  return (
    <Animated.View style={[boxStyle, { transform: [{ scale: scaleAnim }] }]}>
      {digit ? (
        <Text style={[styles.otpDigit, hasError && styles.otpDigitError]} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
          {digit}
        </Text>
      ) : isFocused ? (
        <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
      ) : null}
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
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
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [info, setInfo] = useState('');

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  // Shake animation on error
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Handle OTP input change
  const handleOTPChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, VALIDATION.OTP_LENGTH);

    // Clear error when typing
    if (state.error) {
      dispatch({ type: 'CLEAR_ERROR' });
    }
    if (info) setInfo('');

    dispatch({ type: 'SET_OTP', payload: digits });
    setFocusedIndex(Math.min(digits.length, VALIDATION.OTP_LENGTH - 1));

    // Haptic feedback
    if (digits.length > state.otp.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [state.otp, state.error, info, dispatch]);

  // Handle verify
  const handleVerify = useCallback(async () => {
    if (state.otp.length !== VALIDATION.OTP_LENGTH) {
      dispatch({ type: 'SET_ERROR', payload: 'Enter all 6 digits' });
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      await onVerifyOTP();
    } catch {
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      inputRef.current?.focus();
    }
  }, [state.otp, dispatch, onVerifyOTP, triggerShake]);

  // Handle resend
  const handleResend = useCallback(async () => {
    if (state.resendTimer > 0 || state.loading) return;

    setInfo('Sending code...');
    try {
      await onResendOTP();
      setInfo('Code sent successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setInfo('');
    }
  }, [state.resendTimer, state.loading, onResendOTP]);

  const handleInputPress = () => {
    inputRef.current?.focus();
  };

  // Check if can verify
  const canVerify = state.otp.length === VALIDATION.OTP_LENGTH && !state.loading;

  return (
    <View>
      {/* Edit Contact Link */}
      <Pressable onPress={onTryDifferentMethod} style={styles.editLink}>
        <Feather name="edit-2" size={14} color={iOS.colors.teal} />
        <Text style={styles.editLinkText} maxFontSizeMultiplier={FONT_SCALING.BODY}>
          Change {state.method === 'email' ? 'email' : 'number'}
        </Text>
      </Pressable>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <View style={styles.iconCircle}>
            <Feather
              name={state.method === 'email' ? 'mail' : 'message-square'}
              size={24}
              color={iOS.colors.orange}
            />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Verification Code</Text>
            <Text style={styles.infoSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Sent to {maskedContact}</Text>
          </View>
        </View>
      </View>

      {/* OTP Input */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <Pressable onPress={handleInputPress} style={styles.otpContainer}>
          <View style={styles.otpRow}>
            {Array.from({ length: VALIDATION.OTP_LENGTH }).map((_, index) => (
              <OTPBox
                key={index}
                digit={state.otp[index] || ''}
                isFocused={index === focusedIndex && !state.otp[index]}
                hasError={!!state.error && !!state.otp[index]}
              />
            ))}
          </View>

          {/* Hidden Input */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={state.otp}
            onChangeText={handleOTPChange}
            keyboardType="number-pad"
            maxLength={VALIDATION.OTP_LENGTH}
            autoFocus
            caretHidden
            contextMenuHidden
            editable={!state.loading}
          />
        </Pressable>
      </Animated.View>

      {/* Feedback */}
      <View style={styles.feedbackContainer}>
        {state.error ? (
          <View style={styles.errorBadge}>
            <Feather name="alert-circle" size={16} color={iOS.colors.error} />
            <Text style={styles.errorText} maxFontSizeMultiplier={FONT_SCALING.BODY}>{state.error}</Text>
          </View>
        ) : info ? (
          <View style={styles.infoBadge}>
            <Feather name="check-circle" size={16} color={iOS.colors.success} />
            <Text style={styles.infoText} maxFontSizeMultiplier={FONT_SCALING.BODY}>{info}</Text>
          </View>
        ) : (
          <Text style={styles.hintText} maxFontSizeMultiplier={FONT_SCALING.BODY}>Enter the 6-digit code</Text>
        )}
      </View>

      {/* Verify Button */}
      <Pressable
        onPress={handleVerify}
        disabled={!canVerify}
        style={({ pressed }) => [
          styles.verifyButton,
          canVerify && styles.verifyButtonEnabled,
          pressed && canVerify && styles.verifyButtonPressed,
        ]}
        accessibilityLabel={A11Y_LABELS.buttons.verify}
      >
        {state.loading ? (
          <ActivityIndicator color={iOS.colors.white} size="small" />
        ) : (
          <Text style={[
            styles.verifyButtonText,
            canVerify && styles.verifyButtonTextEnabled,
          ]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
            Verify
          </Text>
        )}
      </Pressable>

      {/* Resend Section */}
      <View style={styles.resendSection}>
        <Text style={styles.resendLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>Didn't receive the code?</Text>
        <Pressable
          onPress={handleResend}
          disabled={state.resendTimer > 0 || state.loading}
          style={styles.resendButton}
          accessibilityLabel={A11Y_LABELS.buttons.resend}
        >
          <Text style={[
            styles.resendButtonText,
            (state.resendTimer > 0 || state.loading) && styles.resendButtonTextDisabled,
          ]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
            {state.resendTimer > 0
              ? `Resend in ${state.resendTimer}s`
              : state.loading
              ? 'Sending...'
              : 'Resend Code'}
          </Text>
        </Pressable>
      </View>

      {/* Trust Badge */}
      <View style={styles.trustBadge}>
        <Feather name="lock" size={14} color={iOS.colors.tertiaryLabel} />
        <Text style={styles.trustText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>End-to-end encrypted</Text>
      </View>
    </View>
  );
});

// ============================================================================
// STYLES - Matches OTPVerificationScreen
// ============================================================================
const styles = StyleSheet.create({
  // Edit link
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: iOS.spacing.sm,
    marginBottom: iOS.spacing.md,
  },
  editLinkText: {
    ...iOS.typography.subhead,
    color: iOS.colors.teal,
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: iOS.colors.orangeLight,
    borderRadius: iOS.radius.lg,
    padding: iOS.spacing.md,
    marginBottom: iOS.spacing.lg,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: iOS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.md,
    ...iOS.shadow.small,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    marginBottom: 2,
  },
  infoSubtitle: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },

  // OTP Input - Matches OTPVerificationScreen exactly
  otpContainer: {
    position: 'relative',
    marginBottom: iOS.spacing.lg,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: iOS.radius.md,
    borderWidth: 2,
    borderColor: iOS.colors.separator,
    backgroundColor: iOS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFocused: {
    borderColor: iOS.colors.orange,
    backgroundColor: iOS.colors.white,
  },
  otpBoxFilled: {
    borderColor: iOS.colors.orange,
    backgroundColor: iOS.colors.orangeLight,
  },
  otpBoxError: {
    borderColor: iOS.colors.error,
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
  },
  otpDigit: {
    ...iOS.typography.title1,
    color: iOS.colors.label,
  },
  otpDigitError: {
    color: iOS.colors.error,
  },
  cursor: {
    width: 2,
    height: 28,
    backgroundColor: iOS.colors.orange,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },

  // Feedback - Matches OTPVerificationScreen
  feedbackContainer: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.lg,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: iOS.radius.pill,
  },
  errorText: {
    ...iOS.typography.subhead,
    color: iOS.colors.error,
    fontWeight: '500',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: iOS.radius.pill,
  },
  infoText: {
    ...iOS.typography.subhead,
    color: iOS.colors.success,
    fontWeight: '500',
  },
  hintText: {
    ...iOS.typography.subhead,
    color: iOS.colors.tertiaryLabel,
  },

  // Verify Button - Orange primary action
  verifyButton: {
    height: 56,
    borderRadius: iOS.radius.pill,
    backgroundColor: iOS.colors.systemFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.lg,
  },
  verifyButtonEnabled: {
    backgroundColor: iOS.colors.orange,
    shadowColor: iOS.colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  verifyButtonPressed: {
    backgroundColor: iOS.colors.orangeDark,
    transform: [{ scale: 0.98 }],
  },
  verifyButtonText: {
    ...iOS.typography.headline,
    color: iOS.colors.tertiaryLabel,
  },
  verifyButtonTextEnabled: {
    color: iOS.colors.white,
  },

  // Resend - Teal link color
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: iOS.spacing.lg,
  },
  resendLabel: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },
  resendButton: {
    paddingVertical: iOS.spacing.sm,
    paddingHorizontal: iOS.spacing.sm,
  },
  resendButtonText: {
    ...iOS.typography.subhead,
    color: iOS.colors.teal,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: iOS.colors.tertiaryLabel,
  },

  // Trust badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
  },
});
