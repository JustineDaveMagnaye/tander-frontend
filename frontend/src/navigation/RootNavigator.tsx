/**
 * TANDER Root Navigator
 * Handles authentication state and switches between Auth and Main flows
 * Includes premium responsive loading screen for all device sizes
 *
 * IMPORTANT: Shows Loading screen for 3 seconds on EVERY app open
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Animated,
  Platform,
  StatusBar,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitialized,
} from '../store/authStore';
import { WebSocketProvider } from '@services/websocket';
import { colors } from '@shared/styles';
import { Text, LocationPermissionGate } from '@shared/components';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';

/** Duration to show loading splash on every app open (in milliseconds) */
const LOADING_SPLASH_DURATION = 3000;

// ============================================================================
// PREMIUM COLOR PALETTE - Matching WelcomeScreen exactly
// ============================================================================
const LOADING_COLORS = {
  // Gradient backgrounds - warm, romantic feel
  gradientTop: '#FF8A65',      // Warm coral-orange
  gradientMiddle: '#FF7043',   // Deeper coral
  gradientBottom: '#26A69A',   // Trust-inspiring teal

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.95)',
  glassTint: 'rgba(255, 255, 255, 0.12)',
  glassStroke: 'rgba(255, 255, 255, 0.35)',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.75)',

  // Decorative
  heartPink: 'rgba(255, 107, 138, 0.6)',
  warmGlow: 'rgba(255, 183, 77, 0.3)',
  ringGlow: 'rgba(255, 255, 255, 0.25)',
} as const;

// ============================================================================
// ANIMATION TIMING CONSTANTS
// ============================================================================
const ANIMATION_TIMING = {
  logoEntry: 800,
  glowFadeIn: 1200,
  textFadeIn: 600,
  textDelay: 400,
  pulseInterval: 2000,
  ringRotation: 25000,
  dotBounce: 500,
  dotStagger: 120,
  heartFloat: 3500,
} as const;

const Stack = createNativeStackNavigator<RootStackParamList>();

// ============================================================================
// RESPONSIVE SIZE CALCULATOR - Premium proportions for all devices
// ============================================================================
interface LoadingResponsiveSizes {
  logoSize: number;
  logoContainerSize: number;
  logoOuterGlowSize: number;
  ringSize: number;
  titleSize: number;
  subtitleSize: number;
  taglineSize: number;
  dotSize: number;
  dotSpacing: number;
  sectionSpacing: number;
  heartSizes: [number, number, number, number];
  footerIconSize: number;
  footerTextSize: number;
  decorCircleSizes: {
    large: number;
    medium: number;
    small: number;
  };
}

