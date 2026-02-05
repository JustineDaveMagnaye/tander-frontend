/**
 * TANDER Email Verification Pending Screen
 * Displayed after registration when email verification is pending
 * Senior-friendly UI with large text and clear instructions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Pressable,
  AccessibilityInfo,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { FONT_SCALING } from '@shared/styles/fontScaling';

type EmailVerificationPendingScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmailVerificationPending'>;
type EmailVerificationPendingScreenRouteProp = RouteProp<AuthStackParamList, 'EmailVerificationPending'>;

const RESEND_COOLDOWN = 60; // seconds

interface EmailVerificationPendingScreenProps {
  navigation: EmailVerificationPendingScreenNavigationProp;
  route: EmailVerificationPendingScreenRouteProp;
}

// Helper function to mask email
const maskEmail = (email: string): string => {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  const maskedLocal = localPart[0] + '***';
  return `${maskedLocal}@${domain}`;
};

export const EmailVerificationPendingScreen: React.FC<EmailVerificationPendingScreenProps> = ({ navigation, route }) => {
  const { email, maskedEmail: routeMaskedEmail } = route.params;
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, wp, hp, moderateScale } = useResponsive();

  const { resendVerificationEmail, isLoading } = useAuthStore();

  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resendCount, setResendCount] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const displayEmail = routeMaskedEmail || maskEmail(email);

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const envelopeBounce = useRef(new Animated.Value(0)).current;

  // Check for reduced motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => setReduceMotion(isEnabled)
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      headerOpacity.setValue(1);
      formOpacity.setValue(1);
      formTranslateY.setValue(0);
      return;
    }

    // Staggered entrance animation
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

    // Envelope bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(envelopeBounce, {
          toValue: -8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(envelopeBounce, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [reduceMotion]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setResendCooldown(resendCooldown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reduceMotion) {
      buttonScale.setValue(0.96);
      return;
    }
    Animated.spring(buttonScale, {
      toValue: 0.96,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) {
      buttonScale.setValue(1);
      return;
    }
    Animated.spring(buttonScale, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isLoading) return;

    try {
      setError('');
      setSuccessMessage('');
      await resendVerificationEmail(email);
      setResendCount(resendCount + 1);
      setResendCooldown(RESEND_COOLDOWN);
      setSuccessMessage('Verification email sent! Check your inbox.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (err?.code === 'RATE_LIMITED') {
        setError('Please wait before requesting another email.');
      } else {
        setError(err?.message || 'Failed to resend email. Please try again.');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleOpenEmailApp = async () => {
    try {
      // Try to open email app
      if (Platform.OS === 'ios') {
        await Linking.openURL('message://');
      } else {
        await Linking.openURL('mailto:');
      }
    } catch (error) {
      // If that fails, try Gmail
      try {
        await Linking.openURL('googlegmail://');
      } catch {
        // If Gmail fails, open webmail
        Linking.openURL('https://mail.google.com');
      }
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  // Responsive sizes
  const titleSize = isLandscape
    ? Math.min(hp(8), wp(4), 28)
    : isTablet ? moderateScale(36) : moderateScale(32);

  const subtitleSize = isLandscape
    ? Math.min(hp(4), wp(2.5), 16)
    : isTablet ? moderateScale(20) : moderateScale(18);

  const buttonHeight = isLandscape
    ? Math.max(Math.min(hp(14), 56), 48)
    : isTablet ? moderateScale(68) : moderateScale(60);

  const maxFormWidth = isTablet ? 500 : isLandscape ? wp(55) : wp(100);

  const renderContent = () => (
    <Animated.View
      style={[
        styles.formCard,
        {
          opacity: formOpacity,
          transform: [{ translateY: formTranslateY }],
          maxWidth: maxFormWidth,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
    >
      {/* Email Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ translateY: reduceMotion ? 0 : envelopeBounce }] }
        ]}
        accessible
        accessibilityLabel="Email envelope icon"
      >
        <View style={styles.envelopeIcon}>
          <Text style={styles.envelopeEmoji} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📧</Text>
        </View>
      </Animated.View>

      {/* Title */}
      <Text
        variant="h2"
        color={colors.neutral.textPrimary}
        center
        style={[styles.title, { fontSize: isTablet ? 26 : 24 }]}
        accessibilityRole="header"
      >
        Check Your Email
      </Text>

      {/* Subtitle */}
      <Text
        variant="body"
        color={colors.neutral.textSecondary}
        center
        style={[styles.subtitle, { fontSize: isTablet ? 18 : 16 }]}
      >
        We've sent a verification link to
      </Text>
      <Text
        variant="bodyLarge"
        color={colors.neutral.textPrimary}
        center
        style={[styles.emailText, { fontSize: isTablet ? 20 : 18 }]}
        accessible
        accessibilityLabel={`Email: ${displayEmail}`}
      >
        {displayEmail}
      </Text>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text
          variant="body"
          color={colors.neutral.textSecondary}
          center
          style={[styles.instructions, { fontSize: isTablet ? 17 : 16 }]}
        >
          Click the link in the email to verify your account. The link will expire in 24 hours.
        </Text>
      </View>

      {/* Success/Error Messages */}
      {successMessage ? (
        <View
          style={styles.successContainer}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={successMessage}
        >
          <Text variant="body" color={colors.semantic.success} center>
            {successMessage}
          </Text>
        </View>
      ) : error ? (
        <View
          style={styles.errorContainer}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${error}`}
        >
          <Text variant="body" color={colors.semantic.error} center>
            {error}
          </Text>
        </View>
      ) : null}

      {/* Open Email App Button */}
      <Animated.View style={{ transform: [{ scale: buttonScale }], marginBottom: spacing.m }}>
        <Pressable
          onPress={handleOpenEmailApp}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Open email app"
          testID="open-email-button"
        >
          <LinearGradient
            colors={colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.primaryButton,
              { height: buttonHeight, borderRadius: buttonHeight / 2 }
            ]}
          >
            <Text
              variant="button"
              color={colors.white}
              style={{
                fontSize: isLandscape ? Math.min(hp(4), 16) : (isTablet ? 20 : 18),
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              Open Email App
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Resend Email Section */}
      <View style={styles.resendContainer}>
        <Text
          variant="body"
          color={colors.neutral.textSecondary}
          style={{ fontSize: isTablet ? 17 : 16 }}
        >
          Didn't receive the email?
        </Text>
        <Pressable
          onPress={handleResendEmail}
          disabled={resendCooldown > 0 || isLoading}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            resendCooldown > 0
              ? `Resend email available in ${resendCooldown} seconds`
              : 'Resend verification email'
          }
          accessibilityState={{ disabled: resendCooldown > 0 || isLoading }}
          style={({ pressed }) => [
            styles.resendButton,
            (resendCooldown > 0 || isLoading) && styles.resendButtonDisabled,
            pressed && !resendCooldown && styles.resendButtonPressed,
          ]}
          testID="resend-email-button"
        >
          <Text
            variant="button"
            color={resendCooldown > 0 || isLoading ? colors.neutral.disabled : colors.teal.primary}
            style={[styles.resendText, { fontSize: isTablet ? 17 : 16 }]}
          >
            {isLoading
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend (${resendCooldown}s)`
              : 'Resend Email'}
          </Text>
        </Pressable>
      </View>

      {/* Tips Section */}
      <View style={styles.tipsContainer}>
        <Text
          variant="caption"
          color={colors.neutral.textSecondary}
          style={{ fontSize: isTablet ? 15 : 14 }}
        >
          Tips:
        </Text>
        <Text
          variant="caption"
          color={colors.neutral.textSecondary}
          style={[styles.tipItem, { fontSize: isTablet ? 14 : 13 }]}
        >
          • Check your spam or junk folder
        </Text>
        <Text
          variant="caption"
          color={colors.neutral.textSecondary}
          style={[styles.tipItem, { fontSize: isTablet ? 14 : 13 }]}
        >
          • Make sure "{email}" is correct
        </Text>
        <Text
          variant="caption"
          color={colors.neutral.textSecondary}
          style={[styles.tipItem, { fontSize: isTablet ? 14 : 13 }]}
        >
          • Add noreply@tander.app to your contacts
        </Text>
      </View>

      {/* Back to Login */}
      <Pressable
        onPress={handleBackToLogin}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Back to login"
        style={({ pressed }) => [
          styles.backToLoginButton,
          pressed && styles.backToLoginPressed,
        ]}
        testID="back-to-login-button"
      >
        <Text
          variant="body"
          color={colors.neutral.textSecondary}
          style={{ fontSize: isTablet ? 16 : 15 }}
        >
          Already verified?{' '}
          <Text
            variant="body"
            color={colors.orange.primary}
            style={{ fontWeight: '600' }}
          >
            Log In
          </Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      <LinearGradient
        colors={colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.m,
            paddingBottom: spacing.xxl + 20,
          }
        ]}
      >
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <Text
            variant="h1"
            color={colors.white}
            style={[styles.headerTitle, { fontSize: titleSize }]}
            accessibilityRole="header"
          >
            Verify Your Email
          </Text>
          <Text
            variant="bodyLarge"
            color="rgba(255,255,255,0.9)"
            style={[styles.headerSubtitle, { fontSize: subtitleSize }]}
          >
            Almost there! Just one more step
          </Text>
        </Animated.View>

        <View style={styles.headerDecoration} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden={true} />
        <View style={styles.headerDecoration2} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden={true} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  header: {
    paddingHorizontal: spacing.l,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    marginTop: spacing.l,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    opacity: 0.95,
    lineHeight: 26,
  },
  headerDecoration: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerDecoration2: {
    position: 'absolute',
    top: 30,
    right: 60,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  formContainer: {
    flex: 1,
    marginTop: -spacing.xl - 4,
  },
  scrollContent: {
    paddingHorizontal: spacing.l,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    paddingTop: spacing.xl,
    ...shadows.large,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  envelopeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orange.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  envelopeEmoji: {
    fontSize: 40,
  },
  title: {
    fontWeight: '700',
    marginBottom: spacing.m,
  },
  subtitle: {
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    marginTop: spacing.xxs,
    marginBottom: spacing.l,
  },
  instructionsContainer: {
    backgroundColor: colors.neutral.background,
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.l,
  },
  instructions: {
    lineHeight: 24,
  },
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.m,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.m,
  },
  primaryButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.s,
    flexWrap: 'wrap',
  },
  resendButton: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.small,
    minHeight: 44,
    justifyContent: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonPressed: {
    backgroundColor: 'rgba(0, 180, 166, 0.1)',
  },
  resendText: {
    fontWeight: '700',
  },
  tipsContainer: {
    marginTop: spacing.l,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
  },
  tipItem: {
    marginTop: spacing.xxs,
    lineHeight: 20,
  },
  backToLoginButton: {
    marginTop: spacing.l,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  backToLoginPressed: {
    opacity: 0.7,
  },
});

export default EmailVerificationPendingScreen;
