/**
 * TANDER Profile Setup Screen - Premium Edition
 * Step 3 of 3: Essential dating profile info (FINAL STEP)
 *
 * Design Philosophy:
 * - Premium gradient backgrounds matching WelcomeScreen aesthetic
 * - Glassmorphism cards with floating hearts decoration
 * - Senior-friendly with large touch targets (56-64px)
 * - Smooth entrance animations respecting reduce motion
 * - 100% responsive across all devices
 * - WCAG AA/AAA compliant contrast ratios
 * - Less typing, more tapping - chip selectors for gender/interests
 *
 * Key Features:
 * - Premium coral-to-teal gradient background
 * - Floating hearts decoration with animations
 * - Decorative background circles
 * - Glassmorphic card containers
 * - Large, accessible photo upload
 * - Date picker with visual calendar
 * - City picker with autocomplete
 * - Smooth entrance animations
 * - Progress indicator (Step 3 of 3 - Final Step)
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Pressable,
  AccessibilityInfo,
  TextInput,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, shadows, borderRadius } from '@shared/styles/spacing';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { completeProfile } from '@services/api';
import { uploadProfilePhoto } from '@services/api/profileApi';
import { useAuthStore, selectCurrentUsername } from '@store/authStore';
import { storage, STORAGE_KEYS } from '@services/storage/asyncStorage';

import { ProfileSetupScreenProps } from './types';
import { styles } from './styles';
import {
  PhotoUpload,
  ChipSelector,
  InputField,
  DatePicker,
  CityPicker,
} from './components';

// ============================================================================
// PREMIUM COLOR PALETTE - Matching WelcomeScreen and LoadingScreen
// ============================================================================
const PREMIUM_COLORS = {
  gradientTop: '#FF8A65',      // Warm coral-orange
  gradientMiddle: '#FF7043',   // Deeper coral
  gradientBottom: '#26A69A',   // Trust-inspiring teal

  glassWhite: 'rgba(255, 255, 255, 0.95)',
  glassTint: 'rgba(255, 255, 255, 0.12)',
  glassCard: 'rgba(255, 255, 255, 0.98)',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.92)',

  heartPink: 'rgba(255, 107, 138, 0.6)',
  warmGlow: 'rgba(255, 183, 77, 0.3)',
} as const;

// ============================================================================
// ANIMATION TIMING
// ============================================================================
const ANIMATION_TIMING = {
  headerFade: 600,
  cardEntrance: 500,
  cardDelay: 200,
  heartFloat: 3500,
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================
const GENDER_OPTIONS = ['Male', 'Female'];
const INTERESTED_IN_OPTIONS = ['Men', 'Women', 'Both'];

const ERROR_MESSAGES = {
  displayName: 'Please enter your display name',
  birthDate: 'Please select your birth date',
  gender: 'Please select your gender',
  interestedIn: 'Please select who you\'re interested in',
  city: 'Please select your city',
  saveFailed: 'Failed to save profile. Please try again.',
};

const PLACEHOLDERS = {
  displayName: 'How should we call you?',
  birthDate: 'Select your birth date',
  city: 'Select your city',
};

const HINTS = {
  displayName: 'This is how other members will see you',
  birthDate: 'Must be 50 years or older',
  city: 'Your location helps find nearby matches',
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
      duration: 1000,
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
  }, [floatAnim, fadeAnim, delay, reduceMotion]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const opacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${positionX}%`,
        top: `${positionY}%`,
        opacity,
        transform: [{ translateY }],
      }}
      pointerEvents="none"
    >
      <View
        style={{
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
          backgroundColor: 'rgba(255, 107, 138, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 107, 138, 0.2)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Feather name="heart" size={size} color={PREMIUM_COLORS.heartPink} />
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
  isTablet: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, isTablet }) => {
  return (
    <View style={{ marginBottom: spacing.l, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.s }}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isCompleted
                    ? colors.teal[500]
                    : isActive
                      ? colors.orange[500]
                      : colors.gray[300],
                  borderWidth: isActive ? 2 : 0,
                  borderColor: colors.orange[200],
                }}
              >
                {isCompleted && (
                  <Text style={{ color: colors.white, fontSize: 8, fontWeight: '700' }}>
                    ✓
                  </Text>
                )}
                {isActive && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.white,
                    }}
                  />
                )}
              </View>
              {stepNumber < totalSteps && (
                <View
                  style={{
                    width: 40,
                    height: 3,
                    backgroundColor: isCompleted ? colors.teal[500] : colors.gray[300],
                    marginHorizontal: spacing.xs,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text
        style={{
          color: colors.gray[700],
          fontWeight: '600',
          fontSize: isTablet ? 15 : 14,
        }}
      >
        Step {currentStep} of {totalSteps}: Build Your Profile
      </Text>
    </View>
  );
};

// ============================================================================
// PRIMARY BUTTON COMPONENT
// ============================================================================
interface PrimaryButtonProps {
  title: string;
  loadingTitle: string;
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  height: number;
  fontSize: number;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  loadingTitle,
  onPress,
  loading,
  disabled = false,
  height,
  fontSize,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 150,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 10,
    }).start();
  };

  const isDisabled = loading || disabled;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={{
          borderRadius: 9999,
          overflow: 'hidden',
          ...shadows.medium,
          opacity: isDisabled && !loading ? 0.5 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel={loading ? loadingTitle : title}
        accessibilityState={{ disabled: isDisabled }}
      >
        <LinearGradient
          colors={
            isDisabled && !loading
              ? ['#D1D5DB', '#C7CBD1']
              : colors.gradient.primaryButton
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height,
            minHeight: 56,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: spacing.s,
            paddingHorizontal: spacing.xl,
          }}
        >
          {loading && (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.3)',
                borderTopColor: colors.white,
              }}
            />
          )}
          <Text style={{ color: colors.white, fontWeight: '700', fontSize }}>
            {loading ? loadingTitle : title}
          </Text>
          {!loading && <Feather name="arrow-right" size={fontSize + 2} color={colors.white} />}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isLandscape,
    isTablet,
    isSmallScreen,
    wp,
    hp,
    moderateScale,
  } = useResponsive();

  // Get username from route params or authStore
  const storeUsername = useAuthStore(selectCurrentUsername);
  const username = route.params?.username || storeUsername || '';

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [interestedIn, setInterestedIn] = useState<'Men' | 'Women' | 'Both' | ''>('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Refs
  const displayNameRef = useRef<TextInput>(null);

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;

  // Responsive sizes
  const titleSize = isLandscape
    ? Math.min(hp(10), wp(6), 38)
    : isTablet
      ? 48
      : 36;
  const subtitleSize = isLandscape
    ? Math.min(hp(4), wp(3), 20)
    : isTablet
      ? 22
      : 19;
  const labelFontSize = isTablet ? 18 : 16;
  const inputFontSize = isTablet ? 18 : 16;
  const inputHeight = isTablet ? 64 : 58;
  const buttonHeight = isTablet ? 68 : 60;
  const buttonFontSize = isTablet ? 20 : 18;
  const maxFormWidth = isTablet ? 600 : 500;
  const heartSize = isTablet ? 28 : 22;

  // Decorative circle sizes
  const decorCircleLarge = isTablet ? 350 : isLandscape ? 200 : 280;
  const decorCircleMedium = isTablet ? 250 : isLandscape ? 140 : 200;
  const decorCircleSmall = isTablet ? 150 : isLandscape ? 90 : 130;

  // Check for reduce motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Entrance animations
  useEffect(() => {
    if (reduceMotion) {
      headerOpacity.setValue(1);
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
      return;
    }

    Animated.stagger(150, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION_TIMING.headerFade,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: ANIMATION_TIMING.cardEntrance,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [reduceMotion, headerOpacity, cardOpacity, cardTranslateY]);

  // Format Date to MM/DD/YYYY string for API
  const formatDateToString = useCallback((date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Handle continue
  const handleContinue = useCallback(async () => {
    setError(null);

    // Validation
    if (!displayName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(ERROR_MESSAGES.displayName);
      displayNameRef.current?.focus();
      return;
    }

    if (!birthDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(ERROR_MESSAGES.birthDate);
      return;
    }

    if (!gender) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(ERROR_MESSAGES.gender);
      return;
    }

    if (!interestedIn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(ERROR_MESSAGES.interestedIn);
      return;
    }

    if (!city.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(ERROR_MESSAGES.city);
      return;
    }

    setLoading(true);

    try {
      // Convert interestedIn to JSON array format
      let interestedInJson = '["male"]';
      if (interestedIn === 'Women') interestedInJson = '["female"]';
      else if (interestedIn === 'Both') interestedInJson = '["male","female"]';

      // Format date for API
      const birthDateStr = formatDateToString(birthDate);

      await completeProfile(
        {
          username,
          nickName: displayName.trim(),
          firstName: displayName.trim(),
          lastName: '',
          birthDate: birthDateStr,
          city: city.trim(),
          country: 'Philippines',
          gender: gender.toLowerCase() as 'male' | 'female',
          interestedIn: interestedInJson,
        },
        true
      );

      // Upload profile photo if available
      if (photoUri) {
        try {
          await uploadProfilePhoto({
            uri: photoUri,
            type: 'image/jpeg',
            name: 'profile-photo.jpg',
          });
        } catch (photoErr) {
          console.warn('Profile photo upload failed, continuing:', photoErr);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);

      // Registration complete - user will be redirected to login
      // The completeProfile API already sets registrationPhase to 'profile_completed'
      // We need to set it to 'verified' to skip ID verification
      const { useAuthStore } = await import('@store/authStore');
      useAuthStore.setState({ registrationPhase: 'verified', isAuthenticated: false });

      // Navigate to Login with success message
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { registrationComplete: true } }],
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || ERROR_MESSAGES.saveFailed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [displayName, birthDate, gender, interestedIn, city, photoUri, username, formatDateToString, navigation]);

  // Form padding
  const formPadding = isLandscape
    ? isTablet
      ? wp(4)
      : wp(3)
    : isSmallScreen
      ? spacing.m
      : spacing.l;

  // Render form content
  const renderForm = () => (
    <Animated.View
      style={{
        opacity: cardOpacity,
        transform: [{ translateY: cardTranslateY }],
        maxWidth: maxFormWidth,
        alignSelf: 'center',
        width: '100%',
        backgroundColor: PREMIUM_COLORS.glassCard,
        borderRadius: isTablet ? 32 : 24,
        padding: isTablet ? spacing.xl : spacing.l,
        ...shadows.large,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
      }}
    >
      {/* Step Indicator */}
      <StepIndicator currentStep={3} totalSteps={3} isTablet={isTablet} />

      {/* Photo Upload */}
      <PhotoUpload
        photoUri={photoUri}
        onPhotoChange={setPhotoUri}
        size={isTablet ? 140 : 120}
        accessibilityLabel="Upload profile photo"
      />

      {/* Display Name */}
      <InputField
        ref={displayNameRef}
        label="Display Name *"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={PLACEHOLDERS.displayName}
        hint={HINTS.displayName}
        height={inputHeight}
        fontSize={inputFontSize}
        labelFontSize={labelFontSize}
        captionFontSize={isTablet ? 15 : 13}
        accessibilityLabel="Display name"
        returnKeyType="done"
        icon="user"
      />

      {/* Birth Date */}
      <DatePicker
        label="Birth Date *"
        value={birthDate}
        onChange={setBirthDate}
        placeholder={PLACEHOLDERS.birthDate}
        hint={HINTS.birthDate}
        height={inputHeight}
        fontSize={inputFontSize}
        labelFontSize={labelFontSize}
        captionFontSize={isTablet ? 15 : 13}
        accessibilityLabel="Birth date"
      />

      {/* Gender */}
      <ChipSelector
        label="I am a *"
        options={GENDER_OPTIONS}
        selectedValue={gender}
        onSelect={(value) => setGender(value as 'Male' | 'Female')}
        labelFontSize={labelFontSize}
        chipPaddingH={isTablet ? 24 : 20}
        chipPaddingV={isTablet ? 16 : 14}
        accessibilityLabel="Gender"
        icon="user"
        hint="Select your gender"
      />

      {/* Interested In */}
      <ChipSelector
        label="Looking for *"
        options={INTERESTED_IN_OPTIONS}
        selectedValue={interestedIn}
        onSelect={(value) => setInterestedIn(value as 'Men' | 'Women' | 'Both')}
        labelFontSize={labelFontSize}
        chipPaddingH={isTablet ? 24 : 20}
        chipPaddingV={isTablet ? 16 : 14}
        accessibilityLabel="Interested in"
        icon="heart"
        hint="Who would you like to meet?"
      />

      {/* City */}
      <CityPicker
        label="City *"
        value={city}
        onChange={setCity}
        placeholder={PLACEHOLDERS.city}
        hint={HINTS.city}
        height={inputHeight}
        fontSize={inputFontSize}
        labelFontSize={labelFontSize}
        captionFontSize={isTablet ? 15 : 13}
        accessibilityLabel="City"
      />

      {/* Error Message */}
      {error && (
        <View
          style={{
            backgroundColor: 'rgba(244, 67, 54, 0.08)',
            borderRadius: borderRadius.large,
            padding: spacing.m,
            marginTop: spacing.m,
            borderWidth: 1,
            borderColor: 'rgba(244, 67, 54, 0.25)',
          }}
          accessibilityLiveRegion="polite"
        >
          <Text
            style={{
              color: colors.semantic.error,
              fontWeight: '600',
              fontSize: inputFontSize,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Continue Button */}
      <View style={{ marginTop: spacing.l }}>
        <PrimaryButton
          title="Continue to Verification"
          loadingTitle="Saving Profile..."
          onPress={handleContinue}
          loading={loading}
          disabled={!displayName || !birthDate || !gender || !interestedIn || !city}
          height={buttonHeight}
          fontSize={buttonFontSize}
        />
      </View>
    </Animated.View>
  );

  // Landscape Layout
  if (isLandscape) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />

        <LinearGradient
          colors={[
            PREMIUM_COLORS.gradientTop,
            PREMIUM_COLORS.gradientMiddle,
            PREMIUM_COLORS.gradientBottom,
          ]}
          locations={[0, 0.45, 1]}
          style={{ flex: 1 }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: 'absolute',
              width: decorCircleLarge,
              height: decorCircleLarge,
              borderRadius: decorCircleLarge / 2,
              backgroundColor: PREMIUM_COLORS.glassTint,
              top: -decorCircleLarge * 0.3,
              right: -decorCircleLarge * 0.2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: decorCircleMedium,
              height: decorCircleMedium,
              borderRadius: decorCircleMedium / 2,
              backgroundColor: PREMIUM_COLORS.glassTint,
              top: '40%',
              left: -decorCircleMedium * 0.35,
            }}
          />

          {/* Floating hearts */}
          {!reduceMotion && (
            <>
              <FloatingHeart size={heartSize} positionX={10} positionY={12} delay={0} reduceMotion={reduceMotion} />
              <FloatingHeart size={heartSize * 0.8} positionX={88} positionY={15} delay={300} reduceMotion={reduceMotion} />
              <FloatingHeart size={heartSize * 0.7} positionX={12} positionY={75} delay={600} reduceMotion={reduceMotion} />
            </>
          )}

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              paddingTop: insets.top + hp(2),
              paddingBottom: insets.bottom + hp(2),
              paddingLeft: insets.left + wp(2),
              paddingRight: insets.right + wp(2),
            }}
          >
            {/* Left Panel - Header */}
            <View style={{ flex: 0.35, justifyContent: 'center', paddingHorizontal: spacing.l }}>
              {navigation.canGoBack() && (
                <Pressable
                  onPress={handleBack}
                  style={{
                    width: 56,
                    height: 56,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing.l,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: 'rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="chevron-left" size={24} color={PREMIUM_COLORS.textPrimary} />
                  </View>
                </Pressable>
              )}

              <Animated.View style={{ opacity: headerOpacity }}>
                <Text
                  variant="h1"
                  color={PREMIUM_COLORS.textPrimary}
                  style={{
                    fontSize: titleSize,
                    fontWeight: '800',
                    marginBottom: spacing.s,
                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                  }}
                >
                  Let's Meet You
                </Text>
                <Text
                  variant="bodyLarge"
                  color={PREMIUM_COLORS.textSecondary}
                  style={{
                    fontSize: subtitleSize,
                    fontWeight: '500',
                    lineHeight: subtitleSize * 1.4,
                  }}
                >
                  Share a few details so others can find you
                </Text>
              </Animated.View>
            </View>

            {/* Right Panel - Form */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 0.65 }}
            >
              <ScrollView
                contentContainerStyle={{
                  paddingVertical: hp(2),
                  paddingHorizontal: formPadding,
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {renderForm()}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Portrait Layout
  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      <LinearGradient
        colors={[
          PREMIUM_COLORS.gradientTop,
          PREMIUM_COLORS.gradientMiddle,
          PREMIUM_COLORS.gradientBottom,
        ]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute',
            width: decorCircleLarge,
            height: decorCircleLarge,
            borderRadius: decorCircleLarge / 2,
            backgroundColor: PREMIUM_COLORS.glassTint,
            top: -decorCircleLarge * 0.25,
            right: -decorCircleLarge * 0.2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: decorCircleMedium,
            height: decorCircleMedium,
            borderRadius: decorCircleMedium / 2,
            backgroundColor: PREMIUM_COLORS.glassTint,
            top: '30%',
            left: -decorCircleMedium * 0.3,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: decorCircleSmall,
            height: decorCircleSmall,
            borderRadius: decorCircleSmall / 2,
            backgroundColor: PREMIUM_COLORS.glassTint,
            bottom: '20%',
            right: -decorCircleSmall * 0.2,
          }}
        />

        {/* Floating hearts */}
        {!reduceMotion && (
          <>
            <FloatingHeart size={heartSize} positionX={8} positionY={10} delay={0} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.8} positionX={85} positionY={8} delay={400} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.7} positionX={10} positionY={65} delay={700} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.6} positionX={88} positionY={55} delay={500} reduceMotion={reduceMotion} />
          </>
        )}

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + spacing.m,
            paddingBottom: spacing.xl + 16,
            paddingHorizontal: spacing.l,
          }}
        >
          {navigation.canGoBack() && (
            <Pressable
              onPress={handleBack}
              style={{
                width: 56,
                height: 56,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: -spacing.xs,
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Feather name="chevron-left" size={24} color={PREMIUM_COLORS.textPrimary} />
              </View>
            </Pressable>
          )}

          <Animated.View style={{ opacity: headerOpacity }}>
            <Text
              variant="h1"
              color={PREMIUM_COLORS.textPrimary}
              style={{
                fontSize: titleSize,
                fontWeight: '800',
                marginTop: spacing.s,
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}
            >
              Let's Meet You
            </Text>
            <Text
              variant="bodyLarge"
              color={PREMIUM_COLORS.textSecondary}
              style={{
                fontSize: subtitleSize,
                marginTop: spacing.xs,
                fontWeight: '500',
                lineHeight: subtitleSize * 1.4,
              }}
            >
              Share a few details to get started
            </Text>
          </Animated.View>
        </View>

        {/* Form Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, marginTop: -spacing.m }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingTop: spacing.l,
              paddingHorizontal: formPadding,
              paddingBottom: insets.bottom + spacing.xxl,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

export default ProfileSetupScreen;
