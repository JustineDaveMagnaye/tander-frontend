/**
 * TANDER WelcomeScreen - Premium Edition
 * A Warm, Trust-Inspiring Welcome Experience for Filipino Seniors (60+)
 *
 * Design Philosophy:
 * - Emotional warmth through soft, romantic gradients
 * - Premium feel with subtle glassmorphism and refined shadows
 * - Senior-friendly with large touch targets (56-64px) and high contrast
 * - Smooth, delightful animations that don't overwhelm
 * - 100% responsive across all devices (320px phones to 1280px+ tablets)
 *
 * Key Features:
 * - 3-second splash display before revealing navigation buttons
 * - WCAG AA/AAA compliant contrast ratios
 * - Reduce motion support for accessibility
 * - Optimized layouts for portrait and landscape orientations
 * - Premium micro-interactions and entrance animations
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
  AccessibilityInfo,
  Animated,
  Image,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '@shared/styles/colors';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import type { AuthStackParamList } from '@navigation/types';

// Import the Tander logo
const TanderLogo = require('../../../../assets/icons/tander-logo.png');

// ============================================================================
// PREMIUM COLOR PALETTE - Warm, Romantic, Trustworthy
// ============================================================================

const PREMIUM_COLORS = {
  // Gradient backgrounds - warmer, more romantic feel
  gradientTop: '#FF8A65', // Warm coral-orange
  gradientMiddle: '#FF7043', // Deeper coral
  gradientBottom: '#26A69A', // Trust-inspiring teal
  gradientAccent: '#FFAB91', // Soft peach highlight

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.95)',
  glassTint: 'rgba(255, 255, 255, 0.12)',
  glassStroke: 'rgba(255, 255, 255, 0.35)',

  // Text on gradient
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.75)',

  // Card backgrounds
  cardBackground: 'rgba(255, 255, 255, 0.96)',
  cardShadow: 'rgba(0, 0, 0, 0.12)',

  // Button colors
  buttonPrimaryBg: '#FFFFFF',
  buttonPrimaryText: '#E65100', // Deep orange for excellent contrast
  buttonSecondaryBorder: 'rgba(255, 255, 255, 0.9)',

  // Decorative
  heartPink: '#FF6B8A',
  warmGlow: 'rgba(255, 183, 77, 0.25)',
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Duration to show splash before revealing buttons (in milliseconds) */
const SPLASH_DURATION = 3000;

/** Animation timing constants */
const ANIMATION_TIMING = {
  logoEntry: 800,
  taglineEntry: 600,
  featureStagger: 150,
  contentEntry: 500,
  buttonReveal: 500,
  pulseInterval: 3000,
  shimmerDuration: 2000,
} as const;

// ============================================================================
// TYPES
// ============================================================================

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

