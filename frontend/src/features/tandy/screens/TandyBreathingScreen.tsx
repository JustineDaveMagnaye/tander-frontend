/**
 * TANDER TandyBreathingScreen - Premium Breathing Experience
 * A stunning, calming breathing exercise for Filipino seniors (50+)
 *
 * DESIGN PHILOSOPHY (Calm/Headspace-Level):
 * - Premium, mesmerizing breathing circle with gradient transitions
 * - Aurora-like particle effects that respond to breath phases
 * - Crystal-clear phase indicators with directional arrows
 * - Elegant progress tracking with milestone celebrations
 * - Smooth pause/resume overlay with frosted glass effect
 * - Celebratory completion screen with stats and encouragement
 *
 * ACCESSIBILITY (Senior-Friendly):
 * - Touch targets: 64px minimum
 * - Font sizes: 20px+ body text
 * - High contrast: WCAG AAA (7:1) recommended
 * - Full screen reader support
 * - Reduced motion support
 * - Haptic feedback on phase transitions
 *
 * RESPONSIVE:
 * - Phones: Portrait-locked, single column
 * - Tablets: Landscape-capable, adaptive layout
 * - Dynamic circle sizing based on screen dimensions
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';

// ============================================================================
// PREMIUM COLOR PALETTE - Serene, Calming, Light Mode
// ============================================================================

const COLORS = {
  // Background gradient - soft, airy, calming
  backgroundStart: '#FEFEFE',
  backgroundMid: '#F8FAFC',
  backgroundEnd: '#F0FDFA',

  // Card colors - frosted glass effect
  cardSolid: '#FFFFFF',
  cardFrosted: 'rgba(255, 255, 255, 0.95)',
  cardBorder: 'rgba(20, 184, 166, 0.15)',

  // Brand colors
  teal: colors.teal[500],         // #14B8A6
  tealLight: colors.teal[300],    // #5EEAD4
  tealDark: colors.teal[600],     // #0D9488
  orange: colors.orange[500],     // #F97316
  orangeLight: colors.orange[400], // #FB923C
  orangeDark: colors.orange[600], // #EA580C

  // Text colors - high contrast for seniors
  textPrimary: '#1E293B',         // slate-800
  textSecondary: '#334155',       // slate-700
  textMuted: '#64748B',           // slate-500
  textOnColor: '#FFFFFF',

  // Phase colors with gradients
  inhale: {
    primary: '#14B8A6',           // Teal - fresh, energizing
    secondary: '#0D9488',
    glow: 'rgba(20, 184, 166, 0.3)',
  },
  hold: {
    primary: '#F97316',           // Orange - warmth, stillness
    secondary: '#EA580C',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  exhale: {
    primary: '#0D9488',           // Deep teal - release, peace
    secondary: '#0F766E',
    glow: 'rgba(13, 148, 136, 0.3)',
  },

  // UI elements
  success: '#10B981',             // emerald-500
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// ============================================================================
// TYPES
// ============================================================================

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'hold2';

interface BreathingType {
  id: string;
  name: string;
  description: string;
  benefit: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  duration: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  phases: {
    inhale: number;
    hold: number;
    exhale: number;
    hold2?: number;
  };
  tips: string[];
  completionMessage: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BREATHING_TYPES: BreathingType[] = [
  {
    id: 'belly',
    name: 'Belly Breathing',
    description: 'Deep breaths into your belly for relaxation',
    benefit: 'Deep Relaxation',
    difficulty: 'Easy',
    duration: '2 min',
    icon: 'wind',
    iconColor: COLORS.teal,
    phases: { inhale: 4, hold: 0, exhale: 4 },
    tips: [
      'Place hand on belly to feel it rise',
      'Breathe through your nose',
      'Keep shoulders relaxed',
    ],
    completionMessage: 'Your body is now relaxed and calm.',
  },
  {
    id: 'pursed',
    name: 'Pursed Lip',
    description: 'Slow exhale like blowing a candle',
    benefit: 'Lung Health',
    difficulty: 'Medium',
    duration: '2.5 min',
    icon: 'moon',
    iconColor: COLORS.orange,
    phases: { inhale: 2, hold: 0, exhale: 4 },
    tips: [
      'Inhale through your nose',
      'Purse lips like blowing a candle',
      'Exhale slowly and gently',
    ],
    completionMessage: 'Great for your lungs and breathing!',
  },
  {
    id: 'calm',
    name: 'Calming Breath',
    description: 'Extra long exhale for stress relief',
    benefit: 'Stress Relief',
    difficulty: 'Easy',
    duration: '3 min',
    icon: 'sunrise',
    iconColor: COLORS.tealLight,
    phases: { inhale: 3, hold: 0, exhale: 5 },
    tips: [
      'Find a comfortable position',
      'Close your eyes if you prefer',
      'Let go of tension with each exhale',
    ],
    completionMessage: 'You have released stress and found peace.',
  },
];

const TARGET_CYCLES = 5;

const MILESTONE_MESSAGES = [
  { cycle: 1, message: 'Great start! Keep going.' },
  { cycle: 2, message: 'You are doing wonderfully!' },
  { cycle: 3, message: 'Halfway there! Stay calm.' },
  { cycle: 4, message: 'Almost done! One more breath.' },
  { cycle: 5, message: 'Congratulations!' },
];

// ============================================================================
// FLOATING PARTICLE COMPONENT - Aurora-like ambient effects
// ============================================================================

interface FloatingParticleProps {
  delay: number;
  size: number;
  startX: number;
  startY: number;
  color: string;
  duration: number;
  phase: BreathingPhase;
  isActive: boolean;
}

const FloatingParticle: React.FC<FloatingParticleProps> = ({
  delay,
  size,
  startX,
  startY,
  color,
  duration,
  phase,
  isActive,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 2000,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Scale up
    Animated.timing(scale, {
      toValue: 1,
      duration: 3000,
      delay,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    // Floating animation
    const floatDistance = isActive ? 40 : 20;
    const floatDuration = isActive
      ? (phase === 'inhale' ? duration * 0.8 : duration * 1.2)
      : duration;

    const floatY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -floatDistance,
          duration: floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: floatDistance * 0.3,
          duration: floatDuration * 0.7,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: floatDuration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const floatX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: floatDistance * 0.5,
          duration: floatDuration * 1.3,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -floatDistance * 0.4,
          duration: floatDuration * 1.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: floatDuration * 0.8,
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
  }, [delay, duration, phase, isActive, opacity, scale, translateX, translateY]);

  return (
    <Animated.View
      style={[
        particleStyles.particle,
        {
          left: `${startX}%`,
          top: `${startY}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
      pointerEvents="none"
    />
  );
};

const particleStyles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});

// ============================================================================
// AMBIENT PARTICLES CONTAINER
// ============================================================================

interface AmbientParticlesProps {
  reduceMotion: boolean;
  phase: BreathingPhase;
  isActive: boolean;
}

const AmbientParticles: React.FC<AmbientParticlesProps> = ({
  reduceMotion,
  phase,
  isActive,
}) => {
  if (reduceMotion) return null;

  // Particle colors that respond to breath phase
  const getPhaseColor = (baseColor: string, opacity: number) => {
    if (!isActive) return baseColor;

    switch (phase) {
      case 'inhale':
        return `rgba(20, 184, 166, ${opacity})`;  // Teal
      case 'hold':
      case 'hold2':
        return `rgba(249, 115, 22, ${opacity})`;  // Orange
      case 'exhale':
        return `rgba(13, 148, 136, ${opacity})`;  // Deep teal
    }
  };

  const particles = useMemo(() => [
    // Large background particles
    { delay: 0, duration: 12000, size: 160, startX: 5, startY: 8, color: getPhaseColor('rgba(94, 234, 212, 0.08)', 0.08) },
    { delay: 1500, duration: 14000, size: 180, startX: 75, startY: 5, color: getPhaseColor('rgba(20, 184, 166, 0.06)', 0.06) },
    { delay: 3000, duration: 13000, size: 140, startX: 85, startY: 60, color: getPhaseColor('rgba(45, 212, 191, 0.07)', 0.07) },

    // Medium particles
    { delay: 500, duration: 10000, size: 100, startX: 15, startY: 25, color: getPhaseColor('rgba(251, 146, 60, 0.05)', 0.05) },
    { delay: 2000, duration: 11000, size: 90, startX: 60, startY: 35, color: getPhaseColor('rgba(20, 184, 166, 0.06)', 0.06) },
    { delay: 1000, duration: 9500, size: 110, startX: 40, startY: 80, color: getPhaseColor('rgba(249, 115, 22, 0.05)', 0.05) },
    { delay: 2500, duration: 10500, size: 95, startX: 0, startY: 50, color: getPhaseColor('rgba(94, 234, 212, 0.07)', 0.07) },

    // Small accent particles
    { delay: 800, duration: 8000, size: 60, startX: 25, startY: 45, color: getPhaseColor('rgba(20, 184, 166, 0.08)', 0.08) },
    { delay: 1800, duration: 8500, size: 55, startX: 80, startY: 25, color: getPhaseColor('rgba(251, 146, 60, 0.06)', 0.06) },
    { delay: 600, duration: 9000, size: 65, startX: 50, startY: 70, color: getPhaseColor('rgba(45, 212, 191, 0.07)', 0.07) },
    { delay: 2200, duration: 7500, size: 50, startX: 90, startY: 45, color: getPhaseColor('rgba(249, 115, 22, 0.05)', 0.05) },

    // Tiny sparkle particles
    { delay: 400, duration: 7000, size: 35, startX: 30, startY: 75, color: getPhaseColor('rgba(20, 184, 166, 0.09)', 0.09) },
    { delay: 2800, duration: 6500, size: 40, startX: 65, startY: 55, color: getPhaseColor('rgba(251, 146, 60, 0.07)', 0.07) },
  ], [phase, isActive]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle, index) => (
        <FloatingParticle
          key={index}
          {...particle}
          phase={phase}
          isActive={isActive}
        />
      ))}
    </View>
  );
};

// ============================================================================
// PREMIUM TYPE CARD - Stunning selection cards
// ============================================================================

interface TypeCardProps {
  type: BreathingType;
  onSelect: () => void;
  index: number;
  isTablet: boolean;
}

const PremiumTypeCard: React.FC<TypeCardProps> = ({
  type,
  onSelect,
  index,
  isTablet,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        delay: index * 150,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  };

  const getPatternText = () => {
    const { phases } = type;
    if (phases.hold2) return `${phases.inhale}-${phases.hold}-${phases.exhale}-${phases.hold2}`;
    if (phases.hold > 0) return `${phases.inhale}-${phases.hold}-${phases.exhale}`;
    return `${phases.inhale}-${phases.exhale}`;
  };

  const getDifficultyColor = () => {
    switch (type.difficulty) {
      case 'Easy': return COLORS.success;
      case 'Medium': return COLORS.orange;
      case 'Advanced': return COLORS.orangeDark;
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }, { scale: scaleAnim }],
      }}
    >
      <Pressable
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${type.name}. ${type.description}. ${type.difficulty}. Duration ${type.duration}. Pattern: ${getPatternText()} seconds.`}
        accessibilityRole="button"
        accessibilityHint="Double tap to select this breathing exercise"
      >
        <View style={[cardStyles.card, isTablet && cardStyles.cardTablet]}>
          {/* Gradient accent bar */}
          <LinearGradient
            colors={[type.iconColor, `${type.iconColor}88`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.accentBar}
          />

          <View style={cardStyles.cardContent}>
            {/* Icon container with glow effect */}
            <View style={cardStyles.iconContainer}>
              <View style={[cardStyles.iconGlow, { backgroundColor: `${type.iconColor}15` }]}>
                <View style={[cardStyles.iconInner, { backgroundColor: `${type.iconColor}25` }]}>
                  <Feather name={type.icon} size={32} color={type.iconColor} />
                </View>
              </View>
            </View>

            {/* Content */}
            <View style={cardStyles.textContent}>
              <Text style={cardStyles.cardTitle}>{type.name}</Text>
              <Text style={cardStyles.cardDescription}>{type.description}</Text>

              {/* Badges row */}
              <View style={cardStyles.badgesRow}>
                {/* Benefit badge */}
                <View style={[cardStyles.badge, { backgroundColor: `${type.iconColor}12` }]}>
                  <Feather name="heart" size={14} color={type.iconColor} />
                  <Text style={[cardStyles.badgeText, { color: type.iconColor }]}>
                    {type.benefit}
                  </Text>
                </View>

                {/* Difficulty badge */}
                <View style={[cardStyles.badge, { backgroundColor: `${getDifficultyColor()}12` }]}>
                  <Feather name="activity" size={14} color={getDifficultyColor()} />
                  <Text style={[cardStyles.badgeText, { color: getDifficultyColor() }]}>
                    {type.difficulty}
                  </Text>
                </View>

                {/* Duration badge */}
                <View style={[cardStyles.badge, { backgroundColor: `${COLORS.textMuted}12` }]}>
                  <Feather name="clock" size={14} color={COLORS.textMuted} />
                  <Text style={[cardStyles.badgeText, { color: COLORS.textMuted }]}>
                    {type.duration}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pattern indicator and arrow */}
            <View style={cardStyles.rightSection}>
              <View style={cardStyles.patternContainer}>
                <Text style={[cardStyles.patternLabel, { color: type.iconColor }]}>
                  {getPatternText()}
                </Text>
                <Text style={cardStyles.patternUnit}>sec</Text>
              </View>
              <View style={[cardStyles.arrowCircle, { backgroundColor: `${type.iconColor}15` }]}>
                <Feather name="chevron-right" size={24} color={type.iconColor} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardSolid,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minHeight: 140,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
    minHeight: 140,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGlow: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 22,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'center',
    gap: 8,
  },
  patternContainer: {
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  patternUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================================================
// MESMERIZING BREATHING CIRCLE - The stunning centerpiece
// ============================================================================

interface BreathingCircleProps {
  size: number;
  isActive: boolean;
  scaleAnim: Animated.Value;
  phase: BreathingPhase;
  count: number;
  totalDuration: number;
  reduceMotion: boolean;
  selectedType: BreathingType | null;
}

const MesmerizingBreathingCircle: React.FC<BreathingCircleProps> = ({
  size,
  isActive,
  scaleAnim,
  phase,
  count,
  totalDuration,
  reduceMotion,
  selectedType,
}) => {
  // Ring animations
  const ring1Opacity = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0.2)).current;
  const ring3Opacity = useRef(new Animated.Value(0.15)).current;
  const ring4Opacity = useRef(new Animated.Value(0.1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring4Scale = useRef(new Animated.Value(1)).current;
  const innerGlow = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Progress arc animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive || reduceMotion) {
      ring1Opacity.setValue(0.2);
      ring2Opacity.setValue(0.15);
      ring3Opacity.setValue(0.1);
      ring4Opacity.setValue(0.08);
      return;
    }

    // Ripple effect for rings
    const createRingAnimation = (
      opacityAnim: Animated.Value,
      scaleAnim: Animated.Value,
      delay: number,
      duration: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0.5,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.08,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0.15,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const ring1Anim = createRingAnimation(ring1Opacity, ring1Scale, 0, 4000);
    const ring2Anim = createRingAnimation(ring2Opacity, ring2Scale, 800, 4500);
    const ring3Anim = createRingAnimation(ring3Opacity, ring3Scale, 1600, 5000);
    const ring4Anim = createRingAnimation(ring4Opacity, ring4Scale, 2400, 5500);

    // Inner glow pulse
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(innerGlow, {
          toValue: 0.8,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(innerGlow, {
          toValue: 0.4,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Slow rotation for subtle movement
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    ring1Anim.start();
    ring2Anim.start();
    ring3Anim.start();
    ring4Anim.start();
    glowAnim.start();
    rotate.start();

    return () => {
      ring1Anim.stop();
      ring2Anim.stop();
      ring3Anim.stop();
      ring4Anim.stop();
      glowAnim.stop();
      rotate.stop();
    };
  }, [isActive, reduceMotion, ring1Opacity, ring2Opacity, ring3Opacity, ring4Opacity, ring1Scale, ring2Scale, ring3Scale, ring4Scale, innerGlow, rotateAnim]);

  // Progress animation for phase
  useEffect(() => {
    if (!isActive) {
      progressAnim.setValue(0);
      return;
    }

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: totalDuration * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [phase, isActive, totalDuration, progressAnim]);

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
    }
  };

  const getPhaseColors = () => {
    switch (phase) {
      case 'inhale':
        return {
          primary: COLORS.inhale.primary,
          secondary: COLORS.inhale.secondary,
          glow: COLORS.inhale.glow,
        };
      case 'hold':
      case 'hold2':
        return {
          primary: COLORS.hold.primary,
          secondary: COLORS.hold.secondary,
          glow: COLORS.hold.glow,
        };
      case 'exhale':
        return {
          primary: COLORS.exhale.primary,
          secondary: COLORS.exhale.secondary,
          glow: COLORS.exhale.glow,
        };
    }
  };

  const phaseColors = getPhaseColors();
  const readyColor = selectedType?.iconColor || COLORS.teal;

  const ring1Size = size + 50;
  const ring2Size = size + 100;
  const ring3Size = size + 150;
  const ring4Size = size + 200;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={circleStyles.wrapper}>
      {/* Outermost ring */}
      {isActive && (
        <Animated.View
          style={[
            circleStyles.ring,
            {
              width: ring4Size,
              height: ring4Size,
              borderRadius: ring4Size / 2,
              borderColor: phaseColors.primary,
              opacity: ring4Opacity,
              transform: [{ scale: ring4Scale }, { rotate: rotateInterpolate }],
            },
          ]}
        />
      )}

      {/* Third ring */}
      {isActive && (
        <Animated.View
          style={[
            circleStyles.ring,
            {
              width: ring3Size,
              height: ring3Size,
              borderRadius: ring3Size / 2,
              borderColor: phaseColors.primary,
              opacity: ring3Opacity,
              transform: [{ scale: ring3Scale }],
            },
          ]}
        />
      )}

      {/* Second ring */}
      {isActive && (
        <Animated.View
          style={[
            circleStyles.ring,
            {
              width: ring2Size,
              height: ring2Size,
              borderRadius: ring2Size / 2,
              borderColor: phaseColors.primary,
              opacity: ring2Opacity,
              transform: [{ scale: ring2Scale }],
            },
          ]}
        />
      )}

      {/* Inner ring */}
      {isActive && (
        <Animated.View
          style={[
            circleStyles.ring,
            {
              width: ring1Size,
              height: ring1Size,
              borderRadius: ring1Size / 2,
              borderColor: phaseColors.primary,
              opacity: ring1Opacity,
              transform: [{ scale: ring1Scale }],
            },
          ]}
        />
      )}

      {/* Main breathing circle */}
      <Animated.View
        style={[
          circleStyles.mainCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: isActive ? scaleAnim : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={
            isActive
              ? [phaseColors.primary, phaseColors.secondary]
              : [readyColor, `${readyColor}CC`]
          }
          style={[
            circleStyles.circleGradient,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        >
          {/* Inner glow effect */}
          <Animated.View
            style={[
              circleStyles.innerGlow,
              {
                width: size * 0.7,
                height: size * 0.7,
                borderRadius: (size * 0.7) / 2,
                opacity: innerGlow,
              },
            ]}
          />

          {/* Content */}
          {isActive ? (
            <View style={circleStyles.activeContent}>
              <Text style={circleStyles.countdownText}>{count}</Text>
            </View>
          ) : (
            <View style={circleStyles.readyContent}>
              <Feather name={selectedType?.icon || 'wind'} size={56} color={COLORS.textOnColor} />
              <Text style={circleStyles.readyLabel}>Ready</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Phase indicator below circle */}
      {isActive && (
        <View style={circleStyles.phaseIndicatorContainer}>
          {/* Direction arrow */}
          <View style={[circleStyles.directionArrow, { backgroundColor: `${phaseColors.primary}20` }]}>
            <Feather
              name={phase === 'inhale' ? 'arrow-up' : phase === 'exhale' ? 'arrow-down' : 'pause'}
              size={24}
              color={phaseColors.primary}
            />
          </View>

          {/* Phase label */}
          <View style={[circleStyles.phaseLabel, { backgroundColor: `${phaseColors.primary}15` }]}>
            <Text style={[circleStyles.phaseLabelText, { color: phaseColors.primary }]}>
              {getPhaseText()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const circleStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  mainCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  circleGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 88,
    fontWeight: '200',
    color: COLORS.textOnColor,
    letterSpacing: -4,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  readyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textOnColor,
    marginTop: 8,
    opacity: 0.9,
  },
  phaseIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  directionArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  phaseLabelText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// ============================================================================
// PROGRESS TRACKER - Engaging visual progress
// ============================================================================

interface ProgressTrackerProps {
  current: number;
  total: number;
  phase: BreathingPhase;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ current, total, phase }) => {
  const milestone = MILESTONE_MESSAGES.find(m => m.cycle === current);

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return COLORS.teal;
      case 'hold':
      case 'hold2': return COLORS.orange;
      case 'exhale': return COLORS.tealDark;
    }
  };

  return (
    <View style={progressStyles.container}>
      {/* Progress bar */}
      <View style={progressStyles.progressBarContainer}>
        <View style={progressStyles.progressBarBackground}>
          <View
            style={[
              progressStyles.progressBarFill,
              {
                width: `${(current / total) * 100}%`,
                backgroundColor: getPhaseColor(),
              },
            ]}
          />
        </View>
      </View>

      {/* Breath indicators */}
      <View style={progressStyles.dotsRow}>
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            style={[
              progressStyles.dot,
              index < current && [progressStyles.dotFilled, { backgroundColor: getPhaseColor() }],
              index === current && progressStyles.dotCurrent,
            ]}
          >
            {index < current && (
              <Feather name="check" size={12} color={COLORS.textOnColor} />
            )}
          </View>
        ))}
      </View>

      {/* Progress text */}
      <Text style={progressStyles.label}>
        Breath {current} of {total}
      </Text>

      {/* Milestone message */}
      {milestone && current > 0 && (
        <Text style={progressStyles.milestone}>{milestone.message}</Text>
      )}
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.cardFrosted,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: `${COLORS.textMuted}20`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.textMuted}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    backgroundColor: COLORS.teal,
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: COLORS.teal,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  milestone: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.teal,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

// ============================================================================
// PAUSE OVERLAY - Calming frosted glass pause screen
// ============================================================================

interface PauseOverlayProps {
  visible: boolean;
  onResume: () => void;
  onStop: () => void;
  cycleCount: number;
  totalCycles: number;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({
  visible,
  onResume,
  onStop,
  cycleCount,
  totalCycles,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  const progressPercentage = Math.round((cycleCount / totalCycles) * 100);

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[pauseStyles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[pauseStyles.content, { transform: [{ scale: scaleAnim }] }]}>
          {/* Pause icon */}
          <View style={pauseStyles.pauseIcon}>
            <Feather name="pause" size={40} color={COLORS.teal} />
          </View>

          <Text style={pauseStyles.title}>Paused</Text>
          <Text style={pauseStyles.subtitle}>Take a moment to rest</Text>

          {/* Progress info */}
          <View style={pauseStyles.progressInfo}>
            <Text style={pauseStyles.progressText}>
              {progressPercentage}% Complete
            </Text>
            <Text style={pauseStyles.breathsText}>
              {cycleCount} of {totalCycles} breaths
            </Text>
          </View>

          {/* Buttons */}
          <View style={pauseStyles.buttonsContainer}>
            <Pressable
              onPress={onResume}
              style={({ pressed }) => [
                pauseStyles.resumeButton,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityLabel="Resume breathing exercise"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[COLORS.teal, COLORS.tealDark]}
                style={pauseStyles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="play" size={24} color={COLORS.textOnColor} />
                <Text style={pauseStyles.resumeText}>Resume</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={onStop}
              style={({ pressed }) => [
                pauseStyles.stopButton,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityLabel="Stop and exit breathing exercise"
              accessibilityRole="button"
            >
              <Feather name="x" size={24} color={COLORS.textSecondary} />
              <Text style={pauseStyles.stopText}>End Session</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const pauseStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: COLORS.cardSolid,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pauseIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.teal}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  progressInfo: {
    backgroundColor: `${COLORS.teal}10`,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.teal,
  },
  breathsText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  resumeButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  resumeText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textOnColor,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  stopText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

// ============================================================================
// COMPLETION SCREEN - Celebratory with stats
// ============================================================================

interface CompletionScreenProps {
  onAgain: () => void;
  onDone: () => void;
  cycles: number;
  exerciseType: BreathingType | null;
  totalTimeSeconds: number;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  onAgain,
  onDone,
  cycles,
  exerciseType,
  totalTimeSeconds,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic celebration
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 50, 100, 50]);
    }
  }, [fadeAnim, scaleAnim, checkAnim, confettiAnim]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        completionStyles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={completionStyles.card}>
        {/* Success icon with animation */}
        <Animated.View
          style={[
            completionStyles.checkCircle,
            { transform: [{ scale: checkAnim }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.success, '#059669']}
            style={completionStyles.checkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="check" size={48} color={COLORS.textOnColor} />
          </LinearGradient>
        </Animated.View>

        <Text style={completionStyles.title}>Well Done!</Text>
        <Text style={completionStyles.subtitle}>
          You completed your breathing session
        </Text>

        {/* Stats row */}
        <View style={completionStyles.statsRow}>
          <View style={completionStyles.statItem}>
            <Feather name="wind" size={24} color={COLORS.teal} />
            <Text style={completionStyles.statValue}>{cycles}</Text>
            <Text style={completionStyles.statLabel}>Breaths</Text>
          </View>
          <View style={completionStyles.statDivider} />
          <View style={completionStyles.statItem}>
            <Feather name="clock" size={24} color={COLORS.orange} />
            <Text style={completionStyles.statValue}>{formatTime(totalTimeSeconds)}</Text>
            <Text style={completionStyles.statLabel}>Duration</Text>
          </View>
          <View style={completionStyles.statDivider} />
          <View style={completionStyles.statItem}>
            <Feather name={exerciseType?.icon || 'heart'} size={24} color={exerciseType?.iconColor || COLORS.teal} />
            <Text style={completionStyles.statValue}>{exerciseType?.difficulty || 'Easy'}</Text>
            <Text style={completionStyles.statLabel}>Level</Text>
          </View>
        </View>

        {/* Motivational message */}
        <View style={completionStyles.messageBox}>
          <Feather name="heart" size={20} color={COLORS.orange} />
          <Text style={completionStyles.messageText}>
            {exerciseType?.completionMessage || 'Great for your health!'}
          </Text>
        </View>

        {/* Buttons */}
        <View style={completionStyles.buttonRow}>
          <Pressable
            onPress={onAgain}
            style={({ pressed }) => [
              completionStyles.secondaryBtn,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityLabel="Practice again"
            accessibilityRole="button"
          >
            <Feather name="refresh-cw" size={22} color={COLORS.tealDark} />
            <Text style={completionStyles.secondaryBtnText}>Again</Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            style={({ pressed }) => [
              completionStyles.primaryBtn,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityLabel="Finish and return"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[COLORS.orange, COLORS.orangeDark]}
              style={completionStyles.primaryBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={completionStyles.primaryBtnText}>Done</Text>
              <Feather name="check" size={22} color={COLORS.textOnColor} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const completionStyles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: COLORS.cardSolid,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  checkCircle: {
    marginBottom: 20,
  },
  checkGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.teal}08`,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 8,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.orange}10`,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 28,
    gap: 12,
    width: '100%',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.orangeDark,
    flex: 1,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 60,
    borderRadius: 20,
    backgroundColor: `${COLORS.teal}12`,
    borderWidth: 1,
    borderColor: `${COLORS.teal}25`,
  },
  secondaryBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.tealDark,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textOnColor,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TandyBreathingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, isTablet, hp, wp, getButtonHeight, getTouchTargetSize } = useResponsive();

  // Accessibility
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotion(enabled);
      } catch {
        setReduceMotion(false);
      }
    };
    check();

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  // Responsive circle size
  const circleSize = useMemo(() => {
    if (isLandscape) {
      return Math.min(height * 0.42, width * 0.28, 220);
    }
    if (isTablet) {
      return Math.min(width * 0.45, height * 0.35, 280);
    }
    return Math.min(width * 0.55, height * 0.30, 240);
  }, [width, height, isLandscape, isTablet]);

  // State
  const [selectedType, setSelectedType] = useState<BreathingType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [count, setCount] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0);

  // Refs
  const countRef = useRef(4);
  const phaseRef = useRef<BreathingPhase>('inhale');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase duration
  const getPhaseDuration = useCallback(
    (p: BreathingPhase): number => {
      if (!selectedType) return 4;
      switch (p) {
        case 'inhale': return selectedType.phases.inhale;
        case 'hold': return selectedType.phases.hold;
        case 'exhale': return selectedType.phases.exhale;
        case 'hold2': return selectedType.phases.hold2 || 0;
      }
    },
    [selectedType]
  );

  // Next phase
  const getNextPhase = useCallback(
    (current: BreathingPhase): BreathingPhase => {
      if (!selectedType) return 'inhale';
      switch (current) {
        case 'inhale':
          return selectedType.phases.hold > 0 ? 'hold' : 'exhale';
        case 'hold':
          return 'exhale';
        case 'exhale':
          if (selectedType.phases.hold2 && selectedType.phases.hold2 > 0) return 'hold2';
          return 'inhale';
        case 'hold2':
          return 'inhale';
      }
    },
    [selectedType]
  );

  // Haptic feedback on phase change
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web' && !reduceMotion) {
      Vibration.vibrate(30);
    }
  }, [reduceMotion]);

  // Timer
  useEffect(() => {
    if (!isActive || !selectedType || isPaused) return;

    const timer = setInterval(() => {
      countRef.current -= 1;
      timeRef.current += 1;
      setTotalTimeSeconds(timeRef.current);

      if (countRef.current <= 0) {
        const nextPhase = getNextPhase(phaseRef.current);
        triggerHaptic();

        if (nextPhase === 'inhale') {
          const newCycleCount = cycleCount + 1;
          setCycleCount(newCycleCount);

          if (newCycleCount >= TARGET_CYCLES) {
            setIsActive(false);
            setShowCompletion(true);
            return;
          }
        }

        phaseRef.current = nextPhase;
        countRef.current = getPhaseDuration(nextPhase);

        if (countRef.current === 0) {
          const skipToPhase = getNextPhase(nextPhase);
          phaseRef.current = skipToPhase;
          countRef.current = getPhaseDuration(skipToPhase);
        }

        setPhase(phaseRef.current);
      }

      setCount(countRef.current);
    }, 1000);

    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [isActive, isPaused, selectedType, getNextPhase, getPhaseDuration, cycleCount, triggerHaptic]);

  // Breathing animation
  useEffect(() => {
    if (!isActive || isPaused || reduceMotion) return;

    const phaseDuration = getPhaseDuration(phase) * 1000;

    let toValue: number;
    if (phase === 'inhale') {
      toValue = 1.35;
    } else if (phase === 'exhale') {
      toValue = 0.7;
    } else {
      return;
    }

    Animated.timing(scaleAnim, {
      toValue,
      duration: phaseDuration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }).start();
  }, [phase, isActive, isPaused, scaleAnim, reduceMotion, getPhaseDuration]);

  // Handlers
  const handleGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleSelectType = (type: BreathingType) => setSelectedType(type);

  const handleStart = () => {
    if (!selectedType) return;
    phaseRef.current = 'inhale';
    countRef.current = selectedType.phases.inhale;
    timeRef.current = 0;
    setPhase('inhale');
    setCount(selectedType.phases.inhale);
    setCycleCount(0);
    setTotalTimeSeconds(0);
    setShowCompletion(false);
    setIsPaused(false);
    scaleAnim.setValue(0.7);
    setIsActive(true);
    triggerHaptic();
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    triggerHaptic();
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setSelectedType(null);
    setCycleCount(0);
  };

  const handleReset = () => {
    setSelectedType(null);
    setIsActive(false);
    setIsPaused(false);
    setCycleCount(0);
    setShowCompletion(false);
  };

  const handleAgain = () => {
    setCycleCount(0);
    setShowCompletion(false);
    handleStart();
  };

  const handleDone = () => handleReset();

  const getInstructionText = () => {
    if (showCompletion) return '';
    if (isPaused) return 'Paused - tap Resume to continue';
    if (!isActive) return 'Sit comfortably and relax';

    if (selectedType?.id === 'pursed') {
      switch (phase) {
        case 'inhale': return 'Breathe in through your nose';
        case 'exhale': return 'Breathe out slowly, lips pursed';
        default: return '';
      }
    } else if (selectedType?.id === 'belly') {
      switch (phase) {
        case 'inhale': return 'Breathe in, feel your belly rise';
        case 'exhale': return 'Breathe out, feel your belly fall';
        default: return '';
      }
    } else {
      switch (phase) {
        case 'inhale': return 'Breathe in slowly';
        case 'exhale': return 'Breathe out gently';
        default: return '';
      }
    }
  };

  // Calculate button height
  const buttonHeight = getButtonHeight();
  const touchTarget = getTouchTargetSize('large');

  // ============================================================================
  // RENDER: TYPE SELECTION
  // ============================================================================

  if (!selectedType) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundStart} />
        <LinearGradient
          colors={[COLORS.backgroundStart, COLORS.backgroundMid, COLORS.backgroundEnd]}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          <AmbientParticles reduceMotion={reduceMotion} phase="inhale" isActive={false} />

          <View style={[styles.safeArea, {
            paddingTop: insets.top + hp(2),
            paddingBottom: insets.bottom + hp(2),
            paddingLeft: insets.left + wp(6),
            paddingRight: insets.right + wp(6),
          }]}>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={handleGoBack}
                accessibilityLabel="Go back"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.backButton,
                  { width: touchTarget, height: touchTarget },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.backButtonInner}>
                  <Feather name="arrow-left" size={26} color={COLORS.textPrimary} />
                </View>
              </Pressable>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconWrapper}>
                <LinearGradient
                  colors={[COLORS.teal, COLORS.tealDark]}
                  style={styles.headerIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name="wind" size={36} color={COLORS.textOnColor} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Breathe</Text>
              <Text style={styles.subtitle}>Choose a breathing exercise</Text>
            </View>

            {/* Cards */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isTablet && styles.scrollContentTablet,
              ]}
              showsVerticalScrollIndicator={false}
            >
              {BREATHING_TYPES.map((type, index) => (
                <PremiumTypeCard
                  key={type.id}
                  type={type}
                  index={index}
                  isTablet={isTablet}
                  onSelect={() => handleSelectType(type)}
                />
              ))}

              {/* Tips section */}
              <View style={[styles.tipsSection, isTablet && styles.tipsSectionTablet]}>
                <View style={styles.tipsHeader}>
                  <Feather name="info" size={18} color={COLORS.textMuted} />
                  <Text style={styles.tipsTitle}>Tips for seniors</Text>
                </View>
                <Text style={styles.tipText}>
                  - Sit in a comfortable chair with feet flat on floor
                </Text>
                <Text style={styles.tipText}>
                  - Stop immediately if you feel dizzy or lightheaded
                </Text>
                <Text style={styles.tipText}>
                  - Practice regularly for best health benefits
                </Text>
              </View>
            </ScrollView>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ============================================================================
  // RENDER: BREATHING EXERCISE
  // ============================================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundStart} />
      <LinearGradient
        colors={[COLORS.backgroundStart, COLORS.backgroundMid, COLORS.backgroundEnd]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <AmbientParticles reduceMotion={reduceMotion} phase={phase} isActive={isActive} />

        <View style={[styles.safeArea, {
          paddingTop: insets.top + hp(2),
          paddingBottom: insets.bottom + hp(2),
          paddingLeft: insets.left + wp(4),
          paddingRight: insets.right + wp(4),
        }]}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={showCompletion ? handleDone : handleReset}
              accessibilityLabel={showCompletion ? 'Finish' : 'Go back'}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.backButton,
                { width: touchTarget, height: touchTarget },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.backButtonInner}>
                <Feather name="arrow-left" size={26} color={COLORS.textPrimary} />
              </View>
            </Pressable>

            {/* Progress indicator */}
            {!showCompletion && (
              <View style={styles.progressWrapper}>
                <ProgressTracker current={cycleCount} total={TARGET_CYCLES} phase={phase} />
              </View>
            )}
          </View>

          {/* Main content */}
          {showCompletion ? (
            <View style={styles.centerContent}>
              <CompletionScreen
                onAgain={handleAgain}
                onDone={handleDone}
                cycles={cycleCount}
                exerciseType={selectedType}
                totalTimeSeconds={totalTimeSeconds}
              />
            </View>
          ) : (
            <View style={styles.centerContent}>
              <MesmerizingBreathingCircle
                size={circleSize}
                isActive={isActive}
                scaleAnim={scaleAnim}
                phase={phase}
                count={count}
                totalDuration={getPhaseDuration(phase)}
                reduceMotion={reduceMotion}
                selectedType={selectedType}
              />

              {/* Instructions */}
              <View style={styles.instructions}>
                <Text style={styles.exerciseName}>{selectedType.name}</Text>
                <Text style={styles.instruction}>{getInstructionText()}</Text>
                {!isActive && (
                  <Text style={styles.safetyNote}>Stop if you feel dizzy</Text>
                )}
              </View>
            </View>
          )}

          {/* Control button */}
          {!showCompletion && (
            <View style={styles.controls}>
              {!isActive ? (
                <Pressable
                  onPress={handleStart}
                  accessibilityLabel="Begin breathing exercise"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { height: buttonHeight },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <LinearGradient
                    colors={[COLORS.orange, COLORS.orangeDark]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Feather name="play" size={26} color={COLORS.textOnColor} />
                    <Text style={styles.primaryButtonText}>Begin</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handlePause}
                  accessibilityLabel="Pause"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.pauseButton,
                    { height: buttonHeight },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather name="pause" size={26} color={COLORS.tealDark} />
                  <Text style={styles.pauseButtonText}>Pause</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Pause overlay */}
        <PauseOverlay
          visible={isPaused}
          onResume={handleResume}
          onStop={handleStop}
          cycleCount={cycleCount}
          totalCycles={TARGET_CYCLES}
        />
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
    backgroundColor: COLORS.backgroundStart,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSolid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  progressWrapper: {
    flex: 1,
    alignItems: 'flex-end',
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  headerIconWrapper: {
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: '300',
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: COLORS.textMuted,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scrollContentTablet: {
    paddingHorizontal: 60,
  },

  // Tips section
  tipsSection: {
    backgroundColor: COLORS.cardFrosted,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tipsSectionTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tipText: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginBottom: 6,
    lineHeight: 22,
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instructions
  instructions: {
    marginTop: 36,
    alignItems: 'center',
    maxWidth: 340,
    paddingHorizontal: 16,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  safetyNote: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Controls
  controls: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  primaryButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 48,
  },
  primaryButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textOnColor,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 48,
    borderRadius: 28,
    backgroundColor: COLORS.cardSolid,
    borderWidth: 2,
    borderColor: `${COLORS.teal}30`,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pauseButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.tealDark,
  },
});

export default TandyBreathingScreen;
