/**
 * TANDER OTP Verification Screen - Super Premium iOS Design
 *
 * Design Principles:
 * - Clean, minimal iOS aesthetic
 * - Large, bold SF-style typography
 * - Generous white space
 * - Subtle depth with refined shadows
 * - Smooth micro-interactions
 * - WCAG AA accessible
 * - Senior-friendly (56px+ touch targets, 18px+ fonts)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Easing,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';
import { twilioApi } from '@services/api/twilioApi';
import { register as registerUser } from '@services/api/authApi';
import { storage, STORAGE_KEYS } from '@services/storage/asyncStorage';
import { FONT_SCALING } from '@shared/styles/fontScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// PREMIUM iOS DESIGN SYSTEM
// ============================================================================
const iOS = {
  colors: {
    // Backgrounds
    background: '#F2F2F7',
    card: '#FFFFFF',

    // Text
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#8E8E93',
    placeholder: '#C7C7CC',

    // System colors
    teal: '#30D5C8',
    tealDark: '#20B2AA',
    tealLight: 'rgba(48, 213, 200, 0.1)',
    orange: '#F97316',
    orangeDark: '#EA580C',
    orangeLight: 'rgba(249, 115, 22, 0.1)',
    red: '#FF3B30',
    green: '#34C759',

    // Separators & borders
    separator: 'rgba(60, 60, 67, 0.12)',
    opaqueSeparator: '#C6C6C8',

    // Fills
    systemFill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(118, 118, 128, 0.12)',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 100,
  },

  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.4 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.4 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.4 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.3 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.2 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.1 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
  },
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================
const RESEND_COOLDOWN = 60;
const OTP_COOLDOWN_KEY = '@tander:otp_cooldown_expiry';
const OTP_LENGTH = 6;

// ============================================================================
// TYPES
// ============================================================================
type OTPScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

interface Props {
  navigation: OTPScreenNavProp;
  route: OTPScreenRouteProp;
}

// ============================================================================
// PREMIUM OTP INPUT COMPONENT
// ============================================================================
interface OTPBoxProps {
  digit: string;
  isFocused: boolean;
  hasError: boolean;
  index: number;
  total: number;
}

const OTPBox: React.FC<OTPBoxProps> = ({ digit, isFocused, hasError, index, total }) => {
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
  }, [digit]);

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
  }, [isFocused, digit]);

  const boxStyle = [
    styles.otpBox,
    isFocused && styles.otpBoxFocused,
    digit && !hasError && styles.otpBoxFilled,
    hasError && digit && styles.otpBoxError,
  ];

  return (
    <Animated.View style={[boxStyle, { transform: [{ scale: scaleAnim }] }]}>
      {digit ? (
        <Text style={[
          styles.otpDigit,
          hasError && styles.otpDigitError,
        ]}>
          {digit}
        </Text>
      ) : isFocused ? (
        <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
      ) : null}
    </Animated.View>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const maskPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  const last4 = digits.slice(-4);
  return `+63 ••• ••• ${last4}`;
};

const maskEmail = (email: string): string => {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  const maskedLocal = localPart.length > 2
    ? localPart[0] + '•••' + localPart[localPart.length - 1]
    : localPart[0] + '•••';
  return `${maskedLocal}@${domain}`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const OTPVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  // Route params
  const { username, phoneNumber, email, pendingRegistration: pendingRegStr } = route.params || {};
  const pendingRegistration = pendingRegStr ? JSON.parse(pendingRegStr) : null;

  const isEmailVerification = !phoneNumber && !!email;
  const verificationTarget = isEmailVerification ? email : phoneNumber;
  const maskedContact = isEmailVerification ? maskEmail(email || '') : maskPhone(phoneNumber || '');

  // State
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const didAutoSend = useRef(false);
  const didCheckCooldown = useRef(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sizing
  const cardMaxWidth = isTablet ? 420 : SCREEN_WIDTH - 48;
  const boxSize = Math.min(52, (cardMaxWidth - 60) / 6);

  // Check reduce motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  // Entrance animation
  useEffect(() => {
    if (reduceMotion) {
      fadeIn.setValue(1);
      slideUp.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [reduceMotion]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-send OTP
  useEffect(() => {
    if (didCheckCooldown.current || !verificationTarget) return;
    didCheckCooldown.current = true;

    const checkCooldown = async () => {
      try {
        const storedExpiry = await storage.getItem(OTP_COOLDOWN_KEY);
        if (storedExpiry) {
          const remaining = Math.ceil((parseInt(storedExpiry, 10) - Date.now()) / 1000);
          if (remaining > 0) {
            setResendCooldown(remaining);
            setInfo('Code sent to your device');
            didAutoSend.current = true;
            return;
          }
          await storage.removeItem(OTP_COOLDOWN_KEY);
        }
        if (!didAutoSend.current) {
          didAutoSend.current = true;
          sendOtp(true);
        }
      } catch {
        if (!didAutoSend.current) {
          didAutoSend.current = true;
          sendOtp(true);
        }
      }
    };
    checkCooldown();
  }, [verificationTarget]);

  // Shake animation on error
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Send OTP
  const sendOtp = useCallback(async (silent = false) => {
    if (!verificationTarget) {
      setError('Contact info missing');
      return;
    }

    setError('');
    if (!silent) setInfo('Sending code...');
    setSending(true);

    try {
      if (isEmailVerification) {
        await twilioApi.sendOtpEmail(email!);
      } else {
        await twilioApi.sendOtp(phoneNumber!, 'sms');
      }

      const expiryTime = Date.now() + RESEND_COOLDOWN * 1000;
      await storage.setItem(OTP_COOLDOWN_KEY, expiryTime.toString());

      setResendCooldown(RESEND_COOLDOWN);
      setSending(false);
      setInfo('Code sent successfully');

      if (!silent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      setSending(false);
      if (silent) {
        setInfo('');
      } else {
        setError(err?.message || 'Failed to send code');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [verificationTarget, isEmailVerification, email, phoneNumber]);

  // Handle OTP input
  const handleOtpChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (error) setError('');
    if (info) setInfo('');
    setOtp(digits);
    setFocusedIndex(Math.min(digits.length, OTP_LENGTH - 1));

    if (digits.length > otp.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [otp, error, info]);

  // Verify OTP
  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || !verificationTarget) {
      setError('Enter all 6 digits');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError('');
    setInfo('');
    setVerifying(true);

    try {
      const result = isEmailVerification
        ? await twilioApi.verifyOtpEmail(email!, otp)
        : await twilioApi.verifyOtp(phoneNumber!, otp);

      if (!result.valid) {
        setVerifying(false);
        setOtp('');
        setFocusedIndex(0);
        setError(result.message || 'Invalid code');
        triggerShake();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        inputRef.current?.focus();
        return;
      }

      await storage.removeItem(OTP_COOLDOWN_KEY);

      if (pendingRegistration) {
        setInfo('Creating account...');
        await registerUser({
          username: pendingRegistration.username,
          password: pendingRegistration.password,
          ...(pendingRegistration.phoneNumber ? { phoneNumber: pendingRegistration.phoneNumber } : {}),
          ...(pendingRegistration.email ? { email: pendingRegistration.email } : {}),
        });
        await storage.setItem(STORAGE_KEYS.CURRENT_USERNAME, pendingRegistration.username);
        await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'otp_verified');
      } else {
        await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'otp_verified');
      }

      setVerifying(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        if (!isNavigating) {
          setIsNavigating(true);
          navigation.navigate('ProfileSetup', { username: pendingRegistration?.username || username || '' });
        }
      }, 300);
    } catch (err: any) {
      setVerifying(false);
      setOtp('');
      setFocusedIndex(0);
      setError(err?.message || 'Verification failed');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      inputRef.current?.focus();
    }
  }, [otp, verificationTarget, isEmailVerification, email, phoneNumber, pendingRegistration, username, navigation, isNavigating]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleResend = useCallback(() => {
    if (resendCooldown > 0 || sending || verifying) return;
    sendOtp(false);
  }, [resendCooldown, sending, verifying, sendOtp]);

  const handleInputPress = () => {
    inputRef.current?.focus();
  };

  const canVerify = otp.length === OTP_LENGTH && !verifying;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <Animated.View style={[styles.backRow, { opacity: fadeIn }]}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <View style={styles.iconCircle}>
            <Feather
              name={isEmailVerification ? 'mail' : 'message-square'}
              size={32}
              color={iOS.colors.orange}
            />
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
            {isEmailVerification ? 'Verify Your Email' : 'Verify Your Number'}
          </Text>

          <Text style={styles.subtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
            We sent a 6-digit code to
          </Text>

          <Text style={styles.contactText} maxFontSizeMultiplier={FONT_SCALING.BODY}>
            {maskedContact}
          </Text>
        </Animated.View>

        {/* Main Card */}
        <Animated.View
          style={[
            styles.card,
            { maxWidth: cardMaxWidth, opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Edit Contact Link */}
          <Pressable onPress={handleBack} style={styles.editLink}>
            <Feather name="edit-2" size={14} color={iOS.colors.teal} />
            <Text style={styles.editLinkText}>
              Change {isEmailVerification ? 'email' : 'number'}
            </Text>
          </Pressable>

          {/* OTP Input */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <Pressable onPress={handleInputPress} style={styles.otpContainer}>
              <View style={styles.otpRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                  <OTPBox
                    key={index}
                    digit={otp[index] || ''}
                    isFocused={index === focusedIndex && !otp[index]}
                    hasError={!!error && !!otp[index]}
                    index={index}
                    total={OTP_LENGTH}
                  />
                ))}
              </View>

              {/* Hidden Input */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                autoFocus
                caretHidden
                contextMenuHidden
                maxFontSizeMultiplier={FONT_SCALING.INPUT}
              />
            </Pressable>
          </Animated.View>

          {/* Feedback */}
          <View style={styles.feedbackContainer}>
            {error ? (
              <View style={styles.errorBadge}>
                <Feather name="alert-circle" size={16} color={iOS.colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : info ? (
              <View style={styles.infoBadge}>
                <Feather name="check-circle" size={16} color={iOS.colors.green} />
                <Text style={styles.infoText}>{info}</Text>
              </View>
            ) : (
              <Text style={styles.hintText}>Enter the 6-digit code</Text>
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
          >
            {verifying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[
                styles.verifyButtonText,
                canVerify && styles.verifyButtonTextEnabled,
              ]}>
                Verify
              </Text>
            )}
          </Pressable>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0 || sending}
              style={styles.resendButton}
            >
              <Text style={[
                styles.resendButtonText,
                (resendCooldown > 0 || sending) && styles.resendButtonTextDisabled,
              ]}>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : sending
                  ? 'Sending...'
                  : 'Resend Code'}
              </Text>
            </Pressable>
          </View>

          {/* Trust Badge */}
          <View style={styles.trustBadge}>
            <Feather name="lock" size={14} color={iOS.colors.tertiaryLabel} />
            <Text style={styles.trustText}>End-to-end encrypted</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Back button
  backRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: iOS.spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: iOS.spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    ...iOS.typography.title1,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: iOS.spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    ...iOS.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  contactText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: iOS.spacing.xs,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xxl,
    padding: iOS.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },

  // Edit link
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: iOS.spacing.sm,
    marginBottom: iOS.spacing.lg,
  },
  editLinkText: {
    ...iOS.typography.subhead,
    color: iOS.colors.teal,
    fontWeight: '600',
  },

  // OTP Input
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
    backgroundColor: iOS.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFocused: {
    borderColor: iOS.colors.orange,
    backgroundColor: iOS.colors.card,
  },
  otpBoxFilled: {
    borderColor: iOS.colors.orange,
    backgroundColor: iOS.colors.orangeLight,
  },
  otpBoxError: {
    borderColor: iOS.colors.red,
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
  },
  otpDigit: {
    ...iOS.typography.title1,
    color: iOS.colors.label,
  },
  otpDigitError: {
    color: iOS.colors.red,
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

  // Feedback
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
    color: iOS.colors.red,
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
    color: iOS.colors.green,
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
    color: '#FFFFFF',
  },

  // Resend
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

export default OTPVerificationScreen;