const calculateLoadingSizes = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  hp: (p: number) => number,
  wp: (p: number) => number,
  moderateScale: (size: number, factor?: number) => number
): LoadingResponsiveSizes => {
  const isSmallPhone = width < BREAKPOINTS.xs + 56;
  const isMediumPhone = width >= BREAKPOINTS.xs + 56 && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;
  const isSmallTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;
  const isLargeTablet = width >= BREAKPOINTS.largeTablet;

  // Logo sizing - landscape safe with Math.min pattern
  let logoSize: number;
  let logoContainerSize: number;
  let logoOuterGlowSize: number;

  if (isLandscape) {
    // In landscape, constrain by height to prevent overflow
    logoSize = Math.min(hp(28), wp(16), 130);
    logoContainerSize = logoSize + 32;
    logoOuterGlowSize = logoSize + 70;
  } else if (isLargeTablet) {
    logoSize = moderateScale(180, 0.3);
    logoContainerSize = logoSize + 52;
    logoOuterGlowSize = logoSize + 100;
  } else if (isSmallTablet) {
    logoSize = moderateScale(160, 0.3);
    logoContainerSize = logoSize + 46;
    logoOuterGlowSize = logoSize + 85;
  } else if (isLargePhone) {
    logoSize = moderateScale(140, 0.4);
    logoContainerSize = logoSize + 40;
    logoOuterGlowSize = logoSize + 75;
  } else if (isMediumPhone) {
    logoSize = moderateScale(120, 0.4);
    logoContainerSize = logoSize + 36;
    logoOuterGlowSize = logoSize + 65;
  } else {
    // Small phones
    logoSize = moderateScale(100, 0.4);
    logoContainerSize = logoSize + 32;
    logoOuterGlowSize = logoSize + 55;
  }

  // Ring size is slightly larger than container
  const ringSize = logoContainerSize + 24;

  // Typography - premium, readable sizes for seniors (minimum 16px body)
  let titleSize: number;
  let subtitleSize: number;
  let taglineSize: number;

  if (isLandscape) {
    titleSize = Math.min(hp(12), wp(7), 48);
    subtitleSize = Math.min(hp(5), wp(3.5), 22);
    taglineSize = Math.min(hp(4), wp(3), 16);
  } else if (isLargeTablet) {
    titleSize = 64;
    subtitleSize = 26;
    taglineSize = 18;
  } else if (isSmallTablet) {
    titleSize = 56;
    subtitleSize = 24;
    taglineSize = 17;
  } else if (isLargePhone) {
    titleSize = 48;
    subtitleSize = 22;
    taglineSize = 16;
  } else if (isMediumPhone) {
    titleSize = 44;
    subtitleSize = 20;
    taglineSize = 15;
  } else {
    titleSize = 40;
    subtitleSize = 19;
    taglineSize = 14;
  }

  // Loading dots - visible and bouncy
  let dotSize: number;
  let dotSpacing: number;

  if (isLandscape) {
    dotSize = Math.min(hp(3.5), 14);
    dotSpacing = Math.min(hp(2), 10);
  } else if (isTablet) {
    dotSize = 16;
    dotSpacing = 12;
  } else if (isLargePhone) {
    dotSize = 14;
    dotSpacing = 10;
  } else {
    dotSize = 12;
    dotSpacing = 8;
  }

  // Section spacing
  const sectionSpacing = isLandscape
    ? Math.min(hp(5), 28)
    : isTablet
      ? 40
      : isLargePhone
        ? 32
        : 28;

  // Floating hearts - varied sizes for visual interest
  const heartBaseSize = isLandscape
    ? Math.min(hp(6), 28)
    : isTablet
      ? 32
      : 24;
  const heartSizes: [number, number, number, number] = [
    heartBaseSize,
    heartBaseSize * 0.8,
    heartBaseSize * 0.65,
    heartBaseSize * 0.5,
  ];

  // Footer
  const footerIconSize = isTablet ? 18 : 16;
  const footerTextSize = isTablet ? 16 : 14;

  // Decorative circles - responsive to screen size
  const decorCircleSizes = {
    large: isTablet ? 400 : isLandscape ? 220 : 320,
    medium: isTablet ? 300 : isLandscape ? 160 : 240,
    small: isTablet ? 180 : isLandscape ? 100 : 140,
  };

  return {
    logoSize,
    logoContainerSize,
    logoOuterGlowSize,
    ringSize,
    titleSize,
    subtitleSize,
    taglineSize,
    dotSize,
    dotSpacing,
    sectionSpacing,
    heartSizes,
    footerIconSize,
    footerTextSize,
    decorCircleSizes,
  };
};

