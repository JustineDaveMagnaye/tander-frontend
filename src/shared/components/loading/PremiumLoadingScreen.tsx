/**
 * Premium iOS-Style Loading Screen
 *
 * Super premium loading experience with:
 * - Animated gradient background with color shifts
 * - Floating orbs/particles with parallax effect
 * - Logo with pulse and glow animations
 * - Custom shimmer loading indicator
 * - Staggered text entrance animations
 * - Premium typography and spacing
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TanderLogo = require('../../../../assets/icons/tander-logo.png');

// =============================================================================
// CONSTANTS
// =============================================================================

const NUM_FLOATING_ORBS = 6;
const ANIMATION_DURATION = {
  logoEntrance: 800,
  logoPulse: 2000,
  textEntrance: 600,
  orbFloat: 4000,
  shimmer: 1500,
  gradientShift: 8000,
};

// =============================================================================
// FLOATING ORB COMPONENT
// =============================================================================

interface FloatingOrbProps {
  index: number;
  delay: number;
}

const FloatingOrb: React.FC<FloatingOrbProps> = ({ index, delay }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Random but consistent position for each orb (using screen percentages)
  const position = useMemo(() => {
    const positions = [
      { left: SCREEN_WIDTH * 0.1, top: 100, size: 80 },
      { left: SCREEN_WIDTH * 0.75, top: 60, size: 60 },
      { left: SCREEN_WIDTH * 0.85, top: 250, size: 100 },
      { left: SCREEN_WIDTH * 0.05, top: 400, size: 70 },
      { left: SCREEN_WIDTH * 0.7, top: 500, size: 90 },
      { left: SCREEN_WIDTH * 0.2, top: 650, size: 50 },
    ];
    return positions[index % positions.length];
  }, [index]);

  useEffect(() => {
    // Entrance animation
    const entranceTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.15 + (index * 0.03),
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    // Floating animation
    const floatAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -20 - (index * 5),
              duration: ANIMATION_DURATION.orbFloat + (index * 500),
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 10 + (index * 3),
              duration: ANIMATION_DURATION.orbFloat + (index * 300),
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 20 + (index * 5),
              duration: ANIMATION_DURATION.orbFloat + (index * 500),
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -10 - (index * 3),
              duration: ANIMATION_DURATION.orbFloat + (index * 300),
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    const floatTimer = setTimeout(floatAnimation, delay + 500);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(floatTimer);
    };
  }, [delay, index]);

  return (
    <Animated.View
      style={[
        styles.floatingOrb,
        {
          left: position.left,
          top: position.top,
          width: position.size,
          height: position.size,
          borderRadius: position.size / 2,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
};

// =============================================================================
// ANIMATED LOGO COMPONENT WITH CIRCULAR SPINNER
// =============================================================================

const LOGO_SIZE = 150;
const SPINNER_SIZE = 180; // Slightly larger than logo for the spinner ring
const SPINNER_STROKE = 3;

const AnimatedLogo: React.FC = () => {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Circular spinner rotation
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const spinnerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION.logoEntrance,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Spinner fade in
    Animated.timing(spinnerOpacity, {
      toValue: 1,
      duration: 800,
      delay: 600,
      useNativeDriver: true,
    }).start();

    // Continuous spinner rotation
    Animated.loop(
      Animated.timing(spinnerRotation, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.03,
          duration: ANIMATION_DURATION.logoPulse / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: ANIMATION_DURATION.logoPulse / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ring pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.5,
            duration: 2500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const spin = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.logoWrapper,
        {
          opacity,
          transform: [{ scale: Animated.multiply(scale, pulseScale) }],
        },
      ]}
    >
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.logoGlow,
          { opacity: glowOpacity },
        ]}
      />

      {/* Pulsing ring (fades out) */}
      <Animated.View
        style={[
          styles.logoRing,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* CIRCULAR SPINNER around logo */}
      <Animated.View
        style={[
          styles.logoSpinnerContainer,
          {
            opacity: spinnerOpacity,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        {/* Background track */}
        <View style={styles.logoSpinnerTrack} />

        {/* Animated gradient arc */}
        <View style={styles.logoSpinnerArc} />

        {/* Second arc for smoother effect */}
        <View style={styles.logoSpinnerArc2} />
      </Animated.View>

      {/* Main logo container */}
      <View style={styles.logoContainer}>
        <LinearGradient
          colors={[colors.orange[400], colors.orange[600]]}
          style={styles.logoGradientBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoInner}>
            <Image
              source={TanderLogo}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

// =============================================================================
// ANIMATED TEXT COMPONENT
// =============================================================================

interface AnimatedTextProps {
  text: string;
  style: any;
  delay: number;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ text, style, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION.textEntrance,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION.textEntrance,
        delay,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.Text
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      maxFontSizeMultiplier={FONT_SCALING.TITLE}
    >
      {text}
    </Animated.Text>
  );
};

// =============================================================================
// MAIN PREMIUM LOADING SCREEN
// =============================================================================

export const PremiumLoadingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const gradientOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Gradient fade in
    Animated.timing(gradientOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Footer entrance
    Animated.parallel([
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        delay: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(footerTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 1500,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Animated Gradient Background */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: gradientOpacity }]}>
        <LinearGradient
          colors={['#FF8C5A', '#FF7043', '#FF5722', '#14B8A6', '#0D9488']}
          locations={[0, 0.25, 0.45, 0.75, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
        />
      </Animated.View>

      {/* Floating Orbs */}
      {Array.from({ length: NUM_FLOATING_ORBS }).map((_, index) => (
        <FloatingOrb key={index} index={index} delay={index * 150} />
      ))}

      {/* Main Content */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        {/* Animated Logo */}
        <AnimatedLogo />

        {/* Text Section */}
        <View style={styles.textSection}>
          <AnimatedText
            text="TANDER"
            style={styles.title}
            delay={400}
          />
          <AnimatedText
            text="Where Meaningful Connections Begin"
            style={styles.tagline}
            delay={600}
          />
        </View>

        {/* Loading Text */}
        <AnimatedText
          text="Loading..."
          style={styles.loadingTextBelow}
          delay={1000}
        />

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              bottom: insets.bottom + 40,
              opacity: footerOpacity,
              transform: [{ translateY: footerTranslateY }],
            },
          ]}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 20 : 80}
            tint="light"
            style={styles.footerBadge}
          >
            <View style={styles.footerContent}>
              <View style={styles.heartIcon}>
                <Animated.Text style={styles.heartEmoji} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>💝</Animated.Text>
              </View>
              <Animated.Text
                style={styles.footerText}
                maxFontSizeMultiplier={FONT_SCALING.BUTTON}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Made for Filipino Seniors 60+
              </Animated.Text>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.orange[500],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Floating orbs
  floatingOrb: {
    position: 'absolute',
    overflow: 'hidden',
  },

  // Logo styles
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
      },
    }),
  },
  logoRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Circular spinner around logo
  logoSpinnerContainer: {
    position: 'absolute',
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSpinnerTrack: {
    position: 'absolute',
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: SPINNER_STROKE,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoSpinnerArc: {
    position: 'absolute',
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: SPINNER_STROKE,
    borderTopColor: '#FFFFFF',
    borderRightColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  logoSpinnerArc2: {
    position: 'absolute',
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: SPINNER_STROKE,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },

  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  logoGradientBorder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: (LOGO_SIZE - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 90,
  },

  // Text section
  textSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Loading text below title
  loadingTextBelow: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
  },

  // Footer
  footer: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  footerBadge: {
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  heartIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heartEmoji: {
    fontSize: 18,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flexShrink: 1,
    minWidth: 0,
  },
});

export default PremiumLoadingScreen;
