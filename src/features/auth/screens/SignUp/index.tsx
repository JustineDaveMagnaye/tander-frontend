/**
 * TANDER Sign Up Screen - Premium iOS Edition
 * Clean, modern iOS-style design with card-based form fields
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthStackParamList } from '@navigation/types';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useAuthStore } from '@store/authStore';

// ============================================================================
// iOS DESIGN SYSTEM
// ============================================================================
const iOS = {
  colors: {
    background: '#F2F2F7',
    secondaryBackground: '#FFFFFF',
    tertiaryBackground: '#F2F2F7',
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#8E8E93',
    quaternaryLabel: '#C7C7CC',
    teal: '#30D5C8',
    tealDark: '#20B2AA',
    tealLight: 'rgba(48, 213, 200, 0.1)',
    orange: '#F97316',
    orangeDark: '#EA580C',
    orangeLight: 'rgba(249, 115, 22, 0.1)',
    separator: 'rgba(60, 60, 67, 0.12)',
    opaqueSeparator: '#C6C6C8',
    systemFill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(120, 120, 128, 0.12)',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 100 },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
  shadow: {
    small: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    large: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================
type SignUpScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
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

const formatPhone = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

// ============================================================================
// INPUT CARD COMPONENT - Defined outside to prevent re-creation
// ============================================================================
interface InputCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  hint?: string;
  hasValue: boolean;
  children: React.ReactNode;
}

const InputCard: React.FC<InputCardProps> = React.memo(({ icon, label, hint, hasValue, children }) => (
  <View style={styles.inputCard}>
    <View style={styles.inputCardHeader}>
      <View style={[styles.inputIconCircle, hasValue && styles.inputIconCircleActive]}>
        <Feather name={icon} size={20} color={hasValue ? iOS.colors.orange : iOS.colors.tertiaryLabel} />
      </View>
      <View style={styles.inputLabelContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {hint && <Text style={styles.inputHint}>{hint}</Text>}
      </View>
    </View>
    {children}
  </View>
));

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const scannedIdFront = useAuthStore((state) => state.scannedIdFront);

  // State
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Refs
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Effects
  useEffect(() => {
    if (!scannedIdFront) {
      navigation.replace('IDScanner');
    }
  }, [navigation, scannedIdFront]);

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
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      cardAnim.setValue(1);
    }
  }, [reduceMotion, cardAnim]);

  useEffect(() => {
    if (error) setError(null);
  }, [username, phone, email, password, confirmPassword, method]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handlers
  const handleContinue = async () => {
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
      const phoneNumber = method === 'phone' ? `+63${phone.replace(/\D/g, '')}` : '';
      const emailAddress = method === 'email' ? email.trim() : '';

      const pendingRegistration = {
        username: username.trim(),
        password,
        phoneNumber,
        email: emailAddress,
        method,
      };

      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
  };

  const canContinue =
    !loading &&
    username.trim().length >= 3 &&
    (method === 'phone' ? phone.replace(/\D/g, '').length === 10 : email.includes('@')) &&
    password.length >= 8 &&
    confirmPassword.length > 0;

  const handleMethodChange = (newMethod: RegistrationMethod) => {
    setMethod(newMethod);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ============================================================================
  // LANDSCAPE LAYOUT
  // ============================================================================
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']} locations={[0, 0.4, 1]} style={styles.gradient}>
          <View style={[styles.landscapeContainer, { paddingTop: insets.top }]}>
            {/* Left Panel */}
            <View style={[styles.landscapeLeft, { paddingLeft: insets.left + iOS.spacing.xl }]}>
              <View style={styles.landscapeBranding}>
                <View style={styles.landscapeIconCircle}>
                  <Feather name="heart" size={32} color={iOS.colors.white} />
                </View>
                <Text style={styles.landscapeTitle} maxFontSizeMultiplier={FONT_SCALING.TITLE}>Create Account</Text>
                <Text style={styles.landscapeSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Start your journey to{'\n'}meaningful connections</Text>
                <View style={styles.landscapeProgress}>
                  <View style={[styles.progressDot, styles.progressDotActive]} />
                  <View style={styles.progressDot} />
                  <View style={styles.progressDot} />
                </View>
              </View>
            </View>

            {/* Right Panel */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.landscapeRight, { paddingRight: insets.right + iOS.spacing.xl }]}
            >
              <Animated.View
                style={[
                  styles.landscapeCard,
                  {
                    opacity: cardAnim,
                    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                  },
                ]}
              >
                <ScrollView
                  ref={scrollViewRef}
                  contentContainerStyle={styles.landscapeScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Error */}
                  {error && (
                    <View style={styles.errorCard}>
                      <Feather name="alert-circle" size={20} color={iOS.colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* Method Toggle */}
                  <View style={styles.methodCard}>
                    <View style={styles.methodCardHeader}>
                      <View style={[styles.inputIconCircle, styles.inputIconCircleActive]}>
                        <Feather name="user-plus" size={20} color={iOS.colors.orange} />
                      </View>
                      <View style={styles.inputLabelContainer}>
                        <Text style={styles.inputLabel}>Sign up method</Text>
                        <Text style={styles.inputHint}>Choose how to verify your account</Text>
                      </View>
                    </View>
                    <View style={styles.methodToggle}>
                      <Pressable
                        style={[styles.methodOption, method === 'phone' && styles.methodOptionActive]}
                        onPress={() => handleMethodChange('phone')}
                        disabled={loading}
                      >
                        <Feather name="smartphone" size={20} color={method === 'phone' ? iOS.colors.white : iOS.colors.tertiaryLabel} />
                        <Text style={[styles.methodText, method === 'phone' && styles.methodTextActive]}>Phone</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.methodOption, method === 'email' && styles.methodOptionActive]}
                        onPress={() => handleMethodChange('email')}
                        disabled={loading}
                      >
                        <Feather name="mail" size={20} color={method === 'email' ? iOS.colors.white : iOS.colors.tertiaryLabel} />
                        <Text style={[styles.methodText, method === 'email' && styles.methodTextActive]}>Email</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Username */}
                  <InputCard icon="at-sign" label="Username" hint="3-20 characters" hasValue={username.length > 0}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        value={username}
                        onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder="your_username"
                        placeholderTextColor={iOS.colors.quaternaryLabel}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => (method === 'phone' ? phoneRef : emailRef).current?.focus()}
                        editable={!loading}
                        maxLength={20}
                        maxFontSizeMultiplier={FONT_SCALING.INPUT}
                      />
                    </View>
                  </InputCard>

                  {/* Phone or Email */}
                  {method === 'phone' ? (
                    <InputCard icon="phone" label="Mobile Number" hint="We'll send a verification code" hasValue={phone.length > 0}>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.phonePrefix}>+63</Text>
                        <TextInput
                          ref={phoneRef}
                          style={[styles.textInput, styles.phoneInput]}
                          value={phone}
                          onChangeText={(text) => setPhone(formatPhone(text))}
                          placeholder="912 345 6789"
                          placeholderTextColor={iOS.colors.quaternaryLabel}
                          keyboardType="phone-pad"
                          returnKeyType="next"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                          editable={!loading}
                          maxLength={12}
                          maxFontSizeMultiplier={FONT_SCALING.INPUT}
                        />
                      </View>
                    </InputCard>
                  ) : (
                    <InputCard icon="mail" label="Email Address" hint="We'll send a verification link" hasValue={email.length > 0}>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          ref={emailRef}
                          style={styles.textInput}
                          value={email}
                          onChangeText={setEmail}
                          placeholder="you@example.com"
                          placeholderTextColor={iOS.colors.quaternaryLabel}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                          editable={!loading}
                          maxFontSizeMultiplier={FONT_SCALING.INPUT}
                        />
                      </View>
                    </InputCard>
                  )}

                  {/* Password */}
                  <InputCard icon="lock" label="Password" hint="At least 8 characters" hasValue={password.length > 0}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        ref={passwordRef}
                        style={[styles.textInput, styles.passwordInput]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Create a password"
                        placeholderTextColor={iOS.colors.quaternaryLabel}
                        secureTextEntry={!showPassword}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                        editable={!loading}
                        maxFontSizeMultiplier={FONT_SCALING.INPUT}
                      />
                      <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                        <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={iOS.colors.teal} />
                      </Pressable>
                    </View>
                  </InputCard>

                  {/* Confirm Password */}
                  <InputCard icon="shield" label="Confirm Password" hint="Re-enter to confirm" hasValue={confirmPassword.length > 0}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        ref={confirmPasswordRef}
                        style={[styles.textInput, styles.passwordInput]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm password"
                        placeholderTextColor={iOS.colors.quaternaryLabel}
                        secureTextEntry={!showConfirmPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleContinue}
                        editable={!loading}
                        maxFontSizeMultiplier={FONT_SCALING.INPUT}
                      />
                      <Pressable style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={iOS.colors.teal} />
                      </Pressable>
                    </View>
                  </InputCard>

                  {/* Continue Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.continueButton,
                      !canContinue && styles.continueButtonDisabled,
                      pressed && canContinue && styles.continueButtonPressed,
                    ]}
                    onPress={handleContinue}
                    disabled={!canContinue}
                  >
                    {loading ? (
                      <ActivityIndicator color={iOS.colors.white} />
                    ) : (
                      <>
                        <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Continue</Text>
                        <Feather name="arrow-right" size={22} color={canContinue ? iOS.colors.white : iOS.colors.quaternaryLabel} />
                      </>
                    )}
                  </Pressable>

                  {/* Sign In */}
                  <View style={styles.signInRow}>
                    <Text style={styles.signInText}>Already have an account?</Text>
                    <Pressable onPress={() => navigation.navigate('Login')} style={styles.signInButton}>
                      <Text style={styles.signInLink}>Sign In</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ============================================================================
  // PORTRAIT LAYOUT
  // ============================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']} locations={[0, 0.4, 1]} style={styles.gradient}>
        <View style={[styles.safeContainer, { paddingTop: insets.top + iOS.spacing.lg, paddingBottom: insets.bottom, paddingHorizontal: iOS.spacing.lg }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} maxFontSizeMultiplier={FONT_SCALING.TITLE}>Create Account</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Start your journey to meaningful connections</Text>
          </View>

          {/* Main Card */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView} keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
            <Animated.View
              style={[
                styles.mainCard,
                {
                  opacity: cardAnim,
                  transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
                },
              ]}
            >
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardVisible ? 40 : iOS.spacing.lg }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Step Indicator */}
                <View style={styles.stepContainer}>
                  <View style={styles.stepRow}>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepCircle, styles.stepCircleActive]}>
                        <Text style={[styles.stepNumber, styles.stepNumberActive]}>1</Text>
                      </View>
                      <Text style={[styles.stepLabel, styles.stepLabelActive]}>Account</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={styles.stepItem}>
                      <View style={styles.stepCircle}>
                        <Text style={styles.stepNumber}>2</Text>
                      </View>
                      <Text style={styles.stepLabel}>Verify</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={styles.stepItem}>
                      <View style={styles.stepCircle}>
                        <Text style={styles.stepNumber}>3</Text>
                      </View>
                      <Text style={styles.stepLabel}>Profile</Text>
                    </View>
                  </View>
                </View>

                {/* Error */}
                {error && (
                  <View style={styles.errorCard}>
                    <Feather name="alert-circle" size={20} color={iOS.colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Method Toggle */}
                <View style={styles.methodCard}>
                  <View style={styles.methodCardHeader}>
                    <View style={[styles.inputIconCircle, styles.inputIconCircleActive]}>
                      <Feather name="user-plus" size={20} color={iOS.colors.orange} />
                    </View>
                    <View style={styles.inputLabelContainer}>
                      <Text style={styles.inputLabel}>Sign up method</Text>
                      <Text style={styles.inputHint}>Choose how to verify your account</Text>
                    </View>
                  </View>
                  <View style={styles.methodToggle}>
                    <Pressable
                      style={[styles.methodOption, method === 'phone' && styles.methodOptionActive]}
                      onPress={() => handleMethodChange('phone')}
                      disabled={loading}
                    >
                      <Feather name="smartphone" size={20} color={method === 'phone' ? iOS.colors.white : iOS.colors.tertiaryLabel} />
                      <Text style={[styles.methodText, method === 'phone' && styles.methodTextActive]}>Phone</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.methodOption, method === 'email' && styles.methodOptionActive]}
                      onPress={() => handleMethodChange('email')}
                      disabled={loading}
                    >
                      <Feather name="mail" size={20} color={method === 'email' ? iOS.colors.white : iOS.colors.tertiaryLabel} />
                      <Text style={[styles.methodText, method === 'email' && styles.methodTextActive]}>Email</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Username */}
                <InputCard icon="at-sign" label="Username" hint="3-20 characters" hasValue={username.length > 0}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={username}
                      onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="your_username"
                      placeholderTextColor={iOS.colors.quaternaryLabel}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => (method === 'phone' ? phoneRef : emailRef).current?.focus()}
                      editable={!loading}
                      maxLength={20}
                      maxFontSizeMultiplier={FONT_SCALING.INPUT}
                    />
                  </View>
                </InputCard>

                {/* Phone or Email */}
                {method === 'phone' ? (
                  <InputCard icon="phone" label="Mobile Number" hint="We'll send a verification code" hasValue={phone.length > 0}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.phonePrefix}>+63</Text>
                      <TextInput
                        ref={phoneRef}
                        style={[styles.textInput, styles.phoneInput]}
                        value={phone}
                        onChangeText={(text) => setPhone(formatPhone(text))}
                        placeholder="912 345 6789"
                        placeholderTextColor={iOS.colors.quaternaryLabel}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        editable={!loading}
                        maxLength={12}
                        maxFontSizeMultiplier={FONT_SCALING.INPUT}
                      />
                    </View>
                  </InputCard>
                ) : (
                  <InputCard icon="mail" label="Email Address" hint="We'll send a verification link" hasValue={email.length > 0}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        ref={emailRef}
                        style={styles.textInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={iOS.colors.quaternaryLabel}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        editable={!loading}
                        maxFontSizeMultiplier={FONT_SCALING.INPUT}
                      />
                    </View>
                  </InputCard>
                )}

                {/* Password */}
                <InputCard icon="lock" label="Password" hint="At least 8 characters" hasValue={password.length > 0}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={passwordRef}
                      style={[styles.textInput, styles.passwordInput]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Create a password"
                      placeholderTextColor={iOS.colors.quaternaryLabel}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      editable={!loading}
                      maxFontSizeMultiplier={FONT_SCALING.INPUT}
                    />
                    <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={iOS.colors.teal} />
                    </Pressable>
                  </View>
                </InputCard>

                {/* Confirm Password */}
                <InputCard icon="shield" label="Confirm Password" hint="Re-enter to confirm" hasValue={confirmPassword.length > 0}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={confirmPasswordRef}
                      style={[styles.textInput, styles.passwordInput]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      placeholderTextColor={iOS.colors.quaternaryLabel}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleContinue}
                      editable={!loading}
                      maxFontSizeMultiplier={FONT_SCALING.INPUT}
                    />
                    <Pressable style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={iOS.colors.teal} />
                    </Pressable>
                  </View>
                </InputCard>

                {/* Continue Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.continueButton,
                    !canContinue && styles.continueButtonDisabled,
                    pressed && canContinue && styles.continueButtonPressed,
                  ]}
                  onPress={handleContinue}
                  disabled={!canContinue}
                >
                  {loading ? (
                    <ActivityIndicator color={iOS.colors.white} />
                  ) : (
                    <>
                      <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Continue</Text>
                      <Feather name="arrow-right" size={22} color={canContinue ? iOS.colors.white : iOS.colors.quaternaryLabel} />
                    </>
                  )}
                </Pressable>

                {/* Sign In */}
                <View style={styles.signInRow}>
                  <Text style={styles.signInText}>Already have an account?</Text>
                  <Pressable onPress={() => navigation.navigate('Login')} style={styles.signInButton}>
                    <Text style={styles.signInLink}>Sign In</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeContainer: { flex: 1 },

  // Header
  header: { marginBottom: iOS.spacing.lg },
  title: { ...iOS.typography.largeTitle, color: iOS.colors.white, textShadowColor: 'rgba(0, 0, 0, 0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.9)', marginTop: iOS.spacing.xs },

  // Main Card
  keyboardView: { flex: 1 },
  mainCard: { flex: 1, backgroundColor: iOS.colors.white, borderRadius: iOS.radius.xxl, ...iOS.shadow.large },
  scrollContent: { padding: iOS.spacing.lg },

  // Step Indicator - Orange for active, Teal for completed
  stepContainer: { marginBottom: iOS.spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: iOS.colors.tertiaryFill, justifyContent: 'center', alignItems: 'center', marginBottom: iOS.spacing.xs },
  stepCircleActive: { backgroundColor: iOS.colors.orange },
  stepCircleCompleted: { backgroundColor: iOS.colors.teal },
  stepNumber: { ...iOS.typography.footnote, fontWeight: '600', color: iOS.colors.tertiaryLabel },
  stepNumberActive: { color: iOS.colors.white },
  stepLabel: { ...iOS.typography.caption1, color: iOS.colors.tertiaryLabel },
  stepLabelActive: { color: iOS.colors.orange, fontWeight: '600' },
  stepLabelCompleted: { color: iOS.colors.teal, fontWeight: '600' },
  stepLine: { width: 40, height: 2, backgroundColor: iOS.colors.separator, marginHorizontal: iOS.spacing.sm, marginBottom: iOS.spacing.lg },
  stepLineCompleted: { backgroundColor: iOS.colors.teal },

  // Error Card
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: iOS.spacing.md, borderRadius: iOS.radius.md, marginBottom: iOS.spacing.md, gap: iOS.spacing.sm },
  errorText: { ...iOS.typography.subhead, color: iOS.colors.error, flex: 1 },

  // Method Card - Orange for active toggle
  methodCard: { backgroundColor: iOS.colors.white, borderRadius: iOS.radius.lg, padding: iOS.spacing.md, marginBottom: iOS.spacing.md, borderWidth: 1, borderColor: iOS.colors.separator, ...iOS.shadow.small },
  methodCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: iOS.spacing.md },
  methodToggle: { flexDirection: 'row', backgroundColor: iOS.colors.tertiaryFill, borderRadius: iOS.radius.md, padding: iOS.spacing.xs, gap: iOS.spacing.xs },
  methodOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: iOS.spacing.sm + 4, borderRadius: iOS.radius.sm, gap: iOS.spacing.sm },
  methodOptionActive: { backgroundColor: iOS.colors.orange, ...iOS.shadow.small },
  methodText: { ...iOS.typography.subhead, fontWeight: '600', color: iOS.colors.tertiaryLabel },
  methodTextActive: { color: iOS.colors.white },

  // Input Card - Orange for active icon
  inputCard: { backgroundColor: iOS.colors.white, borderRadius: iOS.radius.lg, padding: iOS.spacing.md, marginBottom: iOS.spacing.md, borderWidth: 1, borderColor: iOS.colors.separator, ...iOS.shadow.small },
  inputCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: iOS.spacing.sm },
  inputIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: iOS.colors.tertiaryFill, justifyContent: 'center', alignItems: 'center', marginRight: iOS.spacing.md },
  inputIconCircleActive: { backgroundColor: iOS.colors.orangeLight },
  inputLabelContainer: { flex: 1 },
  inputLabel: { ...iOS.typography.headline, color: iOS.colors.label },
  inputHint: { ...iOS.typography.caption1, color: iOS.colors.tertiaryLabel, marginTop: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: iOS.colors.tertiaryBackground, borderRadius: iOS.radius.md, paddingHorizontal: iOS.spacing.md, minHeight: 52 },
  textInput: { flex: 1, ...iOS.typography.body, color: iOS.colors.label, paddingVertical: iOS.spacing.md },
  phonePrefix: { ...iOS.typography.body, fontWeight: '600', color: iOS.colors.secondaryLabel, marginRight: iOS.spacing.sm },
  phoneInput: { flex: 1 },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: iOS.spacing.sm, padding: iOS.spacing.sm },

  // Continue Button - Orange primary action
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: iOS.colors.orange, height: 56, borderRadius: iOS.radius.pill, marginTop: iOS.spacing.lg, gap: iOS.spacing.sm, ...iOS.shadow.medium },
  continueButtonDisabled: { backgroundColor: iOS.colors.tertiaryFill, ...iOS.shadow.small },
  continueButtonPressed: { backgroundColor: iOS.colors.orangeDark, transform: [{ scale: 0.98 }] },
  continueText: { ...iOS.typography.headline, color: iOS.colors.white },
  continueTextDisabled: { color: iOS.colors.quaternaryLabel },

  // Sign In Row
  signInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: iOS.spacing.xl, gap: iOS.spacing.xs },
  signInText: { ...iOS.typography.subhead, color: iOS.colors.secondaryLabel },
  signInButton: { paddingVertical: iOS.spacing.sm, paddingHorizontal: iOS.spacing.xs },
  signInLink: { ...iOS.typography.subhead, fontWeight: '600', color: iOS.colors.teal },

  // Landscape Layout
  landscapeContainer: { flex: 1, flexDirection: 'row' },
  landscapeLeft: { width: '35%', justifyContent: 'center', paddingVertical: iOS.spacing.xl },
  landscapeBranding: { alignItems: 'flex-start' },
  landscapeIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: iOS.spacing.lg },
  landscapeTitle: { ...iOS.typography.title1, color: iOS.colors.white, marginBottom: iOS.spacing.sm },
  landscapeSubtitle: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 24 },
  landscapeProgress: { flexDirection: 'row', marginTop: iOS.spacing.xxl, gap: iOS.spacing.sm },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  progressDotActive: { backgroundColor: iOS.colors.white, width: 24 },
  landscapeRight: { flex: 1, paddingVertical: iOS.spacing.lg },
  landscapeCard: { flex: 1, backgroundColor: iOS.colors.white, borderRadius: iOS.radius.xxl, ...iOS.shadow.large },
  landscapeScrollContent: { padding: iOS.spacing.xl },
});

export default SignUpScreen;
