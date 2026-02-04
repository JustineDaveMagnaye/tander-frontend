/**
 * TANDER Sign Up Step 1 Screen - Premium Edition
 * Account Creation: Username, Phone/Email, Password
 *
 * Design Philosophy:
 * - Premium gradient backgrounds matching WelcomeScreen
 * - Glassmorphism styling with semi-transparent containers
 * - Floating heart decorations with animations
 * - Decorative background circles
 * - Large, senior-friendly touch targets (56-64px minimum)
 * - Font sizes: Body 18-20px minimum, never below 16px
 * - WCAG AA contrast compliance
 * - Smooth entrance animations (fade in, slide up)
 * - Premium glow effects
 * - Safe area handling with useSafeAreaInsets
 * - Responsive sizing using useResponsive hook
 * - Math.min pattern for landscape safety
 *
 * Features:
 * - Step indicator showing 1/4 progress
 * - Phone/Email toggle with animated selection
 * - Password strength indicator
 * - Character count for username
 * - Real-time validation feedback
 * - Premium button with gradient and shadow
 * - Floating hearts decoration
 * - Decorative background circles
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';

// ============================================================================
// PREMIUM COLOR PALETTE - Warm, Romantic, Trustworthy
// ============================================================================

const PREMIUM_COLORS = {
  // Gradient backgrounds - warmer, more romantic feel
  gradientTop: '#FF8A65', // Warm coral-orange
  gradientMiddle: '#FF7043', // Deeper coral
  gradientBottom: '#26A69A', // Trust-inspiring teal

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
  contentStagger: 100,
  heartFloat: 3500,
} as const;

// ============================================================================
// TYPES
// ============================================================================

type Step1ScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUpStep1'>;
};

type RegistrationMethod = 'phone' | 'email';

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

// Format phone number for display
const formatPhone = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

// Calculate password strength (0-3)
const calculatePasswordStrength = (password: string): number => {
  if (password.length < 8) return 0;
  let strength = 1;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength = 3;
  return Math.min(strength, 3);
};

// ============================================================================
// FLOATING HEART DECORATION COMPONENT
// ============================================================================

interface FloatingHeartProps {
  size: number;
  positionX: number;
  positionY: number;
  delay: number;
  duration?: number;
}

const FloatingHeart: React.FC<FloatingHeartProps> = ({
  size,
  positionX,
  positionY,
  delay,
  duration = ANIMATION_TIMING.heartFloat,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in with delay
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Float up and down
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration,
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
  }, [floatAnim, fadeAnim, delay, duration]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
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
// STEP INDICATOR COMPONENT
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  captionFontSize: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, captionFontSize }) => {
  return (
    <View style={styles.stepContainer} accessible={true} accessibilityRole="progressbar">
      <View style={styles.stepRow}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 && <View style={styles.stepLine} />}
            <View
              style={[
                styles.stepDot,
                step === currentStep && styles.stepDotActive,
                step < currentStep && styles.stepDotCompleted,
                step > currentStep && styles.stepDotInactive,
              ]}
            >
              {step === currentStep && <View style={styles.stepDotInner} />}
              {step < currentStep && <Feather name="check" size={8} color={colors.white} />}
            </View>
          </React.Fragment>
        ))}
      </View>
      <Text style={[styles.stepText, { fontSize: captionFontSize }]}>
        Step {currentStep} of {totalSteps}: Create Account
      </Text>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Step1Screen: React.FC<Step1ScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width, height, isTablet, isLandscape, hp, wp, moderateScale } = useResponsive();

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
  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Animation values
  const cardAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // RESPONSIVE SIZING
  // ============================================================================

  const isSmallPhone = width < BREAKPOINTS.xs + 56;
  const isMediumPhone = width >= BREAKPOINTS.xs + 56 && width < BREAKPOINTS.largePhone;

  const sizes = useMemo(() => {
    const inputHeight = isLandscape
      ? Math.max(54, Math.min(hp(12), 60))
      : isTablet
      ? 64
      : 58;

    const buttonHeight = isLandscape
      ? Math.max(54, Math.min(hp(14), 64))
      : isTablet
      ? 68
      : 64;

    const titleSize = isLandscape
      ? Math.min(hp(9), wp(5), 38)
      : isTablet
      ? 42
      : isSmallPhone
      ? 28
      : 32;

    const bodyFontSize = isLandscape
      ? Math.max(15, Math.min(hp(4), 17))
      : isTablet
      ? 20
      : 18;

    const inputFontSize = isLandscape
      ? Math.max(15, Math.min(hp(4), 17))
      : isTablet
      ? 19
      : 17;

    const labelFontSize = isLandscape
      ? Math.max(14, Math.min(hp(3.5), 16))
      : isTablet
      ? 18
      : 16;

    const captionFontSize = isLandscape
      ? Math.max(12, Math.min(hp(3), 14))
      : isTablet
      ? 16
      : 14;

    const screenPadding = isSmallPhone ? 20 : isMediumPhone ? 24 : isTablet ? 32 : 24;

    const cardPadding = isLandscape ? wp(3) : isTablet ? 32 : 24;

    const cardBorderRadius = isTablet ? 32 : 24;

    const heartBaseSize = isLandscape ? Math.min(hp(6), 28) : isTablet ? 32 : 24;

    return {
      inputHeight,
      buttonHeight,
      titleSize,
      bodyFontSize,
      inputFontSize,
      labelFontSize,
      captionFontSize,
      screenPadding,
      cardPadding,
      cardBorderRadius,
      heartBaseSize,
    };
  }, [width, height, isLandscape, isTablet, hp, wp, isSmallPhone, isMediumPhone]);

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

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove();
  }, []);

  // Entrance animations
  useEffect(() => {
    if (reduceMotion) {
      cardAnim.setValue(1);
      contentAnim.setValue(1);
      return;
    }

    // Card slides up with spring
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 35,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Content fades in slightly delayed
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: ANIMATION_TIMING.cardEntry,
      delay: ANIMATION_TIMING.contentStagger,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, cardAnim, contentAnim]);

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError(null);
  }, [username, phone, email, password, confirmPassword, method]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

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
      // Prepare registration data for next step
      const phoneNumber = method === 'phone' ? `+63${phone.replace(/\D/g, '')}` : '';
      const emailAddress = method === 'email' ? email.trim() : '';

      // Store data and navigate to Step 2
      // In production, you would pass this data via navigation params or state management
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to Step 2 (Profile Setup)
      // navigation.navigate('SignUpStep2', {
      //   username: username.trim().toLowerCase(),
      //   phoneNumber,
      //   email: emailAddress,
      //   password,
      //   method,
      // });

      // TODO: Replace with actual navigation when Step 2 is implemented
      console.log('Step 1 data ready:', {
        username: username.trim(),
        phoneNumber,
        email: emailAddress,
        method,
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [username, phone, email, password, confirmPassword, method, navigation]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const canContinue =
    !loading &&
    username.trim().length >= 3 &&
    (method === 'phone' ? phone.replace(/\D/g, '').length === 10 : email.includes('@')) &&
    password.length >= 8 &&
    confirmPassword.length > 0;

  const passwordStrength = calculatePasswordStrength(password);
  const strengthColors = ['#F44336', '#FFC107', '#4CAF50', '#2196F3'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  // Animation interpolations
  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderMethodSelector = () => (
    <View style={styles.methodContainer}>
      <Pressable
        style={[
          styles.methodButton,
          method === 'phone' && styles.methodButtonActive,
          { height: sizes.inputHeight - 6 },
        ]}
        onPress={() => setMethod('phone')}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ selected: method === 'phone' }}
        accessibilityLabel="Sign up with phone number"
      >
        <Feather
          name="smartphone"
          size={sizes.inputFontSize}
          color={method === 'phone' ? colors.orange[600] : colors.gray[500]}
        />
        <Text
          style={[
            styles.methodText,
            method === 'phone' && styles.methodTextActive,
            { fontSize: sizes.inputFontSize },
          ]}
        >
          Phone
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.methodButton,
          method === 'email' && styles.methodButtonActive,
          { height: sizes.inputHeight - 6 },
        ]}
        onPress={() => setMethod('email')}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ selected: method === 'email' }}
        accessibilityLabel="Sign up with email"
      >
        <Feather
          name="mail"
          size={sizes.inputFontSize}
          color={method === 'email' ? colors.orange[600] : colors.gray[500]}
        />
        <Text
          style={[
            styles.methodText,
            method === 'email' && styles.methodTextActive,
            { fontSize: sizes.inputFontSize },
          ]}
        >
          Email
        </Text>
      </Pressable>
    </View>
  );

  const renderPasswordStrength = () => {
    if (password.length === 0) return null;

    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBars}>
          {[0, 1, 2, 3].map((level) => (
            <View
              key={level}
              style={[
                styles.strengthBar,
                passwordStrength >= level && {
                  backgroundColor: strengthColors[passwordStrength],
                },
              ]}
            />
          ))}
        </View>
        <Text
          style={[
            styles.strengthLabel,
            { fontSize: sizes.captionFontSize, color: strengthColors[passwordStrength] },
          ]}
        >
          {strengthLabels[passwordStrength]}
        </Text>
      </View>
    );
  };

  const renderFormContent = () => (
    <Animated.View
      style={{
        opacity: contentAnim,
      }}
    >
      {/* Step Indicator */}
      <StepIndicator currentStep={1} totalSteps={3} captionFontSize={sizes.captionFontSize} />

      {/* Error message */}
      {error && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Feather name="alert-circle" size={20} color={colors.semantic.error} />
          <Text style={[styles.errorText, { fontSize: sizes.captionFontSize }]}>{error}</Text>
        </View>
      )}

      {/* Instructions */}
      <Text
        style={[
          styles.instruction,
          { fontSize: sizes.bodyFontSize, lineHeight: sizes.bodyFontSize * 1.5 },
        ]}
      >
        Let's create your account
      </Text>

      {/* Method selector */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>Sign up with</Text>
      {renderMethodSelector()}

      {/* Username */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
        Username <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputContainer, { height: sizes.inputHeight }]}>
        <Feather name="user" size={sizes.inputFontSize} color={colors.gray[400]} />
        <TextInput
          ref={usernameRef}
          style={[styles.input, { fontSize: sizes.inputFontSize }]}
          value={username}
          onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))}
          placeholder="your_username"
          placeholderTextColor={colors.gray[400]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => (method === 'phone' ? phoneRef : emailRef).current?.focus()}
          editable={!loading}
          maxLength={20}
          accessibilityLabel="Username"
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
        />
        {username.length > 0 && (
          <Text style={[styles.charCount, { fontSize: sizes.captionFontSize }]}>
            {username.length}/20
          </Text>
        )}
      </View>
      <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
        3-20 characters, letters, numbers, underscores
      </Text>

      {/* Phone or Email */}
      {method === 'phone' ? (
        <>
          <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
            Mobile Number <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: sizes.inputHeight }]}>
            <Feather name="smartphone" size={sizes.inputFontSize} color={colors.gray[400]} />
            <Text style={[styles.prefix, { fontSize: sizes.inputFontSize }]}>+63</Text>
            <TextInput
              ref={phoneRef}
              style={[styles.input, { fontSize: sizes.inputFontSize }]}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              placeholder="912 345 6789"
              placeholderTextColor={colors.gray[400]}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
              maxLength={12}
              accessibilityLabel="Mobile number"
              maxFontSizeMultiplier={FONT_SCALING.INPUT}
            />
          </View>
          <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
            We'll send a verification code via SMS
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: sizes.inputHeight }]}>
            <Feather name="mail" size={sizes.inputFontSize} color={colors.gray[400]} />
            <TextInput
              ref={emailRef}
              style={[styles.input, { fontSize: sizes.inputFontSize }]}
              value={email}
              onChangeText={setEmail}
              placeholder="juan@example.com"
              placeholderTextColor={colors.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
              accessibilityLabel="Email address"
              maxFontSizeMultiplier={FONT_SCALING.INPUT}
            />
          </View>
          <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
            We'll send a verification code to your email
          </Text>
        </>
      )}

      {/* Password */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
        Password <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputContainer, { height: sizes.inputHeight }]}>
        <Feather name="lock" size={sizes.inputFontSize} color={colors.gray[400]} />
        <TextInput
          ref={passwordRef}
          style={[styles.input, styles.passwordInput, { fontSize: sizes.inputFontSize }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={!showPassword}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          editable={!loading}
          accessibilityLabel="Password"
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Feather
            name={showPassword ? 'eye-off' : 'eye'}
            size={sizes.inputFontSize}
            color={colors.teal[600]}
          />
        </Pressable>
      </View>
      {renderPasswordStrength()}
      <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
        At least 8 characters. Include uppercase, numbers, or symbols for stronger security
      </Text>

      {/* Confirm Password */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
        Confirm Password <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputContainer, { height: sizes.inputHeight }]}>
        <Feather name="lock" size={sizes.inputFontSize} color={colors.gray[400]} />
        <TextInput
          ref={confirmPasswordRef}
          style={[styles.input, styles.passwordInput, { fontSize: sizes.inputFontSize }]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={!showConfirmPassword}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          editable={!loading}
          accessibilityLabel="Confirm password"
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
        >
          <Feather
            name={showConfirmPassword ? 'eye-off' : 'eye'}
            size={sizes.inputFontSize}
            color={colors.teal[600]}
          />
        </Pressable>
      </View>

      {/* Continue Button */}
      <Pressable
        style={[
          styles.continueButton,
          { height: sizes.buttonHeight, borderRadius: sizes.buttonHeight / 2 },
        ]}
        onPress={handleContinue}
        disabled={!canContinue}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Creating account' : 'Continue to next step'}
        accessibilityState={{ disabled: !canContinue }}
      >
        <LinearGradient
          colors={canContinue ? colors.gradient.primaryButton : ['#D1D5DB', '#C7CBD1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueGradient}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={[styles.continueText, { fontSize: sizes.bodyFontSize }]}>
                Processing...
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.continueText, { fontSize: sizes.bodyFontSize }]}>
                Continue
              </Text>
              <Feather name="arrow-right" size={sizes.bodyFontSize + 2} color={colors.white} />
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* Sign In Link */}
      <View style={styles.signInRow}>
        <Text style={[styles.signInText, { fontSize: sizes.captionFontSize }]}>
          Already have an account?
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.signInButton}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text style={[styles.signInLink, { fontSize: sizes.captionFontSize }]}>Sign In</Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Gradient Background */}
      <LinearGradient
        colors={[PREMIUM_COLORS.gradientTop, PREMIUM_COLORS.gradientMiddle, PREMIUM_COLORS.gradientBottom]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />

        {/* Floating hearts decoration */}
        {!reduceMotion && (
          <>
            <FloatingHeart size={sizes.heartBaseSize} positionX={10} positionY={12} delay={0} />
            <FloatingHeart size={sizes.heartBaseSize * 0.7} positionX={85} positionY={15} delay={300} />
            <FloatingHeart size={sizes.heartBaseSize * 0.5} positionX={12} positionY={75} delay={600} />
            <FloatingHeart size={sizes.heartBaseSize * 0.6} positionX={88} positionY={70} delay={400} />
          </>
        )}

        {/* Header with back button */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + (isTablet ? 24 : 16),
              paddingHorizontal: sizes.screenPadding,
            },
          ]}
        >
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View style={styles.backButtonIcon}>
              <Feather name="arrow-left" size={24} color={PREMIUM_COLORS.textPrimary} />
            </View>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text
              style={[styles.title, { fontSize: sizes.titleSize }]}
              accessible={true}
              accessibilityRole="header"
            >
              Create Account
            </Text>
            <Text style={[styles.subtitle, { fontSize: sizes.captionFontSize + 2 }]}>
              Start your journey to meaningful connections
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.formWrapper}
        >
          <Animated.View
            style={[
              styles.formCard,
              {
                borderTopLeftRadius: sizes.cardBorderRadius,
                borderTopRightRadius: sizes.cardBorderRadius,
                paddingBottom: insets.bottom + (isTablet ? 24 : 16),
                transform: [{ translateY: cardTranslateY }],
                opacity: cardAnim,
              },
            ]}
          >
            <View style={styles.cardHandle} />
            <ScrollView
              contentContainerStyle={{
                padding: sizes.cardPadding,
                paddingBottom: sizes.cardPadding + 20,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderFormContent()}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
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

  // Decorative elements
  decorCircle: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.glassTint,
    borderRadius: 9999,
  },
  decorCircle1: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    top: '30%',
    left: -80,
  },
  decorCircle3: {
    width: 120,
    height: 120,
    bottom: '20%',
    right: -40,
  },

  // Floating hearts
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

  // Header
  header: {
    paddingBottom: 20,
  },
  backButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginTop: 8,
  },
  title: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: PREMIUM_COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 22,
  },

  // Form wrapper
  formWrapper: {
    flex: 1,
  },
  formCard: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cardBackground,
    shadowColor: PREMIUM_COLORS.cardShadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  cardHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray[200],
    marginTop: 12,
    marginBottom: 4,
  },

  // Step indicator
  stepContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.orange[500],
    borderWidth: 3,
    borderColor: colors.orange[200],
  },
  stepDotCompleted: {
    backgroundColor: colors.teal[500],
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
    width: 40,
    height: 3,
    backgroundColor: colors.gray[300],
    marginHorizontal: 8,
  },
  stepText: {
    color: colors.gray[700],
    fontWeight: '600',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
  },
  errorText: {
    flex: 1,
    color: colors.semantic.error,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Instructions
  instruction: {
    color: colors.gray[700],
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Method selector
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
    gap: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  methodButtonActive: {
    borderColor: colors.orange[500],
    backgroundColor: colors.orange[50],
  },
  methodText: {
    color: colors.gray[600],
    fontWeight: '700',
  },
  methodTextActive: {
    color: colors.orange[600],
  },

  // Labels and inputs
  label: {
    color: colors.gray[700],
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: colors.semantic.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: colors.gray[900],
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 48,
  },
  prefix: {
    color: colors.gray[600],
    fontWeight: '600',
  },
  hint: {
    color: colors.gray[500],
    marginTop: 6,
    lineHeight: 18,
  },
  charCount: {
    color: colors.gray[400],
    fontWeight: '500',
  },
  eyeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Password strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
  },
  strengthLabel: {
    fontWeight: '600',
    minWidth: 50,
  },

  // Continue button
  continueButton: {
    marginTop: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(244, 81, 30, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  continueGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  continueText: {
    color: colors.white,
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
    gap: 8,
  },
  signInText: {
    color: colors.gray[600],
  },
  signInButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  signInLink: {
    color: colors.orange[500],
    fontWeight: '800',
  },
});

export default Step1Screen;
