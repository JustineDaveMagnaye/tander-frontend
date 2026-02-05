/**
 * TANDER Forgot Password Screen - Premium iOS Edition
 * Clean, modern iOS-style design with card-based form fields
 * Orange + Teal color theme matching the registration flow
 */

import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Pressable,
  StatusBar,
  Keyboard,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Local imports
import { ForgotPasswordScreenProps } from './types';
import { iOS, STEPS, STEP_LABELS, ResetStep } from './constants';
import { useForgotPasswordForm, useForgotPasswordApi, useResponsiveSizes } from './hooks';
import {
  MethodStep,
  VerifyStep,
  PasswordStep,
  SuccessStep,
} from './components';
import { safeHaptic, HapticType } from './utils';
import { FONT_SCALING } from '@shared/styles/fontScaling';

// Error boundary fallback (simple version)
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Error fallback component
const ErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: iOS.spacing.xl }]}>
    <Text style={[iOS.typography.title2, { color: iOS.colors.error, marginBottom: iOS.spacing.md }]} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
      Something went wrong
    </Text>
    <Text style={[iOS.typography.body, { color: iOS.colors.secondaryLabel, textAlign: 'center', marginBottom: iOS.spacing.lg }]} maxFontSizeMultiplier={FONT_SCALING.BODY}>
      We encountered an error. Please try again.
    </Text>
    <Pressable
      onPress={onRetry}
      style={{
        backgroundColor: iOS.colors.orange,
        paddingHorizontal: iOS.spacing.xl,
        paddingVertical: iOS.spacing.md,
        borderRadius: iOS.radius.pill,
      }}
    >
      <Text style={[iOS.typography.headline, { color: iOS.colors.white }]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
        Try Again
      </Text>
    </Pressable>
  </View>
);

