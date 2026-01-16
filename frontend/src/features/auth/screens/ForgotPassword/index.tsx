/**
 * TANDER Forgot Password Screen
 * Senior-friendly password reset flow with Phone OTP as primary method
 *
 * Refactored for:
 * - Better code organization (split into components and hooks)
 * - Improved performance (memoization, reduced re-renders)
 * - Better state management (useReducer)
 * - Enhanced accessibility
 * - Proper error handling and cleanup
 * - Security improvements
 *
 * FULL RESPONSIVENESS ENHANCEMENTS:
 * ===================================
 * Device Coverage:
 * - iPhone SE (320px portrait, 568px landscape)
 * - iPhone 8/X/11/12/13/14/15/16 (375-430px)
 * - iPad Mini/Air/Pro (768-1024px)
 * - Android phones (360-430px)
 * - Android tablets (600-1280px)
 *
 * Orientation Support:
 * - Portrait: Full-width form with centered max-width (700px on tablets)
 * - Landscape: Split-panel layout (35% header, 65% form)
 *   - Phones: Optimized vertical space usage, smaller padding
 *   - Tablets: Larger form width (up to 700px), comfortable spacing
 *
 * Responsive Features:
 * - Form padding: Dynamically adjusts based on screen size and orientation
 *   - Small phones (320px): Minimal padding for max space
 *   - Standard phones: Normal padding
 *   - Tablets portrait: Generous padding
 *   - Tablets landscape: Balanced padding
 *   - Phone landscape: Compact padding for limited vertical space
 *
 * - Form width:
 *   - Tablets: 85% width, max 700px (increased from 560px)
 *   - Landscape phones: 65% width, max 520px
 *   - Small phones: Full width with minimal margins
 *
 * - Input/Button heights:
 *   - Phones: 64px (portrait), 56px (landscape)
 *   - Tablets: 72px (portrait), 56px (landscape)
 *   - Minimum: 56px (WCAG touch target compliance)
 *
 * - OTP Input:
 *   - Box size: 52-72px based on device and orientation
 *   - Font size: 26-36px for excellent readability
 *   - Gap: Responsive spacing (xs to m)
 *
 * - Typography:
 *   - Title: 24-42px (WCAG minimum 24px)
 *   - Body: 18-22px (WCAG minimum 18px)
 *   - Captions: 14-18px
 *   - All sizes clamped to prevent overflow
 *
 * Supports:
 * - All screen sizes (small phones to large tablets)
 * - Portrait and landscape orientations
 * - iOS 13+ and Android API 24+ (all supported versions)
 * - Accessibility features for seniors (WCAG AAA where possible)
 * - Reduced motion preferences
 * - RTL layouts (partial)
 * - Safe area insets (notch, Dynamic Island, home indicator)
 *
 * Flow:
 * 1. Select method (Phone OTP recommended / Email)
 * 2. Enter phone/email and send OTP
 * 3. Verify OTP code (with responsive 6-digit input)
 * 4. Create new password
 * 5. Success confirmation
 */

import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Pressable,
  StatusBar,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';

// Local imports
import { ForgotPasswordScreenProps } from './types';
import { ResetStep } from './constants';
import { styles, LAYOUT, getResponsiveFormPadding } from './styles';
import { useForgotPasswordForm, useForgotPasswordApi, useResponsiveSizes } from './hooks';
import {
  MethodStep,
  VerifyStep,
  PasswordStep,
  SuccessStep,
} from './components';
import { safeHaptic, HapticType } from './utils';

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
  <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
    <Text variant="h3" color={colors.semantic.error} style={{ marginBottom: spacing.m }}>
      Something went wrong
    </Text>
    <Text variant="body" color={colors.neutral.textSecondary} style={{ textAlign: 'center', marginBottom: spacing.l }}>
      We encountered an error. Please try again.
    </Text>
    <Pressable
      onPress={onRetry}
      style={{
        backgroundColor: colors.orange.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.m,
        borderRadius: 25,
      }}
    >
      <Text variant="button" color={colors.white}>
        Try Again
      </Text>
    </Pressable>
  </View>
);

// Header content based on step
const HEADER_CONTENT: Record<ResetStep, { title: string; titleLandscape: string; subtitle: string; subtitleLandscape: string }> = {
  method: {
    title: 'Forgot Password?',
    titleLandscape: 'Reset Password',
    subtitle: "No worries, we'll help you",
    subtitleLandscape: "We'll help you",
  },
  verify: {
    title: 'Enter Code',
    titleLandscape: 'Enter Code',
    subtitle: 'Check your phone for the code',
    subtitleLandscape: 'Check your phone',
  },
  password: {
    title: 'New Password',
    titleLandscape: 'New Password',
    subtitle: 'Create a strong password',
    subtitleLandscape: 'Create a strong one',
  },
  success: {
    title: 'Success!',
    titleLandscape: 'Success!',
    subtitle: 'Password reset complete',
    subtitleLandscape: 'Password reset complete',
  },
};

