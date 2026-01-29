/**
 * TANDER TandyMeditationScreen - PREMIUM Meditation Experience
 * Version 5.0 - Fixed Layout Issues for ALL Devices and Orientations
 *
 * A stunningly beautiful, research-backed meditation experience for Filipino seniors (50+)
 *
 * DEVICE SUPPORT:
 * - Small Phones (320-375px): iPhone SE, iPhone 8, Galaxy S8
 * - Standard Phones (376-414px): iPhone 12/13/14, Pixel 5
 * - Large Phones (415-480px): iPhone Pro Max, Galaxy S21 Ultra
 * - Tablets Portrait (768-1024px): iPad Mini, iPad, iPad Pro
 * - Tablets Landscape (1024-1366px): All iPads in landscape
 *
 * FIXES IN V5.0:
 * - Fixed text overlapping in selection phase (mindfulness prompt only shows during meditation)
 * - Fixed orb cut off at top in portrait modes
 * - Fixed Begin button not visible in portrait modes
 * - Fixed 10 min card cut off on mobile
 * - Fixed empty space on tablet portrait
 * - Fixed landscape layout text overlap
 *
 * ACCESSIBILITY (Senior-Friendly):
 * - Touch targets: 56-72px (exceeds WCAG AAA)
 * - Font sizes: 18px minimum body, 20px+ for important text
 * - Contrast: 7:1+ for critical elements
 * - Reduced motion support with graceful fallbacks
 * - Screen reader announcements at all milestones
 * - Haptic feedback for breath cues (configurable)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  ScrollView,
  Platform,
  Pressable,
  AccessibilityInfo,
  Vibration,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { colors } from '@shared/styles/colors';
import {
  PREMIUM_COLORS,
  AnimatedSpringButton,
  FloatingOrb,
} from '../components/PremiumComponents';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type MeditationPhase = 'selection' | 'entry' | 'active' | 'closing' | 'complete';
type BreathPhase = 'inhale' | 'hold' | 'exhale';

// Device category for more precise responsive decisions
type DeviceCategory =
  | 'small-phone'
  | 'medium-phone'
  | 'large-phone'
  | 'tablet-portrait'
  | 'tablet-landscape';

interface DurationOption {
  minutes: number;
  label: string;
  description: string;
  shortDescription: string;
  icon: keyof typeof Feather.glyphMap;
  recommended?: boolean;
  color: string;
}

interface ParticleData {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
}

interface ResponsiveSizes {
  orbSize: number;
  cardWidth: number;
  cardPadding: number;
  cardGap: number;
  baseSpacing: number;
  headerTitleSize: number;
  bodyFontSize: number;
  timerFontSize: number;
  buttonHeight: number;
  touchTarget: number;
  screenMargin: number;
}

// ============================================================================
// PREMIUM COLOR PALETTE - Calming, evolving meditation colors
// ============================================================================

const MEDITATION_COLORS = {
  // Background phases (warm cream -> cool mint transition)
  background: {
    warm: '#FFFBF7',
    mid: '#F0FDFA',
    cool: '#ECFDF5',
    deep: '#E6FFFA',
  },

  // Brand teal spectrum
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // Brand orange spectrum (for warmth)
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
  },

  // Breath phase colors
  breathPhase: {
    inhale: {
      primary: '#2DD4BF',
      secondary: '#5EEAD4',
      glow: 'rgba(45, 212, 191, 0.4)',
      text: '#0D9488',
    },
    hold: {
      primary: '#FBBF24',
      secondary: '#FCD34D',
      glow: 'rgba(251, 191, 36, 0.35)',
      text: '#D97706',
    },
    exhale: {
      primary: '#0D9488',
      secondary: '#14B8A6',
      glow: 'rgba(13, 148, 136, 0.35)',
      text: '#115E59',
    },
  },

  // Text hierarchy
  text: {
    primary: '#1E293B',
    secondary: '#475569',
    muted: '#64748B',
    subtle: '#94A3B8',
    inverse: '#FFFFFF',
  },

  // UI surfaces
  surface: {
    card: 'rgba(255, 255, 255, 0.95)',
    cardSelected: 'rgba(20, 184, 166, 0.12)',
    glass: 'rgba(255, 255, 255, 0.85)',
    glassDark: 'rgba(255, 255, 255, 0.75)',
    overlay: 'rgba(240, 253, 250, 0.97)',
    border: 'rgba(20, 184, 166, 0.15)',
    borderSelected: 'rgba(20, 184, 166, 0.5)',
  },

  // Shadows
  shadow: {
    teal: 'rgba(20, 184, 166, 0.25)',
    orange: 'rgba(249, 115, 22, 0.25)',
    soft: 'rgba(0, 0, 0, 0.08)',
  },
};

// ============================================================================
// CONFIGURATION
// ============================================================================

// Breathing pattern: 4s inhale, 4s hold, 6s exhale = 14s cycle (research-backed)
const BREATH_CONFIG = {
  inhale: 4000,
  hold: 4000,
  exhale: 6000,
  get total() {
    return this.inhale + this.hold + this.exhale;
  },
};

// Duration options with senior-friendly descriptions
const DURATION_OPTIONS: DurationOption[] = [
  {
    minutes: 1,
    label: '1',
    description: 'Quick reset',
    shortDescription: 'Quick',
    icon: 'zap',
    color: MEDITATION_COLORS.teal[400],
  },
  {
    minutes: 3,
    label: '3',
    description: 'Short break',
    shortDescription: 'Short',
    icon: 'coffee',
    color: MEDITATION_COLORS.teal[500],
  },
  {
    minutes: 5,
    label: '5',
    description: 'Daily practice',
    shortDescription: 'Daily',
    icon: 'star',
    recommended: true,
    color: MEDITATION_COLORS.orange[500],
  },
  {
    minutes: 10,
    label: '10',
    description: 'Deep calm',
    shortDescription: 'Deep',
    icon: 'moon',
    color: MEDITATION_COLORS.teal[600],
  },
];

// Mindfulness prompts - poetic and calming
const PROMPTS = {
  entry: [
    'Let your eyes close softly.\nBreathe, and simply be.',
    'Find stillness in this moment.\nYou are exactly where you need to be.',
    'Release the weight of the day.\nThis time is yours.',
    'Allow your breath to guide you\ninto peaceful presence.',
  ],
  closing: [
    'Gently return to awareness.\nCarry this peace with you.',
    'Let the calm settle deep within.\nYou have done beautifully.',
    'Slowly open your eyes.\nThe world awaits, refreshed.',
    'Notice how you feel now.\nThis peace is always within reach.',
  ],
};

// Completion affirmations
const COMPLETION_MESSAGES = [
  { title: 'Beautiful', message: 'You honored yourself with this pause' },
  { title: 'Wonderful', message: 'A calmer mind awaits you now' },
  { title: 'Well Done', message: 'Self-care is the greatest gift' },
  { title: 'Perfect', message: 'Every breath was a gift to yourself' },
  { title: 'Lovely', message: 'Peace is now yours to carry forward' },
];

// ============================================================================
// RESPONSIVE HELPERS - Core sizing functions for all devices
// ============================================================================

/**
 * Determines device category based on width, height, and orientation
 */
const getDeviceCategory = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean
): DeviceCategory => {
  if (isTablet) {
    return isLandscape ? 'tablet-landscape' : 'tablet-portrait';
  }

  // Phone categories based on width in portrait
  const effectiveWidth = isLandscape ? height : width;

  if (effectiveWidth <= 375) return 'small-phone';
  if (effectiveWidth <= 414) return 'medium-phone';
  return 'large-phone';
};

/**
 * Calculates responsive orb size based on device and orientation
 * Ensures the orb never gets cut off and maintains visual balance
 */
const getOrbSize = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  deviceCategory: DeviceCategory
): number => {
  // Orb sizing matrix for all devices
  switch (deviceCategory) {
    case 'small-phone':
      // iPhone SE, Galaxy S8 - Smaller orb to fit content
      return Math.min(width * 0.45, height * 0.22, 170);

    case 'medium-phone':
      // iPhone 12/13/14, Pixel 5 - Standard orb
      return Math.min(width * 0.45, height * 0.22, 190);

    case 'large-phone':
      // iPhone Pro Max, Galaxy Ultra - Slightly larger
      return Math.min(width * 0.45, height * 0.22, 210);

    case 'tablet-portrait':
      // iPad Mini, iPad, iPad Pro in portrait
      return Math.min(width * 0.35, height * 0.22, 260);

    case 'tablet-landscape':
      // All tablets in landscape - constrained to left panel
      return Math.min(height * 0.45, width * 0.22, 280);

    default:
      return Math.min(width * 0.45, height * 0.22, 180);
  }
};

/**
 * Calculates all responsive sizes based on device category
 */