interface FeatureCardData {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  iconBgColor: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

interface ResponsiveSizes {
  logoSize: number;
  logoContainerSize: number;
  logoOuterGlowSize: number;
  titleSize: number;
  subtitleSize: number;
  taglineSize: number;
  buttonHeight: number;
  buttonTextSize: number;
  featureTitleSize: number;
  featureSubtitleSize: number;
  featureIconSize: number;
  featureIconContainerSize: number;
  cardPadding: number;
  cardBorderRadius: number;
  screenPadding: number;
  sectionSpacing: number;
  buttonSpacing: number;
  privacyIconSize: number;
  privacyTextSize: number;
}

// ============================================================================
// FEATURE CARD DATA - Enhanced with titles and subtitles
// ============================================================================

const FEATURES: FeatureCardData[] = [
  {
    id: 'companionship',
    icon: 'heart',
    iconBgColor: 'rgba(255, 107, 138, 0.15)',
    iconColor: PREMIUM_COLORS.heartPink,
    title: 'Genuine Connection',
    subtitle: 'Find meaningful companionship',
  },
  {
    id: 'friendships',
    icon: 'users',
    iconBgColor: 'rgba(38, 166, 154, 0.15)',
    iconColor: colors.teal[500],
    title: 'Lasting Bonds',
    subtitle: 'Build real friendships that matter',
  },
  {
    id: 'easy',
    icon: 'smartphone',
    iconBgColor: 'rgba(255, 138, 101, 0.15)',
    iconColor: '#FF8A65',
    title: 'Simple to Use',
    subtitle: 'Designed for comfort and ease',
  },
];

// ============================================================================
// RESPONSIVE SIZE CALCULATOR - Enhanced for premium feel
// ============================================================================

const calculateResponsiveSizes = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  moderateScale: (size: number, factor?: number) => number,
  hp: (percentage: number) => number,
  wp: (percentage: number) => number
): ResponsiveSizes => {
  const isSmallPhone = width < BREAKPOINTS.xs + 56;
  const isMediumPhone = width >= BREAKPOINTS.xs + 56 && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;
  const isSmallTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;
  const isLargeTablet = width >= BREAKPOINTS.largeTablet;

  // Logo sizing with premium scaling
  let logoSize: number;
  let logoContainerSize: number;
  let logoOuterGlowSize: number;

  if (isLandscape) {
    logoSize = Math.min(hp(25), wp(14), 110);
    logoContainerSize = logoSize + 28;
    logoOuterGlowSize = logoSize + 56;
  } else if (isLargeTablet) {
    logoSize = moderateScale(180, 0.3);
    logoContainerSize = logoSize + 48;
    logoOuterGlowSize = logoSize + 80;
  } else if (isSmallTablet) {
    logoSize = moderateScale(160, 0.3);
    logoContainerSize = logoSize + 44;
    logoOuterGlowSize = logoSize + 72;
  } else if (isLargePhone) {
    logoSize = moderateScale(140, 0.4);
    logoContainerSize = logoSize + 36;
    logoOuterGlowSize = logoSize + 64;
  } else if (isMediumPhone) {
    logoSize = moderateScale(120, 0.4);
    logoContainerSize = logoSize + 32;
    logoOuterGlowSize = logoSize + 56;
  } else {
    logoSize = moderateScale(100, 0.4);
    logoContainerSize = logoSize + 28;
    logoOuterGlowSize = logoSize + 48;
  }

  // Typography sizing - premium, readable sizes
  let titleSize: number;
  let subtitleSize: number;
  let taglineSize: number;
  let featureTitleSize: number;
  let featureSubtitleSize: number;
  let buttonTextSize: number;
  let privacyTextSize: number;

  if (isLandscape) {
    titleSize = Math.min(hp(10), wp(6), 42);
    subtitleSize = Math.min(hp(4.5), wp(3), 20);
    taglineSize = Math.min(hp(3.5), wp(2.5), 16);
    featureTitleSize = Math.max(15, Math.min(hp(3.5), 17));
    featureSubtitleSize = Math.max(13, Math.min(hp(2.8), 14));
    buttonTextSize = Math.max(17, Math.min(hp(4.5), 20));
    privacyTextSize = Math.max(12, Math.min(hp(2.8), 14));
  } else if (isLargeTablet) {
    titleSize = 64;
    subtitleSize = 26;
    taglineSize = 20;
    featureTitleSize = 22;
    featureSubtitleSize = 18;
    buttonTextSize = 24;
    privacyTextSize = 17;
  } else if (isSmallTablet) {
    titleSize = 58;
    subtitleSize = 24;
    taglineSize = 19;
    featureTitleSize = 21;
    featureSubtitleSize = 17;
    buttonTextSize = 23;
    privacyTextSize = 16;
  } else if (isLargePhone) {
    titleSize = 52;
    subtitleSize = 22;
    taglineSize = 18;
    featureTitleSize = 20;
    featureSubtitleSize = 16;
    buttonTextSize = 21;
    privacyTextSize = 15;
  } else if (isMediumPhone) {
    titleSize = 48;
    subtitleSize = 20;
    taglineSize = 17;
    featureTitleSize = 19;
    featureSubtitleSize = 15;
    buttonTextSize = 20;
    privacyTextSize = 14;
  } else {
    titleSize = 44;
    subtitleSize = 19;
    taglineSize = 16;
    featureTitleSize = 18;
    featureSubtitleSize = 14;
    buttonTextSize = 19;
    privacyTextSize = 13;
  }

  // Button heights - generous for seniors
  let buttonHeight: number;
  if (isLandscape) {
    buttonHeight = Math.max(54, Math.min(hp(15), 60));
  } else if (isTablet) {
    buttonHeight = 76;
  } else if (isLargePhone) {
    buttonHeight = 68;
  } else {
    buttonHeight = 64;
  }

  // Feature card sizing - premium proportions
  let featureIconSize: number;
  let featureIconContainerSize: number;
  let cardPadding: number;
  let cardBorderRadius: number;

  if (isLandscape) {
    featureIconSize = 20;
    featureIconContainerSize = 44;
    cardPadding = 14;
    cardBorderRadius = 16;
  } else if (isTablet) {
    featureIconSize = 32;
    featureIconContainerSize = 72;
    cardPadding = 28;
    cardBorderRadius = 24;
  } else if (isLargePhone) {
    featureIconSize = 28;
    featureIconContainerSize = 64;
    cardPadding = 24;
    cardBorderRadius = 20;
  } else {
    featureIconSize = 26;
    featureIconContainerSize = 58;
    cardPadding = 20;
    cardBorderRadius = 18;
  }

  // Screen padding
  let screenPadding: number;
  if (isSmallPhone) {
    screenPadding = 20;
  } else if (isMediumPhone) {
    screenPadding = 24;
  } else if (isLargePhone) {
    screenPadding = 28;
  } else if (isSmallTablet) {
    screenPadding = 40;
  } else {
    screenPadding = 48;
  }

  const sectionSpacing = isTablet ? 56 : isLandscape ? 20 : 40;
  const buttonSpacing = isTablet ? 20 : 16;
  const privacyIconSize = isTablet ? 22 : 20;

  return {
    logoSize,
    logoContainerSize,
    logoOuterGlowSize,
    titleSize,
    subtitleSize,
    taglineSize,
    buttonHeight,
    buttonTextSize,
    featureTitleSize,
    featureSubtitleSize,
    featureIconSize,
    featureIconContainerSize,
    cardPadding,
    cardBorderRadius,
    screenPadding,
    sectionSpacing,
    buttonSpacing,
    privacyIconSize,
    privacyTextSize,
  };
};

