/**
 * TANDER LoginScreen - Premium Edition
 * A Secure, Trust-Inspiring Sign In Experience for Filipino Seniors (50+)
 *
 * Design Philosophy:
 * - Premium aesthetic matching WelcomeScreen/LoadingScreen exactly
 * - Emotional warmth through soft, romantic gradients (coral-orange to teal)
 * - Glassmorphism styling with semi-transparent containers
 * - Senior-friendly with large touch targets (56-64px) and high contrast
 * - Smooth, delightful animations that don't overwhelm
 * - Floating hearts decoration for visual warmth
 * - Premium glow effects on logo and key elements
 * - 100% responsive across all devices (320px phones to 1280px+ tablets)
 *
 * Key Features:
 * - Biometric authentication prioritized (less typing, more tapping)
 * - WCAG AA/AAA compliant contrast ratios
 * - Reduce motion support for accessibility
 * - Optimized layouts for portrait and landscape orientations
 * - Premium micro-interactions and entrance animations
 * - Glassmorphic input fields with premium shadows
 * - Animated glow behind logo
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  AccessibilityInfo,
  Keyboard,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { colors } from '@shared/styles/colors';
import { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useBiometric } from '@shared/hooks/useBiometric';
import { TermsAndConditionsModal } from '@shared/components/TermsAndConditionsModal';

// Import the Tander logo
const TanderLogo = require('../../../../assets/icons/tander-logo.png');
const GoogleIcon = require('../../../../assets/icons/google.png');
const AppleIcon = require('../../../../assets/icons/apple.png');

// ============================================================================
// PREMIUM COLOR PALETTE - Matching WelcomeScreen and LoadingScreen
// ============================================================================

const PREMIUM_COLORS = {
  // Gradient backgrounds - warm, romantic feel
  gradientTop: '#FF8A65',      // Warm coral-orange
  gradientMiddle: '#FF7043',   // Deeper coral
  gradientBottom: '#26A69A',   // Trust-inspiring teal

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.95)',
  glassTint: 'rgba(255, 255, 255, 0.12)',
  glassStroke: 'rgba(255, 255, 255, 0.35)',
  glassCardBg: 'rgba(255, 255, 255, 0.96)',

  // Text on gradient
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.75)',

  // Text on white
  textDark: '#1F2937',
  textDarkSecondary: '#6B7280',

  // Decorative
  heartPink: '#FF6B8A',
  warmGlow: 'rgba(255, 183, 77, 0.25)',
  inputGlow: 'rgba(255, 138, 101, 0.1)',
} as const;

// ============================================================================
// ANIMATION TIMING CONSTANTS
// ============================================================================

const ANIMATION_TIMING = {
  logoEntry: 800,
  glowFadeIn: 1200,
  contentEntry: 600,
  staggerDelay: 80,
  pulseInterval: 3000,
  heartFloat: 4000,
} as const;

// ============================================================================
// TYPES
// ============================================================================

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

interface ResponsiveSizes {
  logoSize: number;
  logoContainerSize: number;
  logoGlowSize: number;
  titleSize: number;
  subtitleSize: number;
  inputHeight: number;
  buttonHeight: number;
  fontSize: number;
  labelSize: number;
  helperSize: number;
  cardPadding: number;
  cardBorderRadius: number;
  inputBorderRadius: number;
  screenPadding: number;
  sectionSpacing: number;
  heartSize: number;
}

// ============================================================================
// RESPONSIVE SIZE CALCULATOR - Premium proportions
// ============================================================================

const calculateResponsiveSizes = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  moderateScale: (size: number, factor?: number) => number,
  hp: (percentage: number) => number,
  wp: (percentage: number) => number
): ResponsiveSizes => {
  const isSmallPhone = width < BREAKPOINTS.xs + 56;
  const isMediumPhone = width >= BREAKPOINTS.xs + 56 && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;

  // Logo sizing - compact for form screen
  let logoSize: number;
  let logoContainerSize: number;
  let logoGlowSize: number;

  if (isLandscape) {
    logoSize = Math.min(hp(18), wp(10), 85);
    logoContainerSize = logoSize + 24;
    logoGlowSize = logoSize + 50;
  } else if (isTablet) {
    logoSize = moderateScale(100, 0.3);
    logoContainerSize = logoSize + 32;
    logoGlowSize = logoSize + 60;
  } else if (isLargePhone) {
    logoSize = moderateScale(85, 0.4);
    logoContainerSize = logoSize + 28;
    logoGlowSize = logoSize + 52;
  } else if (isMediumPhone) {
    logoSize = moderateScale(75, 0.4);
    logoContainerSize = logoSize + 24;
    logoGlowSize = logoSize + 46;
  } else {
    logoSize = moderateScale(70, 0.4);
    logoContainerSize = logoSize + 22;
    logoGlowSize = logoSize + 42;
  }

  // Typography - senior-friendly (minimum 16px body text)
  let titleSize: number;
  let subtitleSize: number;
  let fontSize: number;
  let labelSize: number;
  let helperSize: number;

  if (isLandscape) {
    titleSize = Math.min(hp(7), wp(5), 36);
    subtitleSize = Math.min(hp(3.5), wp(2.5), 18);
    fontSize = Math.max(16, Math.min(hp(3.5), 19));
    labelSize = Math.max(15, fontSize - 2);
    helperSize = Math.max(13, fontSize - 4);
  } else if (isTablet) {
    titleSize = 44;
    subtitleSize = 22;
    fontSize = 20;
    labelSize = 18;
    helperSize = 15;
  } else if (isLargePhone) {
    titleSize = 38;
    subtitleSize = 20;
    fontSize = 19;
    labelSize = 17;
    helperSize = 14;
  } else if (isMediumPhone) {
    titleSize = 34;
    subtitleSize = 19;
    fontSize = 18;
    labelSize = 16;
    helperSize = 14;
  } else {
    titleSize = 30;
    subtitleSize = 18;
    fontSize = 17;
    labelSize = 15;
    helperSize = 13;
  }

  // Touch targets - generous for seniors
  let inputHeight: number;
  let buttonHeight: number;

  if (isLandscape) {
    inputHeight = Math.max(54, Math.min(hp(12), 60));
    buttonHeight = Math.max(54, Math.min(hp(12), 62));
  } else if (isTablet) {
    inputHeight = 68;
    buttonHeight = 70;
  } else if (isLargePhone) {
    inputHeight = 62;
    buttonHeight = 64;
  } else {
    inputHeight = 58;
    buttonHeight = 60;
  }

  // Card styling
  const cardPadding = isLandscape ? 20 : isTablet ? 36 : isLargePhone ? 28 : isSmallPhone ? 20 : 24;
  const cardBorderRadius = isTablet ? 32 : 28;
  const inputBorderRadius = isTablet ? 18 : 16;

  // Screen padding
  const screenPadding = isSmallPhone ? 20 : isMediumPhone ? 24 : isLargePhone ? 28 : 32;

  // Section spacing
  const sectionSpacing = isLandscape ? 16 : isTablet ? 28 : 24;

  // Heart size for decoration
  const heartSize = isLandscape ? 22 : isTablet ? 28 : 24;

  return {
    logoSize,
    logoContainerSize,
    logoGlowSize,
    titleSize,
    subtitleSize,
    inputHeight,
    buttonHeight,
    fontSize,
    labelSize,
    helperSize,
    cardPadding,
    cardBorderRadius,
    inputBorderRadius,
    screenPadding,
    sectionSpacing,
    heartSize,
  };
};

// ============================================================================
// FLOATING HEART DECORATION COMPONENT
// ============================================================================

interface FloatingHeartProps {
  size: number;
  positionX: string;
  positionY: string;
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
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacityAnim.setValue(0.2);
      return;
    }

    // Fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Float animation
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
  }, [floatAnim, opacityAnim, delay, reduceMotion]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const opacity = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.25],
  });

  return (
    <Animated.View
      style={[
        styles.floatingHeart,
        {
          left: positionX,
          top: positionY,
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
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
          },
        ]}
      >
        <Feather name="heart" size={size} color={PREMIUM_COLORS.heartPink} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// DECORATIVE CIRCLES COMPONENT
// ============================================================================

interface DecorativeCirclesProps {
  isLandscape: boolean;
  isTablet: boolean;
}

const DecorativeCircles: React.FC<DecorativeCirclesProps> = ({ isLandscape, isTablet }) => {
  const size1 = isTablet ? 350 : isLandscape ? 200 : 280;
  const size2 = isTablet ? 260 : isLandscape ? 140 : 200;
  const size3 = isTablet ? 160 : isLandscape ? 90 : 130;

  return (
    <>
      <View
        style={[
          styles.decorCircle,
          {
            width: size1,
            height: size1,
            borderRadius: size1 / 2,
            top: -size1 * 0.3,
            right: -size1 * 0.25,
          },
        ]}
      />
      <View
        style={[
          styles.decorCircle,
          {
            width: size2,
            height: size2,
            borderRadius: size2 / 2,
            top: '40%',
            left: -size2 * 0.4,
          },
        ]}
      />
      <View
        style={[
          styles.decorCircle,
          {
            width: size3,
            height: size3,
            borderRadius: size3 / 2,
            bottom: '12%',
            right: -size3 * 0.3,
          },
        ]}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isLandscape,
    isTablet,
    isIOS,
    hp,
    wp,
    moderateScale,
  } = useResponsive();

  // ============================================================================
  // STATE
  // ============================================================================

  const [reduceMotion, setReduceMotion] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsReminderModal, setShowTermsReminderModal] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  // ============================================================================
  // ANIMATION VALUES
  // ============================================================================

  const logoAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ============================================================================
  // AUTH & BIOMETRIC
  // ============================================================================

  const authLogin = useAuthStore((state) => state.login);

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    biometricLabel,
    isAuthenticating: biometricAuthenticating,
    authenticateAndGetCredentials,
    clearError: clearBiometricError,
  } = useBiometric();

  const showBiometricButton = biometricAvailable && biometricEnabled;

  // ============================================================================
  // RESPONSIVE SIZES
  // ============================================================================

  const sizes = useMemo(
    () => calculateResponsiveSizes(width, height, isLandscape, isTablet, moderateScale, hp, wp),
    [width, height, isLandscape, isTablet, moderateScale, hp, wp]
  );

  const maxFormWidth = isTablet ? 560 : isLandscape ? Math.min(wp(50), 520) : Math.min(wp(92), 440);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Check reduce motion accessibility setting
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

  // Premium entrance animations
  useEffect(() => {
    if (reduceMotion) {
      logoAnim.setValue(1);
      glowAnim.setValue(1);
      cardAnim.setValue(1);
      return;
    }

    // Logo entrance
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 1,
        tension: 45,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.glowFadeIn,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Card entrance
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: ANIMATION_TIMING.pulseInterval,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: ANIMATION_TIMING.pulseInterval,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseTimer = setTimeout(() => pulse.start(), 1000);

    return () => {
      clearTimeout(pulseTimer);
      pulse.stop();
    };
  }, [reduceMotion, logoAnim, glowAnim, cardAnim, pulseAnim]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const clearAllErrors = useCallback(() => {
    setUsernameError(null);
    setPasswordError(null);
    setError(null);
  }, []);

  const announce = useCallback((msg: string) => {
    AccessibilityInfo.announceForAccessibility(msg);
  }, []);

  const validate = useCallback(() => {
    let ok = true;
    setUsernameError(null);
    setPasswordError(null);

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setUsernameError('Username is required');
      ok = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      ok = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      ok = false;
    }

    if (!ok) {
      setError('Please check the highlighted fields');
      announce('Please check the highlighted fields');
    }

    return ok;
  }, [username, password, announce]);

  const routeAfterLogin = useCallback(
    (fallbackUsername: string) => {
      const state = useAuthStore.getState();
      const currentPhase = state.registrationPhase;
      const currentUsername = state.currentUsername || fallbackUsername;

      if (currentPhase === 'email_verified' || currentPhase === 'otp_verified') {
        announce('Please complete your profile to continue');
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileSetup', params: { username: currentUsername } }],
        });
        return;
      }

      if (currentPhase === 'profile_completed') {
        announce('Please complete ID verification to continue');
        navigation.reset({
          index: 0,
          routes: [{ name: 'IDVerification', params: { username: currentUsername } }],
        });
        return;
      }

      announce('Sign in successful');
    },
    [announce, navigation]
  );

  const handleLogin = useCallback(async () => {
    if (loading) return;

    clearAllErrors();
    if (!validate()) return;

    // Check if terms are accepted - show friendly reminder modal if not
    if (!termsAccepted) {
      setShowTermsReminderModal(true);
      return;
    }

    const trimmedUsername = username.trim();

    setLoading(true);

    try {
      await authLogin(trimmedUsername, password);
      routeAfterLogin(trimmedUsername);
    } catch (err: any) {
      const message = err?.message || 'Sign in failed. Please try again.';
      setError(message);
      announce(message);
    } finally {
      setLoading(false);
    }
  }, [authLogin, clearAllErrors, loading, password, routeAfterLogin, username, validate, announce, termsAccepted]);

  const handleBiometricLogin = useCallback(async () => {
    if (loading || biometricAuthenticating) return;

    // Check if terms are accepted - show friendly reminder modal if not
    if (!termsAccepted) {
      setShowTermsReminderModal(true);
      return;
    }

    clearAllErrors();
    clearBiometricError();

    try {
      const credentials = await authenticateAndGetCredentials();
      if (!credentials) return;

      setUsername(credentials.username);
      setPassword(credentials.password);

      setLoading(true);
      await authLogin(credentials.username, credentials.password);
      routeAfterLogin(credentials.username);

      announce(`Signed in with ${biometricLabel}`);
    } catch (err: any) {
      const message = err?.message || 'Sign in failed. Please try again.';
      setError(message);
      announce(message);
    } finally {
      setLoading(false);
    }
  }, [
    authenticateAndGetCredentials,
    authLogin,
    biometricAuthenticating,
    biometricLabel,
    clearAllErrors,
    clearBiometricError,
    loading,
    routeAfterLogin,
    announce,
    termsAccepted,
  ]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const handleForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPassword');
  }, [navigation]);

  const handleSignUp = useCallback(() => {
    navigation.navigate('SignUp');
  }, [navigation]);

  const onChangeUsername = useCallback(
    (v: string) => {
      setUsername(v);
      if (usernameError || error) {
        setUsernameError(null);
        setError(null);
      }
    },
    [error, usernameError]
  );

  const onChangePassword = useCallback(
    (v: string) => {
      setPassword(v);
      if (passwordError || error) {
        setPasswordError(null);
        setError(null);
      }
    },
    [error, passwordError]
  );

  // ============================================================================
  // ANIMATION INTERPOLATIONS
  // ============================================================================

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const logoOpacity = logoAnim;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const cardOpacity = cardAnim;

  const combinedLogoScale = Animated.multiply(logoScale, pulseAnim);

  const signInDisabled =
    loading || biometricAuthenticating || username.trim().length === 0 || password.length === 0;

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const FieldError = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
      <Text
        style={[styles.fieldErrorText, { fontSize: sizes.helperSize }]}
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
    );
  };

  const renderFormContent = () => (
    <View style={{ width: '100%' }}>
      {/* Global error */}
      {error && (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={20} color={colors.semantic.error} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.errorTitle, { fontSize: sizes.fontSize }]}>
              Couldn't sign you in
            </Text>
            <Text style={[styles.errorText, { fontSize: sizes.helperSize }]}>
              {error}
            </Text>
          </View>
        </View>
      )}

      {/* Biometric button (less typing, more tapping) */}
      {showBiometricButton && (
        <View style={{ marginBottom: sizes.sectionSpacing }}>
          <TouchableOpacity
            style={[styles.biometricButton, { height: sizes.buttonHeight }]}
            onPress={handleBiometricLogin}
            disabled={loading || biometricAuthenticating}
            accessibilityLabel={`Sign in with ${biometricLabel}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading || biometricAuthenticating }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                biometricAuthenticating
                  ? [colors.gray[400], colors.gray[500]]
                  : ['#FF7043', '#14B8A6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              {biometricAuthenticating ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.buttonText, { fontSize: sizes.fontSize, marginLeft: 12 }]}>
                    Authenticating...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Feather
                    name={biometricLabel.includes('Face') ? 'smile' : 'fingerprint'}
                    size={sizes.fontSize + 4}
                    color="#fff"
                  />
                  <Text style={[styles.buttonText, { fontSize: sizes.fontSize, marginLeft: 12 }]}>
                    Sign in with {biometricLabel}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.divider, { marginVertical: sizes.sectionSpacing }]}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontSize: sizes.helperSize }]}>
              or use password
            </Text>
            <View style={styles.dividerLine} />
          </View>
        </View>
      )}

      {/* Username */}
      <View style={{ marginBottom: sizes.sectionSpacing - 4 }}>
        <Text style={[styles.label, { fontSize: sizes.labelSize }]}>Username</Text>
        <View
          style={[
            styles.inputContainer,
            { height: sizes.inputHeight, borderRadius: sizes.inputBorderRadius },
            usernameError ? styles.inputErrorBorder : null,
          ]}
        >
          <Feather name="user" size={sizes.fontSize + 2} color={colors.gray[400]} />
          <TextInput
            style={[styles.input, { fontSize: sizes.fontSize, marginLeft: 14 }]}
            placeholder="Enter your username"
            placeholderTextColor={colors.gray[400]}
            value={username}
            onChangeText={onChangeUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
            textContentType="username"
            autoComplete="username"
            accessibilityLabel="Username"
            accessibilityHint="Enter your username"
          />
        </View>
        <FieldError message={usernameError} />
      </View>

      {/* Password */}
      <View style={{ marginBottom: sizes.sectionSpacing - 4 }}>
        <Text style={[styles.label, { fontSize: sizes.labelSize }]}>Password</Text>
        <View
          style={[
            styles.inputContainer,
            { height: sizes.inputHeight, borderRadius: sizes.inputBorderRadius },
            passwordError ? styles.inputErrorBorder : null,
          ]}
        >
          <Feather name="lock" size={sizes.fontSize + 2} color={colors.gray[400]} />
          <TextInput
            ref={passwordRef}
            style={[styles.input, styles.passwordInput, { fontSize: sizes.fontSize, marginLeft: 14 }]}
            placeholder="Enter your password"
            placeholderTextColor={colors.gray[400]}
            value={password}
            onChangeText={onChangePassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
            textContentType="password"
            autoComplete="password"
            accessibilityLabel="Password"
            accessibilityHint="Enter your password"
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((s) => !s)}
            disabled={loading}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={sizes.fontSize}
              color={colors.teal[600]}
            />
          </TouchableOpacity>
        </View>
        <FieldError message={passwordError} />
        {!passwordError && (
          <Text style={[styles.helperText, { fontSize: sizes.helperSize }]}>
            Minimum 8 characters
          </Text>
        )}
      </View>

      {/* Forgot password */}
      <TouchableOpacity
        style={styles.forgotButton}
        onPress={handleForgotPassword}
        disabled={loading}
        accessibilityLabel="Forgot Password"
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.forgotText, { fontSize: sizes.labelSize }]}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Sign in button */}
      <TouchableOpacity
        style={[styles.primaryButton, { height: sizes.buttonHeight }]}
        onPress={handleLogin}
        disabled={signInDisabled}
        accessibilityLabel={loading ? 'Signing in' : 'Sign In'}
        accessibilityRole="button"
        accessibilityState={{ disabled: signInDisabled }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={
            signInDisabled
              ? [colors.gray[300], colors.gray[400]]
              : ['#FF7043', '#F4511E']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.buttonText, { fontSize: sizes.fontSize, marginLeft: 12 }]}>
                Signing In...
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText, { fontSize: sizes.fontSize }]}>
                Sign In
              </Text>
              <Feather name="arrow-right" size={sizes.fontSize + 2} color="#fff" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { marginVertical: sizes.sectionSpacing + 4 }]}>
        <View style={styles.dividerLine} />
        <Text style={[styles.dividerText, { fontSize: sizes.helperSize }]}>
          or continue with
        </Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social buttons */}
      <View style={styles.socialRow}>
        <TouchableOpacity
          style={[
            styles.socialButton,
            { height: sizes.buttonHeight - 6, borderRadius: sizes.inputBorderRadius },
          ]}
          disabled={loading}
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          activeOpacity={0.7}
        >
          <Image source={GoogleIcon} style={styles.socialIcon} resizeMode="contain" />
          <Text style={[styles.socialText, { fontSize: sizes.fontSize - 2 }]}>
            Google
          </Text>
        </TouchableOpacity>

        {isIOS && (
          <TouchableOpacity
            style={[
              styles.socialButton,
              { height: sizes.buttonHeight - 6, borderRadius: sizes.inputBorderRadius },
            ]}
            disabled={loading}
            accessibilityLabel="Continue with Apple"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            activeOpacity={0.7}
          >
            <Image source={AppleIcon} style={styles.socialIcon} resizeMode="contain" />
            <Text style={[styles.socialText, { fontSize: sizes.fontSize - 2 }]}>
              Apple
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sign up */}
      <View style={[styles.signUpRow, { marginTop: sizes.sectionSpacing + 8 }]}>
        <Text style={[styles.signUpText, { fontSize: sizes.fontSize - 1 }]}>
          Don't have an account?
        </Text>
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          accessibilityLabel="Create Account"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.signUpLink, { fontSize: sizes.fontSize - 1 }]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Terms Checkbox */}
      <View style={[styles.termsCheckboxRow, { marginTop: sizes.sectionSpacing - 4 }]}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            termsAccepted && styles.checkboxChecked,
          ]}
          onPress={() => setTermsAccepted(!termsAccepted)}
          accessibilityLabel={termsAccepted ? 'Terms accepted, tap to uncheck' : 'Tap to accept terms and conditions'}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          activeOpacity={0.7}
        >
          {termsAccepted && (
            <Feather name="check" size={16} color="#fff" />
          )}
        </TouchableOpacity>
        <View style={styles.termsTextContainer}>
          <Text style={[styles.termsText, { fontSize: sizes.helperSize }]}>
            I agree to the{' '}
          </Text>
          <TouchableOpacity
            onPress={() => setShowTerms(true)}
            accessibilityLabel="View Terms and Conditions"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.termsLink, { fontSize: sizes.helperSize }]}>
              Terms and Conditions
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Premium gradient background */}
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
        <DecorativeCircles isLandscape={isLandscape} isTablet={isTablet} />

        {/* Floating hearts */}
        {!reduceMotion && (
          <>
            <FloatingHeart
              size={sizes.heartSize}
              positionX="10%"
              positionY="8%"
              delay={0}
              reduceMotion={reduceMotion}
            />
            <FloatingHeart
              size={sizes.heartSize * 0.8}
              positionX="85%"
              positionY="12%"
              delay={300}
              reduceMotion={reduceMotion}
            />
            <FloatingHeart
              size={sizes.heartSize * 0.6}
              positionX="15%"
              positionY="75%"
              delay={600}
              reduceMotion={reduceMotion}
            />
            <FloatingHeart
              size={sizes.heartSize * 0.7}
              positionX="88%"
              positionY="68%"
              delay={450}
              reduceMotion={reduceMotion}
            />
          </>
        )}

        {/* Safe area container */}
        <View
          style={[
            styles.safeContainer,
            {
              paddingTop: insets.top + (isLandscape ? hp(2) : hp(3)),
              paddingBottom: insets.bottom + (isLandscape ? hp(2) : hp(3)),
              paddingLeft: Math.max(insets.left, sizes.screenPadding),
              paddingRight: Math.max(insets.right, sizes.screenPadding),
            },
          ]}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.backCircle}>
              <Feather name="arrow-left" size={24} color={PREMIUM_COLORS.textPrimary} />
            </View>
          </TouchableOpacity>

          {/* Content wrapper */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.contentWrapper}
          >
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isLandscape && styles.scrollContentLandscape,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.centerContainer,
                  { maxWidth: maxFormWidth, alignSelf: 'center', width: '100%' },
                ]}
              >
                {/* Logo section */}
                <View style={[styles.logoSection, { marginBottom: sizes.sectionSpacing }]}>
                  {/* Glow effect */}
                  <Animated.View
                    style={[
                      styles.logoGlow,
                      {
                        width: sizes.logoGlowSize,
                        height: sizes.logoGlowSize,
                        borderRadius: sizes.logoGlowSize / 2,
                        opacity: glowOpacity,
                      },
                    ]}
                  />

                  {/* Logo container */}
                  <Animated.View
                    style={[
                      styles.logoWrapper,
                      {
                        opacity: logoOpacity,
                        transform: [{ scale: combinedLogoScale }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.logoContainer,
                        {
                          width: sizes.logoContainerSize,
                          height: sizes.logoContainerSize,
                          borderRadius: sizes.logoContainerSize / 2,
                        },
                      ]}
                    >
                      <Image
                        source={TanderLogo}
                        style={{
                          width: sizes.logoSize,
                          height: sizes.logoSize,
                        }}
                        resizeMode="contain"
                        accessible={true}
                        accessibilityLabel="Tander logo"
                      />
                    </View>
                  </Animated.View>

                  {/* Title */}
                  <Animated.Text
                    style={[
                      styles.title,
                      {
                        fontSize: sizes.titleSize,
                        opacity: logoAnim,
                        marginTop: 20,
                      },
                    ]}
                    accessible={true}
                    accessibilityRole="header"
                  >
                    Welcome Back
                  </Animated.Text>

                  {/* Subtitle */}
                  <Animated.Text
                    style={[
                      styles.subtitle,
                      {
                        fontSize: sizes.subtitleSize,
                        opacity: logoAnim,
                        marginTop: 8,
                      },
                    ]}
                  >
                    Sign in to continue your journey
                  </Animated.Text>
                </View>

                {/* Glassmorphic card */}
                <Animated.View
                  style={[
                    styles.formCard,
                    {
                      borderRadius: sizes.cardBorderRadius,
                      padding: sizes.cardPadding,
                      opacity: cardOpacity,
                      transform: [{ translateY: cardTranslateY }],
                    },
                  ]}
                >
                  {renderFormContent()}
                </Animated.View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>

      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
      />

      {/* Terms Reminder Modal - Appears when user tries to sign in without accepting */}
      <Modal
        visible={showTermsReminderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermsReminderModal(false)}
      >
        <TouchableOpacity
          style={styles.reminderModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTermsReminderModal(false)}
        >
          <View style={styles.reminderModalContent}>
            {/* Icon */}
            <View style={styles.reminderIconContainer}>
              <LinearGradient
                colors={[colors.orange[500], colors.teal[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reminderIconGradient}
              >
                <Feather name="check-square" size={32} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.reminderTitle}>
              One More Step!
            </Text>

            {/* Message */}
            <Text style={styles.reminderMessage}>
              Please accept the Terms and Conditions by checking the checkbox below to continue.
            </Text>

            {/* Visual pointer to checkbox */}
            <View style={styles.reminderPointer}>
              <Feather name="arrow-down" size={24} color={colors.orange[500]} />
              <Text style={styles.reminderPointerText}>
                Look for the checkbox below
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.reminderButtons}>
              <TouchableOpacity
                style={styles.reminderReadTermsBtn}
                onPress={() => {
                  setShowTermsReminderModal(false);
                  setShowTerms(true);
                }}
                accessibilityLabel="Read Terms"
                accessibilityRole="button"
              >
                <Text style={styles.reminderReadTermsText}>Read Terms</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reminderAcceptBtn}
                onPress={() => {
                  setTermsAccepted(true);
                  setShowTermsReminderModal(false);
                }}
                accessibilityLabel="I Accept"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.orange[500], colors.teal[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.reminderAcceptGradient}
                >
                  <Feather name="check" size={20} color="#fff" />
                  <Text style={styles.reminderAcceptText}>I Accept</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ============================================================================
// STYLES - Premium Design
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
  },

  // ============================================================================
  // DECORATIVE ELEMENTS
  // ============================================================================

  decorCircle: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.glassTint,
  },

  floatingHeart: {
    position: 'absolute',
    zIndex: 1,
  },
  heartCircle: {
    backgroundColor: 'rgba(255, 107, 138, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 138, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ============================================================================
  // BACK BUTTON
  // ============================================================================

  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: PREMIUM_COLORS.glassStroke,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ============================================================================
  // CONTENT LAYOUT
  // ============================================================================

  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  scrollContentLandscape: {
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
  },

  // ============================================================================
  // LOGO SECTION
  // ============================================================================

  logoSection: {
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.warmGlow,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    backgroundColor: PREMIUM_COLORS.glassWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontWeight: '800',
    color: PREMIUM_COLORS.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: PREMIUM_COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ============================================================================
  // GLASSMORPHIC CARD
  // ============================================================================

  formCard: {
    backgroundColor: PREMIUM_COLORS.glassCardBg,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    width: '100%',
  },

  // ============================================================================
  // ERROR BOX
  // ============================================================================

  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorTitle: {
    color: colors.semantic.error,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    color: colors.semantic.error,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ============================================================================
  // INPUT FIELDS
  // ============================================================================

  label: {
    color: colors.gray[700],
    fontWeight: '700',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    color: colors.gray[900],
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 50,
  },
  inputErrorBorder: {
    borderColor: 'rgba(244, 67, 54, 0.5)',
    backgroundColor: 'rgba(244, 67, 54, 0.03)',
  },
  fieldErrorText: {
    marginTop: 8,
    color: colors.semantic.error,
    fontWeight: '600',
  },
  helperText: {
    marginTop: 8,
    color: colors.gray[500],
    fontWeight: '500',
  },
  eyeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ============================================================================
  // BUTTONS
  // ============================================================================

  biometricButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: 'rgba(20, 184, 166, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: 'rgba(244, 81, 30, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginBottom: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    color: colors.teal[600],
    fontWeight: '700',
  },

  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialText: {
    color: colors.gray[700],
    fontWeight: '700',
  },

  // ============================================================================
  // DIVIDER
  // ============================================================================

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  dividerText: {
    color: colors.gray[500],
    paddingHorizontal: 16,
    fontWeight: '600',
  },

  // ============================================================================
  // SIGN UP & TERMS
  // ============================================================================

  signUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    color: colors.gray[600],
    fontWeight: '600',
    marginRight: 6,
  },
  signUpLink: {
    color: colors.orange[500],
    fontWeight: '800',
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  termsText: {
    color: colors.gray[500],
    fontWeight: '500',
  },
  termsLink: {
    color: colors.teal[600],
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ============================================================================
  // TERMS CHECKBOX
  // ============================================================================

  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.teal[500],
    borderColor: colors.teal[500],
  },
  termsTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  // ============================================================================
  // TERMS REMINDER MODAL
  // ============================================================================

  reminderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reminderModalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  reminderIconContainer: {
    marginBottom: 20,
  },
  reminderIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[800],
    marginBottom: 12,
    textAlign: 'center',
  },
  reminderMessage: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  reminderPointer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange[50],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  reminderPointerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.orange[600],
    marginLeft: 8,
  },
  reminderButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  reminderReadTermsBtn: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  reminderReadTermsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[700],
  },
  reminderAcceptBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reminderAcceptGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  reminderAcceptText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default LoginScreen;