const getResponsiveSizes = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  deviceCategory: DeviceCategory
): ResponsiveSizes => {
  // Base values that scale per device category
  const sizes: Record<DeviceCategory, Omit<ResponsiveSizes, 'orbSize'>> = {
    'small-phone': {
      cardWidth: 88,
      cardPadding: 12,
      cardGap: 10,
      baseSpacing: 12,
      headerTitleSize: 22,
      bodyFontSize: 16,
      timerFontSize: 36,
      buttonHeight: 56,
      touchTarget: 56,
      screenMargin: 16,
    },
    'medium-phone': {
      cardWidth: 95,
      cardPadding: 14,
      cardGap: 12,
      baseSpacing: 14,
      headerTitleSize: 24,
      bodyFontSize: 17,
      timerFontSize: 40,
      buttonHeight: 60,
      touchTarget: 56,
      screenMargin: 20,
    },
    'large-phone': {
      cardWidth: 105,
      cardPadding: 16,
      cardGap: 14,
      baseSpacing: 16,
      headerTitleSize: 26,
      bodyFontSize: 18,
      timerFontSize: 44,
      buttonHeight: 64,
      touchTarget: 60,
      screenMargin: 24,
    },
    'tablet-portrait': {
      cardWidth: 120,
      cardPadding: 18,
      cardGap: 14,
      baseSpacing: 20,
      headerTitleSize: 28,
      bodyFontSize: 19,
      timerFontSize: 48,
      buttonHeight: 68,
      touchTarget: 64,
      screenMargin: 32,
    },
    'tablet-landscape': {
      cardWidth: 130,
      cardPadding: 20,
      cardGap: 16,
      baseSpacing: 20,
      headerTitleSize: 26,
      bodyFontSize: 18,
      timerFontSize: 46,
      buttonHeight: 64,
      touchTarget: 64,
      screenMargin: 32,
    },
  };

  const baseValues = sizes[deviceCategory];
  const orbSize = getOrbSize(width, height, isLandscape, isTablet, deviceCategory);

  return {
    ...baseValues,
    orbSize,
  };
};

/**
 * Hook to get all responsive values based on current device
 */
const useResponsiveSizes = (): ResponsiveSizes & {
  deviceCategory: DeviceCategory;
  isLandscapeTablet: boolean;
  showMasterDetail: boolean;
} => {
  const { width, height, isLandscape, isTablet } = useResponsive();

  return useMemo(() => {
    const deviceCategory = getDeviceCategory(width, height, isLandscape, isTablet);
    const sizes = getResponsiveSizes(width, height, isLandscape, isTablet, deviceCategory);
    const isLandscapeTablet = isTablet && isLandscape;
    const showMasterDetail = isLandscapeTablet;

    return {
      ...sizes,
      deviceCategory,
      isLandscapeTablet,
      showMasterDetail,
    };
  }, [width, height, isLandscape, isTablet]);
};

// ============================================================================
// PREMIUM AMBIENT ORBS - Soft, ethereal floating orbs for visual depth
// ============================================================================

interface AmbientOrbProps {
  delay: number;
  size: number;
  startX: number;
  startY: number;
  color: string;
  floatDistance: number;
  duration: number;
}

