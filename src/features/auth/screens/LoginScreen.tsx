/**
 * TANDER LoginScreen - Super Premium iPhone Edition
 *
 * Ultra-refined, Apple-inspired sign-in experience featuring:
 * - Buttery smooth 60fps animations
 * - Premium glassmorphism with depth
 * - Elegant orange & teal color harmony
 * - Senior-friendly large touch targets (56-64px)
 * - WCAG AAA compliant accessibility
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
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsive } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useBiometric } from '@shared/hooks/useBiometric';
import { TermsAndConditionsModal } from '@shared/components/TermsAndConditionsModal';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { getVerificationConfig } from '@/services/api/authApi';

const TanderLogo = require('../../../../assets/icons/tander-logo.png');
const GoogleIcon = require('../../../../assets/icons/google.png');

// ============================================================================
// PREMIUM DESIGN TOKENS
// ============================================================================

const THEME = {
  // Refined gradient - warm sunset to ocean
  gradient: {
    colors: ['#FF9A6C', '#FF7A50', '#FF6038', '#2EC4A8', '#1AAF94'] as string[],
    locations: [0, 0.25, 0.45, 0.75, 1] as number[],
  },

  // Glass effects
  glass: {
    card: 'rgba(255, 255, 255, 0.98)',
    cardBorder: 'rgba(255, 255, 255, 0.9)',
    inputBg: '#F9FAFB',
    inputBorder: '#E5E7EB',
    inputFocusBg: 'rgba(20, 184, 166, 0.08)',
    inputFocusBorder: '#14B8A6',
  },

  // Typography colors
  text: {
    hero: '#FFFFFF',
    heroMuted: 'rgba(255, 255, 255, 0.9)',
    dark: '#111827',
    medium: '#4B5563',
    light: '#9CA3AF',
    teal: '#0D9488',
    orange: '#EA580C',
    error: '#DC2626',
  },

  // Accent colors
  accent: {
    orange: '#F97316',
    orangeDark: '#EA580C',
    teal: '#14B8A6',
    tealDark: '#0D9488',
  },

  // Premium shadows
  shadow: {
    glow: 'rgba(255, 180, 120, 0.5)',
    card: 'rgba(0, 0, 0, 0.1)',
    button: 'rgba(249, 115, 22, 0.4)',
    buttonTeal: 'rgba(20, 184, 166, 0.4)',
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

// ============================================================================
// ANIMATED ORB BACKGROUND
// ============================================================================

const AnimatedOrbs: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const animate = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );

    const a1 = animate(orb1, 7000);
    const a2 = animate(orb2, 9000);
    const a3 = animate(orb3, 11000);

    a1.start();
    setTimeout(() => a2.start(), 1500);
    setTimeout(() => a3.start(), 3000);

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [reduceMotion]);

  return (
    <>
      <Animated.View
        style={[
          styles.orb,
          styles.orbLarge,
          { transform: [{ translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -25] }) }] },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbMedium,
          { transform: [{ translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbSmall,
          { transform: [{ scale: orb3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
        ]}
        pointerEvents="none"
      />
    </>
  );
};

// ============================================================================
// PREMIUM INPUT FIELD
// ============================================================================

interface InputFieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  error?: string | null;
  helperText?: string;
  disabled?: boolean;
  returnKeyType?: 'done' | 'next';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: any;
  autoComplete?: any;
  label: string;
}

const InputField: React.FC<InputFieldProps> = ({
  icon, placeholder, value, onChangeText, secureTextEntry, showToggle,
  showPassword, onTogglePassword, error, helperText, disabled,
  returnKeyType, onSubmitEditing, inputRef, autoCapitalize,
  textContentType, autoComplete, label,
}) => {
  const [focused, setFocused] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: focused ? 1 : 0,
      tension: 300,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#FCA5A5' : THEME.glass.inputBorder, error ? '#EF4444' : THEME.glass.inputFocusBorder],
  });

  const bgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#FEF2F2' : THEME.glass.inputBg, error ? '#FEE2E2' : THEME.glass.inputFocusBg],
  });

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel} maxFontSizeMultiplier={FONT_SCALING.BODY}>{label}</Text>
      <Animated.View style={[styles.inputBox, { borderColor, backgroundColor: bgColor }]}>
        <View style={styles.inputIcon}>
          <Feather name={icon as any} size={20} color={focused ? THEME.accent.teal : THEME.text.light} />
        </View>
        <TextInput
          ref={inputRef}
          style={styles.inputText}
          placeholder={placeholder}
          placeholderTextColor={THEME.text.light}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          editable={!disabled}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          textContentType={textContentType}
          autoComplete={autoComplete}
          accessibilityLabel={label}
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
        />
        {showToggle && (
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={onTogglePassword}
            disabled={disabled}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={THEME.accent.teal} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={14} color={THEME.text.error} />
          <Text style={styles.errorText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>{helperText}</Text>
      ) : null}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, wp } = useResponsive();

  // State
  const [reduceMotion, setReduceMotion] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNavigatingToRegister, setIsNavigatingToRegister] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Auth
  const authLogin = useAuthStore((state) => state.login);
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    biometricLabel,
    isAuthenticating: biometricAuthenticating,
    authenticateAndGetCredentials,
    clearError: clearBiometricError,
  } = useBiometric();

  const showBiometric = biometricAvailable && biometricEnabled;

  // Responsive
  const sizes = useMemo(() => ({
    logo: isTablet ? 88 : 72,
    title: isTablet ? 36 : 32,
    subtitle: isTablet ? 17 : 15,
    button: isTablet ? 60 : 56,
    padding: isTablet ? 32 : 24,
    maxWidth: isTablet ? 460 : isLandscape ? Math.min(wp(50), 420) : Math.min(wp(90), 380),
  }), [isTablet, isLandscape, wp]);

  // Effects
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      logoAnim.setValue(1);
      cardAnim.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, tension: 45, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [reduceMotion]);

  // Handlers
  const clearErrors = useCallback(() => {
    setUsernameError(null);
    setPasswordError(null);
    setError(null);
  }, []);

  const validate = useCallback(() => {
    let valid = true;
    if (!username.trim()) { setUsernameError('Username is required'); valid = false; }
    if (!password) { setPasswordError('Password is required'); valid = false; }
    else if (password.length < 8) { setPasswordError('Minimum 8 characters'); valid = false; }
    return valid;
  }, [username, password]);

  const routeAfterLogin = useCallback((uname: string) => {
    const { registrationPhase, currentUsername } = useAuthStore.getState();
    const user = currentUsername || uname;

    if (registrationPhase === 'email_verified' || registrationPhase === 'otp_verified') {
      navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup', params: { username: user } }] });
    } else if (registrationPhase === 'profile_completed') {
      navigation.reset({ index: 0, routes: [{ name: 'Verification', params: { username: user } }] });
    }
  }, [navigation]);

  const handleLogin = useCallback(async () => {
    if (loading) return;
    clearErrors();
    if (!validate()) return;

    setLoading(true);
    try {
      await authLogin(username.trim(), password);
      routeAfterLogin(username.trim());
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authLogin, clearErrors, loading, password, routeAfterLogin, username, validate]);

  const handleBiometric = useCallback(async () => {
    if (loading || biometricAuthenticating) return;
    clearErrors();
    clearBiometricError();

    try {
      const creds = await authenticateAndGetCredentials();
      if (!creds) return;

      setUsername(creds.username);
      setPassword(creds.password);
      setLoading(true);
      await authLogin(creds.username, creds.password);
      routeAfterLogin(creds.username);
    } catch (err: any) {
      setError(err?.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }, [authenticateAndGetCredentials, authLogin, biometricAuthenticating, clearErrors, clearBiometricError, loading, routeAfterLogin]);

  const handleCreateAccount = useCallback(async () => {
    if (loading || isNavigatingToRegister) return;
    setIsNavigatingToRegister(true);

    try {
      // Fetch verification config to get minimumAge
      const config = await getVerificationConfig();
      const minimumAge = config?.minimumAge ?? 60;

      // Navigate to IDScanner with minimumAge param
      navigation.navigate('IDScanner', { minimumAge });
    } catch (err) {
      console.warn('[LoginScreen] Failed to fetch config, using default minimumAge:', err);
      // Fallback to default if config fetch fails
      navigation.navigate('IDScanner', { minimumAge: 60 });
    } finally {
      setIsNavigatingToRegister(false);
    }
  }, [loading, isNavigatingToRegister, navigation]);

  // Animations
  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const signInDisabled = loading || biometricAuthenticating || !username.trim() || !password;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={THEME.gradient.colors}
        locations={THEME.gradient.locations}
        style={styles.gradient}
      >
        <AnimatedOrbs reduceMotion={reduceMotion} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.canGoBack() && navigation.goBack()}
              accessibilityLabel="Go back"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.backCircle}>
                <Feather name="chevron-left" size={26} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={[styles.mainContent, { maxWidth: sizes.maxWidth }]}>
              {/* Logo Section */}
              <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
                <View style={styles.logoGlow} />
                <View style={[styles.logoCircle, { width: sizes.logo + 28, height: sizes.logo + 28 }]}>
                  <Image source={TanderLogo} style={{ width: sizes.logo, height: sizes.logo }} resizeMode="contain" />
                </View>
                <Text
                  style={[styles.heroTitle, { fontSize: sizes.title }]}
                  maxFontSizeMultiplier={FONT_SCALING.TITLE}
                >
                  Welcome Back
                </Text>
                <Text
                  style={[styles.heroSubtitle, { fontSize: sizes.subtitle }]}
                  maxFontSizeMultiplier={FONT_SCALING.BODY}
                >
                  Sign in to continue your journey
                </Text>
              </Animated.View>

              {/* Card */}
              <Animated.View
                style={[
                  styles.card,
                  { padding: sizes.padding, opacity: cardAnim, transform: [{ translateY: cardTranslateY }] },
                ]}
              >
                {/* Error Banner */}
                {error && (
                  <View style={styles.errorBanner}>
                    <View style={styles.errorIconCircle}>
                      <Feather name="alert-triangle" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.errorTextContainer}>
                      <Text style={styles.errorBannerTitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Unable to sign in</Text>
                      <Text style={styles.errorBannerMsg} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>{error}</Text>
                    </View>
                  </View>
                )}

                {/* Biometric */}
                {showBiometric && (
                  <>
                    <TouchableOpacity
                      style={styles.biometricBtn}
                      onPress={handleBiometric}
                      disabled={loading || biometricAuthenticating}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[THEME.accent.teal, THEME.accent.tealDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.biometricGradient, { height: sizes.button }]}
                      >
                        {biometricAuthenticating ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons
                              name={biometricLabel?.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
                              size={22}
                              color="#FFFFFF"
                            />
                            <Text style={styles.biometricText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                              Continue with {biometricLabel}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>or use password</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  </>
                )}

                {/* Form */}
                <InputField
                  icon="user"
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={(v) => { setUsername(v); if (usernameError) setUsernameError(null); if (error) setError(null); }}
                  error={usernameError}
                  disabled={loading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  autoCapitalize="none"
                  textContentType="username"
                  autoComplete="username"
                />

                <View style={{ height: 16 }} />

                <InputField
                  icon="lock"
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); if (error) setError(null); }}
                  secureTextEntry
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  error={passwordError}
                  helperText="Minimum 8 characters"
                  disabled={loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  inputRef={passwordRef}
                  autoCapitalize="none"
                  textContentType="password"
                  autoComplete="password"
                />

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.forgotText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.signInBtn, signInDisabled && styles.signInBtnDisabled]}
                  onPress={handleLogin}
                  disabled={signInDisabled}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={signInDisabled ? ['#D1D5DB', '#9CA3AF'] : [THEME.accent.orange, THEME.accent.orangeDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.signInGradient, { height: sizes.button }]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.signInText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Sign In</Text>
                        <Feather name="arrow-right" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google */}
                <TouchableOpacity style={styles.googleBtn} disabled={loading} activeOpacity={0.7}>
                  <Image source={GoogleIcon} style={styles.googleIcon} resizeMode="contain" />
                  <Text style={styles.googleText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Sign Up */}
                <View style={styles.signUpRow}>
                  <Text style={styles.signUpText} maxFontSizeMultiplier={FONT_SCALING.BODY}>Don't have an account? </Text>
                  <TouchableOpacity onPress={handleCreateAccount} disabled={loading || isNavigatingToRegister}>
                    {isNavigatingToRegister ? (
                      <ActivityIndicator size="small" color={THEME.accent.orange} />
                    ) : (
                      <Text style={styles.signUpLink} maxFontSizeMultiplier={FONT_SCALING.BODY}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Terms */}
                <View style={styles.termsRow}>
                  <Text style={styles.termsText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>By signing in, you agree to our </Text>
                  <TouchableOpacity onPress={() => setShowTerms(true)}>
                    <Text style={styles.termsLink} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Terms & Conditions</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <TermsAndConditionsModal visible={showTerms} onClose={() => setShowTerms(false)} />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Orbs
  orb: { position: 'absolute', borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.07)' },
  orbLarge: { width: 280, height: 280, top: -70, right: -50 },
  orbMedium: { width: 180, height: 180, top: '38%', left: -70 },
  orbSmall: { width: 120, height: 120, bottom: '12%', right: -30 },

  // Back
  backBtn: { alignSelf: 'flex-start', marginBottom: 12 },
  backCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Main
  mainContent: { flex: 1, alignSelf: 'center', width: '100%', justifyContent: 'center' },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoGlow: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: THEME.shadow.glow, top: -20,
  },
  logoCircle: {
    borderRadius: 100, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  heroTitle: {
    fontWeight: '800', color: THEME.text.hero, textAlign: 'center',
    marginTop: 18, letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  heroSubtitle: {
    color: THEME.text.heroMuted, textAlign: 'center', marginTop: 6, fontWeight: '500',
  },

  // Card
  card: {
    backgroundColor: THEME.glass.card, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 28, elevation: 10,
    borderWidth: 1, borderColor: THEME.glass.cardBorder,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
    marginBottom: 18, borderWidth: 1, borderColor: '#FECACA',
  },
  errorIconCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  errorTextContainer: { flex: 1 },
  errorBannerTitle: { fontSize: 15, fontWeight: '700', color: '#DC2626', marginBottom: 2 },
  errorBannerMsg: { fontSize: 14, color: '#DC2626', lineHeight: 20 },

  // Biometric
  biometricBtn: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 16,
    shadowColor: THEME.shadow.buttonTeal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 6,
  },
  biometricGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  biometricText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  // Input Field
  fieldContainer: { marginBottom: 4 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: THEME.text.dark, marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', height: 56,
    borderRadius: 14, borderWidth: 2, paddingHorizontal: 14,
  },
  inputIcon: { width: 32, alignItems: 'center' },
  inputText: { flex: 1, fontSize: 16, color: THEME.text.dark, fontWeight: '500' },
  toggleBtn: { padding: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  errorText: { fontSize: 13, color: THEME.text.error, fontWeight: '500' },
  helperText: { fontSize: 13, color: THEME.text.light, marginTop: 6 },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 10, marginBottom: 4 },
  forgotText: { fontSize: 14, fontWeight: '600', color: THEME.text.teal },

  // Sign In
  signInBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: THEME.shadow.button, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 6,
  },
  signInBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  signInGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  signInText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.4 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: THEME.text.light, paddingHorizontal: 14, fontWeight: '500' },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minHeight: 54, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: '#E5E7EB', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  googleIcon: { width: 22, height: 22 },
  googleText: { fontSize: 15, fontWeight: '600', color: THEME.text.dark },

  // Sign Up
  signUpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signUpText: { fontSize: 14, color: THEME.text.medium, fontWeight: '500' },
  signUpLink: { fontSize: 14, fontWeight: '700', color: THEME.text.orange },

  // Terms
  termsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 },
  termsText: { fontSize: 13, color: THEME.text.light },
  termsLink: { fontSize: 13, color: THEME.text.teal, fontWeight: '600', textDecorationLine: 'underline' },
});

export default LoginScreen;