// Main screen component
function ForgotPasswordScreenContent({ navigation }: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const sizes = useResponsiveSizes();
  const { isLandscape, isTablet, isSmallScreen, wp, hp } = sizes;

  // G5-R-008: Track keyboard visibility for landscape mode optimization
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard listeners for landscape mode optimization
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        // Scroll to focused input when keyboard appears in landscape
        if (isLandscape) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [isLandscape]);

  // Get responsive form padding (G1-R-003 fix) - Enhanced with landscape support
  const formPadding = useMemo(
    () => getResponsiveFormPadding(isSmallScreen, isTablet, isLandscape),
    [isSmallScreen, isTablet, isLandscape]
  );

  // G5-R-008: Adjust keyboard vertical offset for landscape
  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS === 'ios') {
      return isLandscape ? 60 : 0;
    }
    return 0;
  }, [isLandscape]);

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
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const hasAnimated = useRef(false);

  // Entrance animation (only once)
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (state.reduceMotion) {
      headerOpacity.setValue(1);
      formOpacity.setValue(1);
      formTranslateY.setValue(0);
      return;
    }

    Animated.stagger(100, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(formTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [state.reduceMotion, headerOpacity, formOpacity, formTranslateY]);

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
    // Validate before sending
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
  const headerContent = useMemo(() => {
    const content = HEADER_CONTENT[state.step];
    return {
      title: isLandscape ? content.titleLandscape : content.title,
      subtitle: isLandscape ? content.subtitleLandscape : content.subtitle,
    };
  }, [state.step, isLandscape]);

  const maskedContact = useMemo(() => getMaskedContact(), [getMaskedContact]);
  const passwordRequirements = useMemo(() => getPasswordRequirements(), [getPasswordRequirements]);

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

  // Render form card
  const renderForm = () => (
    <Animated.View
      style={[
        styles.formCard,
        {
          opacity: formOpacity,
          transform: [{ translateY: formTranslateY }],
          maxWidth: sizes.maxFormWidth,
          alignSelf: 'center',
          width: '100%',
          // G1-R-003: Responsive padding for small screens
          padding: formPadding,
        },
      ]}
    >
      {renderStepContent()}
    </Animated.View>
  );

  // Render back button
  const renderBackButton = () => {
    if (state.step === 'success') return null;

    return (
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <View style={styles.backButtonIcon}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </View>
      </Pressable>
    );
  };

  // Landscape layout
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />

        <View
          style={[
            styles.landscapeContainer,
            {
              paddingTop: insets.top + hp(2),
              paddingBottom: insets.bottom + hp(2),
              paddingLeft: insets.left + wp(2),
              paddingRight: insets.right + wp(2),
            },
          ]}
        >
          {/* Left side - Auth Gradient Header */}
          <LinearGradient
            colors={colors.gradient.authBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.landscapeHeader, { flex: LAYOUT.landscapeHeaderFlex }]}
          >
            {renderBackButton()}

            <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
              <Text
                variant="h1"
                color={colors.white}
                style={[styles.headerTitle, { fontSize: sizes.titleSize }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {headerContent.title}
              </Text>
              <Text
                variant="bodyLarge"
                color="rgba(255,255,255,0.9)"
                style={[styles.headerSubtitle, { fontSize: sizes.subtitleSize, marginTop: hp(1) }]}
                numberOfLines={2}
              >
                {headerContent.subtitle}
              </Text>
            </Animated.View>

            <View style={styles.headerDecoration} />
          </LinearGradient>

          {/* Right side - Form - Enhanced for better screen utilization */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.landscapeForm, { flex: LAYOUT.landscapeFormFlex }]}
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  // G5-R-008: Reduce vertical padding when keyboard is visible in landscape
                  paddingVertical: isKeyboardVisible ? hp(1) : hp(2),
                  // Enhanced: Better horizontal padding for landscape
                  paddingHorizontal: isTablet ? wp(5) : wp(3),
                  flexGrow: 1,
                  justifyContent: 'center', // Center form vertically in landscape
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              // G5-R-008: Auto-scroll to focused input
              keyboardDismissMode="interactive"
            >
              {renderForm()}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    );
  }

  // Portrait layout
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Auth Gradient Header */}
      <LinearGradient
        colors={colors.gradient.authBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.m,
            paddingBottom: spacing.xxl + 20,
          },
        ]}
      >
        {renderBackButton()}

        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <Text
            variant="h1"
            color={colors.white}
            style={[styles.headerTitle, { fontSize: sizes.titleSize }]}
          >
            {headerContent.title}
          </Text>
          <Text
            variant="bodyLarge"
            color="rgba(255,255,255,0.9)"
            style={[styles.headerSubtitle, { fontSize: sizes.subtitleSize }]}
          >
            {headerContent.subtitle}
          </Text>
        </Animated.View>

        <View style={styles.headerDecoration} />
      </LinearGradient>

      {/* Form Section - Enhanced for tablets */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + spacing.xxl,
              flexGrow: 1,
              // Enhanced: Better horizontal padding for tablets
              paddingHorizontal: isTablet ? wp(8) : spacing.l,
              // Center content on tablets
              justifyContent: isTablet ? 'flex-start' : undefined,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Wrapped with error boundary
export function ForgotPasswordScreen(props: ForgotPasswordScreenProps) {
  const handleRetry = useCallback(() => {
    // Force re-mount by navigating
    props.navigation.replace('ForgotPassword');
  }, [props.navigation]);

  return (
    <ErrorBoundary fallback={<ErrorFallback onRetry={handleRetry} />}>
      <ForgotPasswordScreenContent {...props} />
    </ErrorBoundary>
  );
}

// Display name for React DevTools
ForgotPasswordScreen.displayName = 'ForgotPasswordScreen';

export default ForgotPasswordScreen;