// Main screen component
function ForgotPasswordScreenContent({ navigation }: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;
  const sizes = useResponsiveSizes();

  // Track keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard listeners
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

  // Form state and validation
  const {
    state,
    dispatch,
    validatePhone,
    validateEmail,
    validateOTP,
    validatePassword,
    getPasswordRequirements,
    getMaskedContact,
  } = useForgotPasswordForm();

  // API handlers
  const api = useForgotPasswordApi({
    dispatch,
    method: state.method,
    phone: state.phone,
    email: state.email,
    otp: state.otp,
    newPassword: state.newPassword,
  });

  // Animation values
  const cardAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  // Entrance animation (only once)
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (state.reduceMotion) {
      cardAnim.setValue(1);
      return;
    }

    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [state.reduceMotion, cardAnim]);

  // Handlers
  const handleBack = useCallback(() => {
    safeHaptic(HapticType.Light);
    if (state.step === 'method') {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Login');
      }
    } else {
      dispatch({ type: 'GO_BACK' });
    }
  }, [state.step, navigation, dispatch]);

  const handleBackToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleSendOTP = useCallback(async () => {
    const validation = state.method === 'phone' ? validatePhone() : validateEmail();
    if (!validation.isValid) {
      safeHaptic(HapticType.Error);
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return;
    }
    await api.sendOTP();
  }, [state.method, validatePhone, validateEmail, dispatch, api]);

  const handleVerifyOTP = useCallback(async () => {
    const validation = validateOTP();
    if (!validation.isValid) {
      safeHaptic(HapticType.Error);
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return;
    }
    await api.verifyOTP();
  }, [validateOTP, dispatch, api]);

  const handleResendOTP = useCallback(async () => {
    if (state.resendTimer > 0) return;
    await api.resendOTP();
  }, [state.resendTimer, api]);

  const handleResetPassword = useCallback(async () => {
    const validation = validatePassword();
    if (!validation.isValid) {
      safeHaptic(HapticType.Error);
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return;
    }
    await api.resetPassword();
  }, [validatePassword, dispatch, api]);

  const handleTryDifferentMethod = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: 'method' });
    dispatch({ type: 'CLEAR_OTP' });
  }, [dispatch]);

  // Memoized values
  const maskedContact = useMemo(() => getMaskedContact(), [getMaskedContact]);
  const passwordRequirements = useMemo(() => getPasswordRequirements(), [getPasswordRequirements]);

  // Get current step index for step indicator
  const currentStepIndex = STEPS.indexOf(state.step);

  // Render step indicator
  const renderStepIndicator = () => {
    if (state.step === 'success') return null;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepRow}>
          {STEPS.slice(0, 3).map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            return (
              <React.Fragment key={step}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCompleted && styles.stepCircleCompleted,
                  ]}>
                    {isCompleted ? (
                      <Feather name="check" size={16} color={iOS.colors.white} />
                    ) : (
                      <Text style={[
                        styles.stepNumber,
                        (isActive || isCompleted) && styles.stepNumberActive,
                      ]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
                    {STEP_LABELS[step]}
                  </Text>
                </View>
                {index < 2 && (
                  <View style={[
                    styles.stepLine,
                    isCompleted && styles.stepLineCompleted,
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (state.step) {
      case 'method':
        return (
          <MethodStep
            state={state}
            dispatch={dispatch}
            sizes={sizes}
            isTablet={isTablet}
            isLandscape={isLandscape}
            onSendOTP={handleSendOTP}
            onBackToLogin={handleBackToLogin}
          />
        );

      case 'verify':
        return (
          <VerifyStep
            state={state}
            dispatch={dispatch}
            sizes={sizes}
            isTablet={isTablet}
            isLandscape={isLandscape}
            maskedContact={maskedContact}
            onVerifyOTP={handleVerifyOTP}
            onResendOTP={handleResendOTP}
            onTryDifferentMethod={handleTryDifferentMethod}
          />
        );

      case 'password':
        return (
          <PasswordStep
            state={state}
            dispatch={dispatch}
            sizes={sizes}
            isTablet={isTablet}
            isLandscape={isLandscape}
            passwordRequirements={passwordRequirements}
            onResetPassword={handleResetPassword}
          />
        );

      case 'success':
        return (
          <SuccessStep
            sizes={sizes}
            isTablet={isTablet}
            isLandscape={isLandscape}
            reduceMotion={state.reduceMotion}
            onSignIn={handleBackToLogin}
          />
        );
    }
  };

  // ============================================================================
  // LANDSCAPE LAYOUT
  // ============================================================================
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']}
          locations={[0, 0.4, 1]}
          style={styles.gradient}
        >
          <View style={[styles.landscapeContainer, { paddingTop: insets.top }]}>
            {/* Left Panel - Branding */}
            <View style={[styles.landscapeLeft, { paddingLeft: insets.left + iOS.spacing.xl }]}>
              {/* Back Button */}
              {state.step !== 'success' && (
                <Pressable
                  onPress={handleBack}
                  style={styles.landscapeBackButton}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <View style={styles.backButtonIcon}>
                    <Feather name="chevron-left" size={24} color={iOS.colors.white} />
                  </View>
                </Pressable>
              )}

              <View style={styles.landscapeBranding}>
                <View style={styles.landscapeIconCircle}>
                  <Feather name="key" size={32} color={iOS.colors.white} />
                </View>
                <Text style={styles.landscapeTitle} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
                  {state.step === 'success' ? 'Success!' : 'Reset Password'}
                </Text>
                <Text style={styles.landscapeSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
                  {state.step === 'method' && "We'll help you get back\ninto your account"}
                  {state.step === 'verify' && 'Enter the code we sent\nto verify your identity'}
                  {state.step === 'password' && 'Create a new password\nthat you\'ll remember'}
                  {state.step === 'success' && 'Your password has been\nsuccessfully reset'}
                </Text>
                <View style={styles.landscapeProgress}>
                  {STEPS.slice(0, 3).map((step, index) => (
                    <View
                      key={step}
                      style={[
                        styles.progressDot,
                        index <= currentStepIndex && styles.progressDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Right Panel - Form */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.landscapeRight, { paddingRight: insets.right + iOS.spacing.xl }]}
            >
              <Animated.View
                style={[
                  styles.landscapeCard,
                  {
                    opacity: cardAnim,
                    transform: [{
                      translateY: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    }],
                  },
                ]}
              >
                <ScrollView
                  ref={scrollViewRef}
                  contentContainerStyle={[
                    styles.landscapeScrollContent,
                    { paddingBottom: keyboardVisible ? 40 : iOS.spacing.lg },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {renderStepIndicator()}
                  {renderStepContent()}
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
      <LinearGradient
        colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <View style={[
          styles.safeContainer,
          {
            paddingTop: insets.top + iOS.spacing.lg,
            paddingBottom: insets.bottom,
            paddingHorizontal: iOS.spacing.lg,
          },
        ]}>
          {/* Header */}
          <View style={styles.header}>
            {/* Back Button */}
            {state.step !== 'success' && (
              <Pressable
                onPress={handleBack}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <View style={styles.backButtonIcon}>
                  <Feather name="chevron-left" size={24} color={iOS.colors.white} />
                </View>
              </Pressable>
            )}
            <Text style={styles.title} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
              {state.step === 'success' ? 'Success!' : 'Reset Password'}
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
              {state.step === 'method' && "We'll help you get back into your account"}
              {state.step === 'verify' && 'Enter the verification code'}
              {state.step === 'password' && 'Create a new password'}
              {state.step === 'success' && 'Your password has been reset'}
            </Text>
          </View>

          {/* Main Card */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <Animated.View
              style={[
                styles.mainCard,
                {
                  opacity: cardAnim,
                  transform: [{
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  }],
                },
              ]}
            >
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: keyboardVisible ? 40 : iOS.spacing.lg },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderStepIndicator()}
                {renderStepContent()}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeContainer: { flex: 1 },

  // Header
  header: { marginBottom: iOS.spacing.lg },
  backButton: { marginBottom: iOS.spacing.md },
  backButtonIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    ...iOS.typography.largeTitle,
    color: iOS.colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...iOS.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: iOS.spacing.xs,
  },

  // Main Card
  keyboardView: { flex: 1 },
  mainCard: {
    flex: 1,
    backgroundColor: iOS.colors.white,
    borderRadius: iOS.radius.xxl,
    ...iOS.shadow.large,
  },
  scrollContent: { padding: iOS.spacing.lg },

  // Step Indicator - Orange for active, Teal for completed
  stepContainer: { marginBottom: iOS.spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.xs,
  },
  stepCircleActive: { backgroundColor: iOS.colors.orange },
  stepCircleCompleted: { backgroundColor: iOS.colors.teal },
  stepNumber: {
    ...iOS.typography.footnote,
    fontWeight: '600',
    color: iOS.colors.tertiaryLabel,
  },
  stepNumberActive: { color: iOS.colors.white },
  stepLabel: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
  },
  stepLabelActive: { color: iOS.colors.orange, fontWeight: '600' },
  stepLabelCompleted: { color: iOS.colors.teal, fontWeight: '600' },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: iOS.colors.separator,
    marginHorizontal: iOS.spacing.sm,
    marginBottom: iOS.spacing.lg,
  },
  stepLineCompleted: { backgroundColor: iOS.colors.teal },

  // Landscape Layout
  landscapeContainer: { flex: 1, flexDirection: 'row' },
  landscapeLeft: {
    width: '35%',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.xl,
  },
  landscapeBackButton: {
    position: 'absolute',
    top: iOS.spacing.md,
    left: iOS.spacing.xl,
  },
  landscapeBranding: { alignItems: 'flex-start' },
  landscapeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.lg,
  },
  landscapeTitle: {
    ...iOS.typography.title1,
    color: iOS.colors.white,
    marginBottom: iOS.spacing.sm,
  },
  landscapeSubtitle: {
    ...iOS.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  landscapeProgress: {
    flexDirection: 'row',
    marginTop: iOS.spacing.xxl,
    gap: iOS.spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: iOS.colors.white,
    width: 24,
  },
  landscapeRight: {
    flex: 1,
    paddingVertical: iOS.spacing.lg,
  },
  landscapeCard: {
    flex: 1,
    backgroundColor: iOS.colors.white,
    borderRadius: iOS.radius.xxl,
    ...iOS.shadow.large,
  },
  landscapeScrollContent: { padding: iOS.spacing.xl },
});

// Wrapped with error boundary
export function ForgotPasswordScreen(props: ForgotPasswordScreenProps) {
  const handleRetry = useCallback(() => {
    props.navigation.replace('ForgotPassword');
  }, [props.navigation]);

  return (
    <ErrorBoundary fallback={<ErrorFallback onRetry={handleRetry} />}>
      <ForgotPasswordScreenContent {...props} />
    </ErrorBoundary>
  );
}

ForgotPasswordScreen.displayName = 'ForgotPasswordScreen';

export default ForgotPasswordScreen;
