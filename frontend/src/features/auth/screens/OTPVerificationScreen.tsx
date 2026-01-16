/**
 * TANDER OTP Verification Screen - Premium Edition
 * Phone Number Verification with Premium UI/UX
 *
 * Design Philosophy:
 * - Matches WelcomeScreen's premium aesthetic with gradient backgrounds
 * - Large, senior-friendly touch targets (56-64px minimum)
 * - Premium glassmorphism card styling
 * - Smooth entrance animations
 * - Floating hearts decoration
 * - Decorative background circles
 * - WCAG AA compliant contrast ratios
 * - 100% responsive across all devices
 *
 * Features:
 * - Auto-send OTP on mount
 * - Resend with countdown timer
 * - Success animation on verification
 * - Account creation after OTP verification
 * - Registration state persistence
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { OTPInput } from '@shared/components/ui/OTPInput';
import { colors } from '@shared/styles/colors';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';
import { twilioApi } from '@services/api/twilioApi';
import { register as registerUser } from '@services/api/authApi';
import { storage, STORAGE_KEYS } from '@services/storage/asyncStorage';

// ============================================================================
// PREMIUM COLOR PALETTE - Matching WelcomeScreen exactly
// ============================================================================
const PREMIUM_COLORS = {
  // Gradient backgrounds - warm, romantic feel
  gradientTop: '#FF8A65', // Warm coral-orange
  gradientMiddle: '#FF7043', // Deeper coral
  gradientBottom: '#26A69A', // Trust-inspiring teal

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.98)',
  glassTint: 'rgba(255, 255, 255, 0.12)',
  glassStroke: 'rgba(255, 255, 255, 0.35)',

  // Text on gradient
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.75)',

  // Card backgrounds
  cardBackground: 'rgba(255, 255, 255, 0.96)',
  cardShadow: 'rgba(0, 0, 0, 0.12)',

  // Decorative
  heartPink: '#FF6B8A',
  warmGlow: 'rgba(255, 183, 77, 0.25)',
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================
const RESEND_COOLDOWN = 60; // seconds
const ANIMATION_TIMING = {
  entrance: 800,
  textFade: 600,
  cardSlide: 500,
  success: 1200,
  heartFloat: 3500,
} as const;

// ============================================================================
// TYPES
// ============================================================================
type OTPScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

interface Props {
  navigation: OTPScreenNavProp;
  route: OTPScreenRouteProp;
}

interface ResponsiveSizes {
  logoSize: number;
  titleSize: number;
  subtitleSize: number;
  bodySize: number;
  buttonHeight: number;
  buttonTextSize: number;
  cardPadding: number;
  cardBorderRadius: number;
  screenPadding: number;
  iconSize: number;
  heartSizes: [number, number, number];
  decorCircleSizes: {
    large: number;
    medium: number;
    small: number;
  };
}

// ============================================================================
// RESPONSIVE SIZE CALCULATOR
// ============================================================================
const calculateResponsiveSizes = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  hp: (p: number) => number,
  wp: (p: number) => number,
  moderateScale: (size: number, factor?: number) => number
): ResponsiveSizes => {
  const isSmallPhone = width < BREAKPOINTS.xs + 56;
  const isMediumPhone = width >= BREAKPOINTS.xs + 56 && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;
  const isSmallTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;

  // Logo/Icon sizing
  let logoSize: number;
  if (isLandscape) {
    logoSize = Math.min(hp(18), wp(10), 90);
  } else if (isTablet) {
    logoSize = moderateScale(110, 0.3);
  } else if (isLargePhone) {
    logoSize = moderateScale(90, 0.4);
  } else {
    logoSize = moderateScale(80, 0.4);
  }

  // Typography - senior-friendly minimum 16px body
  let titleSize: number;
  let subtitleSize: number;
  let bodySize: number;

  if (isLandscape) {
    titleSize = Math.min(hp(9), wp(5.5), 38);
    subtitleSize = Math.min(hp(4), wp(3), 20);
    bodySize = Math.min(hp(3.5), wp(2.8), 18);
  } else if (isTablet) {
    titleSize = 48;
    subtitleSize = 24;
    bodySize = 20;
  } else if (isLargePhone) {
    titleSize = 40;
    subtitleSize = 22;
    bodySize = 19;
  } else if (isMediumPhone) {
    titleSize = 36;
    subtitleSize = 20;
    bodySize = 18;
  } else {
    titleSize = 32;
    subtitleSize = 19;
    bodySize = 17;
  }

  // Button heights - generous for seniors
  let buttonHeight: number;
  let buttonTextSize: number;
  if (isLandscape) {
    buttonHeight = Math.max(56, Math.min(hp(14), 64));
    buttonTextSize = Math.max(18, Math.min(hp(4.5), 21));
  } else if (isTablet) {
    buttonHeight = 68;
    buttonTextSize = 22;
  } else if (isLargePhone) {
    buttonHeight = 64;
    buttonTextSize = 20;
  } else {
    buttonHeight = 60;
    buttonTextSize = 19;
  }

  // Card styling
  let cardPadding: number;
  let cardBorderRadius: number;
  if (isLandscape) {
    cardPadding = 20;
    cardBorderRadius = 20;
  } else if (isTablet) {
    cardPadding = 32;
    cardBorderRadius = 28;
  } else if (isLargePhone) {
    cardPadding = 28;
    cardBorderRadius = 24;
  } else {
    cardPadding = 24;
    cardBorderRadius = 22;
  }

  // Screen padding
  const screenPadding = isSmallPhone ? 20 : isMediumPhone ? 24 : isLargePhone ? 28 : isTablet ? 40 : 32;

  // Icon sizes
  const iconSize = isTablet ? 32 : isLandscape ? 24 : 28;

  // Floating hearts
  const heartBaseSize = isLandscape ? Math.min(hp(6), 26) : isTablet ? 28 : 22;
  const heartSizes: [number, number, number] = [heartBaseSize, heartBaseSize * 0.75, heartBaseSize * 0.55];

  // Decorative circles
  const decorCircleSizes = {
    large: isTablet ? 380 : isLandscape ? 200 : 300,
    medium: isTablet ? 280 : isLandscape ? 140 : 220,
    small: isTablet ? 160 : isLandscape ? 90 : 140,
  };

  return {
    logoSize,
    titleSize,
    subtitleSize,
    bodySize,
    buttonHeight,
    buttonTextSize,
    cardPadding,
    cardBorderRadius,
    screenPadding,
    iconSize,
    heartSizes,
    decorCircleSizes,
  };
};

// ============================================================================
// FLOATING HEART DECORATION COMPONENT
// ============================================================================
interface FloatingHeartProps {
  size: number;
  positionX: number;
  positionY: number;
  delay: number;
  reduceMotion: boolean;
}

const FloatingHeart: React.FC<FloatingHeartProps> = ({
  size,
  positionX,
  positionY,
  delay,
  reduceMotion,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(0.3);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: ANIMATION_TIMING.heartFloat,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: ANIMATION_TIMING.heartFloat,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => floatLoop.start(), delay);
    return () => {
      clearTimeout(timer);
      floatLoop.stop();
    };
  }, [reduceMotion, floatAnim, fadeAnim, delay]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const opacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <Animated.View
      style={[
        styles.floatingHeart,
        {
          left: `${positionX}%`,
          top: `${positionY}%`,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.heartCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Feather name="heart" size={size * 0.5} color={PREMIUM_COLORS.heartPink} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const maskPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  const last4 = digits.slice(-4);
  return `+63 *** *** ${last4}`;
};

const maskEmail = (email: string): string => {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  const maskedLocal = localPart.length > 2
    ? localPart[0] + '***' + localPart[localPart.length - 1]
    : localPart[0] + '***';
  return `${maskedLocal}@${domain}`;
};

export const OTPVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isLandscape,
    isTablet,
    hp,
    wp,
    moderateScale,
  } = useResponsive();

  // Get params
  const { username, phoneNumber, email, pendingRegistration: pendingRegStr } = route.params || {};
  const pendingRegistration = pendingRegStr ? JSON.parse(pendingRegStr) : null;

  // Determine if this is phone or email verification
  const isEmailVerification = !phoneNumber && !!email;
  const verificationTarget = isEmailVerification ? email : phoneNumber;

  // Debug logging
  console.log('[OTPVerification] Route params:', { username, phoneNumber, email });
  console.log('[OTPVerification] isEmailVerification:', isEmailVerification);
  console.log('[OTPVerification] verificationTarget:', verificationTarget);

  // State
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const didAutoSend = useRef(false);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Responsive sizes
  const sizes = useMemo(
    () => calculateResponsiveSizes(width, height, isLandscape, isTablet, hp, wp, moderateScale),
    [width, height, isLandscape, isTablet, hp, wp, moderateScale]
  );

  const maskedContact = isEmailVerification ? maskEmail(email || '') : maskPhone(phoneNumber || '');

  // Check reduce motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotion(enabled);
      } catch {
        setReduceMotion(false);
      }
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription?.remove();
  }, []);

  // Entrance animations
  useEffect(() => {
    if (reduceMotion) {
      headerAnim.setValue(1);
      cardAnim.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.entrance,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.cardSlide,
        delay: 200,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, headerAnim, cardAnim]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-send OTP on mount
  useEffect(() => {
    if (didAutoSend.current || !verificationTarget) return;
    didAutoSend.current = true;
    sendOtp(true);
  }, [verificationTarget]);

  // Send OTP
  const sendOtp = useCallback(
    async (silent = false) => {
      console.log('[OTPVerification] sendOtp called, silent:', silent);
      console.log('[OTPVerification] verificationTarget:', verificationTarget);
      console.log('[OTPVerification] isEmailVerification:', isEmailVerification);

      if (!verificationTarget) {
        setError(isEmailVerification ? 'Email is missing. Please go back.' : 'Phone number is missing. Please go back.');
        return;
      }

      try {
        setError('');
        setInfo(silent ? 'Sending code...' : 'Sending a new code...');
        setSending(true);

        // Use different API for email vs phone
        if (isEmailVerification) {
          console.log('[OTPVerification] Calling twilioApi.sendOtpEmail with:', email);
          await twilioApi.sendOtpEmail(email!);
          console.log('[OTPVerification] sendOtpEmail success');
        } else {
          console.log('[OTPVerification] Calling twilioApi.sendOtp with:', phoneNumber);
          await twilioApi.sendOtp(phoneNumber!, 'sms');
          console.log('[OTPVerification] sendOtp success');
        }

        setResendCooldown(RESEND_COOLDOWN);
        setSending(false);
        setInfo(isEmailVerification ? 'Code sent! Check your email.' : 'Code sent! Check your messages.');

        if (!silent) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          AccessibilityInfo.announceForAccessibility('Verification code sent');
        }
      } catch (err: any) {
        setSending(false);
        setInfo('');
        const msg = err?.message || 'Could not send code. Please try again.';
        setError(silent ? 'Having trouble? Tap Resend Code.' : msg);

        if (!silent) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    },
    [verificationTarget, isEmailVerification, email, phoneNumber]
  );

  // Resend OTP
  const handleResend = useCallback(() => {
    if (resendCooldown > 0 || sending || verifying) return;
    sendOtp(false);
  }, [resendCooldown, sending, verifying, sendOtp]);

  // Verify OTP with success animation
  const handleVerify = useCallback(async () => {
    console.log('[OTPVerification] handleVerify called with OTP:', otp);
    console.log('[OTPVerification] isEmailVerification:', isEmailVerification);

    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!verificationTarget) {
      setError(isEmailVerification ? 'Email is missing. Please go back.' : 'Phone number is missing. Please go back.');
      return;
    }

    setError('');
    setInfo('');
    setVerifying(true);

    try {
      // Verify OTP with Twilio - use different API for email vs phone
      console.log('[OTPVerification] Calling verify API...');
      const result = isEmailVerification
        ? await twilioApi.verifyOtpEmail(email!, otp)
        : await twilioApi.verifyOtp(phoneNumber!, otp);
      console.log('[OTPVerification] Verify result:', result);

      if (!result.valid) {
        setVerifying(false);
        setOtp('');
        setError(result.message || 'Invalid code. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Success animation
      if (!reduceMotion) {
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }

      // OTP verified! Now create the account if pending
      if (pendingRegistration) {
        setInfo(isEmailVerification ? 'Email verified! Creating your account...' : 'Phone verified! Creating your account...');

        try {
          await registerUser({
            username: pendingRegistration.username,
            password: pendingRegistration.password,
            ...(pendingRegistration.phoneNumber ? { phoneNumber: pendingRegistration.phoneNumber } : {}),
            ...(pendingRegistration.email ? { email: pendingRegistration.email } : {}),
          });

          await storage.setItem(STORAGE_KEYS.CURRENT_USERNAME, pendingRegistration.username);
          await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'otp_verified');

          setVerifying(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          AccessibilityInfo.announceForAccessibility('Account created successfully');

          // Navigate after brief success display
          setTimeout(() => {
            if (!isNavigating) {
              setIsNavigating(true);
              navigation.navigate('ProfileSetup', { username: pendingRegistration.username });
            }
          }, 800);
        } catch (regErr: any) {
          setVerifying(false);
          setError(regErr?.message || 'Failed to create account. Please try again.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'otp_verified');

        setVerifying(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility(isEmailVerification ? 'Email verified' : 'Phone verified');

        setTimeout(() => {
          if (!isNavigating) {
            setIsNavigating(true);
            navigation.navigate('ProfileSetup', { username: username || '' });
          }
        }, 800);
      }
    } catch (err: any) {
      setVerifying(false);
      setOtp('');
      setError(err?.message || 'Verification failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [otp, verificationTarget, isEmailVerification, email, phoneNumber, pendingRegistration, username, navigation, reduceMotion, successAnim, isNavigating]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const canVerify = otp.length === 6 && !verifying;

  // Animation interpolations
  const headerOpacity = headerAnim;
  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 0],
  });

  const cardOpacity = cardAnim;
  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const successScale = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const successOpacity = successAnim;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Premium Gradient Background */}
      <LinearGradient
        colors={[
          PREMIUM_COLORS.gradientTop,
          PREMIUM_COLORS.gradientMiddle,
          PREMIUM_COLORS.gradientBottom,
        ]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle1,
            {
              width: sizes.decorCircleSizes.large,
              height: sizes.decorCircleSizes.large,
              borderRadius: sizes.decorCircleSizes.large / 2,
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle2,
            {
              width: sizes.decorCircleSizes.medium,
              height: sizes.decorCircleSizes.medium,
              borderRadius: sizes.decorCircleSizes.medium / 2,
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle3,
            {
              width: sizes.decorCircleSizes.small,
              height: sizes.decorCircleSizes.small,
              borderRadius: sizes.decorCircleSizes.small / 2,
            },
          ]}
        />

        {/* Floating hearts */}
        {!reduceMotion && (
          <>
            <FloatingHeart size={sizes.heartSizes[0]} positionX={10} positionY={12} delay={0} reduceMotion={reduceMotion} />
            <FloatingHeart size={sizes.heartSizes[1]} positionX={85} positionY={15} delay={300} reduceMotion={reduceMotion} />
            <FloatingHeart size={sizes.heartSizes[2]} positionX={20} positionY={75} delay={600} reduceMotion={reduceMotion} />
          </>
        )}

        {/* Main content */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (isTablet ? 48 : 32),
              paddingBottom: insets.bottom + (isTablet ? 40 : 32),
              paddingHorizontal: sizes.screenPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.headerSection,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
                marginBottom: isLandscape ? 24 : 32,
              },
            ]}
          >
            {/* Back Button */}
            <Pressable
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={verifying}
            >
              <View style={styles.backButtonCircle}>
                <Feather name="arrow-left" size={sizes.iconSize * 0.75} color={PREMIUM_COLORS.textPrimary} />
              </View>
            </Pressable>

            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                {
                  width: sizes.logoSize,
                  height: sizes.logoSize,
                  borderRadius: sizes.logoSize / 2,
                  marginBottom: 16,
                },
              ]}
            >
              <Feather name={isEmailVerification ? "mail" : "smartphone"} size={sizes.logoSize * 0.5} color={colors.orange[500]} />
            </View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                {
                  fontSize: sizes.titleSize,
                },
              ]}
              accessible={true}
              accessibilityRole="header"
            >
              {isEmailVerification ? 'Verify Your Email' : 'Verify Your Phone'}
            </Text>

            {/* Subtitle */}
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: sizes.subtitleSize,
                },
              ]}
            >
              We sent a 6-digit code to
            </Text>
            <Text
              style={[
                styles.phoneText,
                {
                  fontSize: sizes.subtitleSize,
                },
              ]}
            >
              {maskedContact}
            </Text>
          </Animated.View>

          {/* Glassmorphic Card */}
          <Animated.View
            style={[
              styles.card,
              {
                padding: sizes.cardPadding,
                borderRadius: sizes.cardBorderRadius,
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
                maxWidth: isTablet ? 520 : undefined,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
          >
            {/* Change contact link */}
            <Pressable
              onPress={handleBack}
              style={styles.changeButton}
              accessibilityRole="button"
              accessibilityLabel={isEmailVerification ? "Change email" : "Change phone number"}
              disabled={verifying}
            >
              <Feather name="edit-2" size={16} color={colors.teal[600]} />
              <Text style={[styles.changeText, { fontSize: sizes.bodySize - 2 }]}>
                {isEmailVerification ? 'Change email' : 'Change number'}
              </Text>
            </Pressable>

            {/* OTP Input */}
            <View style={[styles.otpContainer, { marginVertical: isLandscape ? 20 : 28 }]}>
              <OTPInput
                length={6}
                value={otp}
                onChange={(v) => {
                  if (error) setError('');
                  if (info) setInfo('');
                  setOtp(v);
                }}
                error={!!error}
                autoFocus
                disabled={verifying}
              />
            </View>

            {/* Feedback messages */}
            <View style={[styles.feedbackContainer, { minHeight: isLandscape ? 40 : 56 }]}>
              {error ? (
                <View style={styles.errorBox} accessibilityRole="alert">
                  <Feather name="alert-circle" size={18} color={colors.semantic.error} />
                  <Text style={[styles.errorText, { fontSize: sizes.bodySize - 2 }]}>{error}</Text>
                </View>
              ) : info ? (
                <View style={styles.infoBox}>
                  <Feather name="info" size={18} color={colors.teal[600]} />
                  <Text style={[styles.infoText, { fontSize: sizes.bodySize - 2 }]}>{info}</Text>
                </View>
              ) : (
                <Text style={[styles.hintText, { fontSize: sizes.bodySize - 2 }]}>
                  {isEmailVerification ? 'Enter the code to verify your email' : 'Enter the code to verify your phone'}
                </Text>
              )}
            </View>

            {/* Verify Button */}
            <Pressable
              style={[
                styles.verifyButton,
                { height: sizes.buttonHeight, borderRadius: sizes.buttonHeight / 2 },
                !canVerify && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!canVerify}
              accessibilityRole="button"
              accessibilityLabel={verifying ? 'Verifying' : (isEmailVerification ? 'Verify email' : 'Verify phone')}
              accessibilityState={{ disabled: !canVerify }}
            >
              <LinearGradient
                colors={canVerify ? ['#FF7043', '#F4511E'] : ['#D1D5DB', '#C7CBD1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {verifying ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.white} size="small" />
                    <Text style={[styles.buttonText, { fontSize: sizes.buttonTextSize }]}>
                      Verifying...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.buttonText, { fontSize: sizes.buttonTextSize }]}>
                      {isEmailVerification ? 'Verify Email' : 'Verify Phone'}
                    </Text>
                    <Feather name="check-circle" size={sizes.buttonTextSize} color={PREMIUM_COLORS.textPrimary} />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Resend section */}
            <View style={[styles.resendRow, { marginTop: isLandscape ? 16 : 20 }]}>
              <Text style={[styles.resendLabel, { fontSize: sizes.bodySize - 2 }]}>
                Didn't receive it?
              </Text>
              <Pressable
                onPress={handleResend}
                disabled={resendCooldown > 0 || sending || verifying}
                style={[
                  styles.resendButton,
                  { minHeight: 44 },
                  (resendCooldown > 0 || sending) && styles.resendDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              >
                <Text
                  style={[
                    styles.resendText,
                    { fontSize: sizes.bodySize - 1 },
                    (resendCooldown > 0 || sending) && styles.resendTextDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend (${resendCooldown}s)`
                    : sending
                    ? 'Sending...'
                    : 'Resend Code'}
                </Text>
              </Pressable>
            </View>

            {/* Trust badge */}
            <View style={[styles.trustBadge, { marginTop: isLandscape ? 16 : 24 }]}>
              <View style={styles.trustBadgeIcon}>
                <Feather name="shield" size={16} color={colors.teal[500]} />
              </View>
              <Text style={[styles.trustBadgeText, { fontSize: sizes.bodySize - 3 }]}>
                Your privacy is protected
              </Text>
            </View>
          </Animated.View>

          {/* Success overlay */}
          {successAnim._value > 0 && (
            <Animated.View
              style={[
                styles.successOverlay,
                {
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.successIcon}>
                <Feather name="check-circle" size={60} color={colors.teal[500]} />
              </View>
              <Text style={styles.successText}>Verified!</Text>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// STYLES - Premium, Refined Design
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Decorative elements
  decorCircle: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.glassTint,
  },
  decorCircle1: {
    top: -60,
    right: -50,
  },
  decorCircle2: {
    top: '40%',
    left: -80,
  },
  decorCircle3: {
    bottom: '20%',
    right: -40,
  },

  floatingHeart: {
    position: 'absolute',
    zIndex: 1,
  },
  heartCircle: {
    backgroundColor: 'rgba(255, 107, 138, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 138, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header section
  headerSection: {
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: PREMIUM_COLORS.glassWhite,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    fontWeight: '800',
    color: PREMIUM_COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 12,
  },
  subtitle: {
    color: PREMIUM_COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  phoneText: {
    color: PREMIUM_COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: PREMIUM_COLORS.cardBackground,
    shadowColor: PREMIUM_COLORS.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },

  // Change number
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  changeText: {
    color: colors.teal[600],
    fontWeight: '700',
  },

  // OTP
  otpContainer: {
    width: '100%',
  },

  // Feedback
  feedbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
  },
  errorText: {
    flex: 1,
    color: colors.semantic.error,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  infoText: {
    flex: 1,
    color: colors.teal[700],
    fontWeight: '600',
  },
  hintText: {
    color: colors.gray[600],
    textAlign: 'center',
    fontWeight: '500',
  },

  // Button
  verifyButton: {
    overflow: 'hidden',
    shadowColor: 'rgba(244, 81, 30, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 1,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Resend
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  resendLabel: {
    color: colors.gray[600],
    fontWeight: '500',
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  resendDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: colors.teal[600],
    fontWeight: '700',
  },
  resendTextDisabled: {
    color: colors.gray[500],
  },

  // Trust badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  trustBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustBadgeText: {
    color: colors.gray[600],
    fontWeight: '500',
  },

  // Success overlay
  successOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 32,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
  },
  successIcon: {
    marginBottom: 12,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.teal[700],
    letterSpacing: 0.5,
  },
});

export default OTPVerificationScreen;