// ============================================================================
// PREMIUM ANIMATED LOADING DOTS COMPONENT
// ============================================================================
interface LoadingDotsProps {
  dotSize: number;
  dotSpacing: number;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ dotSize, dotSpacing }) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: ANIMATION_TIMING.dotBounce,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: ANIMATION_TIMING.dotBounce,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(ANIMATION_TIMING.dotStagger * 2),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1Anim, 0);
    const anim2 = createDotAnimation(dot2Anim, ANIMATION_TIMING.dotStagger);
    const anim3 = createDotAnimation(dot3Anim, ANIMATION_TIMING.dotStagger * 2);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  const createDotStyle = (anim: Animated.Value) => ({
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: LOADING_COLORS.textPrimary,
    marginHorizontal: dotSpacing,
    shadowColor: LOADING_COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1.3],
        }),
      },
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -dotSize],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 1, 0.9],
    }),
  });

  return (
    <View style={loadingStyles.dotsContainer} accessible={true} accessibilityLabel="Loading">
      <Animated.View style={createDotStyle(dot1Anim)} />
      <Animated.View style={createDotStyle(dot2Anim)} />
      <Animated.View style={createDotStyle(dot3Anim)} />
    </View>
  );
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
  const rotateAnim = useRef(new Animated.Value(0)).current;

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
          duration: duration + Math.random() * 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration + Math.random() * 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Gentle rotation
    const rotateLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: duration * 1.5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: duration * 1.5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const floatTimer = setTimeout(() => floatLoop.start(), delay);
    const rotateTimer = setTimeout(() => rotateLoop.start(), delay + 200);

    return () => {
      clearTimeout(floatTimer);
      clearTimeout(rotateTimer);
      floatLoop.stop();
      rotateLoop.stop();
    };
  }, [floatAnim, fadeAnim, rotateAnim, delay, duration]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-6deg', '6deg', '-6deg'],
  });

  const opacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <Animated.View
      style={[
        loadingStyles.floatingHeart,
        {
          left: `${positionX}%`,
          top: `${positionY}%`,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          loadingStyles.heartCircle,
          {
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
          },
        ]}
      >
        <Feather name="heart" size={size} color={LOADING_COLORS.heartPink} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// DECORATIVE CIRCLES COMPONENT
// ============================================================================
interface DecorativeCirclesProps {
  sizes: LoadingResponsiveSizes['decorCircleSizes'];
  isLandscape: boolean;
}

const DecorativeCircles: React.FC<DecorativeCirclesProps> = ({ sizes, isLandscape }) => {
  return (
    <>
      <View
        style={[
          loadingStyles.decorCircle,
          {
            width: sizes.large,
            height: sizes.large,
            borderRadius: sizes.large / 2,
            top: isLandscape ? -sizes.large * 0.3 : -sizes.large * 0.25,
            right: isLandscape ? -sizes.large * 0.2 : -sizes.large * 0.2,
          },
        ]}
      />
      <View
        style={[
          loadingStyles.decorCircle,
          {
            width: sizes.medium,
            height: sizes.medium,
            borderRadius: sizes.medium / 2,
            top: '38%',
            left: isLandscape ? -sizes.medium * 0.4 : -sizes.medium * 0.35,
          },
        ]}
      />
      <View
        style={[
          loadingStyles.decorCircle,
          {
            width: sizes.small,
            height: sizes.small,
            borderRadius: sizes.small / 2,
            bottom: isLandscape ? '15%' : '18%',
            right: isLandscape ? -sizes.small * 0.25 : -sizes.small * 0.2,
          },
        ]}
      />
    </>
  );
};

// ============================================================================
// PREMIUM LOADING SCREEN COMPONENT
// ============================================================================

/**
 * Premium Responsive Loading Screen for TANDER
 *
 * Features:
 * - Matches WelcomeScreen's premium aesthetic exactly
 * - Fully responsive from 320px phones to 1280px tablets
 * - Landscape-safe with Math.min constraints
 * - Senior-friendly with large text (minimum 14px, recommended 16px+)
 * - Smooth, delightful animations that build anticipation
 * - Floating hearts decoration
 * - Custom animated loading dots (no ActivityIndicator)
 * - Logo with premium glow effect and subtle pulse
 * - Glassmorphism styling
 * - WCAG AA compliant contrast
 * - Respects reduce motion accessibility setting
 */
const LoadingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, isTablet, hp, wp, moderateScale } = useResponsive();

  // Accessibility: check reduce motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

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

  // Animation values
  const logoScaleAnim = useRef(new Animated.Value(0.3)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowScaleAnim = useRef(new Animated.Value(0.7)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  const textTranslateAnim = useRef(new Animated.Value(30)).current;
  const ringRotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const footerOpacityAnim = useRef(new Animated.Value(0)).current;

  // Calculate responsive sizes
  const sizes = useMemo(
    () => calculateLoadingSizes(width, height, isLandscape, isTablet, hp, wp, moderateScale),
    [width, height, isLandscape, isTablet, hp, wp, moderateScale]
  );

  // Premium entrance animations sequence
  useEffect(() => {
    if (reduceMotion) {
      // Skip animations for reduce motion preference
      logoScaleAnim.setValue(1);
      logoOpacityAnim.setValue(1);
      glowOpacityAnim.setValue(0.8);
      glowScaleAnim.setValue(1);
      textOpacityAnim.setValue(1);
      textTranslateAnim.setValue(0);
      footerOpacityAnim.setValue(1);
      return;
    }

    // Phase 1: Glow and logo entrance
    Animated.parallel([
      // Glow fade in
      Animated.timing(glowOpacityAnim, {
        toValue: 0.8,
        duration: ANIMATION_TIMING.glowFadeIn,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Glow scale
      Animated.spring(glowScaleAnim, {
        toValue: 1,
        tension: 25,
        friction: 8,
        useNativeDriver: true,
      }),
      // Logo opacity
      Animated.timing(logoOpacityAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.logoEntry,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Logo scale with spring
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 45,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Text content entrance (delayed)
    Animated.parallel([
      Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.textFadeIn,
        delay: ANIMATION_TIMING.textDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateAnim, {
        toValue: 0,
        duration: ANIMATION_TIMING.textFadeIn,
        delay: ANIMATION_TIMING.textDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 3: Footer fade in
    Animated.timing(footerOpacityAnim, {
      toValue: 1,
      duration: 500,
      delay: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Continuous animations: Ring rotation
    const ringRotation = Animated.loop(
      Animated.timing(ringRotationAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.ringRotation,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    ringRotation.start();

    // Continuous animations: Subtle pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: ANIMATION_TIMING.pulseInterval,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: ANIMATION_TIMING.pulseInterval,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseTimer = setTimeout(() => pulse.start(), 1000);

    return () => {
      ringRotation.stop();
      pulse.stop();
      clearTimeout(pulseTimer);
    };
  }, [
    reduceMotion,
    logoScaleAnim,
    logoOpacityAnim,
    glowOpacityAnim,
    glowScaleAnim,
    textOpacityAnim,
    textTranslateAnim,
    footerOpacityAnim,
    ringRotationAnim,
    pulseAnim,
  ]);

  // Animation interpolations
  const ringRotate = ringRotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const combinedLogoScale = Animated.multiply(logoScaleAnim, pulseAnim);

  // Landscape layout adjustments
  const contentPaddingHorizontal = isLandscape ? wp(5) : wp(6);
  const contentMaxWidth = isTablet ? 600 : undefined;

  return (
    <View style={loadingStyles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      <LinearGradient
        colors={[
          LOADING_COLORS.gradientTop,
          LOADING_COLORS.gradientMiddle,
          LOADING_COLORS.gradientBottom,
        ]}
        locations={[0, 0.45, 1]}
        style={loadingStyles.gradient}
      >
        {/* Safe area padding container */}
        <View
          style={[
            loadingStyles.safeContainer,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            },
          ]}
        >
          {/* Decorative background circles */}
          <DecorativeCircles sizes={sizes.decorCircleSizes} isLandscape={isLandscape} />

          {/* Floating hearts decoration */}
          {!reduceMotion && (
            <>
              <FloatingHeart size={sizes.heartSizes[0]} positionX={12} positionY={15} delay={0} />
              <FloatingHeart size={sizes.heartSizes[1]} positionX={82} positionY={12} delay={400} />
              <FloatingHeart size={sizes.heartSizes[2]} positionX={8} positionY={68} delay={700} />
              <FloatingHeart size={sizes.heartSizes[1]} positionX={88} positionY={60} delay={500} />
              <FloatingHeart size={sizes.heartSizes[3]} positionX={25} positionY={45} delay={900} />
              <FloatingHeart size={sizes.heartSizes[3]} positionX={75} positionY={38} delay={1100} />
            </>
          )}

          {/* Main content */}
          <View
            style={[
              loadingStyles.content,
              isLandscape && loadingStyles.contentLandscape,
              {
                paddingHorizontal: contentPaddingHorizontal,
                maxWidth: contentMaxWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
          >
            {/* Logo section */}
            <View style={loadingStyles.logoSection}>
              {/* Outer glow effect */}
              <Animated.View
                style={[
                  loadingStyles.logoGlow,
                  {
                    width: sizes.logoOuterGlowSize + 40,
                    height: sizes.logoOuterGlowSize + 40,
                    borderRadius: (sizes.logoOuterGlowSize + 40) / 2,
                    opacity: glowOpacityAnim,
                    transform: [{ scale: glowScaleAnim }],
                  },
                ]}
              />

              {/* Logo wrapper with pulse */}
              <Animated.View
                style={[
                  loadingStyles.logoWrapper,
                  {
                    opacity: logoOpacityAnim,
                    transform: [{ scale: combinedLogoScale }],
                  },
                ]}
              >
                {/* Rotating decorative ring */}
                <Animated.View
                  style={[
                    loadingStyles.logoRing,
                    {
                      width: sizes.ringSize,
                      height: sizes.ringSize,
                      borderRadius: sizes.ringSize / 2,
                      transform: [{ rotate: reduceMotion ? '0deg' : ringRotate }],
                    },
                  ]}
                />

                {/* Outer decorative ring (static) */}
                <View
                  style={[
                    loadingStyles.logoOuterRing,
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
                    loadingStyles.logoContainer,
                    {
                      width: sizes.logoContainerSize,
                      height: sizes.logoContainerSize,
                      borderRadius: sizes.logoContainerSize / 2,
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/icons/tander-logo.png')}
                    style={{
                      width: sizes.logoSize,
                      height: sizes.logoSize,
                    }}
                    resizeMode="contain"
                    accessible={true}
                    accessibilityLabel="Tander logo - hearts connecting"
                  />
                </View>
              </Animated.View>
            </View>

            {/* Text content */}
            <Animated.View
              style={[
                loadingStyles.textContainer,
                {
                  opacity: textOpacityAnim,
                  transform: [{ translateY: textTranslateAnim }],
                  marginTop: sizes.sectionSpacing,
                },
              ]}
            >
              <Text
                variant="h1"
                color={LOADING_COLORS.textPrimary}
                style={[
                  loadingStyles.title,
                  { fontSize: sizes.titleSize },
                ]}
                accessible={true}
                accessibilityRole="header"
              >
                TANDER
              </Text>
              <Text
                variant="body"
                color={LOADING_COLORS.textSecondary}
                style={[
                  loadingStyles.subtitle,
                  { fontSize: sizes.subtitleSize, marginTop: 10 },
                ]}
              >
                Where Meaningful Connections Begin
              </Text>
            </Animated.View>

            {/* Loading indicator section */}
            <Animated.View
              style={[
                loadingStyles.loaderWrapper,
                {
                  opacity: textOpacityAnim,
                  marginTop: sizes.sectionSpacing * 1.25,
                },
              ]}
            >
              <LoadingDots dotSize={sizes.dotSize} dotSpacing={sizes.dotSpacing} />
              <Text
                variant="caption"
                color={LOADING_COLORS.textMuted}
                style={[
                  loadingStyles.loadingText,
                  { fontSize: sizes.taglineSize, marginTop: sizes.sectionSpacing * 0.5 },
                ]}
              >
                Preparing your experience...
              </Text>
            </Animated.View>
          </View>

          {/* Footer badge */}
          <Animated.View
            style={[
              loadingStyles.footer,
              { opacity: footerOpacityAnim },
            ]}
          >
            <View style={loadingStyles.footerBadge}>
              <View style={loadingStyles.footerIconContainer}>
                <Feather
                  name="heart"
                  size={sizes.footerIconSize}
                  color={colors.teal[400]}
                />
              </View>
              <Text
                variant="caption"
                color={LOADING_COLORS.textMuted}
                style={[loadingStyles.footerText, { fontSize: sizes.footerTextSize }]}
              >
                Made for Filipino Seniors 60+
              </Text>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// LOADING SCREEN STYLES - Premium, Responsive Design
// ============================================================================
const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
  },

  // Decorative circles
  decorCircle: {
    position: 'absolute',
    backgroundColor: LOADING_COLORS.glassTint,
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

  // Main content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentLandscape: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  // Logo section
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    backgroundColor: LOADING_COLORS.warmGlow,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: LOADING_COLORS.ringGlow,
    borderStyle: 'dashed',
  },
  logoOuterRing: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  logoContainer: {
    backgroundColor: LOADING_COLORS.glassWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
  },

  // Text content
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },

  // Loading dots
  loaderWrapper: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  loadingText: {
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 10,
  },
  footerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore(selectIsInitialized);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  // Loading splash state - shows for 3 seconds on EVERY app open
  // Only applies to AUTHENTICATED users (unauthenticated go through AuthNavigator's WelcomeScreen)
  const [showLoadingSplash, setShowLoadingSplash] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Loading splash timer - 3 seconds on every app open (for authenticated users)
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const timer = setTimeout(() => {
      setShowLoadingSplash(false);
    }, LOADING_SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [isInitialized, isAuthenticated]);

  // Show loading screen only during initial auth check
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // For AUTHENTICATED users: Show Loading splash for 3 seconds before Main
  if (isAuthenticated && showLoadingSplash) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <WebSocketProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main">
              {() => (
                <LocationPermissionGate>
                  <MainTabNavigator />
                </LocationPermissionGate>
              )}
            </Stack.Screen>
          ) : (
            // Unauthenticated: AuthNavigator starts with WelcomeScreen (3-sec splash built-in)
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </WebSocketProvider>
    </NavigationContainer>
  );
};

export default RootNavigator;