const AmbientOrb: React.FC<AmbientOrbProps> = ({
  delay,
  size,
  startX,
  startY,
  color,
  floatDistance,
  duration,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Gentle fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 2500,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Slow scale up
    Animated.timing(scale, {
      toValue: 1,
      duration: 3000,
      delay,
      easing: Easing.out(Easing.back(1.05)),
      useNativeDriver: true,
    }).start();

    // Ultra-smooth vertical floating
    const floatY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -floatDistance,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: floatDistance * 0.3,
          duration: duration * 0.75,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Gentle horizontal drift
    const floatX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: floatDistance * 0.35,
          duration: duration * 1.1,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -floatDistance * 0.25,
          duration: duration * 1.3,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: duration * 0.7,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const floatTimer = setTimeout(() => {
      floatY.start();
      floatX.start();
    }, delay);

    return () => {
      clearTimeout(floatTimer);
      floatY.stop();
      floatX.stop();
    };
  }, [delay, duration, floatDistance, opacity, scale, translateX, translateY]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${startX}%`,
        top: `${startY}%`,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { scale }],
      }}
      pointerEvents="none"
    />
  );
};

// Premium orb colors - Very soft, ethereal
const AMBIENT_ORB_COLORS = {
  tealLight: 'rgba(94, 234, 212, 0.06)',
  tealMid: 'rgba(20, 184, 166, 0.05)',
  tealDark: 'rgba(13, 148, 136, 0.04)',
  orangeLight: 'rgba(251, 146, 60, 0.05)',
  orangeMid: 'rgba(249, 115, 22, 0.04)',
  peach: 'rgba(253, 186, 116, 0.04)',
  aqua: 'rgba(45, 212, 191, 0.05)',
};

interface AmbientOrbsProps {
  reduceMotion: boolean;
}

const AmbientOrbs: React.FC<AmbientOrbsProps> = ({ reduceMotion }) => {
  if (reduceMotion) return null;

  // Premium ambient orbs configuration
  const orbs = useMemo(() => [
    // Large background orbs
    { delay: 0, duration: 14000, size: 160, startX: 5, startY: 8, color: AMBIENT_ORB_COLORS.tealLight, floatDistance: 22 },
    { delay: 2500, duration: 16000, size: 180, startX: 75, startY: 5, color: AMBIENT_ORB_COLORS.orangeLight, floatDistance: 18 },
    { delay: 1500, duration: 15000, size: 140, startX: 85, startY: 60, color: AMBIENT_ORB_COLORS.aqua, floatDistance: 20 },
    { delay: 3000, duration: 13000, size: 150, startX: 0, startY: 50, color: AMBIENT_ORB_COLORS.tealMid, floatDistance: 24 },
    { delay: 1000, duration: 17000, size: 170, startX: 70, startY: 80, color: AMBIENT_ORB_COLORS.peach, floatDistance: 16 },
    // Medium accent orbs
    { delay: 500, duration: 11000, size: 100, startX: 20, startY: 25, color: AMBIENT_ORB_COLORS.tealDark, floatDistance: 28 },
    { delay: 2000, duration: 12000, size: 90, startX: 55, startY: 40, color: AMBIENT_ORB_COLORS.orangeMid, floatDistance: 26 },
    { delay: 3500, duration: 10000, size: 110, startX: 40, startY: 85, color: AMBIENT_ORB_COLORS.tealLight, floatDistance: 24 },
    // Small accent orbs
    { delay: 800, duration: 9000, size: 60, startX: 15, startY: 45, color: AMBIENT_ORB_COLORS.aqua, floatDistance: 32 },
    { delay: 1800, duration: 8500, size: 55, startX: 80, startY: 30, color: AMBIENT_ORB_COLORS.tealMid, floatDistance: 30 },
    { delay: 600, duration: 9500, size: 50, startX: 45, startY: 70, color: AMBIENT_ORB_COLORS.peach, floatDistance: 28 },
  ], []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb, index) => (
        <AmbientOrb key={index} {...orb} />
      ))}
    </View>
  );
};

// ============================================================================
// FLOATING PARTICLES - Ambient atmosphere with responsive particle count
// ============================================================================

interface FloatingParticlesProps {
  isActive: boolean;
  reduceMotion: boolean;
  intensity?: 'light' | 'medium' | 'full';
  breathPhase: BreathPhase;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  isActive,
  reduceMotion,
  intensity = 'medium',
  breathPhase,
}) => {
  const { width, height } = useWindowDimensions();

  // Responsive particle count based on screen size
  const particleCount = useMemo(() => {
    const baseCount = intensity === 'light' ? 6 : intensity === 'medium' ? 10 : 16;
    // Scale up for larger screens
    const screenArea = width * height;
    const baseArea = 375 * 667; // iPhone SE reference
    const scaleFactor = Math.min(Math.sqrt(screenArea / baseArea), 2);
    return Math.round(baseCount * scaleFactor);
  }, [width, height, intensity]);

  const particles = useRef<ParticleData[]>(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(height + 50 + Math.random() * 100),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3 + Math.random() * 0.5),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!isActive || reduceMotion) {
      particles.slice(0, particleCount).forEach((p) => {
        p.opacity.setValue(0);
        p.y.setValue(height + 50);
      });
      return;
    }

    const animations = particles.slice(0, particleCount).map((particle, index) => {
      const baseDuration = 10000 + Math.random() * 8000;
      const delay = index * 600 + Math.random() * 1000;

      // Reset position
      particle.y.setValue(height + 50 + Math.random() * 100);
      particle.x.setValue(Math.random() * width);

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            // Rise upward
            Animated.timing(particle.y, {
              toValue: -100,
              duration: baseDuration,
              easing: Easing.out(Easing.sin),
              useNativeDriver: true,
            }),
            // Gentle horizontal drift
            Animated.timing(particle.x, {
              toValue: (particle.x as any)._value + (Math.random() - 0.5) * 150,
              duration: baseDuration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            // Fade in and out
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.25 + Math.random() * 0.35,
                duration: baseDuration * 0.2,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.25 + Math.random() * 0.3,
                duration: baseDuration * 0.6,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: baseDuration * 0.2,
                useNativeDriver: true,
              }),
            ]),
            // Gentle rotation
            Animated.timing(particle.rotation, {
              toValue: Math.random() > 0.5 ? 360 : -360,
              duration: baseDuration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
          // Reset for next loop
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: height + 50 + Math.random() * 100,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotation, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    animations.forEach((anim) => anim.start());

    return () => animations.forEach((anim) => anim.stop());
  }, [isActive, reduceMotion, particles, width, height, particleCount]);

  if (reduceMotion || !isActive) return null;

  // Get phase-specific color
  const getParticleColor = () => {
    switch (breathPhase) {
      case 'inhale':
        return MEDITATION_COLORS.breathPhase.inhale.secondary;
      case 'hold':
        return MEDITATION_COLORS.breathPhase.hold.secondary;
      case 'exhale':
        return MEDITATION_COLORS.breathPhase.exhale.secondary;
      default:
        return MEDITATION_COLORS.teal[300];
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.slice(0, particleCount).map((particle, index) => {
        const size = 4 + (index % 4) * 3;
        const isLarge = index % 5 === 0;

        return (
          <Animated.View
            key={index}
            style={[
              styles.floatingParticle,
              {
                width: isLarge ? size * 1.5 : size,
                height: isLarge ? size * 1.5 : size,
                borderRadius: size,
                backgroundColor: getParticleColor(),
                opacity: particle.opacity,
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { scale: particle.scale },
                  {
                    rotate: particle.rotation.interpolate({
                      inputRange: [-360, 0, 360],
                      outputRange: ['-360deg', '0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ============================================================================
// BREATH PHASE INDICATOR - Clear visual feedback with responsive sizing
// ============================================================================

interface BreathPhaseIndicatorProps {
  phase: BreathPhase;
  isActive: boolean;
  isPaused: boolean;
  reduceMotion: boolean;
}

const BreathPhaseIndicator: React.FC<BreathPhaseIndicatorProps> = ({
  phase,
  isActive,
  isPaused,
  reduceMotion,
}) => {
  const { deviceCategory, bodyFontSize } = useResponsiveSizes();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(15)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  // Responsive icon size
  const iconSize = deviceCategory.includes('tablet') ? 22 : 18;
  const pillPadding = deviceCategory.includes('tablet') ? 12 : 10;
  const iconCircleSize = deviceCategory.includes('tablet') ? 42 : 36;

  useEffect(() => {
    if (!isActive || isPaused) {
      opacity.setValue(0);
      return;
    }

    // Animate in with bounce
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduceMotion ? 100 : 500,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
    };
  }, [phase, isActive, isPaused, reduceMotion, opacity, translateY, scale]);

  const getPhaseConfig = () => {
    switch (phase) {
      case 'inhale':
        return {
          label: 'Breathe In',
          sublabel: 'Expand gently',
          icon: 'arrow-up' as const,
          colors: MEDITATION_COLORS.breathPhase.inhale,
        };
      case 'hold':
        return {
          label: 'Hold',
          sublabel: 'Rest in stillness',
          icon: 'pause' as const,
          colors: MEDITATION_COLORS.breathPhase.hold,
        };
      case 'exhale':
        return {
          label: 'Release',
          sublabel: 'Let go softly',
          icon: 'arrow-down' as const,
          colors: MEDITATION_COLORS.breathPhase.exhale,
        };
    }
  };

  const config = getPhaseConfig();

  if (!isActive || isPaused) return null;

  return (
    <Animated.View
      style={[
        styles.phaseIndicatorContainer,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      accessibilityLabel={`${config.label}: ${config.sublabel}`}
      accessibilityRole="text"
    >
      <View
        style={[
          styles.phaseIndicatorPill,
          {
            backgroundColor: `${config.colors.primary}15`,
            paddingVertical: pillPadding,
          },
        ]}
      >
        <View
          style={[
            styles.phaseIconCircle,
            {
              backgroundColor: config.colors.primary,
              width: iconCircleSize,
              height: iconCircleSize,
              borderRadius: iconCircleSize / 2,
            },
          ]}
        >
          <Feather name={config.icon} size={iconSize} color="#FFFFFF" />
        </View>
        <View style={styles.phaseTextContainer}>
          <Text
            style={[
              styles.phaseLabel,
              { color: config.colors.text, fontSize: bodyFontSize },
            ]}
          >
            {config.label}
          </Text>
          <Text style={[styles.phaseSublabel, { fontSize: bodyFontSize - 5 }]}>
            {config.sublabel}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// PREMIUM BREATHING ORB - The mesmerizing centerpiece
// ============================================================================

interface PremiumBreathingOrbProps {
  size: number;
  isActive: boolean;
  isPaused: boolean;
  progress: number;
  reduceMotion: boolean;
  breathPhase: BreathPhase;
  onBreathPhaseChange: (phase: BreathPhase) => void;
}

const PremiumBreathingOrb: React.FC<PremiumBreathingOrbProps> = ({
  size,
  isActive,
  isPaused,
  progress,
  reduceMotion,
  breathPhase,
  onBreathPhaseChange,
}) => {
  // Core orb animations
  const breatheScale = useRef(new Animated.Value(1)).current;
  const innerGlow = useRef(new Animated.Value(0)).current;
  const outerGlowOpacity = useRef(new Animated.Value(0.3)).current;
  const shimmerRotation = useRef(new Animated.Value(0)).current;

  // Concentric ripple rings
  const ripple1Scale = useRef(new Animated.Value(1)).current;
  const ripple1Opacity = useRef(new Animated.Value(0)).current;
  const ripple2Scale = useRef(new Animated.Value(1)).current;
  const ripple2Opacity = useRef(new Animated.Value(0)).current;
  const ripple3Scale = useRef(new Animated.Value(1)).current;
  const ripple3Opacity = useRef(new Animated.Value(0)).current;

  // Inner pulse (heartbeat effect)
  const heartbeatScale = useRef(new Animated.Value(1)).current;
  const heartbeatOpacity = useRef(new Animated.Value(0.15)).current;

  // Color transition values
  const colorProgress = useRef(new Animated.Value(0)).current;

  // Responsive values based on orb size
  const iconSize = Math.max(size * 0.16, 24);
  const playIconSize = Math.max(size * 0.18, 28);
  const statusTextSize = Math.max(size * 0.07, 12);
  const readyTextSize = Math.max(size * 0.08, 14);
  const playIconCircleSize = Math.max(size * 0.28, 48);
  const progressRingOffset = Math.min(30, size * 0.12);

  // Breathing animation with phase tracking
  useEffect(() => {
    if (!isActive || isPaused || reduceMotion) {
      breatheScale.setValue(1);
      outerGlowOpacity.setValue(0.3);
      innerGlow.setValue(0);
      return;
    }

    const runBreathCycle = () => {
      // INHALE: expand smoothly
      onBreathPhaseChange('inhale');
      Vibration.vibrate(25);

      Animated.timing(colorProgress, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();

      Animated.sequence([
        Animated.parallel([
          Animated.timing(breatheScale, {
            toValue: 1.22,
            duration: BREATH_CONFIG.inhale,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(outerGlowOpacity, {
            toValue: 0.7,
            duration: BREATH_CONFIG.inhale,
            useNativeDriver: true,
          }),
          Animated.timing(innerGlow, {
            toValue: 1,
            duration: BREATH_CONFIG.inhale,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (!isActive || isPaused) return;

        // HOLD: maintain with subtle pulse
        onBreathPhaseChange('hold');

        Animated.timing(colorProgress, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: false,
        }).start();

        Animated.sequence([
          Animated.timing(breatheScale, {
            toValue: 1.18,
            duration: BREATH_CONFIG.hold,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!isActive || isPaused) return;

          // EXHALE: contract gracefully
          onBreathPhaseChange('exhale');
          Vibration.vibrate(15);

          Animated.timing(colorProgress, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start();

          Animated.parallel([
            Animated.timing(breatheScale, {
              toValue: 1.0,
              duration: BREATH_CONFIG.exhale,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(outerGlowOpacity, {
              toValue: 0.35,
              duration: BREATH_CONFIG.exhale,
              useNativeDriver: true,
            }),
            Animated.timing(innerGlow, {
              toValue: 0,
              duration: BREATH_CONFIG.exhale,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (isActive && !isPaused) {
              runBreathCycle();
            }
          });
        });
      });
    };

    runBreathCycle();

    return () => {
      breatheScale.stopAnimation();
      outerGlowOpacity.stopAnimation();
      innerGlow.stopAnimation();
      colorProgress.stopAnimation();
    };
  }, [isActive, isPaused, reduceMotion, breatheScale, outerGlowOpacity, innerGlow, colorProgress, onBreathPhaseChange]);

  // Concentric ripple animations
  useEffect(() => {
    if (!isActive || isPaused || reduceMotion) {
      ripple1Opacity.setValue(0);
      ripple2Opacity.setValue(0);
      ripple3Opacity.setValue(0);
      return;
    }

    const createRippleAnimation = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
      maxScale: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: maxScale,
              duration: 3000,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.5,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 2500,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const ripple1Anim = createRippleAnimation(ripple1Scale, ripple1Opacity, 0, 1.6);
    const ripple2Anim = createRippleAnimation(ripple2Scale, ripple2Opacity, 1000, 1.8);
    const ripple3Anim = createRippleAnimation(ripple3Scale, ripple3Opacity, 2000, 2.0);

    ripple1Anim.start();
    ripple2Anim.start();
    ripple3Anim.start();

    return () => {
      ripple1Anim.stop();
      ripple2Anim.stop();
      ripple3Anim.stop();
    };
  }, [isActive, isPaused, reduceMotion, ripple1Scale, ripple1Opacity, ripple2Scale, ripple2Opacity, ripple3Scale, ripple3Opacity]);

  // Inner heartbeat pulse
  useEffect(() => {
    if (!isActive || isPaused || reduceMotion) {
      heartbeatScale.setValue(1);
      return;
    }

    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatScale, {
          toValue: 1.08,
          duration: 600,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.in(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ])
    );

    heartbeat.start();
    return () => heartbeat.stop();
  }, [isActive, isPaused, reduceMotion, heartbeatScale]);

  // Shimmer rotation
  useEffect(() => {
    if (!isActive || reduceMotion) {
      shimmerRotation.setValue(0);
      return;
    }

    const shimmer = Animated.loop(
      Animated.timing(shimmerRotation, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmer.start();
    return () => shimmer.stop();
  }, [isActive, reduceMotion, shimmerRotation]);

  // Get phase-specific colors
  const getOrbColors = (): [string, string] => {
    if (!isActive) return ['#FFFFFF', '#F8FAFC'];

    switch (breathPhase) {
      case 'inhale':
        return [MEDITATION_COLORS.breathPhase.inhale.secondary, MEDITATION_COLORS.breathPhase.inhale.primary];
      case 'hold':
        return [MEDITATION_COLORS.breathPhase.hold.secondary, MEDITATION_COLORS.breathPhase.hold.primary];
      case 'exhale':
        return [MEDITATION_COLORS.breathPhase.exhale.secondary, MEDITATION_COLORS.breathPhase.exhale.primary];
      default:
        return [MEDITATION_COLORS.teal[400], MEDITATION_COLORS.teal[500]];
    }
  };

  const getGlowColor = (): string => {
    switch (breathPhase) {
      case 'inhale':
        return MEDITATION_COLORS.breathPhase.inhale.glow;
      case 'hold':
        return MEDITATION_COLORS.breathPhase.hold.glow;
      case 'exhale':
        return MEDITATION_COLORS.breathPhase.exhale.glow;
      default:
        return 'rgba(20, 184, 166, 0.3)';
    }
  };

  const orbColors = getOrbColors();
  const glowColor = getGlowColor();

  return (
    <View style={styles.orbContainer}>
      {/* Concentric ripple rings */}
      {isActive && !reduceMotion && (
        <>
          <Animated.View
            style={[
              styles.rippleRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: MEDITATION_COLORS.teal[300],
                opacity: ripple1Opacity,
                transform: [{ scale: ripple1Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: MEDITATION_COLORS.teal[400],
                opacity: ripple2Opacity,
                transform: [{ scale: ripple2Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: MEDITATION_COLORS.teal[500],
                opacity: ripple3Opacity,
                transform: [{ scale: ripple3Scale }],
              },
            ]}
          />
        </>
      )}

      {/* Outer glow layer */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size * 0.75,
            backgroundColor: glowColor,
            opacity: isActive ? outerGlowOpacity : 0.2,
          },
        ]}
      />

      {/* Shimmer ring */}
      {isActive && !reduceMotion && (
        <Animated.View
          style={[
            styles.shimmerRing,
            {
              width: size * 1.15,
              height: size * 1.15,
              borderRadius: size * 0.575,
              transform: [
                {
                  rotate: shimmerRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            style={styles.shimmerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Main orb with gradient */}
      <Animated.View
        style={[
          styles.mainOrb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: isActive && !isPaused ? breatheScale : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={orbColors}
          style={[styles.orbGradient, { borderRadius: size / 2 }]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        >
          {/* Inner heartbeat pulse */}
          <Animated.View
            style={[
              styles.heartbeatPulse,
              {
                width: size * 0.6,
                height: size * 0.6,
                borderRadius: size * 0.3,
                opacity: heartbeatOpacity,
                transform: [{ scale: heartbeatScale }],
              },
            ]}
          />

          {/* Inner highlight (top shine) */}
          <Animated.View
            style={[
              styles.innerHighlight,
              {
                width: size * 0.5,
                height: size * 0.5,
                borderRadius: size * 0.25,
                opacity: innerGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.35],
                }),
              },
            ]}
          />

          {/* Center icon and text */}
          <View style={styles.orbCenterContent}>
            {isActive ? (
              <>
                <Feather
                  name={isPaused ? 'pause' : 'wind'}
                  size={iconSize}
                  color="rgba(255, 255, 255, 0.95)"
                />
                <Text style={[styles.orbStatusText, { fontSize: statusTextSize }]}>
                  {isPaused ? 'Paused' : 'Breathe'}
                </Text>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.playIconCircle,
                    {
                      width: playIconCircleSize,
                      height: playIconCircleSize,
                      borderRadius: playIconCircleSize / 2,
                    },
                  ]}
                >
                  <Feather
                    name="play"
                    size={playIconSize}
                    color={MEDITATION_COLORS.teal[500]}
                    style={{ marginLeft: 3 }}
                  />
                </View>
                <Text style={[styles.orbReadyText, { fontSize: readyTextSize }]}>
                  Ready
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Circular progress ring */}
      {isActive && (
        <View
          style={[
            styles.progressRingContainer,
            {
              width: size + progressRingOffset,
              height: size + progressRingOffset,
              borderRadius: (size + progressRingOffset) / 2,
            },
          ]}
        >
          <View
            style={[
              styles.progressRing,
              {
                width: size + progressRingOffset,
                height: size + progressRingOffset,
                borderRadius: (size + progressRingOffset) / 2,
                borderWidth: Math.max(2, size * 0.015),
                borderColor: `rgba(20, 184, 166, ${0.15 + progress * 0.35})`,
              },
            ]}
          />
          {/* Progress arc indicator */}
          <View
            style={[
              styles.progressArc,
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: MEDITATION_COLORS.teal[400],
                top: 0,
                left: (size + progressRingOffset) / 2 - 4,
                transform: [
                  { translateY: -4 },
                  { rotate: `${progress * 360}deg` },
                  { translateY: (size + progressRingOffset) / 2 },
                ],
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

// ============================================================================
// PREMIUM DURATION CARD - Glassmorphism with selection animation
// ============================================================================

interface PremiumDurationCardProps {
  option: DurationOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  reduceMotion: boolean;
  cardWidth: number;
  cardPadding: number;
}

const PremiumDurationCard: React.FC<PremiumDurationCardProps> = ({
  option,
  isSelected,
  onSelect,
  index,
  reduceMotion,
  cardWidth,
  cardPadding,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

  // Responsive sizes based on card width
  const iconWrapSize = Math.max(cardWidth * 0.38, 40);
  const iconSize = Math.max(cardWidth * 0.18, 18);
  const minutesFontSize = Math.max(cardWidth * 0.26, 24);
  const unitFontSize = Math.max(cardWidth * 0.1, 10);
  const descFontSize = Math.max(cardWidth * 0.09, 9);

  // Entrance animation
  useEffect(() => {
    const delay = reduceMotion ? 0 : index * 100;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: reduceMotion ? 100 : 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, index, reduceMotion]);

  // Selection glow animation
  useEffect(() => {
    if (isSelected && !reduceMotion) {
      Animated.parallel([
        Animated.spring(glowAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      iconRotation.setValue(0);
    }
  }, [isSelected, reduceMotion, glowAnim, iconRotation]);

  const handlePress = () => {
    if (!reduceMotion) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
    Vibration.vibrate(20);
    onSelect();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Pressable
        onPress={handlePress}
        accessibilityLabel={`${option.minutes} minute${option.minutes > 1 ? 's' : ''} meditation, ${option.description}${option.recommended ? ', recommended' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          styles.durationCard,
          {
            width: cardWidth,
            padding: cardPadding,
          },
          isSelected && styles.durationCardSelected,
          pressed && !reduceMotion && { opacity: 0.9 },
        ]}
      >
        {/* Selection glow */}
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1.05],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Recommended badge */}
        {option.recommended && (
          <View style={styles.recommendedBadge}>
            <Feather name="star" size={10} color="#FFFFFF" />
            <Text style={styles.recommendedText}>Best</Text>
          </View>
        )}

        {/* Icon container with animation */}
        <Animated.View
          style={[
            styles.durationIconWrap,
            isSelected && styles.durationIconWrapSelected,
            {
              width: iconWrapSize,
              height: iconWrapSize,
              borderRadius: iconWrapSize * 0.3,
              transform: [
                {
                  rotate: iconRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '15deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Feather
            name={option.icon}
            size={iconSize}
            color={isSelected ? '#FFFFFF' : option.color}
          />
        </Animated.View>

        {/* Duration number */}
        <Text
          style={[
            styles.durationMinutes,
            { fontSize: minutesFontSize },
            isSelected && styles.durationMinutesSelected,
          ]}
        >
          {option.label}
        </Text>

        {/* Unit label */}
        <Text
          style={[
            styles.durationUnit,
            { fontSize: unitFontSize },
            isSelected && styles.durationUnitSelected,
          ]}
        >
          min
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.durationDescription,
            { fontSize: descFontSize },
            isSelected && styles.durationDescriptionSelected,
          ]}
          numberOfLines={1}
        >
          {option.shortDescription}
        </Text>

        {/* Selection checkmark */}
        {isSelected && (
          <View style={styles.selectionCheck}>
            <Feather name="check" size={12} color="#FFFFFF" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// MINDFULNESS PROMPT - Gentle text animations with responsive sizing
// Only shown during entry/closing phases of meditation, NOT during selection
// ============================================================================

interface MindfulnessPromptProps {
  text: string;
  visible: boolean;
  reduceMotion: boolean;
}

const MindfulnessPrompt: React.FC<MindfulnessPromptProps> = ({
  text,
  visible,
  reduceMotion,
}) => {
  const { deviceCategory, bodyFontSize } = useResponsiveSizes();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(25)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  const promptFontSize = deviceCategory.includes('tablet') ? bodyFontSize - 2 : bodyFontSize - 4;
  const lineHeight = promptFontSize * 1.5;

  useEffect(() => {
    if (visible) {
      translateY.setValue(25);
      scale.setValue(0.95);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduceMotion ? 200 : 1800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: reduceMotion ? 200 : 1800,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: reduceMotion ? 200 : 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: reduceMotion ? 100 : 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -15,
          duration: reduceMotion ? 100 : 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, reduceMotion, opacity, translateY, scale]);

  if (!text) return null;

  return (
    <Animated.View
      style={[
        styles.promptContainer,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      accessibilityLabel={text.replace('\n', ' ')}
      accessibilityRole="text"
    >
      <Text style={[styles.promptText, { fontSize: promptFontSize, lineHeight }]}>
        {text}
      </Text>
    </Animated.View>
  );
};

// ============================================================================
// VISUAL TIME DISPLAY - Elegant, anxiety-free with responsive sizing
// ============================================================================

interface VisualTimeDisplayProps {
  seconds: number;
  isActive: boolean;
  showExactTime?: boolean;
}

const VisualTimeDisplay: React.FC<VisualTimeDisplayProps> = ({
  seconds,
  isActive,
  showExactTime = true,
}) => {
  const { timerFontSize, bodyFontSize } = useResponsiveSizes();

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <View
      style={styles.timeDisplayContainer}
      accessibilityLabel={`${mins} minutes ${secs} seconds remaining`}
      accessibilityRole="timer"
    >
      {showExactTime ? (
        <>
          <Text
            style={[
              styles.timeText,
              { fontSize: timerFontSize },
              isActive && styles.timeTextActive,
            ]}
          >
            {display}
          </Text>
          <Text
            style={[
              styles.timeLabel,
              { fontSize: bodyFontSize - 5 },
              isActive && styles.timeLabelActive,
            ]}
          >
            remaining
          </Text>
        </>
      ) : (
        <View style={styles.timeVisualIndicator}>
          <MaterialCommunityIcons
            name="timer-sand"
            size={20}
            color={MEDITATION_COLORS.teal[500]}
          />
          <Text style={[styles.timeVisualText, { fontSize: bodyFontSize }]}>
            breathing
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// DREAMY PAUSE OVERLAY - Responsive for all devices
// ============================================================================

interface DreamyPauseOverlayProps {
  onResume: () => void;
  onEnd: () => void;
  reduceMotion: boolean;
  elapsedTime: number;
  totalTime: number;
}

const DreamyPauseOverlay: React.FC<DreamyPauseOverlayProps> = ({
  onResume,
  onEnd,
  reduceMotion,
  elapsedTime,
  totalTime,
}) => {
  const { deviceCategory, buttonHeight, bodyFontSize, touchTarget } = useResponsiveSizes();
  const { width } = useWindowDimensions();

  const opacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.85)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  // Responsive sizes
  const isTablet = deviceCategory.includes('tablet');
  const pauseIconSize = isTablet ? 100 : 90;
  const titleSize = isTablet ? 36 : 32;
  const subtitleSize = bodyFontSize;
  const encouragementSize = bodyFontSize + 1;
  const buttonWidth = Math.min(280, width * 0.65);
  const resumeButtonHeight = Math.max(buttonHeight, touchTarget);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduceMotion ? 100 : 500,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        tension: 40,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation for pause icon
    if (!reduceMotion) {
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatY, {
            toValue: -8,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatY, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      floatAnimation.start();
      return () => floatAnimation.stop();
    }
  }, [opacity, contentScale, floatY, reduceMotion]);

  const handleResume = () => {
    Vibration.vibrate(35);
    if (!reduceMotion) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onResume());
    } else {
      onResume();
    }
  };

  const progressPercent = Math.round((elapsedTime / totalTime) * 100);

  return (
    <Animated.View style={[styles.pauseOverlay, { opacity }]}>
      <LinearGradient
        colors={[
          'rgba(240, 253, 250, 0.98)',
          'rgba(255, 255, 255, 0.98)',
          'rgba(240, 253, 250, 0.98)',
        ]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.pauseContent,
          { transform: [{ scale: contentScale }] },
        ]}
      >
        {/* Floating pause icon */}
        <Animated.View
          style={[
            styles.pauseIconContainer,
            {
              width: pauseIconSize,
              height: pauseIconSize,
              borderRadius: pauseIconSize / 2,
              transform: [{ translateY: floatY }],
            },
          ]}
        >
          <LinearGradient
            colors={[MEDITATION_COLORS.teal[400], MEDITATION_COLORS.teal[500]]}
            style={styles.pauseIconGradient}
          >
            <Feather name="pause" size={isTablet ? 42 : 36} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Title and message */}
        <Text style={[styles.pauseTitle, { fontSize: titleSize }]}>
          Taking a Pause
        </Text>
        <Text style={[styles.pauseSubtitle, { fontSize: subtitleSize }]}>
          {progressPercent}% through your session
        </Text>
        <Text style={[styles.pauseEncouragement, { fontSize: encouragementSize }]}>
          Take all the time you need
        </Text>

        {/* Resume button */}
        <Pressable
          onPress={handleResume}
          accessibilityLabel="Resume meditation"
          accessibilityRole="button"
          accessibilityHint="Double tap to continue your meditation"
          style={({ pressed }) => [
            styles.resumeButton,
            {
              width: buttonWidth,
              height: resumeButtonHeight,
              borderRadius: resumeButtonHeight / 2,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[MEDITATION_COLORS.teal[500], MEDITATION_COLORS.teal[600]]}
            style={styles.resumeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View
              style={[
                styles.resumeIconCircle,
                { width: touchTarget * 0.78, height: touchTarget * 0.78, borderRadius: touchTarget * 0.39 },
              ]}
            >
              <Feather name="play" size={isTablet ? 28 : 24} color={MEDITATION_COLORS.teal[500]} />
            </View>
            <Text style={[styles.resumeText, { fontSize: bodyFontSize + 4 }]}>
              Continue
            </Text>
          </LinearGradient>
        </Pressable>

        {/* End session link */}
        <Pressable
          onPress={onEnd}
          accessibilityLabel="End meditation session"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.endSessionButton,
            { minHeight: touchTarget },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.endSessionText, { fontSize: bodyFontSize }]}>
            End Session
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// ============================================================================
// CELEBRATION COMPLETION SCREEN - Fully responsive
// ============================================================================

interface CelebrationCompletionProps {
  duration: number;
  onDone: () => void;
  onAgain: () => void;
  reduceMotion: boolean;
}

const CelebrationCompletion: React.FC<CelebrationCompletionProps> = ({
  duration,
  onDone,
  onAgain,
  reduceMotion,
}) => {
  const { width, height } = useWindowDimensions();
  const {
    deviceCategory,
    buttonHeight,
    bodyFontSize,
    touchTarget,
    screenMargin,
  } = useResponsiveSizes();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkRotation = useRef(new Animated.Value(-0.5)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const confettiY = useRef(new Animated.Value(0)).current;

  const [completionMessage] = useState(
    COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]
  );

  // Responsive sizes
  const isTablet = deviceCategory.includes('tablet');
  const cardWidth = Math.min(width * 0.9, isTablet ? 480 : 420);
  const cardPadding = isTablet ? 40 : 32;
  const badgeSize = isTablet ? 120 : 100;
  const titleSize = isTablet ? 38 : 32;
  const statValueSize = isTablet ? 52 : 44;
  const statLabelSize = bodyFontSize - 2;
  const messageSize = bodyFontSize;
  const buttonFontSize = bodyFontSize;

  // Confetti particles
  const confetti = useRef(
    Array.from({ length: 30 }, () => ({
      x: Math.random() * 400 - 200,
      delay: Math.random() * 500,
      color: [
        MEDITATION_COLORS.teal[400],
        MEDITATION_COLORS.teal[500],
        MEDITATION_COLORS.orange[400],
        MEDITATION_COLORS.orange[500],
        '#FBBF24',
      ][Math.floor(Math.random() * 5)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }))
  ).current;

  useEffect(() => {
    // Announce completion for screen readers
    AccessibilityInfo.announceForAccessibility(
      `Meditation complete. You meditated for ${duration} minute${duration > 1 ? 's' : ''}. ${completionMessage.message}`
    );

    // Celebration haptic
    Vibration.vibrate([0, 60, 60, 60, 60, 100]);

    // Main entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: reduceMotion ? 200 : 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 30,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Checkmark bounce in
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(checkRotation, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Confetti animation
    if (!reduceMotion) {
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(confettiOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(confettiY, {
            toValue: 1,
            duration: 2500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(confettiOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fadeAnim, scaleAnim, checkScale, checkRotation, confettiOpacity, confettiY, duration, completionMessage, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.completionContainer,
        {
          width: cardWidth,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Confetti layer */}
      {!reduceMotion && (
        <Animated.View
          style={[
            styles.confettiContainer,
            {
              opacity: confettiOpacity,
            },
          ]}
          pointerEvents="none"
        >
          {confetti.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confettiPiece,
                {
                  backgroundColor: particle.color,
                  width: particle.size,
                  height: particle.size * 0.6,
                  borderRadius: 2,
                  left: '50%',
                  marginLeft: particle.x,
                  transform: [
                    {
                      translateY: confettiY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 400 + Math.random() * 200],
                      }),
                    },
                    {
                      rotate: `${particle.rotation + (confettiY as any)._value * 720}deg`,
                    },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
      )}

      <View style={[styles.completionCard, { padding: cardPadding }]}>
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Achievement badge with checkmark */}
        <Animated.View
          style={[
            styles.achievementBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              transform: [
                { scale: checkScale },
                {
                  rotate: checkRotation.interpolate({
                    inputRange: [-0.5, 0],
                    outputRange: ['-45deg', '0deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[MEDITATION_COLORS.teal[400], MEDITATION_COLORS.teal[600]]}
            style={styles.achievementGradient}
          >
            <Feather name="check" size={isTablet ? 56 : 44} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Celebration title */}
        <Text style={[styles.completionTitle, { fontSize: titleSize }]}>
          {completionMessage.title}!
        </Text>

        {/* Stats section */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: statValueSize }]}>
              {duration}
            </Text>
            <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>
              minute{duration > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="meditation"
              size={isTablet ? 38 : 32}
              color={MEDITATION_COLORS.orange[500]}
            />
            <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>
              mindful
            </Text>
          </View>
        </View>

        {/* Motivational message */}
        <View style={styles.messageCard}>
          <MaterialCommunityIcons
            name="format-quote-open"
            size={20}
            color={MEDITATION_COLORS.orange[400]}
          />
          <Text style={[styles.messageText, { fontSize: messageSize }]}>
            {completionMessage.message}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.completionButtons}>
          <Pressable
            onPress={onAgain}
            accessibilityLabel="Meditate again"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.againButton,
              { height: buttonHeight, minHeight: touchTarget },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Feather name="refresh-cw" size={20} color={MEDITATION_COLORS.teal[600]} />
            <Text style={[styles.againButtonText, { fontSize: buttonFontSize }]}>
              Again
            </Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            accessibilityLabel="Finish and return"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.doneButton,
              { height: buttonHeight, minHeight: touchTarget },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[MEDITATION_COLORS.orange[500], MEDITATION_COLORS.orange[600]]}
              style={styles.doneButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.doneButtonText, { fontSize: buttonFontSize }]}>
                Done
              </Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT - Fully responsive with master-detail for tablets
// ============================================================================

export const TandyMeditationScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, isTablet, hp, wp } = useResponsive();

  // Get all responsive sizes
  const {
    orbSize,
    cardWidth,
    cardPadding,
    cardGap,
    baseSpacing,
    headerTitleSize,
    bodyFontSize,
    timerFontSize,
    buttonHeight,
    touchTarget,
    screenMargin,
    deviceCategory,
    isLandscapeTablet,
    showMasterDetail,
  } = useResponsiveSizes();

  // State
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [phase, setPhase] = useState<MeditationPhase>('selection');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const totalSeconds = selectedDuration * 60;
  const timeRemaining = totalSeconds - elapsedSeconds;
  const progress = elapsedSeconds / totalSeconds;
  const isActive = phase === 'entry' || phase === 'active' || phase === 'closing';

  // Responsive layout calculations
  const headerPaddingTop = insets.top + (isLandscape ? Math.min(hp(1), 8) : 12);
  const contentPaddingBottom = insets.bottom + (isLandscape ? Math.min(hp(1), 8) : 12);
  const horizontalPadding = insets.left + screenMargin;

  // Check reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Timer
  useEffect(() => {
    if (!isActive || isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          setPhase('complete');
          return prev;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isPaused, totalSeconds]);

  // Phase management
  useEffect(() => {
    if (phase === 'entry') {
      const prompt = PROMPTS.entry[Math.floor(Math.random() * PROMPTS.entry.length)];
      setPromptText(prompt);
      setShowPrompt(true);

      const hidePrompt = setTimeout(() => setShowPrompt(false), 9000);
      const transitionToActive = setTimeout(() => setPhase('active'), 11000);

      return () => {
        clearTimeout(hidePrompt);
        clearTimeout(transitionToActive);
      };
    }
  }, [phase]);

  // Closing phase
  useEffect(() => {
    if (phase === 'active' && timeRemaining <= 35 && timeRemaining > 30) {
      setPhase('closing');
      const prompt = PROMPTS.closing[Math.floor(Math.random() * PROMPTS.closing.length)];
      setPromptText(prompt);
      setShowPrompt(true);

      const hidePrompt = setTimeout(() => setShowPrompt(false), 9000);
      return () => clearTimeout(hidePrompt);
    }
  }, [phase, timeRemaining]);

  // Progress announcements
  useEffect(() => {
    if (!isActive || isPaused) return;

    const progressPercent = Math.round(progress * 100);

    if (progressPercent === 25) {
      AccessibilityInfo.announceForAccessibility('25% complete. Keep breathing peacefully.');
    } else if (progressPercent === 50) {
      AccessibilityInfo.announceForAccessibility('Halfway through. You are doing beautifully.');
    } else if (progressPercent === 75) {
      AccessibilityInfo.announceForAccessibility('75% complete. Almost there, wonderful work.');
    }
  }, [progress, isActive, isPaused]);

  // Handlers
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleSelectDuration = useCallback((minutes: number) => {
    setSelectedDuration(minutes);
    Vibration.vibrate(20);
  }, []);

  const handleStart = useCallback(async () => {
    setIsLoading(true);

    AccessibilityInfo.announceForAccessibility(
      `Starting ${selectedDuration} minute meditation. Close your eyes and breathe.`
    );

    await new Promise((resolve) => setTimeout(resolve, 400));

    setIsLoading(false);
    setElapsedSeconds(0);
    setIsPaused(false);
    setPhase('entry');
  }, [selectedDuration]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    Vibration.vibrate(40);
    AccessibilityInfo.announceForAccessibility('Meditation paused.');
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    Vibration.vibrate(30);
    AccessibilityInfo.announceForAccessibility('Meditation resumed.');
  }, []);

  const handleEnd = useCallback(() => {
    setPhase('selection');
    setIsPaused(false);
    setElapsedSeconds(0);
    setShowPrompt(false);
    AccessibilityInfo.announceForAccessibility('Meditation ended.');
  }, []);

  const handleComplete = useCallback(() => {
    setPhase('selection');
    setElapsedSeconds(0);
    setShowPrompt(false);
  }, []);

  const handleMeditateAgain = useCallback(() => {
    setPhase('entry');
    setElapsedSeconds(0);
    setIsPaused(false);
    Vibration.vibrate(25);
    AccessibilityInfo.announceForAccessibility('Starting meditation again.');
  }, []);

  // Gesture handlers
  const handlePressIn = useCallback(() => {
    if (!isActive || isPaused) return;

    longPressTimer.current = setTimeout(() => {
      handlePause();
    }, 700);
  }, [isActive, isPaused, handlePause]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTap = useCallback(() => {
    if (!isActive) return;

    const now = Date.now();
    if (now - lastTapTime.current < 350) {
      if (isPaused) {
        handleResume();
      } else {
        handlePause();
      }
    }
    lastTapTime.current = now;
  }, [isActive, isPaused, handlePause, handleResume]);

  // Background gradient
  const getBackgroundColors = (): [string, string, string] => {
    if (!isActive) {
      return [
        MEDITATION_COLORS.background.warm,
        MEDITATION_COLORS.background.warm,
        MEDITATION_COLORS.background.mid,
      ];
    }
    if (progress < 0.3) {
      return [
        MEDITATION_COLORS.background.warm,
        MEDITATION_COLORS.background.mid,
        MEDITATION_COLORS.background.mid,
      ];
    }
    if (progress < 0.7) {
      return [
        MEDITATION_COLORS.background.mid,
        MEDITATION_COLORS.background.mid,
        MEDITATION_COLORS.background.cool,
      ];
    }
    return [
      MEDITATION_COLORS.background.mid,
      MEDITATION_COLORS.background.cool,
      MEDITATION_COLORS.background.deep,
    ];
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[
            MEDITATION_COLORS.background.warm,
            MEDITATION_COLORS.background.mid,
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={MEDITATION_COLORS.teal[500]} />
          <Text style={[styles.loadingText, { fontSize: bodyFontSize }]}>
            Preparing your sanctuary...
          </Text>
        </View>
      </View>
    );
  }

  // Render duration cards section
  const renderDurationCards = () => {
    // Calculate total width needed for all cards plus padding
    const totalCardsWidth = DURATION_OPTIONS.length * cardWidth + (DURATION_OPTIONS.length - 1) * cardGap;
    const contentWidth = showMasterDetail ? wp(55) - 48 : width - screenMargin * 2;
    const needsScroll = totalCardsWidth > contentWidth;

    return (
      <View style={styles.durationSection}>
        <Text
          style={[
            styles.durationTitle,
            { fontSize: bodyFontSize - 4, marginBottom: baseSpacing * 0.75 },
          ]}
        >
          Choose Duration
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.durationScroll,
            {
              gap: cardGap,
              paddingHorizontal: needsScroll ? 4 : 0,
            },
          ]}
          decelerationRate="fast"
          snapToInterval={cardWidth + cardGap}
          snapToAlignment="start"
        >
          {DURATION_OPTIONS.map((option, index) => (
            <PremiumDurationCard
              key={option.minutes}
              option={option}
              isSelected={option.minutes === selectedDuration}
              onSelect={() => handleSelectDuration(option.minutes)}
              index={index}
              reduceMotion={reduceMotion}
              cardWidth={cardWidth}
              cardPadding={cardPadding}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render start button
  const renderStartButton = () => (
    <View
      style={[
        styles.startSection,
        {
          maxWidth: isLandscapeTablet ? 260 : 300,
          marginTop: baseSpacing,
        },
      ]}
    >
      <Pressable
        onPress={handleStart}
        accessibilityLabel={`Begin ${selectedDuration} minute meditation`}
        accessibilityRole="button"
        accessibilityHint="Double tap to start your meditation session"
        style={({ pressed }) => [
          styles.beginButton,
          { height: buttonHeight, borderRadius: buttonHeight / 2 },
          pressed && {
            opacity: 0.95,
            transform: [{ scale: 0.98 }],
          },
        ]}
      >
        <LinearGradient
          colors={[MEDITATION_COLORS.orange[500], MEDITATION_COLORS.orange[600]]}
          style={styles.beginGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View
            style={[
              styles.beginIconContainer,
              {
                width: buttonHeight * 0.65,
                height: buttonHeight * 0.65,
                borderRadius: buttonHeight * 0.325,
              },
            ]}
          >
            <Feather name="play" size={Math.max(buttonHeight * 0.32, 20)} color="#FFFFFF" />
          </View>
          <Text style={[styles.beginText, { fontSize: bodyFontSize + 4 }]}>
            Begin
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  // Render selection content for portrait mode (phones and tablets)
  const renderPortraitSelectionContent = () => (
    <ScrollView
      style={styles.portraitScrollView}
      contentContainerStyle={[
        styles.portraitScrollContent,
        {
          paddingBottom: contentPaddingBottom + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backButton,
            { width: touchTarget, height: touchTarget },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.backButtonInner}>
            <Feather
              name="arrow-left"
              size={24}
              color={MEDITATION_COLORS.text.primary}
            />
          </View>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>
            Meditation
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: bodyFontSize - 2 }]}>
            Find your peace
          </Text>
        </View>

        <View style={{ width: touchTarget }} />
      </View>

      {/* Orb Section */}
      <View style={styles.portraitOrbSection}>
        <PremiumBreathingOrb
          size={orbSize}
          isActive={false}
          isPaused={false}
          progress={0}
          reduceMotion={reduceMotion}
          breathPhase={breathPhase}
          onBreathPhaseChange={setBreathPhase}
        />
      </View>

      {/* Instructions */}
      <View style={[styles.instructions, { marginTop: baseSpacing, marginBottom: baseSpacing }]}>
        <Text
          style={[
            styles.instructionText,
            { fontSize: bodyFontSize, lineHeight: bodyFontSize * 1.5 },
          ]}
        >
          Sit comfortably and close your eyes
        </Text>
        <Text
          style={[
            styles.instructionHint,
            { fontSize: bodyFontSize - 3, marginTop: 6 },
          ]}
        >
          Double-tap or long-press to pause
        </Text>
      </View>

      {/* Duration Cards */}
      {renderDurationCards()}

      {/* Begin Button */}
      {renderStartButton()}
    </ScrollView>
  );

  // Render landscape tablet selection content (master-detail layout)
  const renderLandscapeSelectionContent = () => (
    <View style={styles.landscapeContainer}>
      {/* Header for landscape */}
      <View style={[styles.landscapeHeader, { top: insets.top + 8, left: horizontalPadding }]}>
        <Pressable
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backButton,
            { width: touchTarget, height: touchTarget },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.backButtonInner}>
            <Feather
              name="arrow-left"
              size={24}
              color={MEDITATION_COLORS.text.primary}
            />
          </View>
        </Pressable>
      </View>

      {/* Left Side: Orb */}
      <View style={styles.landscapeOrbSection}>
        <PremiumBreathingOrb
          size={orbSize}
          isActive={false}
          isPaused={false}
          progress={0}
          reduceMotion={reduceMotion}
          breathPhase={breathPhase}
          onBreathPhaseChange={setBreathPhase}
        />
      </View>

      {/* Right Side: Selection Options */}
      <View style={styles.landscapeSelectionSection}>
        {/* Title */}
        <View style={styles.landscapeTitleSection}>
          <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>
            Meditation
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: bodyFontSize - 1, marginTop: 4 }]}>
            Find your peace
          </Text>
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { marginTop: baseSpacing, marginBottom: baseSpacing }]}>
          <Text
            style={[
              styles.instructionText,
              { fontSize: bodyFontSize, lineHeight: bodyFontSize * 1.5 },
            ]}
          >
            Sit comfortably and close your eyes
          </Text>
          <Text
            style={[
              styles.instructionHint,
              { fontSize: bodyFontSize - 3, marginTop: 6 },
            ]}
          >
            Double-tap or long-press to pause
          </Text>
        </View>

        {/* Duration Cards */}
        {renderDurationCards()}

        {/* Begin Button */}
        {renderStartButton()}
      </View>
    </View>
  );

  // Render active meditation content
  const renderActiveMeditationContent = () => (
    <View style={styles.activeMeditationContainer}>
      {/* Minimal header during meditation */}
      <View style={[styles.headerMinimal, { top: insets.top + 8, left: screenMargin }]}>
        <Pressable
          onPress={handleEnd}
          accessibilityLabel="End meditation"
          accessibilityRole="button"
          style={[styles.closeButton, { width: touchTarget, height: touchTarget }]}
        >
          <Feather
            name="x"
            size={22}
            color={MEDITATION_COLORS.text.subtle}
          />
        </Pressable>
      </View>

      {/* Mindfulness prompt - only during entry/closing phases */}
      {(phase === 'entry' || phase === 'closing') && (
        <MindfulnessPrompt
          text={promptText}
          visible={showPrompt}
          reduceMotion={reduceMotion}
        />
      )}

      {/* Central breathing orb */}
      <View style={styles.activeMeditationOrbWrapper}>
        <PremiumBreathingOrb
          size={orbSize}
          isActive={isActive}
          isPaused={isPaused}
          progress={progress}
          reduceMotion={reduceMotion}
          breathPhase={breathPhase}
          onBreathPhaseChange={setBreathPhase}
        />

        {/* Time display */}
        <VisualTimeDisplay
          seconds={timeRemaining}
          isActive={isActive}
          showExactTime={true}
        />

        {/* Breath phase indicator */}
        <BreathPhaseIndicator
          phase={breathPhase}
          isActive={isActive}
          isPaused={isPaused}
          reduceMotion={reduceMotion}
        />
      </View>

      {/* Pause button during meditation */}
      {!isPaused && (
        <View
          style={[
            styles.pauseControl,
            { bottom: insets.bottom + baseSpacing * 1.5 },
          ]}
        >
          <Pressable
            onPress={handlePause}
            accessibilityLabel="Pause meditation"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.pauseButton,
              {
                width: touchTarget + 16,
                height: touchTarget + 16,
                borderRadius: (touchTarget + 16) / 2,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Feather
              name="pause"
              size={26}
              color={MEDITATION_COLORS.text.subtle}
            />
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={MEDITATION_COLORS.background.warm}
        translucent={Platform.OS === 'android'}
      />

      <LinearGradient
        colors={getBackgroundColors()}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        {/* Premium ambient orbs - always visible for depth */}
        <AmbientOrbs reduceMotion={reduceMotion} />

        {/* Floating particles - during active meditation */}
        <FloatingParticles
          isActive={isActive}
          reduceMotion={reduceMotion}
          intensity={isTablet ? 'full' : 'medium'}
          breathPhase={breathPhase}
        />

        <Pressable
          style={styles.touchArea}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleTap}
          disabled={!isActive || phase === 'complete'}
        >
          <View
            style={[
              styles.safeArea,
              {
                paddingTop: phase === 'selection' && !showMasterDetail ? 0 : headerPaddingTop,
                paddingBottom: phase === 'selection' && !showMasterDetail ? 0 : contentPaddingBottom,
                paddingLeft: phase === 'selection' && !showMasterDetail ? 0 : horizontalPadding,
                paddingRight: phase === 'selection' && !showMasterDetail ? 0 : insets.right + screenMargin,
              },
            ]}
          >
            {/* SELECTION PHASE */}
            {phase === 'selection' && (
              showMasterDetail
                ? renderLandscapeSelectionContent()
                : renderPortraitSelectionContent()
            )}

            {/* ACTIVE MEDITATION PHASE */}
            {isActive && !isPaused && phase !== 'complete' && (
              renderActiveMeditationContent()
            )}

            {/* COMPLETION PHASE */}
            {phase === 'complete' && (
              <View style={styles.centerContent}>
                <CelebrationCompletion
                  duration={selectedDuration}
                  onDone={handleComplete}
                  onAgain={handleMeditateAgain}
                  reduceMotion={reduceMotion}
                />
              </View>
            )}

            {/* Pause overlay */}
            {isPaused && (
              <DreamyPauseOverlay
                onResume={handleResume}
                onEnd={handleEnd}
                reduceMotion={reduceMotion}
                elapsedTime={elapsedSeconds}
                totalTime={totalSeconds}
              />
            )}
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  touchArea: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Floating particles
  floatingParticle: {
    position: 'absolute',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.muted,
    letterSpacing: 0.3,
  },

  // Portrait scroll layout
  portraitScrollView: {
    flex: 1,
  },
  portraitScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  portraitOrbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  // Landscape layout
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeHeader: {
    position: 'absolute',
    zIndex: 10,
  },
  landscapeOrbSection: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  landscapeSelectionSection: {
    flex: 0.55,
    paddingLeft: 24,
    paddingRight: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  landscapeTitleSection: {
    marginBottom: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
    }),
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
    color: MEDITATION_COLORS.text.primary,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.muted,
    marginTop: 2,
  },

  // Minimal header
  headerMinimal: {
    position: 'absolute',
    zIndex: 10,
  },
  closeButton: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },

  // Active meditation
  activeMeditationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMeditationOrbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instructions
  instructions: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  instructionText: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.secondary,
    textAlign: 'center',
  },
  instructionHint: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.subtle,
    textAlign: 'center',
  },

  // Duration section
  durationSection: {
    alignItems: 'center',
    width: '100%',
  },
  durationTitle: {
    fontWeight: '700',
    color: MEDITATION_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  durationScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Duration card
  durationCard: {
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: MEDITATION_COLORS.surface.card,
    borderWidth: 2,
    borderColor: MEDITATION_COLORS.surface.border,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.shadow.soft,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
    }),
  },
  durationCardSelected: {
    backgroundColor: MEDITATION_COLORS.teal[500],
    borderColor: MEDITATION_COLORS.teal[500],
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOpacity: 0.4,
        shadowRadius: 18,
      },
    }),
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: MEDITATION_COLORS.teal[400],
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MEDITATION_COLORS.orange[500],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.orange[600],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  durationIconWrap: {
    backgroundColor: MEDITATION_COLORS.teal[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  durationIconWrapSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  durationMinutes: {
    fontWeight: '700',
    color: MEDITATION_COLORS.text.primary,
    lineHeight: 36,
  },
  durationMinutesSelected: {
    color: '#FFFFFF',
  },
  durationUnit: {
    fontWeight: '600',
    color: MEDITATION_COLORS.text.muted,
    marginTop: -2,
  },
  durationUnitSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  durationDescription: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.subtle,
    marginTop: 4,
    textAlign: 'center',
  },
  durationDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  selectionCheck: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Start section
  startSection: {
    alignItems: 'center',
    width: '100%',
  },
  beginButton: {
    width: '100%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.orange[600],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
    }),
  },
  beginGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  beginIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginText: {
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Pause control
  pauseControl: {
    position: 'absolute',
    alignSelf: 'center',
  },
  pauseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
    }),
  },

  // Time display
  timeDisplayContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timeText: {
    fontWeight: '300',
    color: MEDITATION_COLORS.teal[500],
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  timeTextActive: {
    color: MEDITATION_COLORS.teal[600],
    fontWeight: '400',
  },
  timeLabel: {
    fontWeight: '600',
    color: MEDITATION_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  timeLabelActive: {
    color: MEDITATION_COLORS.teal[600],
  },
  timeVisualIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeVisualText: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.muted,
    letterSpacing: 0.5,
  },

  // Orb styles
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  outerGlow: {
    position: 'absolute',
  },
  shimmerRing: {
    position: 'absolute',
    overflow: 'hidden',
  },
  shimmerGradient: {
    flex: 1,
    borderRadius: 999,
  },
  mainOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 36,
      },
    }),
  },
  orbGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heartbeatPulse: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  innerHighlight: {
    position: 'absolute',
    top: '10%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  orbCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  orbStatusText: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
  },
  playIconCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  orbReadyText: {
    fontWeight: '600',
    color: MEDITATION_COLORS.teal[600],
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 6,
  },
  progressRingContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
  },
  progressArc: {
    position: 'absolute',
  },

  // Phase indicator
  phaseIndicatorContainer: {
    marginTop: 24,
  },
  phaseIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingLeft: 10,
    borderRadius: 28,
    gap: 12,
  },
  phaseIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseTextContainer: {
    alignItems: 'flex-start',
  },
  phaseLabel: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  phaseSublabel: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.muted,
    marginTop: 1,
  },

  // Prompt
  promptContainer: {
    position: 'absolute',
    top: '8%',
    left: 28,
    right: 28,
    alignItems: 'center',
    zIndex: 5,
  },
  promptText: {
    fontWeight: '400',
    color: MEDITATION_COLORS.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.4,
    fontStyle: 'italic',
  },

  // Pause overlay
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pauseContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pauseIconContainer: {
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
    }),
  },
  pauseIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTitle: {
    fontWeight: '600',
    color: MEDITATION_COLORS.teal[700],
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  pauseSubtitle: {
    fontWeight: '500',
    color: MEDITATION_COLORS.teal[600],
    marginBottom: 8,
  },
  pauseEncouragement: {
    fontWeight: '400',
    color: MEDITATION_COLORS.text.muted,
    marginBottom: 40,
    fontStyle: 'italic',
  },
  resumeButton: {
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
    }),
  },
  resumeGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  resumeIconCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeText: {
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  endSessionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endSessionText: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.muted,
  },

  // Completion
  completionContainer: {
    alignSelf: 'center',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    top: -50,
  },
  completionCard: {
    borderRadius: 32,
    alignItems: 'center',
    backgroundColor: MEDITATION_COLORS.surface.card,
    borderWidth: 1,
    borderColor: MEDITATION_COLORS.surface.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
    }),
  },
  decorCircle1: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: MEDITATION_COLORS.teal[50],
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: MEDITATION_COLORS.orange[50],
  },
  achievementBadge: {
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.teal[600],
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
    }),
  },
  achievementGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontWeight: '700',
    color: MEDITATION_COLORS.text.primary,
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  statValue: {
    fontWeight: '700',
    color: MEDITATION_COLORS.teal[600],
  },
  statLabel: {
    fontWeight: '500',
    color: MEDITATION_COLORS.text.muted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: MEDITATION_COLORS.surface.border,
  },
  messageCard: {
    backgroundColor: MEDITATION_COLORS.orange[50],
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  messageText: {
    fontWeight: '500',
    color: MEDITATION_COLORS.orange[600],
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 8,
    fontStyle: 'italic',
  },
  completionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 14,
  },
  againButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 22,
    backgroundColor: MEDITATION_COLORS.teal[50],
    borderWidth: 2,
    borderColor: MEDITATION_COLORS.teal[100],
  },
  againButtonText: {
    fontWeight: '600',
    color: MEDITATION_COLORS.teal[600],
  },
  doneButton: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: MEDITATION_COLORS.orange[600],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
    }),
  },
  doneButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  doneButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TandyMeditationScreen;