// ============================================================================
// PREMIUM FEATURE CARD COMPONENT
// ============================================================================

interface FeatureCardProps {
  feature: FeatureCardData;
  sizes: ResponsiveSizes;
  isCompact?: boolean;
  animatedValue: Animated.Value;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  sizes,
  isCompact = false,
  animatedValue,
  index,
}) => {
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  if (isCompact) {
    return (
      <Animated.View
        style={[
          styles.landscapeFeatureCard,
          {
            borderRadius: sizes.cardBorderRadius,
            padding: sizes.cardPadding,
            opacity: animatedValue,
            transform: [{ translateY }],
          },
        ]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`${feature.title}. ${feature.subtitle}`}
      >
        <View
          style={[
            styles.landscapeFeatureIconContainer,
            {
              width: sizes.featureIconContainerSize,
              height: sizes.featureIconContainerSize,
              borderRadius: sizes.featureIconContainerSize * 0.3,
              backgroundColor: feature.iconBgColor,
            },
          ]}
        >
          <Feather name={feature.icon} size={sizes.featureIconSize} color={feature.iconColor} />
        </View>
        <View style={styles.landscapeFeatureTextContainer}>
          <Text
            style={[styles.landscapeFeatureTitle, { fontSize: sizes.featureTitleSize }]}
            numberOfLines={1}
          >
            {feature.title}
          </Text>
          <Text
            style={[styles.landscapeFeatureSubtitle, { fontSize: sizes.featureSubtitleSize }]}
            numberOfLines={1}
          >
            {feature.subtitle}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          borderRadius: sizes.cardBorderRadius,
          padding: sizes.cardPadding,
          opacity: animatedValue,
          transform: [{ translateY }],
        },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${feature.title}. ${feature.subtitle}`}
    >
      {/* Icon with colored background */}
      <View
        style={[
          styles.featureIconContainer,
          {
            width: sizes.featureIconContainerSize,
            height: sizes.featureIconContainerSize,
            borderRadius: sizes.featureIconContainerSize * 0.28,
            backgroundColor: feature.iconBgColor,
          },
        ]}
      >
        <Feather name={feature.icon} size={sizes.featureIconSize} color={feature.iconColor} />
      </View>

      {/* Text content */}
      <View style={styles.featureTextContainer}>
        <Text
          style={[styles.featureTitle, { fontSize: sizes.featureTitleSize }]}
          numberOfLines={1}
        >
          {feature.title}
        </Text>
        <Text
          style={[styles.featureSubtitle, { fontSize: sizes.featureSubtitleSize }]}
          numberOfLines={2}
        >
          {feature.subtitle}
        </Text>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// PREMIUM ANIMATED BUTTON COMPONENT
// ============================================================================

interface AnimatedButtonProps {
  onPress: () => void;
  title: string;
  variant: 'primary' | 'secondary';
  height: number;
  textSize: number;
  accessibilityHint: string;
  style?: object;
  animatedValue?: Animated.Value;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  title,
  variant,
  height,
  textSize,
  accessibilityHint,
  style,
  animatedValue,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 150,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.6,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const isPrimary = variant === 'primary';

  const buttonTranslateY = animatedValue?.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: scaleAnim },
            ...(buttonTranslateY ? [{ translateY: buttonTranslateY }] : []),
          ],
          opacity: animatedValue,
        },
        style,
      ]}
    >
      {isPrimary ? (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.primaryButton,
            {
              height,
              minHeight: 56,
            },
          ]}
          accessible={true}
          accessibilityLabel={title}
          accessibilityRole="button"
          accessibilityHint={accessibilityHint}
        >
          <LinearGradient
            colors={['#FF7043', '#F4511E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={[styles.primaryButtonText, { fontSize: textSize }]}>
              {title}
            </Text>
            <Feather name="arrow-right" size={textSize + 2} color={PREMIUM_COLORS.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.secondaryButton,
            { height, minHeight: 56 },
          ]}
          accessible={true}
          accessibilityLabel={title}
          accessibilityRole="button"
          accessibilityHint={accessibilityHint}
        >
          <Text style={[styles.secondaryButtonText, { fontSize: textSize }]}>
            {title}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ============================================================================
// DECORATIVE FLOATING HEARTS COMPONENT
// ============================================================================

interface FloatingHeartsProps {
  isTablet: boolean;
  isLandscape: boolean;
  reduceMotion: boolean;
}

const FloatingHearts: React.FC<FloatingHeartsProps> = ({ isTablet, isLandscape, reduceMotion }) => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const createFloatAnimation = (value: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createFloatAnimation(float1, 4000, 0);
    const anim2 = createFloatAnimation(float2, 5000, 1000);
    const anim3 = createFloatAnimation(float3, 4500, 500);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [reduceMotion, float1, float2, float3]);

  const translateY1 = float1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const translateY2 = float2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const translateY3 = float3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const baseSize = isTablet ? 60 : isLandscape ? 35 : 45;

  return (
    <>
      <Animated.View
        style={[
          styles.floatingHeart,
          styles.floatingHeart1,
          {
            width: baseSize,
            height: baseSize,
            borderRadius: baseSize / 2,
            transform: [{ translateY: translateY1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingHeart,
          styles.floatingHeart2,
          {
            width: baseSize * 0.7,
            height: baseSize * 0.7,
            borderRadius: (baseSize * 0.7) / 2,
            transform: [{ translateY: translateY2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingHeart,
          styles.floatingHeart3,
          {
            width: baseSize * 0.5,
            height: baseSize * 0.5,
            borderRadius: (baseSize * 0.5) / 2,
            transform: [{ translateY: translateY3 }],
          },
        ]}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isLandscape,
    isTablet,
    isSmallScreen,
    hp,
    wp,
    moderateScale,
  } = useResponsive();

  // ============================================================================
  // STATE
  // ============================================================================

  const [reduceMotion, setReduceMotion] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const isNavigating = useRef(false);

  // ============================================================================
  // ANIMATION VALUES
  // ============================================================================

  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // RESPONSIVE SIZES
  // ============================================================================

  const sizes = useMemo(
    () => calculateResponsiveSizes(width, height, isLandscape, isTablet, moderateScale, hp, wp),
    [width, height, isLandscape, isTablet, moderateScale, hp, wp]
  );

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

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription?.remove();
  }, []);

  // Reset on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      isNavigating.current = false;
      setShowButtons(false);

      // Reset all animations
      logoAnim.setValue(0);
      titleAnim.setValue(0);
      taglineAnim.setValue(0);
      featureAnims.forEach((anim) => anim.setValue(0));
      buttonsAnim.setValue(0);
      pulseAnim.setValue(1);
      glowAnim.setValue(0);

      setFocusCount((prev) => prev + 1);
    });
    return unsubscribe;
  }, [navigation, logoAnim, titleAnim, taglineAnim, featureAnims, buttonsAnim, pulseAnim, glowAnim]);

  // Premium entrance animations sequence
  useEffect(() => {
    if (reduceMotion) {
      logoAnim.setValue(1);
      titleAnim.setValue(1);
      taglineAnim.setValue(1);
      featureAnims.forEach((anim) => anim.setValue(1));
      buttonsAnim.setValue(1);
      glowAnim.setValue(1);
      setShowButtons(true);
      return;
    }

    // Phase 1: Logo entrance with spring
    const logoAnimation = Animated.spring(logoAnim, {
      toValue: 1,
      tension: 35,
      friction: 8,
      useNativeDriver: true,
    });

    // Phase 2: Title fade in
    const titleAnimation = Animated.timing(titleAnim, {
      toValue: 1,
      duration: ANIMATION_TIMING.taglineEntry,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // Phase 3: Tagline
    const taglineAnimation = Animated.timing(taglineAnim, {
      toValue: 1,
      duration: ANIMATION_TIMING.taglineEntry,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // Phase 4: Feature cards stagger
    const featureAnimations = featureAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * ANIMATION_TIMING.featureStagger,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    );

    // Glow animation
    const glowAnimation = Animated.timing(glowAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // Start sequence
    Animated.sequence([
      Animated.delay(100),
      logoAnimation,
    ]).start();

    Animated.sequence([
      Animated.delay(500),
      titleAnimation,
    ]).start();

    Animated.sequence([
      Animated.delay(700),
      taglineAnimation,
    ]).start();

    Animated.sequence([
      Animated.delay(900),
      Animated.stagger(ANIMATION_TIMING.featureStagger, featureAnimations),
    ]).start();

    Animated.sequence([
      Animated.delay(300),
      glowAnimation,
    ]).start();

    // 3-second timer for button reveal
    const splashTimer = setTimeout(() => {
      setShowButtons(true);

      Animated.spring(buttonsAnim, {
        toValue: 1,
        tension: 45,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(splashTimer);
    };
  }, [reduceMotion, logoAnim, titleAnim, taglineAnim, featureAnims, buttonsAnim, glowAnim, focusCount]);

  // Subtle pulse animation for logo
  useEffect(() => {
    if (reduceMotion) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: ANIMATION_TIMING.pulseInterval / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: ANIMATION_TIMING.pulseInterval / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => {
      pulse.start();
    }, 1500);

    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
  }, [reduceMotion, pulseAnim, focusCount]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleGetStarted = useCallback(() => {
    if (isNavigating.current || !showButtons) return;
    isNavigating.current = true;
    navigation.navigate('SignUp');
  }, [navigation, showButtons]);

  const handleSignIn = useCallback(() => {
    if (isNavigating.current || !showButtons) return;
    isNavigating.current = true;
    navigation.navigate('Login');
  }, [navigation, showButtons]);

  // ============================================================================
  // ANIMATION INTERPOLATIONS
  // ============================================================================

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const logoOpacity = logoAnim;

  const titleTranslateY = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [25, 0],
  });

  const taglineTranslateY = taglineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const combinedLogoScale = Animated.multiply(logoScale, pulseAnim);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  // ============================================================================
  // RENDER - PORTRAIT CONTENT
  // ============================================================================

  const renderPortraitContent = () => {
    const contentMaxWidth = isTablet ? 580 : undefined;

    return (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (isTablet ? 56 : 40),
            paddingBottom: insets.bottom + (isTablet ? 48 : 32),
            paddingHorizontal: sizes.screenPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={contentMaxWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth } : undefined}>

          {/* Logo and Header Section */}
          <View style={[styles.logoSection, { marginBottom: sizes.sectionSpacing }]}>
            {/* Animated glow behind logo */}
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  width: sizes.logoOuterGlowSize + 60,
                  height: sizes.logoOuterGlowSize + 60,
                  borderRadius: (sizes.logoOuterGlowSize + 60) / 2,
                  opacity: glowOpacity,
                },
              ]}
            />

            {/* Logo container with premium styling */}
            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: combinedLogoScale }],
                },
              ]}
            >
              {/* Outer decorative ring */}
              <View
                style={[
                  styles.logoOuterRing,
                  {
                    width: sizes.logoOuterGlowSize,
                    height: sizes.logoOuterGlowSize,
                    borderRadius: sizes.logoOuterGlowSize / 2,
                  },
                ]}
              />

              {/* Main logo container */}
              <View
                style={[
                  styles.logoContainer,
                  {
                    width: sizes.logoContainerSize,
                    height: sizes.logoContainerSize,
                    borderRadius: sizes.logoContainerSize / 2,
                  },
                ]}
              >
                <Image
                  source={TanderLogo}
                  style={{
                    width: sizes.logoSize,
                    height: sizes.logoSize,
                  }}
                  resizeMode="contain"
                  accessible={true}
                  accessibilityLabel="Tander logo - two interlocking hearts representing connection"
                />
              </View>
            </Animated.View>

            {/* App Title */}
            <Animated.Text
              style={[
                styles.title,
                {
                  fontSize: sizes.titleSize,
                  opacity: titleAnim,
                  transform: [{ translateY: titleTranslateY }],
                },
              ]}
              accessible={true}
              accessibilityRole="header"
            >
              TANDER
            </Animated.Text>

            {/* Tagline */}
            <Animated.Text
              style={[
                styles.tagline,
                {
                  fontSize: sizes.subtitleSize,
                  opacity: taglineAnim,
                  transform: [{ translateY: taglineTranslateY }],
                },
              ]}
              accessible={true}
            >
              Where Meaningful Connections Begin
            </Animated.Text>

            {/* Sub-tagline */}
            <Animated.Text
              style={[
                styles.subTagline,
                {
                  fontSize: sizes.taglineSize,
                  opacity: taglineAnim,
                  transform: [{ translateY: taglineTranslateY }],
                },
              ]}
            >
              Made for Filipino seniors 60+
            </Animated.Text>
          </View>

          {/* Feature Cards Section */}
          <View
            style={[
              styles.featuresSection,
              {
                marginBottom: sizes.sectionSpacing,
                gap: isTablet ? 20 : 16,
              },
            ]}
            accessible={true}
            accessibilityRole="list"
            accessibilityLabel="App features"
          >
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                sizes={sizes}
                animatedValue={featureAnims[index]}
                index={index}
              />
            ))}
          </View>

          {/* Buttons Section */}
          <Animated.View
            style={[
              styles.buttonsSection,
              {
                opacity: buttonsAnim,
                gap: sizes.buttonSpacing,
              },
            ]}
            pointerEvents={showButtons ? 'auto' : 'none'}
          >
            {/* Primary Button */}
            <AnimatedButton
              onPress={handleGetStarted}
              title="Get Started"
              variant="primary"
              height={sizes.buttonHeight}
              textSize={sizes.buttonTextSize}
              accessibilityHint="Tap to create a new account and start finding connections"
              animatedValue={buttonsAnim}
            />

            {/* Secondary Button */}
            <AnimatedButton
              onPress={handleSignIn}
              title="I Already Have an Account"
              variant="secondary"
              height={sizes.buttonHeight}
              textSize={sizes.buttonTextSize}
              accessibilityHint="Tap to sign in to your existing Tander account"
              animatedValue={buttonsAnim}
            />

            {/* Trust Badge */}
            <Animated.View
              style={[styles.trustBadge, { opacity: buttonsAnim }]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel="Your privacy and safety are our top priority"
            >
              <View style={styles.trustBadgeIcon}>
                <Feather name="shield" size={sizes.privacyIconSize} color={colors.teal[400]} />
              </View>
              <Text style={[styles.trustBadgeText, { fontSize: sizes.privacyTextSize }]}>
                Your privacy and safety are our top priority
              </Text>
            </Animated.View>
          </Animated.View>
        </View>
      </ScrollView>
    );
  };

  // ============================================================================
  // RENDER - LANDSCAPE CONTENT
  // ============================================================================

  const renderLandscapeContent = () => {
    const leftPadding = Math.max(insets.left, 20) + 20;
    const rightPadding = Math.max(insets.right, 20) + 20;
    const topPadding = Math.max(insets.top, 12) + 12;
    const bottomPadding = Math.max(insets.bottom, 12) + 12;

    const availableWidth = width - leftPadding - rightPadding;
    const leftSideWidth = isTablet ? availableWidth * 0.52 : availableWidth * 0.48;
    const rightSideWidth = isTablet ? Math.min(availableWidth * 0.42, 420) : Math.min(availableWidth * 0.46, 360);

    return (
      <View
        style={[
          styles.landscapeContainer,
          {
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            paddingLeft: leftPadding,
            paddingRight: rightPadding,
          },
        ]}
      >
        {/* Left Side - Branding */}
        <View style={[styles.landscapeLeft, { flex: 1, maxWidth: leftSideWidth }]}>
          {/* Logo glow */}
          <Animated.View
            style={[
              styles.logoGlow,
              {
                width: sizes.logoOuterGlowSize + 40,
                height: sizes.logoOuterGlowSize + 40,
                borderRadius: (sizes.logoOuterGlowSize + 40) / 2,
                opacity: glowOpacity,
                position: 'absolute',
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoAnim,
                transform: [{ scale: combinedLogoScale }],
                marginBottom: 16,
              },
            ]}
          >
            <View
              style={[
                styles.logoOuterRing,
                {
                  width: sizes.logoOuterGlowSize,
                  height: sizes.logoOuterGlowSize,
                  borderRadius: sizes.logoOuterGlowSize / 2,
                },
              ]}
            />
            <View
              style={[
                styles.logoContainer,
                {
                  width: sizes.logoContainerSize,
                  height: sizes.logoContainerSize,
                  borderRadius: sizes.logoContainerSize / 2,
                },
              ]}
            >
              <Image
                source={TanderLogo}
                style={{ width: sizes.logoSize, height: sizes.logoSize }}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="Tander logo"
              />
            </View>
          </Animated.View>

          <Animated.Text
            style={[
              styles.title,
              {
                fontSize: sizes.titleSize,
                opacity: titleAnim,
                transform: [{ translateY: titleTranslateY }],
                marginBottom: 8,
              },
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            TANDER
          </Animated.Text>

          <Animated.Text
            style={[
              styles.tagline,
              {
                fontSize: sizes.subtitleSize,
                opacity: taglineAnim,
                transform: [{ translateY: taglineTranslateY }],
                marginBottom: 20,
              },
            ]}
          >
            Where Meaningful{'\n'}Connections Begin
          </Animated.Text>

          {/* Compact Features */}
          <View style={[styles.landscapeFeatures, { maxWidth: Math.min(leftSideWidth - 24, 340) }]}>
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                sizes={sizes}
                isCompact={true}
                animatedValue={featureAnims[index]}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Decorative Divider */}
        <View style={styles.landscapeDivider}>
          <View style={styles.landscapeDividerLine} />
          <View style={styles.landscapeDividerDot} />
          <View style={styles.landscapeDividerLine} />
        </View>

        {/* Right Side - Actions */}
        <Animated.View
          style={[
            styles.landscapeRight,
            {
              maxWidth: rightSideWidth,
              opacity: buttonsAnim,
            },
          ]}
          pointerEvents={showButtons ? 'auto' : 'none'}
        >
          <Text style={[styles.landscapeHeading, { fontSize: Math.max(22, sizes.titleSize * 0.55) }]}>
            Ready to find{'\n'}your connection?
          </Text>

          <AnimatedButton
            onPress={handleGetStarted}
            title="Get Started"
            variant="primary"
            height={sizes.buttonHeight}
            textSize={sizes.buttonTextSize}
            accessibilityHint="Create a new account"
            style={{ width: '100%', marginBottom: 14 }}
            animatedValue={buttonsAnim}
          />

          <AnimatedButton
            onPress={handleSignIn}
            title="Sign In"
            variant="secondary"
            height={Math.max(52, sizes.buttonHeight - 8)}
            textSize={Math.max(16, sizes.buttonTextSize - 2)}
            accessibilityHint="Sign in to existing account"
            style={{ width: '100%' }}
            animatedValue={buttonsAnim}
          />

          <View style={[styles.trustBadge, { marginTop: 20 }]}>
            <View style={styles.trustBadgeIcon}>
              <Feather
                name="shield"
                size={Math.max(16, sizes.privacyIconSize - 2)}
                color={colors.teal[400]}
              />
            </View>
            <Text style={[styles.trustBadgeText, { fontSize: Math.max(12, sizes.privacyTextSize - 1) }]}>
              Privacy & safety first
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Premium Gradient Background */}
      <LinearGradient
        colors={[
          PREMIUM_COLORS.gradientTop,
          PREMIUM_COLORS.gradientMiddle,
          PREMIUM_COLORS.gradientBottom,
        ]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        {/* Decorative floating elements */}
        <FloatingHearts isTablet={isTablet} isLandscape={isLandscape} reduceMotion={reduceMotion} />

        {/* Decorative circles */}
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle1,
            {
              width: isTablet ? 400 : isLandscape ? 200 : 300,
              height: isTablet ? 400 : isLandscape ? 200 : 300,
              borderRadius: isTablet ? 200 : isLandscape ? 100 : 150,
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle2,
            {
              width: isTablet ? 300 : isLandscape ? 150 : 220,
              height: isTablet ? 300 : isLandscape ? 150 : 220,
              borderRadius: isTablet ? 150 : isLandscape ? 75 : 110,
            },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle3,
            {
              width: isTablet ? 200 : isLandscape ? 100 : 160,
              height: isTablet ? 200 : isLandscape ? 100 : 160,
              borderRadius: isTablet ? 100 : isLandscape ? 50 : 80,
            },
          ]}
        />

        {/* Main Content */}
        {isLandscape ? renderLandscapeContent() : renderPortraitContent()}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  // ============================================================================
  // DECORATIVE ELEMENTS
  // ============================================================================
  decorCircle: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.glassTint,
  },
  decorCircle1: {
    top: -80,
    right: -60,
  },
  decorCircle2: {
    top: '35%',
    left: -100,
  },
  decorCircle3: {
    bottom: '15%',
    right: -50,
  },

  floatingHeart: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 107, 138, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 138, 0.25)',
  },
  floatingHeart1: {
    top: '12%',
    right: '8%',
  },
  floatingHeart2: {
    top: '65%',
    left: '5%',
  },
  floatingHeart3: {
    bottom: '25%',
    right: '15%',
  },

  // ============================================================================
  // LOGO SECTION
  // ============================================================================
  logoSection: {
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    backgroundColor: PREMIUM_COLORS.warmGlow,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoOuterRing: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoContainer: {
    backgroundColor: PREMIUM_COLORS.glassWhite,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  title: {
    fontWeight: '800',
    color: PREMIUM_COLORS.textPrimary,
    letterSpacing: 2,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  tagline: {
    color: PREMIUM_COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  subTagline: {
    color: PREMIUM_COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ============================================================================
  // FEATURE CARDS
  // ============================================================================
  featuresSection: {
    // Gap set dynamically
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: PREMIUM_COLORS.cardBackground,
    shadowColor: PREMIUM_COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  featureIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: colors.gray[800],
    fontWeight: '700',
    marginBottom: 4,
  },
  featureSubtitle: {
    color: colors.gray[500],
    fontWeight: '500',
    lineHeight: 22,
  },

  // ============================================================================
  // BUTTONS
  // ============================================================================
  buttonsSection: {
    // Gap set dynamically
  },
  primaryButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: 'rgba(244, 81, 30, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2.5,
    borderColor: PREMIUM_COLORS.buttonSecondaryBorder,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: PREMIUM_COLORS.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 16,
  },
  trustBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustBadgeText: {
    color: PREMIUM_COLORS.textSecondary,
    fontWeight: '500',
  },

  // ============================================================================
  // LANDSCAPE LAYOUT
  // ============================================================================
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  landscapeLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  landscapeDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '60%',
    marginHorizontal: 24,
  },
  landscapeDividerLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  landscapeDividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginVertical: 8,
  },
  landscapeFeatures: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  landscapeFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: PREMIUM_COLORS.cardBackground,
    shadowColor: PREMIUM_COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  landscapeFeatureIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeFeatureTextContainer: {
    flex: 1,
  },
  landscapeFeatureTitle: {
    color: colors.gray[800],
    fontWeight: '700',
    marginBottom: 2,
  },
  landscapeFeatureSubtitle: {
    color: colors.gray[500],
    fontWeight: '500',
  },
  landscapeHeading: {
    fontWeight: '700',
    color: PREMIUM_COLORS.textPrimary,
    marginBottom: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 32,
  },
});

export default WelcomeScreen;
