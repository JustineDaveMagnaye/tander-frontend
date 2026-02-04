/**
 * TANDER ID Verification Screen - Ultra Premium iOS 26 Liquid Glass Edition
 * Step 4 of 4: Final verification with celebration
 *
 * Design References (2025):
 * - Apple Liquid Glass from iOS 26/WWDC 2025
 * - Premium glassmorphism with adaptive tint/opacity
 * - Apple Wallet success animations
 * - iOS Human Interface Guidelines
 *
 * Features:
 * - Premium dark gradient backgrounds
 * - Liquid Glass card components
 * - Animated celebration effects
 * - iOS 17+ SF Pro typography
 * - Multi-stage haptic feedback
 * - 56pt+ senior-friendly touch targets
 * - WCAG AA/AAA compliant contrast
 * - Responsive across all devices
 *
 * Sources:
 * - Apple Human Interface Guidelines
 * - Glassmorphism in 2025: Apple's Liquid Glass
 * - KYC Verification UI Design patterns
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  Image,
  Alert,
  AccessibilityInfo,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { submitIdVerification } from '@/services/api/authApi';

// Screen dimensions available if needed
Dimensions.get('window');

type IDScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'IDVerification'>;
type IDScreenRouteProp = RouteProp<AuthStackParamList, 'IDVerification'>;

interface Props {
  navigation: IDScreenNavProp;
  route: IDScreenRouteProp;
}

// Create animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// APPLE iOS 26 LIQUID GLASS DESIGN SYSTEM
// Reference: https://www.everydayux.net/glassmorphism-apple-liquid-glass-interface-design/
// ============================================================================
const LiquidGlass = {
  // Adaptive colors that respond to context
  colors: {
    // System backgrounds
    systemBackground: '#0A0F14',
    secondaryBackground: 'rgba(28, 28, 30, 0.95)',
    tertiaryBackground: 'rgba(44, 44, 46, 0.85)',

    // Liquid Glass materials
    glass: {
      ultraThin: 'rgba(255, 255, 255, 0.05)',
      thin: 'rgba(255, 255, 255, 0.08)',
      regular: 'rgba(255, 255, 255, 0.12)',
      thick: 'rgba(255, 255, 255, 0.18)',
      ultraThick: 'rgba(255, 255, 255, 0.25)',
      border: 'rgba(255, 255, 255, 0.12)',
      highlight: 'rgba(255, 255, 255, 0.35)',
    },

    // Labels (on dark backgrounds)
    label: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.70)',
      tertiary: 'rgba(255, 255, 255, 0.45)',
      quaternary: 'rgba(255, 255, 255, 0.25)',
    },

    // iOS System Colors
    system: {
      blue: '#0A84FF',
      green: '#30D158',
      orange: '#FF9F0A',
      red: '#FF453A',
      teal: '#64D2FF',
      cyan: '#5AC8FA',
      mint: '#63E6BE',
      indigo: '#5E5CE6',
      purple: '#BF5AF2',
      pink: '#FF375F',
    },

    // TANDER Brand
    brand: {
      primary: '#30D5C8',
      secondary: '#FF9F0A',
      accent: '#FF375F',
      gradientPrimary: ['#30D5C8', '#20B2AA', '#14A89D'],
      gradientSecondary: ['#FF9F0A', '#FF7A00', '#FF5722'],
      gradientAccent: ['#FF375F', '#FF2D55', '#FF1744'],
      gradientDark: ['#0A1612', '#0D1B16', '#0A1612'],
    },
  },

  // iOS 17+ SF Pro Typography
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37, lineHeight: 41 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36, lineHeight: 34 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35, lineHeight: 28 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38, lineHeight: 25 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41, lineHeight: 22 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41, lineHeight: 22 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32, lineHeight: 21 },
    subheadline: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24, lineHeight: 20 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08, lineHeight: 18 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 16 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07, lineHeight: 13 },
  },

  // 8pt Grid System
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
    massive: 48,
  },

  // Apple Corner Radii
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    pill: 9999,
  },

  // iOS Spring Animations
  springs: {
    gentle: { damping: 20, stiffness: 100 },
    snappy: { damping: 15, stiffness: 200 },
    bouncy: { damping: 10, stiffness: 150 },
    rigid: { damping: 25, stiffness: 400 },
  },

  // Blur Intensities
  blur: {
    ultraThin: 20,
    thin: 40,
    regular: 60,
    thick: 80,
    ultraThick: 100,
  },
} as const;

// ============================================================================
// FLOATING PARTICLE COMPONENT
// Premium ambient decoration
// ============================================================================
const FloatingParticle: React.FC<{
  size: number;
  positionX: number;
  positionY: number;
  delay: number;
  color: string;
}> = ({ size, positionX, positionY, delay, color }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Fade in
    opacity.value = withDelay(
      delay,
      withTiming(0.4, { duration: 800, easing: Easing.out(Easing.ease) })
    );

    // Float animation
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Scale pulse
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.9, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${positionX}%`,
          top: `${positionY}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
};

// ============================================================================
// STEP INDICATOR COMPONENT
// Premium progress indicator
// ============================================================================
const StepIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
}> = ({ currentStep, totalSteps }) => {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.stepIndicator}>
      <View style={styles.stepIndicatorRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <Animated.View
                style={[
                  styles.stepDot,
                  isCompleted && styles.stepDotComplete,
                  isActive && styles.stepDotActive,
                  isActive && pulseStyle,
                ]}
              >
                {isCompleted && (
                  <Feather name="check" size={10} color="#FFF" />
                )}
              </Animated.View>
              {stepNumber < totalSteps && (
                <View
                  style={[
                    styles.stepLine,
                    isCompleted && styles.stepLineComplete,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </Text>
      <Text style={styles.stepSubtext}>Final Verification</Text>
    </View>
  );
};

// ============================================================================
// LIQUID GLASS BUTTON
// Premium button with gradient or glass effect
// ============================================================================
const LiquidGlassButton: React.FC<{
  onPress: () => void;
  title: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}> = ({ onPress, title, icon, variant = 'primary', disabled, loading, fullWidth }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.96, LiquidGlass.springs.snappy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, LiquidGlass.springs.snappy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.liquidButton,
        fullWidth && styles.liquidButtonFullWidth,
        animatedStyle,
        (disabled || loading) && styles.liquidButtonDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={LiquidGlass.colors.brand.gradientPrimary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.liquidButtonGradient}
        >
          {loading ? (
            <View style={styles.loadingSpinner} />
          ) : (
            <>
              {icon && <Feather name={icon as any} size={20} color="#FFF" />}
              <Text style={styles.liquidButtonTextPrimary}>{title}</Text>
            </>
          )}
        </LinearGradient>
      ) : (
        <BlurView intensity={LiquidGlass.blur.regular} style={styles.liquidButtonBlur}>
          {loading ? (
            <View style={styles.loadingSpinner} />
          ) : (
            <>
              {icon && <Feather name={icon as any} size={20} color={LiquidGlass.colors.label.primary} />}
              <Text style={styles.liquidButtonTextSecondary}>{title}</Text>
            </>
          )}
        </BlurView>
      )}
    </AnimatedPressable>
  );
};

// ============================================================================
// PHOTO UPLOAD CARD
// Premium glassmorphic upload component
// ============================================================================
const PhotoUploadCard: React.FC<{
  label: string;
  photo: ImagePicker.ImagePickerAsset | null;
  onPick: () => void;
  onRemove: () => void;
  required?: boolean;
  disabled?: boolean;
}> = ({ label, photo, onPick, onRemove, required = false, disabled = false }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (photo) {
      scale.value = withSequence(
        withSpring(1.02, LiquidGlass.springs.bouncy),
        withSpring(1, LiquidGlass.springs.gentle)
      );
    }
  }, [photo]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.uploadCardContainer}>
      <Text style={styles.uploadLabel}>
        {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
      </Text>

      {photo ? (
        <Animated.View style={[styles.uploadCardFilled, animatedStyle]}>
          <Image source={{ uri: photo.uri }} style={styles.uploadImage} resizeMode="cover" />

          {/* Success badge */}
          <View style={styles.uploadSuccessBadge}>
            <LinearGradient
              colors={['#30D158', '#28C74F']}
              style={styles.uploadSuccessBadgeGradient}
            >
              <Feather name="check" size={14} color="#FFF" />
              <Text style={styles.uploadSuccessText}>Uploaded</Text>
            </LinearGradient>
          </View>

          {/* Remove button */}
          <Pressable
            onPress={onRemove}
            style={styles.uploadRemoveButton}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label.toLowerCase()}`}
          >
            <BlurView intensity={LiquidGlass.blur.thick} style={styles.uploadRemoveBlur}>
              <Feather name="x" size={20} color="#FFF" />
            </BlurView>
          </Pressable>
        </Animated.View>
      ) : (
        <Pressable
          onPress={onPick}
          disabled={disabled}
          style={[styles.uploadCardEmpty, disabled && styles.uploadCardDisabled]}
          accessibilityRole="button"
          accessibilityLabel={`Upload ${label.toLowerCase()}`}
        >
          <View style={styles.uploadIconContainer}>
            <LinearGradient
              colors={LiquidGlass.colors.brand.gradientPrimary as any}
              style={styles.uploadIconGradient}
            >
              <Feather name="camera" size={28} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.uploadTitle}>Tap to Upload</Text>
          <Text style={styles.uploadSubtitle}>Select from gallery</Text>
        </Pressable>
      )}
    </View>
  );
};

// ============================================================================
// INFO CARD COMPONENT
// Premium glassmorphic info display
// ============================================================================
const InfoCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  color: string;
}> = ({ icon, title, description, color }) => {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoCardIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.infoCardContent}>
        <Text style={[styles.infoCardTitle, { color }]}>{title}</Text>
        <Text style={styles.infoCardDescription}>{description}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const IDVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, wp } = useResponsive();

  // Auth store
  const scannedIdFront = useAuthStore((state) => state.scannedIdFront);
  const clearScannedId = useAuthStore((state) => state.clearScannedId);

  // State
  const [frontPhoto, setFrontPhoto] = useState<ImagePicker.ImagePickerAsset | null>(
    scannedIdFront ? { uri: scannedIdFront, width: 0, height: 0 } as ImagePicker.ImagePickerAsset : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canVerify = !!frontPhoto && !loading;

  // Request photo permissions
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'We need access to your photos to upload your ID. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Pick front photo
  const pickFrontPhoto = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFrontPhoto(result.assets[0]);
        setError('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility('ID photo selected');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not select photo. Please try again.');
    }
  }, []);

  // Remove photo
  const removeFrontPhoto = useCallback(() => {
    setFrontPhoto(null);
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility('ID photo removed');
  }, []);

  // Handle verification
  const handleVerify = useCallback(async () => {
    if (!frontPhoto) {
      setError('Please upload a photo of your ID');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const frontBlob = await fetch(frontPhoto.uri).then((r) => r.blob());
      await submitIdVerification(frontBlob);
      clearScannedId();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility('Verification submitted successfully');

      Alert.alert(
        'Verification Submitted',
        'Your ID is being reviewed. You can now log in and start exploring.',
        [
          {
            text: 'Continue to Login',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login', params: { registrationComplete: true } }],
              });
            },
          },
        ],
      );
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || 'Verification failed. Please try again.';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [frontPhoto, clearScannedId, navigation]);

  // Back handler
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Responsive values
  const contentMaxWidth = isTablet ? 560 : 480;
  const formPadding = isLandscape ? wp(3) : LiquidGlass.spacing.xl;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradient */}
      <LinearGradient
        colors={LiquidGlass.colors.brand.gradientDark as any}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating particles */}
      <FloatingParticle size={8} positionX={12} positionY={15} delay={0} color={LiquidGlass.colors.brand.primary + '40'} />
      <FloatingParticle size={6} positionX={85} positionY={10} delay={300} color={LiquidGlass.colors.system.mint + '40'} />
      <FloatingParticle size={10} positionX={8} positionY={60} delay={600} color={LiquidGlass.colors.brand.primary + '30'} />
      <FloatingParticle size={5} positionX={90} positionY={55} delay={450} color={LiquidGlass.colors.system.teal + '40'} />
      <FloatingParticle size={7} positionX={50} positionY={85} delay={800} color={LiquidGlass.colors.brand.primary + '35'} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, { paddingTop: insets.top + LiquidGlass.spacing.lg }]}
      >
        {navigation.canGoBack() && (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <BlurView intensity={LiquidGlass.blur.thick} style={styles.backButtonBlur}>
              <Feather name="chevron-left" size={24} color={LiquidGlass.colors.label.primary} />
            </BlurView>
          </Pressable>
        )}

        <Animated.View entering={FadeIn.delay(200)} style={styles.headerContent}>
          <Text style={styles.headerTitle}>Verify Your Identity</Text>
          <Text style={styles.headerSubtitle}>
            Final step to complete your registration
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: formPadding,
              paddingBottom: insets.bottom + LiquidGlass.spacing.xxxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main card */}
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={[styles.mainCard, { maxWidth: contentMaxWidth }]}
          >
            {/* Step indicator */}
            <StepIndicator currentStep={4} totalSteps={4} />

            {/* Why we need this */}
            <InfoCard
              icon="shield"
              title="Why we need this"
              description="To keep our community safe and verify you're 50+, we need a photo of your government-issued ID."
              color={LiquidGlass.colors.system.orange}
            />

            {/* Error message */}
            {error && (
              <Animated.View entering={FadeIn} style={styles.errorCard}>
                <Feather name="alert-circle" size={20} color={LiquidGlass.colors.system.red} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Photo upload */}
            <PhotoUploadCard
              label="Front of ID"
              photo={frontPhoto}
              onPick={pickFrontPhoto}
              onRemove={removeFrontPhoto}
              required
              disabled={loading}
            />

            {/* Privacy note */}
            <InfoCard
              icon="lock"
              title="Your privacy matters"
              description="Your ID is encrypted and secure. We'll never share it with other members."
              color={LiquidGlass.colors.brand.primary}
            />

            {/* Submit button */}
            <View style={styles.buttonContainer}>
              <LiquidGlassButton
                onPress={handleVerify}
                title="Complete Verification"
                icon="check-circle"
                disabled={!canVerify}
                loading={loading}
                fullWidth
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LiquidGlass.colors.systemBackground,
  },

  // Header
  header: {
    paddingHorizontal: LiquidGlass.spacing.xl,
    paddingBottom: LiquidGlass.spacing.xl,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: LiquidGlass.spacing.lg,
  },

  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LiquidGlass.colors.glass.regular,
    borderWidth: 1,
    borderColor: LiquidGlass.colors.glass.border,
  },

  headerContent: {
    marginTop: LiquidGlass.spacing.sm,
  },

  headerTitle: {
    ...LiquidGlass.typography.largeTitle,
    color: LiquidGlass.colors.label.primary,
    marginBottom: LiquidGlass.spacing.sm,
  },

  headerSubtitle: {
    ...LiquidGlass.typography.body,
    color: LiquidGlass.colors.label.secondary,
  },

  // Content
  content: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: LiquidGlass.spacing.lg,
  },

  // Main card
  mainCard: {
    backgroundColor: LiquidGlass.colors.glass.thin,
    borderRadius: LiquidGlass.radius.xxl,
    padding: LiquidGlass.spacing.xxl,
    borderWidth: 1,
    borderColor: LiquidGlass.colors.glass.border,
    alignSelf: 'center',
    width: '100%',
  },

  // Step indicator
  stepIndicator: {
    alignItems: 'center',
    marginBottom: LiquidGlass.spacing.xxl,
  },

  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LiquidGlass.spacing.md,
  },

  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LiquidGlass.colors.glass.thick,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepDotActive: {
    backgroundColor: LiquidGlass.colors.brand.primary,
  },

  stepDotComplete: {
    backgroundColor: LiquidGlass.colors.system.green,
  },

  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: LiquidGlass.colors.glass.border,
    marginHorizontal: LiquidGlass.spacing.xs,
  },

  stepLineComplete: {
    backgroundColor: LiquidGlass.colors.system.green,
  },

  stepText: {
    ...LiquidGlass.typography.headline,
    color: LiquidGlass.colors.label.primary,
  },

  stepSubtext: {
    ...LiquidGlass.typography.subheadline,
    color: LiquidGlass.colors.system.orange,
    marginTop: LiquidGlass.spacing.xxs,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LiquidGlass.colors.glass.ultraThin,
    borderRadius: LiquidGlass.radius.lg,
    padding: LiquidGlass.spacing.lg,
    marginBottom: LiquidGlass.spacing.lg,
    borderWidth: 1,
    borderColor: LiquidGlass.colors.glass.border,
  },

  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: LiquidGlass.spacing.md,
  },

  infoCardContent: {
    flex: 1,
  },

  infoCardTitle: {
    ...LiquidGlass.typography.headline,
    marginBottom: LiquidGlass.spacing.xxs,
  },

  infoCardDescription: {
    ...LiquidGlass.typography.subheadline,
    color: LiquidGlass.colors.label.secondary,
    lineHeight: 20,
  },

  // Error card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${LiquidGlass.colors.system.red}15`,
    borderRadius: LiquidGlass.radius.lg,
    padding: LiquidGlass.spacing.lg,
    marginBottom: LiquidGlass.spacing.lg,
    borderWidth: 1,
    borderColor: `${LiquidGlass.colors.system.red}30`,
    gap: LiquidGlass.spacing.md,
  },

  errorText: {
    ...LiquidGlass.typography.subheadline,
    color: LiquidGlass.colors.system.red,
    flex: 1,
  },

  // Upload card
  uploadCardContainer: {
    marginBottom: LiquidGlass.spacing.lg,
  },

  uploadLabel: {
    ...LiquidGlass.typography.headline,
    color: LiquidGlass.colors.label.primary,
    marginBottom: LiquidGlass.spacing.md,
  },

  requiredAsterisk: {
    color: LiquidGlass.colors.system.red,
  },

  uploadCardEmpty: {
    height: 180,
    borderRadius: LiquidGlass.radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: LiquidGlass.colors.glass.border,
    backgroundColor: LiquidGlass.colors.glass.ultraThin,
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadCardDisabled: {
    opacity: 0.5,
  },

  uploadIconContainer: {
    marginBottom: LiquidGlass.spacing.md,
  },

  uploadIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadTitle: {
    ...LiquidGlass.typography.headline,
    color: LiquidGlass.colors.label.primary,
    marginBottom: LiquidGlass.spacing.xxs,
  },

  uploadSubtitle: {
    ...LiquidGlass.typography.subheadline,
    color: LiquidGlass.colors.label.tertiary,
  },

  uploadCardFilled: {
    borderRadius: LiquidGlass.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LiquidGlass.colors.system.green + '40',
  },

  uploadImage: {
    width: '100%',
    height: 200,
    backgroundColor: LiquidGlass.colors.secondaryBackground,
  },

  uploadSuccessBadge: {
    position: 'absolute',
    bottom: LiquidGlass.spacing.md,
    left: LiquidGlass.spacing.md,
    borderRadius: LiquidGlass.radius.pill,
    overflow: 'hidden',
  },

  uploadSuccessBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LiquidGlass.spacing.xs,
    paddingVertical: LiquidGlass.spacing.sm,
    paddingHorizontal: LiquidGlass.spacing.md,
  },

  uploadSuccessText: {
    ...LiquidGlass.typography.footnote,
    color: '#FFF',
    fontWeight: '600',
  },

  uploadRemoveButton: {
    position: 'absolute',
    top: LiquidGlass.spacing.md,
    right: LiquidGlass.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },

  uploadRemoveBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LiquidGlass.colors.system.red + '90',
  },

  // Button container
  buttonContainer: {
    marginTop: LiquidGlass.spacing.lg,
  },

  // Liquid button
  liquidButton: {
    height: 56,
    borderRadius: LiquidGlass.radius.lg,
    overflow: 'hidden',
  },

  liquidButtonFullWidth: {
    width: '100%',
  },

  liquidButtonDisabled: {
    opacity: 0.5,
  },

  liquidButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LiquidGlass.spacing.sm,
    paddingHorizontal: LiquidGlass.spacing.xl,
  },

  liquidButtonBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LiquidGlass.spacing.sm,
    backgroundColor: LiquidGlass.colors.glass.regular,
    borderWidth: 1,
    borderColor: LiquidGlass.colors.glass.border,
    borderRadius: LiquidGlass.radius.lg,
  },

  liquidButtonTextPrimary: {
    ...LiquidGlass.typography.headline,
    color: '#FFF',
  },

  liquidButtonTextSecondary: {
    ...LiquidGlass.typography.headline,
    color: LiquidGlass.colors.label.primary,
  },

  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFF',
  },
});

export default IDVerificationScreen;
