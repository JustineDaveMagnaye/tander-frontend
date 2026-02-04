/**
 * MethodStep Component - Premium iOS Edition
 * Step 1: Select reset method (Phone OTP / Email)
 */

import React, { memo, useCallback, useRef } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  ForgotPasswordState,
  ForgotPasswordAction,
  ResponsiveSizes,
} from '../types';
import { iOS, A11Y_LABELS, VALIDATION } from '../constants';
import { FONT_SCALING } from '@shared/styles/fontScaling';

interface MethodStepProps {
  state: ForgotPasswordState;
  dispatch: React.Dispatch<ForgotPasswordAction>;
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  onSendOTP: () => Promise<void>;
  onBackToLogin: () => void;
}

// Format phone number: 912 345 6789
const formatPhone = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

export const MethodStep = memo(function MethodStep({
  state,
  dispatch,
  sizes,
  isTablet,
  isLandscape,
  onSendOTP,
  onBackToLogin,
}: MethodStepProps) {
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  // Handlers
  const handleMethodChange = useCallback((method: 'phone' | 'email') => {
    dispatch({ type: 'SET_METHOD', payload: method });
    dispatch({ type: 'CLEAR_ERROR' });
    // Focus the input after method change
    setTimeout(() => {
      if (method === 'phone') {
        phoneRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    }, 100);
  }, [dispatch]);

  const handlePhoneChange = useCallback((text: string) => {
    dispatch({ type: 'SET_PHONE', payload: formatPhone(text) });
  }, [dispatch]);

  const handleEmailChange = useCallback((text: string) => {
    dispatch({ type: 'SET_EMAIL', payload: text });
  }, [dispatch]);

  // Check if can proceed
  const canProceed = state.method === 'phone'
    ? state.phone.replace(/\D/g, '').length === 10
    : state.email.includes('@') && state.email.includes('.');

  return (
    <View>
      {/* Error Card */}
      {state.error && (
        <View style={styles.errorCard}>
          <Feather name="alert-circle" size={20} color={iOS.colors.error} />
          <Text style={styles.errorText} maxFontSizeMultiplier={FONT_SCALING.BODY}>{state.error}</Text>
        </View>
      )}

      {/* Method Selector Card */}
      <View style={styles.inputCard}>
        <View style={styles.inputCardHeader}>
          <View style={[styles.inputIconCircle, styles.inputIconCircleActive]}>
            <Feather name="unlock" size={20} color={iOS.colors.orange} />
          </View>
          <View style={styles.inputLabelContainer}>
            <Text style={styles.inputLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>Reset Method</Text>
            <Text style={styles.inputHint} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Choose how to verify your identity</Text>
          </View>
        </View>
        <View style={styles.methodToggle}>
          <Pressable
            style={[styles.methodOption, state.method === 'phone' && styles.methodOptionActive]}
            onPress={() => handleMethodChange('phone')}
            disabled={state.loading}
            accessibilityLabel={A11Y_LABELS.tabs.phone}
            accessibilityState={{ selected: state.method === 'phone' }}
          >
            <Feather
              name="smartphone"
              size={20}
              color={state.method === 'phone' ? iOS.colors.white : iOS.colors.tertiaryLabel}
            />
            <Text style={[styles.methodText, state.method === 'phone' && styles.methodTextActive]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
              Phone
            </Text>
          </Pressable>
          <Pressable
            style={[styles.methodOption, state.method === 'email' && styles.methodOptionActive]}
            onPress={() => handleMethodChange('email')}
            disabled={state.loading}
            accessibilityLabel={A11Y_LABELS.tabs.email}
            accessibilityState={{ selected: state.method === 'email' }}
          >
            <Feather
              name="mail"
              size={20}
              color={state.method === 'email' ? iOS.colors.white : iOS.colors.tertiaryLabel}
            />
            <Text style={[styles.methodText, state.method === 'email' && styles.methodTextActive]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
              Email
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Phone or Email Input Card */}
      {state.method === 'phone' ? (
        <View style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <View style={[styles.inputIconCircle, state.phone.length > 0 && styles.inputIconCircleActive]}>
              <Feather
                name="phone"
                size={20}
                color={state.phone.length > 0 ? iOS.colors.orange : iOS.colors.tertiaryLabel}
              />
            </View>
            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>Mobile Number</Text>
              <Text style={styles.inputHint} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>We'll send a verification code</Text>
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.phonePrefix} maxFontSizeMultiplier={FONT_SCALING.BODY}>+63</Text>
            <TextInput
              ref={phoneRef}
              style={[styles.textInput, styles.phoneInput]}
              value={state.phone}
              onChangeText={handlePhoneChange}
              placeholder="912 345 6789"
              placeholderTextColor={iOS.colors.quaternaryLabel}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={onSendOTP}
              editable={!state.loading}
              maxLength={12}
              accessibilityLabel={A11Y_LABELS.inputs.phone}
              accessibilityHint={A11Y_LABELS.inputs.phone_hint}
            />
          </View>
        </View>
      ) : (
        <View style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <View style={[styles.inputIconCircle, state.email.length > 0 && styles.inputIconCircleActive]}>
              <Feather
                name="mail"
                size={20}
                color={state.email.length > 0 ? iOS.colors.orange : iOS.colors.tertiaryLabel}
              />
            </View>
            <View style={styles.inputLabelContainer}>
              <Text style={styles.inputLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>Email Address</Text>
              <Text style={styles.inputHint} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>We'll send a verification link</Text>
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={emailRef}
              style={styles.textInput}
              value={state.email}
              onChangeText={handleEmailChange}
              placeholder="you@example.com"
              placeholderTextColor={iOS.colors.quaternaryLabel}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onSendOTP}
              editable={!state.loading}
              maxLength={VALIDATION.MAX_INPUT_LENGTH.email}
              accessibilityLabel={A11Y_LABELS.inputs.email}
              accessibilityHint={A11Y_LABELS.inputs.email_hint}
            />
          </View>
        </View>
      )}

      {/* Send Code Button */}
      <Pressable
        style={({ pressed }) => [
          styles.continueButton,
          !canProceed && styles.continueButtonDisabled,
          pressed && canProceed && !state.loading && styles.continueButtonPressed,
        ]}
        onPress={onSendOTP}
        disabled={!canProceed || state.loading}
        accessibilityLabel={A11Y_LABELS.buttons.send_code}
      >
        {state.loading ? (
          <ActivityIndicator color={iOS.colors.white} />
        ) : (
          <>
            <Text style={[styles.continueText, !canProceed && styles.continueTextDisabled]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
              Send Code
            </Text>
            <Feather
              name="arrow-right"
              size={22}
              color={canProceed ? iOS.colors.white : iOS.colors.quaternaryLabel}
            />
          </>
        )}
      </Pressable>

      {/* Back to Login */}
      <View style={styles.signInRow}>
        <Text style={styles.signInText} maxFontSizeMultiplier={FONT_SCALING.BODY}>Remember your password?</Text>
        <Pressable onPress={onBackToLogin} style={styles.signInButton}>
          <Text style={styles.signInLink} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Sign In</Text>
        </Pressable>
      </View>
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

  // Method Toggle - Orange for active
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: iOS.colors.tertiaryFill,
    borderRadius: iOS.radius.md,
    padding: iOS.spacing.xs,
    gap: iOS.spacing.xs,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.sm + 4,
    borderRadius: iOS.radius.sm,
    gap: iOS.spacing.sm,
  },
  methodOptionActive: {
    backgroundColor: iOS.colors.orange,
    ...iOS.shadow.small,
  },
  methodText: {
    ...iOS.typography.subhead,
    fontWeight: '600',
    color: iOS.colors.tertiaryLabel,
  },
  methodTextActive: {
    color: iOS.colors.white,
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
  phonePrefix: {
    ...iOS.typography.body,
    fontWeight: '600',
    color: iOS.colors.secondaryLabel,
    marginRight: iOS.spacing.sm,
  },
  phoneInput: {
    flex: 1,
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

  // Sign In Row
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: iOS.spacing.xl,
    gap: iOS.spacing.xs,
  },
  signInText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },
  signInButton: {
    paddingVertical: iOS.spacing.sm,
    paddingHorizontal: iOS.spacing.xs,
  },
  signInLink: {
    ...iOS.typography.subhead,
    fontWeight: '600',
    color: iOS.colors.teal,
  },
});
