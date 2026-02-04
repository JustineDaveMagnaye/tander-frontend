/**
 * TANDER Sign Up Step 2 Screen - Premium Edition
 * Profile Information: Birthdate, Gender, Location, Bio
 *
 * Design Philosophy:
 * - Premium gradient backgrounds matching WelcomeScreen
 * - Glassmorphism styling with semi-transparent containers
 * - Floating heart decorations with animations
 * - Decorative background circles
 * - Large, senior-friendly touch targets (56-64px minimum)
 * - Font sizes: Body 18-20px minimum, never below 16px
 * - WCAG AA contrast compliance
 * - "Less Typing, More Tapping" - Uses pickers and chips instead of text inputs
 * - Smooth entrance animations (fade in, slide up)
 * - Premium glow effects
 *
 * Features:
 * - Step indicator showing 2/4 progress
 * - Date picker for birthdate (senior-friendly with preset buttons)
 * - Gender selection with chips
 * - City picker with autocomplete
 * - Bio textarea with character counter
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

type Step2ScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUpStep2'>;
};

type Gender = 'male' | 'female' | 'other';

// ============================================================================
// PHILIPPINE CITIES DATA (Top 20 major cities for seniors)
// ============================================================================

const PHILIPPINE_CITIES = [
  'Manila',
  'Quezon City',
  'Makati',
  'Pasig',
  'Taguig',
  'Mandaluyong',
  'Cebu City',
  'Davao City',
  'Cagayan de Oro',
  'Iloilo City',
  'Bacolod',
  'Baguio',
  'Antipolo',
  'Caloocan',
  'Las Piñas',
  'Parañaque',
  'Pasay',
  'Valenzuela',
  'Zamboanga',
  'Tagaytay',
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
};

const validateBirthdate = (birthdate: Date | null): string | null => {
  if (!birthdate) return 'Please select your birthdate';
  const age = calculateAge(birthdate);
  if (age < 50) return 'You must be at least 50 years old to join';
  if (age > 120) return 'Please enter a valid birthdate';
  return null;
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
        Step {currentStep} of {totalSteps}: Your Profile
      </Text>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Step2Screen: React.FC<Step2ScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width, height, isTablet, isLandscape, hp, wp, moderateScale } = useResponsive();

  // ============================================================================
  // STATE
  // ============================================================================

  const [reduceMotion, setReduceMotion] = useState(false);
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [city, setCity] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const bioRef = useRef<TextInput>(null);

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

    const chipHeight = isLandscape
      ? Math.max(48, Math.min(hp(10), 54))
      : isTablet
      ? 60
      : 54;

    const screenPadding = isSmallPhone ? 20 : isMediumPhone ? 24 : isTablet ? 32 : 24;

    const cardPadding = isLandscape ? wp(3) : isTablet ? 32 : 24;

    const cardBorderRadius = isTablet ? 32 : 24;

    const heartBaseSize = isLandscape ? Math.min(hp(6), 28) : isTablet ? 32 : 24;

    return {
      inputHeight,
      buttonHeight,
      chipHeight,
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
  }, [birthdate, gender, city, bio]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleDatePreset = useCallback((yearsAgo: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - yearsAgo);
    setBirthdate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleGenderSelect = useCallback((selectedGender: Gender) => {
    setGender(selectedGender);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCitySelect = useCallback((selectedCity: string) => {
    setCity(selectedCity);
    setShowCityPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleContinue = useCallback(async () => {
    // Validate required fields
    const birthdateError = validateBirthdate(birthdate);
    if (birthdateError) {
      setError(birthdateError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!gender) {
      setError('Please select your gender');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!city.trim()) {
      setError('Please select your city');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);

    try {
      // Prepare profile data for next step
      const profileData = {
        birthdate: birthdate?.toISOString(),
        gender,
        city: city.trim(),
        bio: bio.trim(),
      };

      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to Step 3 (Profile Photo/Interests)
      // navigation.navigate('SignUpStep3', profileData);

      // TODO: Replace with actual navigation when Step 3 is implemented
      console.log('Step 2 data ready:', profileData);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [birthdate, gender, city, bio, navigation]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const canContinue = !loading && birthdate !== null && gender !== null && city.trim().length > 0;

  const age = birthdate ? calculateAge(birthdate) : null;

  const filteredCities = useMemo(() => {
    if (!city) return PHILIPPINE_CITIES;
    return PHILIPPINE_CITIES.filter((c) => c.toLowerCase().includes(city.toLowerCase()));
  }, [city]);

  // Animation interpolations
  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDatePresets = () => (
    <View style={styles.presetsContainer}>
      <Text style={[styles.presetsLabel, { fontSize: sizes.captionFontSize }]}>Quick select:</Text>
      <View style={styles.presetsRow}>
        {[50, 55, 60, 65, 70].map((age) => (
          <Pressable
            key={age}
            style={[styles.presetButton, { height: sizes.chipHeight - 10 }]}
            onPress={() => handleDatePreset(age)}
            accessibilityRole="button"
            accessibilityLabel={`Set age to ${age} years`}
          >
            <Text style={[styles.presetText, { fontSize: sizes.captionFontSize }]}>{age}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderGenderChips = () => (
    <View style={styles.chipsContainer}>
      {(['male', 'female', 'other'] as Gender[]).map((g) => (
        <Pressable
          key={g}
          style={[
            styles.chip,
            gender === g && styles.chipActive,
            { height: sizes.chipHeight },
          ]}
          onPress={() => handleGenderSelect(g)}
          accessibilityRole="button"
          accessibilityState={{ selected: gender === g }}
          accessibilityLabel={`Select ${g === 'male' ? 'Man' : g === 'female' ? 'Woman' : 'Other'}`}
        >
          <Feather
            name={g === 'male' ? 'user' : g === 'female' ? 'user' : 'users'}
            size={sizes.inputFontSize}
            color={gender === g ? colors.orange[600] : colors.gray[500]}
          />
          <Text
            style={[
              styles.chipText,
              gender === g && styles.chipTextActive,
              { fontSize: sizes.inputFontSize },
            ]}
          >
            {g === 'male' ? 'Man' : g === 'female' ? 'Woman' : 'Other'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderCityPicker = () => (
    <View style={styles.pickerContainer}>
      <ScrollView
        style={styles.pickerScroll}
        contentContainerStyle={styles.pickerContent}
        keyboardShouldPersistTaps="handled"
      >
        {filteredCities.map((c) => (
          <Pressable
            key={c}
            style={[styles.pickerItem, { height: sizes.inputHeight }]}
            onPress={() => handleCitySelect(c)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${c}`}
          >
            <Feather name="map-pin" size={sizes.inputFontSize} color={colors.gray[500]} />
            <Text style={[styles.pickerItemText, { fontSize: sizes.inputFontSize }]}>{c}</Text>
            <Feather name="check" size={sizes.inputFontSize} color={colors.teal[500]} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        style={[styles.pickerCloseButton, { height: sizes.buttonHeight }]}
        onPress={() => setShowCityPicker(false)}
        accessibilityRole="button"
        accessibilityLabel="Close city picker"
      >
        <Text style={[styles.pickerCloseText, { fontSize: sizes.bodyFontSize }]}>Close</Text>
      </Pressable>
    </View>
  );

  const renderFormContent = () => (
    <Animated.View
      style={{
        opacity: contentAnim,
      }}
    >
      {/* Step Indicator */}
      <StepIndicator currentStep={2} totalSteps={3} captionFontSize={sizes.captionFontSize} />

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
        Tell us a bit about yourself
      </Text>

      {/* Birthdate */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
        Birthdate <Text style={styles.required}>*</Text>
      </Text>
      <Pressable
        style={[styles.inputContainer, { height: sizes.inputHeight }]}
        onPress={() => setShowDatePicker(!showDatePicker)}
        accessibilityRole="button"
        accessibilityLabel="Select birthdate"
      >
        <Feather name="calendar" size={sizes.inputFontSize} color={colors.gray[400]} />
        <Text
          style={[
            styles.inputText,
            !birthdate && styles.placeholderText,
            { fontSize: sizes.inputFontSize },
          ]}
        >
          {birthdate
            ? `${birthdate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} ${age ? `(${age} years old)` : ''}`
            : 'Select your birthdate'}
        </Text>
        <Feather
          name={showDatePicker ? 'chevron-up' : 'chevron-down'}
          size={sizes.inputFontSize}
          color={colors.gray[500]}
        />
      </Pressable>
      {showDatePicker && renderDatePresets()}
      <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
        You must be at least 50 years old to join TANDER
      </Text>

      {/* Gender */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
        I am a <Text style={styles.required}>*</Text>
      </Text>
      {renderGenderChips()}

      {/* City */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
        City <Text style={styles.required}>*</Text>
      </Text>
      <Pressable
        style={[styles.inputContainer, { height: sizes.inputHeight }]}
        onPress={() => setShowCityPicker(!showCityPicker)}
        accessibilityRole="button"
        accessibilityLabel="Select city"
      >
        <Feather name="map-pin" size={sizes.inputFontSize} color={colors.gray[400]} />
        <Text
          style={[
            styles.inputText,
            !city && styles.placeholderText,
            { fontSize: sizes.inputFontSize },
          ]}
        >
          {city || 'Select your city'}
        </Text>
        <Feather
          name={showCityPicker ? 'chevron-up' : 'chevron-down'}
          size={sizes.inputFontSize}
          color={colors.gray[500]}
        />
      </Pressable>
      {showCityPicker && renderCityPicker()}
      <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
        Help us find matches near you
      </Text>

      {/* Bio (Optional) */}
      <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>About Me (Optional)</Text>
      <View style={[styles.textareaContainer, { minHeight: sizes.inputHeight * 2 }]}>
        <TextInput
          ref={bioRef}
          style={[styles.textarea, { fontSize: sizes.inputFontSize }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell potential matches about yourself..."
          placeholderTextColor={colors.gray[400]}
          multiline
          numberOfLines={4}
          maxLength={300}
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
          editable={!loading}
          accessibilityLabel="Bio"
        />
      </View>
      <View style={styles.bioFooter}>
        <Text style={[styles.hint, { fontSize: sizes.captionFontSize }]}>
          Share your interests, hobbies, or what you're looking for
        </Text>
        <Text style={[styles.charCount, { fontSize: sizes.captionFontSize }]}>
          {bio.length}/300
        </Text>
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
        accessibilityLabel={loading ? 'Saving profile' : 'Continue to next step'}
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
                Saving...
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

      {/* Skip Link */}
      <View style={styles.skipRow}>
        <Pressable
          onPress={() => {
            /* TODO: Skip to Step 3 */
          }}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
        >
          <Text style={[styles.skipLink, { fontSize: sizes.captionFontSize }]}>
            Skip for now
          </Text>
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
            <FloatingHeart size={sizes.heartBaseSize} positionX={8} positionY={10} delay={0} />
            <FloatingHeart size={sizes.heartBaseSize * 0.8} positionX={88} positionY={14} delay={250} />
            <FloatingHeart size={sizes.heartBaseSize * 0.6} positionX={14} positionY={78} delay={500} />
            <FloatingHeart size={sizes.heartBaseSize * 0.7} positionX={85} positionY={72} delay={350} />
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
              Your Profile
            </Text>
            <Text style={[styles.subtitle, { fontSize: sizes.captionFontSize + 2 }]}>
              Help us get to know you better
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
    width: 260,
    height: 260,
    top: -70,
    right: -50,
  },
  decorCircle2: {
    width: 180,
    height: 180,
    top: '28%',
    left: -70,
  },
  decorCircle3: {
    width: 140,
    height: 140,
    bottom: '18%',
    right: -50,
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
  inputText: {
    flex: 1,
    color: colors.gray[900],
    fontWeight: '500',
  },
  placeholderText: {
    color: colors.gray[400],
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

  // Date presets
  presetsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  presetsLabel: {
    color: colors.gray[600],
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.orange[50],
    borderWidth: 2,
    borderColor: colors.orange[200],
    borderRadius: 12,
  },
  presetText: {
    color: colors.orange[700],
    fontWeight: '700',
  },

  // Gender chips
  chipsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
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
  chipActive: {
    borderColor: colors.orange[500],
    backgroundColor: colors.orange[50],
  },
  chipText: {
    color: colors.gray[600],
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.orange[600],
  },

  // City picker
  pickerContainer: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.gray[200],
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 240,
  },
  pickerContent: {
    padding: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerItemText: {
    flex: 1,
    color: colors.gray[700],
    fontWeight: '500',
  },
  pickerCloseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  pickerCloseText: {
    color: colors.gray[700],
    fontWeight: '700',
  },

  // Bio textarea
  textareaContainer: {
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textarea: {
    color: colors.gray[900],
    textAlignVertical: 'top',
  },
  bioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
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

  // Skip link
  skipRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipLink: {
    color: colors.gray[500],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default Step2Screen;
