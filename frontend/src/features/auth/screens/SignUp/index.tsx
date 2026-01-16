/**
 * TANDER Sign Up Screen - Premium Edition
 * Fully responsive premium glassmorphic design matching WelcomeScreen aesthetic
 *
 * Design Philosophy:
 * - Full-screen premium gradient background (not just header)
 * - Floating hearts decoration with animations
 * - Decorative glassmorphic circles
 * - Glassmorphic card container for form
 * - Step indicator showing "Step 1 of 3"
 * - Smooth entrance animations
 * - 100% responsive (320px phones to 1280px+ tablets)
 * - Senior-friendly (56-64px touch targets, 18-20px body text)
 * - WCAG AA compliant contrast
 * - Reduce motion support
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';

// ============================================================================
// PREMIUM COLOR PALETTE - Matching WelcomeScreen exactly
// ============================================================================
const PREMIUM_COLORS = {
  // Gradient backgrounds - warm, romantic feel
  gradientTop: '#FF8A65',      // Warm coral-orange
  gradientMiddle: '#FF7043',   // Deeper coral
  gradientBottom: '#26A69A',   // Trust-inspiring teal

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.96)',
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
  heartPink: 'rgba(255, 107, 138, 0.6)',
  warmGlow: 'rgba(255, 183, 77, 0.25)',
} as const;

// ============================================================================
// ANIMATION TIMING CONSTANTS
// ============================================================================
const ANIMATION_TIMING = {
  cardEntry: 600,
  contentEntry: 500,
  heartFloat: 4000,
  staggerDelay: 100,
} as const;

// ============================================================================
// TYPES
// ============================================================================
type SignUpScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

type RegistrationMethod = 'phone' | 'email';

interface ResponsiveSizes {
  titleSize: number;
  subtitleSize: number;
  bodyTextSize: number;
  inputHeight: number;
  buttonHeight: number;
  cardPadding: number;
  cardBorderRadius: number;
  iconSize: number;
  stepTextSize: number;
  heartSizes: [number, number, number, number];
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================
const validateUsername = (username: string): string | null => {
  const trimmed = username.trim();
  if (!trimmed) return 'Please choose a username';
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 20) return 'Username cannot exceed 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Only letters, numbers, and underscores allowed';
  return null;
};

const validatePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Please enter your mobile number';
  if (digits.length !== 10) return 'Please enter all 10 digits';
  if (!digits.startsWith('9')) return 'Philippine mobile numbers start with 9';
  return null;
};

const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return 'Please enter your email';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Please enter a password';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
};

const formatPhone = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

// ============================================================================
// RESPONSIVE SIZE CALCULATOR
// ============================================================================
const calculateResponsiveSizes = (
  width: number,
  _height: number,
  isLandscape: boolean,
  isTablet: boolean,
  hp: (p: number) => number,
  wp: (p: number) => number,
  _moderateScale: (size: number, factor?: number) => number
): ResponsiveSizes => {
  const isSmallPhone = width < BREAKPOINTS.xs + 56;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;

  // Typography - senior-friendly sizes
  let titleSize: number;
  let subtitleSize: number;
  let bodyTextSize: number;
  let stepTextSize: number;

  if (isLandscape) {
    titleSize = Math.min(hp(8), wp(5), 32);
    subtitleSize = Math.min(hp(4), wp(2.8), 18);
    bodyTextSize = Math.max(16, Math.min(hp(3.5), 18));
    stepTextSize = Math.max(13, Math.min(hp(3), 15));
  } else if (isTablet) {
    titleSize = 40;
    subtitleSize = 22;
    bodyTextSize = 20;
    stepTextSize = 16;
  } else if (isLargePhone) {
    titleSize = 34;
    subtitleSize = 20;
    bodyTextSize = 18;
    stepTextSize = 15;
  } else if (isSmallPhone) {
    titleSize = 28;
    subtitleSize = 18;
    bodyTextSize = 16;
    stepTextSize = 13;
  } else {
    titleSize = 32;
    subtitleSize = 19;
    bodyTextSize = 17;
    stepTextSize = 14;
  }

  // Touch targets - generous for seniors
  const inputHeight = isLandscape
    ? Math.max(54, Math.min(hp(14), 60))
    : isTablet
      ? 64
      : 60;

  const buttonHeight = isLandscape
    ? Math.max(54, Math.min(hp(14), 60))
    : isTablet
      ? 64
      : 60;

  // Card styling
  const cardPadding = isLandscape ? 20 : isTablet ? 32 : isSmallPhone ? 20 : 24;
  const cardBorderRadius = isTablet ? 28 : 24;

  // Icons
  const iconSize = isTablet ? 24 : 22;

  // Floating hearts
  const heartBaseSize = isLandscape ? 28 : isTablet ? 32 : 24;
  const heartSizes: [number, number, number, number] = [
    heartBaseSize,
    heartBaseSize * 0.75,
    heartBaseSize * 0.6,
    heartBaseSize * 0.5,
  ];

  return {
    titleSize,
    subtitleSize,
    bodyTextSize,
    inputHeight,
    buttonHeight,
    cardPadding,
    cardBorderRadius,
    iconSize,
    stepTextSize,
    heartSizes,
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

    // Fade in
    Animated.timing(fadeAnim, {
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
  }, [floatAnim, fadeAnim, delay, reduceMotion]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const opacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
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
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
          },
        ]}
      >
        <Feather name="heart" size={size} color={PREMIUM_COLORS.heartPink} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width, height, isTablet, isLandscape, wp, hp, moderateScale } = useResponsive();

  // ============================================================================
  // STATE
  // ============================================================================
  const [reduceMotion, setReduceMotion] = useState(false);
  const [method, setMethod] = useState<RegistrationMethod>('phone');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for input navigation
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Refs for keyboard-aware scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const inputPositions = useRef<{ [key: string]: number }>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ============================================================================
  // ANIMATION VALUES
  // ============================================================================
  const cardSlideAnim = useRef(new Animated.Value(100)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacityAnim = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // RESPONSIVE SIZES
  // ============================================================================
  const sizes = useMemo(
    () => calculateResponsiveSizes(width, height, isLandscape, isTablet, hp, wp, moderateScale),
    [width, height, isLandscape, isTablet, hp, wp, moderateScale]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

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
      cardSlideAnim.setValue(0);
      cardOpacityAnim.setValue(1);
      contentOpacityAnim.setValue(1);
      return;
    }

    // Card slides up with spring
    Animated.parallel([
      Animated.spring(cardSlideAnim, {
        toValue: 0,
        tension: 45,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.cardEntry,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Content fades in after card
    Animated.timing(contentOpacityAnim, {
      toValue: 1,
      duration: ANIMATION_TIMING.contentEntry,
      delay: ANIMATION_TIMING.cardEntry - 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, cardSlideAnim, cardOpacityAnim, contentOpacityAnim]);

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError(null);
  }, [username, phone, email, password, confirmPassword, method]);

  // Keyboard event listeners for scroll management
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Scroll to focused input to ensure visibility above keyboard
  const scrollToInput = useCallback((inputName: string, additionalOffset: number = 0) => {
    // Small delay to allow keyboard to finish opening
    setTimeout(() => {
      const inputY = inputPositions.current[inputName];
      if (scrollViewRef.current && inputY !== undefined) {
        // Scroll so the input is visible with some padding above it
        const scrollOffset = Math.max(0, inputY - 120 + additionalOffset);
        scrollViewRef.current.scrollTo({
          y: scrollOffset,
          animated: true,
        });
      }
    }, Platform.OS === 'ios' ? 50 : 150);
  }, []);

  // Store input position when layout changes
  const handleInputLayout = useCallback((inputName: string) => (event: LayoutChangeEvent) => {
    inputPositions.current[inputName] = event.nativeEvent.layout.y;
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleContinue = useCallback(async () => {
    // Validate all fields
    let validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (method === 'phone') {
      validationError = validatePhone(phone);
    } else {
      validationError = validateEmail(email);
    }
    if (validationError) {
      setError(validationError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);

    try {
      // Prepare registration data
      const phoneNumber = method === 'phone' ? `+63${phone.replace(/\D/g, '')}` : '';
      const emailAddress = method === 'email' ? email.trim() : '';

      const pendingRegistration = {
        username: username.trim().toLowerCase(),
        password,
        phoneNumber,
        email: emailAddress,
        method,
      };

      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to OTP verification for both phone and email
      // The OTPVerificationScreen will handle both cases
      console.log('[SignUp] Navigating to OTPVerification with params:', {
        username: pendingRegistration.username,
        phoneNumber: pendingRegistration.phoneNumber,
        email: pendingRegistration.email,
        method: pendingRegistration.method,
      });
      navigation.navigate('OTPVerification', {
        username: pendingRegistration.username,
        phoneNumber: pendingRegistration.phoneNumber,
        email: pendingRegistration.email,
        pendingRegistration: JSON.stringify(pendingRegistration),
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [username, phone, email, password, confirmPassword, method, navigation]);

  const canContinue =
    !loading &&
    username.trim().length >= 3 &&
    (method === 'phone' ? phone.replace(/\D/g, '').length === 10 : email.includes('@')) &&
    password.length >= 8 &&
    confirmPassword.length > 0;

  // ============================================================================
  // STEP INDICATOR COMPONENT
  // ============================================================================
  const StepIndicator = () => (
    <View style={styles.stepContainer} accessible={true} accessibilityLabel="Step 1 of 3">
      <View style={styles.stepRow}>
        {/* Step 1 - Active */}
        <View style={[styles.stepDot, styles.stepDotActive]}>
          <View style={styles.stepDotInner} />
        </View>
        <View style={styles.stepLine} />
        {/* Step 2 */}
        <View style={[styles.stepDot, styles.stepDotInactive]} />
        <View style={styles.stepLine} />
        {/* Step 3 */}
        <View style={[styles.stepDot, styles.stepDotInactive]} />
      </View>
      <Text style={[styles.stepText, { fontSize: sizes.stepTextSize }]}>
        Step 1 of 3
      </Text>
    </View>
  );

  // ============================================================================
  // METHOD SELECTOR COMPONENT
  // ============================================================================
  const MethodSelector = () => (
    <View style={styles.methodContainer}>
      <Pressable
        style={[
          styles.methodButton,
          method === 'phone' && styles.methodButtonActive,
          { height: sizes.inputHeight - 8, borderRadius: (sizes.inputHeight - 8) / 2 },
        ]}
        onPress={() => setMethod('phone')}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ selected: method === 'phone' }}
        accessibilityLabel="Sign up with phone number"
      >
        <Feather
          name="smartphone"
          size={sizes.iconSize}
          color={method === 'phone' ? colors.orange[600] : colors.gray[500]}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.methodText,
            method === 'phone' && styles.methodTextActive,
            { fontSize: sizes.bodyTextSize },
          ]}
        >
          Phone
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.methodButton,
          method === 'email' && styles.methodButtonActive,
          { height: sizes.inputHeight - 8, borderRadius: (sizes.inputHeight - 8) / 2 },
        ]}
        onPress={() => setMethod('email')}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ selected: method === 'email' }}
        accessibilityLabel="Sign up with email"
      >
        <Feather
          name="mail"
          size={sizes.iconSize}
          color={method === 'email' ? colors.orange[600] : colors.gray[500]}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.methodText,
            method === 'email' && styles.methodTextActive,
            { fontSize: sizes.bodyTextSize },
          ]}
        >
          Email
        </Text>
      </Pressable>
    </View>
  );

  // ============================================================================
  // RENDER FORM CONTENT
  // ============================================================================
  const renderFormContent = () => (
    <Animated.View
      style={[
        styles.formContent,
        {
          opacity: contentOpacityAnim,
        },
      ]}
    >
      <StepIndicator />

      {/* Error message */}
      {error && (
        <View style={[styles.errorBox, { borderRadius: sizes.cardBorderRadius * 0.5 }]} accessibilityRole="alert">
          <Feather name="alert-circle" size={18} color={colors.semantic.error} style={{ marginRight: 10 }} />
          <Text style={[styles.errorText, { fontSize: sizes.bodyTextSize - 2 }]}>{error}</Text>
        </View>
      )}

      {/* Method selector */}
      <Text style={[styles.sectionLabel, { fontSize: sizes.bodyTextSize }]}>Sign up with</Text>
      <MethodSelector />

      {/* Username */}
      <View onLayout={handleInputLayout('username')}>
        <Text style={[styles.label, { fontSize: sizes.bodyTextSize - 1 }]}>Username</Text>
        <View style={[styles.inputContainer, { height: sizes.inputHeight, borderRadius: sizes.inputHeight / 2 }]}>
          <Feather name="user" size={sizes.iconSize} color={colors.gray[400]} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { fontSize: sizes.bodyTextSize }]}
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="your_username"
            placeholderTextColor={colors.gray[400]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => (method === 'phone' ? phoneRef : emailRef).current?.focus()}
            onFocus={() => scrollToInput('username')}
            editable={!loading}
            maxLength={20}
            accessibilityLabel="Username"
            accessibilityHint="3 to 20 characters using letters, numbers, and underscores"
          />
        </View>
        <Text style={styles.hint}>3-20 characters, letters, numbers, underscores</Text>
      </View>

      {/* Phone or Email */}
      {method === 'phone' ? (
        <View onLayout={handleInputLayout('phone')}>
          <Text style={[styles.label, { fontSize: sizes.bodyTextSize - 1 }]}>Mobile Number</Text>
          <View style={[styles.inputContainer, { height: sizes.inputHeight, borderRadius: sizes.inputHeight / 2 }]}>
            <Feather name="smartphone" size={sizes.iconSize} color={colors.gray[400]} style={styles.inputIcon} />
            <Text style={[styles.prefix, { fontSize: sizes.bodyTextSize }]}>+63</Text>
            <TextInput
              ref={phoneRef}
              style={[styles.input, { fontSize: sizes.bodyTextSize }]}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              placeholder="912 345 6789"
              placeholderTextColor={colors.gray[400]}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => scrollToInput('phone')}
              editable={!loading}
              maxLength={12}
              accessibilityLabel="Mobile number"
              accessibilityHint="Philippine mobile number starting with 9"
            />
          </View>
          <Text style={styles.hint}>We'll send a verification code via SMS</Text>
        </View>
      ) : (
        <View onLayout={handleInputLayout('email')}>
          <Text style={[styles.label, { fontSize: sizes.bodyTextSize - 1 }]}>Email Address</Text>
          <View style={[styles.inputContainer, { height: sizes.inputHeight, borderRadius: sizes.inputHeight / 2 }]}>
            <Feather name="mail" size={sizes.iconSize} color={colors.gray[400]} style={styles.inputIcon} />
            <TextInput
              ref={emailRef}
              style={[styles.input, { fontSize: sizes.bodyTextSize }]}
              value={email}
              onChangeText={setEmail}
              placeholder="juan@example.com"
              placeholderTextColor={colors.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => scrollToInput('email')}
              editable={!loading}
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address for verification"
            />
          </View>
          <Text style={styles.hint}>We'll send a verification code to your email</Text>
        </View>
      )}

      {/* Password */}
      <View onLayout={handleInputLayout('password')}>
        <Text style={[styles.label, { fontSize: sizes.bodyTextSize - 1 }]}>Password</Text>
        <View style={[styles.inputContainer, { height: sizes.inputHeight, borderRadius: sizes.inputHeight / 2 }]}>
          <Feather name="lock" size={sizes.iconSize} color={colors.gray[400]} style={styles.inputIcon} />
          <TextInput
            ref={passwordRef}
            style={[styles.input, styles.passwordInput, { fontSize: sizes.bodyTextSize }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor={colors.gray[400]}
            secureTextEntry={!showPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            onFocus={() => scrollToInput('password')}
            editable={!loading}
            accessibilityLabel="Password"
            accessibilityHint="Enter at least 8 characters"
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={sizes.iconSize}
              color={colors.teal[600]}
            />
          </Pressable>
        </View>
        <Text style={styles.hint}>At least 8 characters</Text>
      </View>

      {/* Confirm Password */}
      <View onLayout={handleInputLayout('confirmPassword')}>
        <Text style={[styles.label, { fontSize: sizes.bodyTextSize - 1 }]}>Confirm Password</Text>
        <View style={[styles.inputContainer, { height: sizes.inputHeight, borderRadius: sizes.inputHeight / 2 }]}>
          <Feather name="lock" size={sizes.iconSize} color={colors.gray[400]} style={styles.inputIcon} />
          <TextInput
            ref={confirmPasswordRef}
            style={[styles.input, styles.passwordInput, { fontSize: sizes.bodyTextSize }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            placeholderTextColor={colors.gray[400]}
            secureTextEntry={!showConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            onFocus={() => scrollToInput('confirmPassword', 60)}
            editable={!loading}
            accessibilityLabel="Confirm password"
            accessibilityHint="Re-enter your password to confirm"
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Feather
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={sizes.iconSize}
              color={colors.teal[600]}
            />
          </Pressable>
        </View>
      </View>

      {/* Continue Button */}
      <Pressable
        style={[styles.continueButton, { marginTop: isLandscape ? 20 : 32 }]}
        onPress={handleContinue}
        disabled={!canContinue}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Creating account' : 'Continue to next step'}
        accessibilityState={{ disabled: !canContinue }}
      >
        <LinearGradient
          colors={canContinue ? ['#FF7043', '#F4511E'] : ['#D1D5DB', '#C7CBD1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.continueGradient,
            { height: sizes.buttonHeight, borderRadius: sizes.buttonHeight / 2 },
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={[styles.continueText, { fontSize: sizes.bodyTextSize + 1 }]}>Creating...</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.continueText, { fontSize: sizes.bodyTextSize + 1 }]}>Continue</Text>
              <Feather name="arrow-right" size={sizes.iconSize + 2} color={PREMIUM_COLORS.textPrimary} />
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* Sign In Link */}
      <View style={styles.signInRow}>
        <Text style={[styles.signInText, { fontSize: sizes.bodyTextSize - 2 }]}>Already have an account?</Text>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.signInButton}
          accessibilityRole="button"
          accessibilityLabel="Sign in to existing account"
        >
          <Text style={[styles.signInLink, { fontSize: sizes.bodyTextSize - 2 }]}>Sign In</Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const contentMaxWidth = isTablet ? 600 : 480;
  const screenPadding = isLandscape ? wp(4) : isTablet ? 40 : 24;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Premium Gradient Background - FULL SCREEN */}
      <LinearGradient
        colors={[
          PREMIUM_COLORS.gradientTop,
          PREMIUM_COLORS.gradientMiddle,
          PREMIUM_COLORS.gradientBottom,
        ]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        {/* Decorative background circles */}
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle1,
            {
              width: isTablet ? 400 : isLandscape ? 220 : 320,
              height: isTablet ? 400 : isLandscape ? 220 : 320,
              borderRadius: isTablet ? 200 : isLandscape ? 110 : 160,
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle2,
            {
              width: isTablet ? 300 : isLandscape ? 160 : 240,
              height: isTablet ? 300 : isLandscape ? 160 : 240,
              borderRadius: isTablet ? 150 : isLandscape ? 80 : 120,
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle3,
            {
              width: isTablet ? 180 : isLandscape ? 100 : 140,
              height: isTablet ? 180 : isLandscape ? 100 : 140,
              borderRadius: isTablet ? 90 : isLandscape ? 50 : 70,
            },
          ]}
        />

        {/* Floating hearts decoration */}
        {!reduceMotion && (
          <>
            <FloatingHeart size={sizes.heartSizes[0]} positionX={10} positionY={12} delay={0} reduceMotion={reduceMotion} />
            <FloatingHeart size={sizes.heartSizes[1]} positionX={85} positionY={15} delay={400} reduceMotion={reduceMotion} />
            <FloatingHeart size={sizes.heartSizes[2]} positionX={8} positionY={70} delay={700} reduceMotion={reduceMotion} />
            <FloatingHeart size={sizes.heartSizes[1]} positionX={88} positionY={65} delay={500} reduceMotion={reduceMotion} />
            <FloatingHeart size={sizes.heartSizes[3]} positionX={50} positionY={85} delay={900} reduceMotion={reduceMotion} />
          </>
        )}

        {/* Safe area container */}
        <View
          style={[
            styles.safeContainer,
            {
              paddingTop: insets.top + (isLandscape ? hp(2) : 16),
              paddingBottom: insets.bottom,
              paddingLeft: Math.max(insets.left, screenPadding),
              paddingRight: Math.max(insets.right, screenPadding),
            },
          ]}
        >
          {/* Header with back button */}
          <View style={[styles.header, { marginBottom: isLandscape ? hp(3) : 20 }]}>
            <Pressable
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back to welcome screen"
            >
              <View style={styles.backButtonCircle}>
                <Feather name="arrow-left" size={24} color={PREMIUM_COLORS.textPrimary} />
              </View>
            </Pressable>

            <View style={styles.headerTextContainer}>
              <Text style={[styles.title, { fontSize: sizes.titleSize }]}>Create Account</Text>
              <Text style={[styles.subtitle, { fontSize: sizes.subtitleSize }]}>
                Start your journey to meaningful connections
              </Text>
            </View>
          </View>

          {/* Glassmorphic Card Container */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
          >
            <Animated.View
              style={[
                styles.glassCard,
                {
                  maxWidth: contentMaxWidth,
                  borderRadius: sizes.cardBorderRadius,
                  padding: sizes.cardPadding,
                  opacity: cardOpacityAnim,
                  transform: [{ translateY: cardSlideAnim }],
                },
              ]}
            >
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: keyboardHeight > 0 ? 40 : 16 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={true}
                overScrollMode="always"
                scrollEventThrottle={16}
              >
                {renderFormContent()}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// STYLES - Premium, Glassmorphic Design
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

  // Decorative elements
  decorCircle: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.glassTint,
  },
  decorCircle1: {
    top: -80,
    right: -60,
  },
  decorCircle2: {
    top: '40%',
    left: -100,
  },
  decorCircle3: {
    bottom: '10%',
    right: -50,
  },

  floatingHeart: {
    position: 'absolute',
  },
  heartCircle: {
    backgroundColor: 'rgba(255, 107, 138, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 138, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: PREMIUM_COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Glassmorphic card
  keyboardView: {
    flex: 1,
  },
  glassCard: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cardBackground,
    alignSelf: 'center',
    width: '100%',
    shadowColor: PREMIUM_COLORS.cardShadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  formContent: {
    // Animated content wrapper
  },

  // Step indicator
  stepContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.orange[500],
    borderWidth: 2,
    borderColor: colors.orange[200],
  },
  stepDotInactive: {
    backgroundColor: colors.gray[300],
  },
  stepDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  stepLine: {
    width: 32,
    height: 3,
    backgroundColor: colors.gray[300],
    marginHorizontal: 6,
  },
  stepText: {
    color: colors.gray[700],
    fontWeight: '600',
  },

  // Error box
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontWeight: '600',
    flex: 1,
  },

  // Method selector
  sectionLabel: {
    color: colors.gray[700],
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  methodContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  methodButtonActive: {
    borderColor: colors.orange[500],
    backgroundColor: colors.orange[50],
    shadowColor: 'rgba(249, 115, 22, 0.3)',
  },
  methodText: {
    color: colors.gray[600],
    fontWeight: '700',
  },
  methodTextActive: {
    color: colors.orange[600],
  },

  // Input fields
  label: {
    color: colors.gray[700],
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.gray[900],
    paddingVertical: 0,
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 48,
  },
  prefix: {
    color: colors.gray[600],
    fontWeight: '600',
    marginRight: 8,
  },
  hint: {
    color: colors.gray[500],
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Continue button
  continueButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: 'rgba(244, 81, 30, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  continueGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  continueText: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Sign in link
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  signInText: {
    color: colors.gray[600],
    fontWeight: '500',
  },
  signInButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  signInLink: {
    color: colors.orange[600],
    fontWeight: '800',
  },
});

export default SignUpScreen;
