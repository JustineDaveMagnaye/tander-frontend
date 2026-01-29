/**
 * TANDER TandyBreathingScreen - Serene Breathing Experience
 * A calming, relaxing breathing exercise for Filipino seniors (60+)
 *
 * DESIGN PHILOSOPHY (Based on Calm/Headspace Research):
 * - Soft, muted colors that promote relaxation
 * - Avoid sharp lines - use rounded corners, circles, organic shapes
 * - Pulsing circle animation to guide breath rhythm
 * - Floating ambient particles for nature-like serenity
 * - Smooth, gentle animations that calm rather than excite
 *
 * COLOR PSYCHOLOGY:
 * - Deep blues/purples: Serenity, calm, restful sleep
 * - Soft teals: Trust, tranquility, emotional balance
 * - Warm accents: Comfort, safety (used sparingly)
 *
 * ACCESSIBILITY (Senior-Friendly):
 * - Touch targets: 56-64px minimum
 * - Font sizes: 18px+ body text, never below 14px
 * - High contrast: WCAG AA (4.5:1) minimum
 * - Full screen reader support
 *
 * Sources:
 * - https://www.purrweb.com/blog/designing-a-meditation-app-tips-step-by-step-guide/
 * - https://raw.studio/blog/how-headspace-designs-for-mindfulness/
 * - https://cieden.com/meditation-app
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '@shared/hooks/useResponsive';
import { colors } from '@shared/styles/colors';
import {
  PREMIUM_COLORS,
  AnimatedSpringButton,
  FloatingOrb,
} from '../components/PremiumComponents';

// ============================================================================
// SERENE COLOR PALETTE - Light Mode, Calming & Airy
// ============================================================================

const SERENE_COLORS = {
  // Light, airy gradient background - soft cream to warm white
  backgroundDeep: '#fefefe',      // Pure white
  backgroundMid: '#f8fafc',       // Off-white (slate-50)
  backgroundLight: '#f1f5f9',     // Light gray (slate-100)
  backgroundAccent: '#e0f2fe',    // Soft sky blue tint

  // Soft accent colors
  accentSoftTeal: '#14b8a6',      // Brand teal
  accentSoftPurple: '#a78bfa',    // Gentle lavender
  accentSoftBlue: '#0ea5e9',      // Sky blue
  accentWarmGlow: '#f97316',      // Brand orange

  // Breathing circle - soft, calming
  breatheCore: '#ffffff',         // Pure white center
  breatheInner: '#ccfbf1',        // Very light teal
  breatheOuter: '#5eead4',        // Soft teal
  breatheGlow: '#14b8a6',         // Brand teal glow

  // Card backgrounds - light, frosted glass effect
  cardDark: 'rgba(255, 255, 255, 0.9)',     // White with slight transparency
  cardMid: 'rgba(255, 255, 255, 0.95)',     // Almost solid white
  cardLight: 'rgba(248, 250, 252, 0.9)',    // Off-white

  // Text colors - dark for light mode (high contrast)
  textPrimary: '#1e293b',         // Dark slate (slate-800)
  textSecondary: '#334155',       // Medium slate (slate-700)
  textMuted: '#64748b',           // Muted slate (slate-500)
  textAccent: '#0d9488',          // Dark teal

  // Phase-specific colors - Orange & Teal brand theme
  inhaleColor: '#14b8a6',         // Brand teal - fresh, energizing
  holdColor: '#f97316',           // Brand orange - warmth, stillness
  exhaleColor: '#0d9488',         // Deep teal - release, peace

  // Button colors
  buttonPrimary: '#14b8a6',       // Teal (brand)
  buttonSecondary: '#94a3b8',     // Light slate
};

// Floating bubble colors - More transparent for light mode
const BUBBLE_COLORS = {
  // Teal variations (very soft, ethereal)
  tealLight: 'rgba(94, 234, 212, 0.06)',      // Very soft mint teal
  tealMid: 'rgba(20, 184, 166, 0.05)',        // Brand teal - subtle
  tealDark: 'rgba(13, 148, 136, 0.04)',       // Deep teal - barely visible

  // Orange variations (warm, very gentle)
  orangeLight: 'rgba(251, 146, 60, 0.05)',    // Very soft orange
  orangeMid: 'rgba(249, 115, 22, 0.04)',      // Brand orange - subtle
  orangeWarm: 'rgba(234, 88, 12, 0.03)',      // Deep orange - whisper

  // Mixed accent
  peach: 'rgba(253, 186, 116, 0.04)',         // Soft peach - barely there
  aqua: 'rgba(45, 212, 191, 0.05)',           // Aqua teal - subtle
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
  icon: keyof typeof Feather.glyphMap;
  phases: {
    inhale: number;
    hold: number;
    exhale: number;
    hold2?: number;
  };
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Senior-friendly breathing exercises based on medical research
// Sources: 24hrcares.com, secondwindmovement.com, eldergym.com
const BREATHING_TYPES: BreathingType[] = [
  {
    id: 'belly',
    name: 'Belly Breathing',
    description: 'Breathe deep into your belly',
    benefit: 'Relaxation',
    icon: 'wind',
    phases: { inhale: 4, hold: 0, exhale: 4 },
    color: '#14b8a6', // Brand teal
  },
  {
    id: 'pursed',
    name: 'Pursed Lip',
    description: 'Breathe out slowly like blowing a candle',
    benefit: 'Lung Health',
    icon: 'moon',
    phases: { inhale: 2, hold: 0, exhale: 4 },
    color: '#f97316', // Brand orange
  },
  {
    id: 'calm',
    name: 'Calming Breath',
    description: 'Slow and gentle for relaxation',
    benefit: 'Stress Relief',
    icon: 'sunrise',
    phases: { inhale: 3, hold: 0, exhale: 5 },
    color: '#5eead4', // Soft teal
  },
];

const TARGET_CYCLES = 5;

// ============================================================================
// RELAXING BUBBLE COMPONENT - Ultra-smooth, dreamy floating bubbles
// ============================================================================

interface RelaxingBubbleProps {
  delay: number;
  size: number;
  startX: number;
  startY: number;
  color: string;
  floatDistance: number;
  duration: number;
}

const RelaxingBubble: React.FC<RelaxingBubbleProps> = ({
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
  const scale = useRef(new Animated.Value(0.3)).current;
  const innerGlow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Very slow, gentle fade in (3 seconds)
    Animated.timing(opacity, {
      toValue: 1,
      duration: 3000,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Slow scale up with overshoot for organic feel (4 seconds)
    Animated.timing(scale, {
      toValue: 1,
      duration: 4000,
      delay,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();

    // Ultra-smooth vertical floating (very slow - 8-12 seconds per cycle)
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
          duration: duration * 0.8,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration * 0.6,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Gentle horizontal drift (even slower - 10-15 seconds per cycle)
    const floatX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: floatDistance * 0.4,
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -floatDistance * 0.3,
          duration: duration * 1.4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: duration * 0.8,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle inner glow pulsing (very slow breathing effect)
    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(innerGlow, {
          toValue: 0.8,
          duration: duration * 0.6,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(innerGlow, {
          toValue: 0.5,
          duration: duration * 0.6,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const floatTimer = setTimeout(() => {
      floatY.start();
      floatX.start();
      glowPulse.start();
    }, delay);

    return () => {
      clearTimeout(floatTimer);
      floatY.stop();
      floatX.stop();
      glowPulse.stop();
    };
  }, [delay, duration, floatDistance, opacity, scale, translateX, translateY, innerGlow]);

  return (
    <Animated.View
      style={[
        bubbleStyles.bubble,
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
    >
      {/* Inner glow effect */}
      <Animated.View
        style={[
          bubbleStyles.innerGlow,
          {
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: (size * 0.6) / 2,
            opacity: innerGlow,
          },
        ]}
      />
    </Animated.View>
  );
};

const bubbleStyles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerGlow: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
});

// ============================================================================
// RELAXING BUBBLES CONTAINER - Orange & Teal themed ambient bubbles
// ============================================================================

interface RelaxingBubblesProps {
  reduceMotion: boolean;
}

const RelaxingBubbles: React.FC<RelaxingBubblesProps> = ({ reduceMotion }) => {
  if (reduceMotion) return null;

  // More bubbles with much slower animations (8-15 second cycles)
  // Alternating between orange and teal for brand consistency
  const bubbles = useMemo(() => [
    // Large teal bubbles (background layer - very slow)
    { delay: 0, duration: 12000, size: 140, startX: 5, startY: 10, color: BUBBLE_COLORS.tealLight, floatDistance: 25 },
    { delay: 2000, duration: 14000, size: 160, startX: 75, startY: 5, color: BUBBLE_COLORS.tealMid, floatDistance: 20 },
    { delay: 4000, duration: 13000, size: 120, startX: 85, startY: 65, color: BUBBLE_COLORS.aqua, floatDistance: 22 },

    // Large orange bubbles (background layer - very slow)
    { delay: 1000, duration: 15000, size: 130, startX: 0, startY: 55, color: BUBBLE_COLORS.orangeLight, floatDistance: 18 },
    { delay: 3000, duration: 11000, size: 150, startX: 70, startY: 75, color: BUBBLE_COLORS.orangeMid, floatDistance: 24 },

    // Medium teal bubbles (mid layer)
    { delay: 500, duration: 10000, size: 90, startX: 20, startY: 25, color: BUBBLE_COLORS.tealDark, floatDistance: 30 },
    { delay: 2500, duration: 11000, size: 80, startX: 60, startY: 40, color: BUBBLE_COLORS.tealLight, floatDistance: 28 },
    { delay: 1500, duration: 9000, size: 100, startX: 40, startY: 85, color: BUBBLE_COLORS.aqua, floatDistance: 25 },

    // Medium orange bubbles (mid layer)
    { delay: 800, duration: 10500, size: 85, startX: 30, startY: 60, color: BUBBLE_COLORS.peach, floatDistance: 26 },
    { delay: 3500, duration: 12000, size: 95, startX: 55, startY: 15, color: BUBBLE_COLORS.orangeWarm, floatDistance: 22 },

    // Small accent bubbles (foreground - slightly faster but still slow)
    { delay: 1200, duration: 8000, size: 50, startX: 15, startY: 45, color: BUBBLE_COLORS.tealMid, floatDistance: 35 },
    { delay: 2200, duration: 8500, size: 45, startX: 80, startY: 30, color: BUBBLE_COLORS.orangeLight, floatDistance: 32 },
    { delay: 600, duration: 9500, size: 55, startX: 45, startY: 70, color: BUBBLE_COLORS.tealLight, floatDistance: 30 },
    { delay: 1800, duration: 8200, size: 40, startX: 90, startY: 50, color: BUBBLE_COLORS.peach, floatDistance: 28 },

    // Tiny sparkle bubbles (very subtle)
    { delay: 400, duration: 7500, size: 30, startX: 25, startY: 80, color: BUBBLE_COLORS.aqua, floatDistance: 20 },
    { delay: 2800, duration: 7000, size: 35, startX: 65, startY: 55, color: BUBBLE_COLORS.orangeMid, floatDistance: 18 },
  ], []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bubbles.map((bubble, index) => (
        <RelaxingBubble key={index} {...bubble} />
      ))}
    </View>
  );
};

// ============================================================================
// SERENE TYPE CARD - Soft, Rounded Design
// ============================================================================

interface TypeCardProps {
  type: BreathingType;
  onSelect: () => void;
  index: number;
}

const SereneTypeCard: React.FC<TypeCardProps> = ({ type, onSelect, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slower, more gentle entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800, // Slower fade
        delay: index * 200, // More stagger between cards
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900, // Slower slide
        delay: index * 200,
        easing: Easing.out(Easing.sin), // Sinusoidal for smooth feel
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98, // Subtler press effect
      useNativeDriver: true,
      tension: 80, // Softer spring
      friction: 12,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60, // Slower release
      friction: 10,
    }).start();
  };

  const getPatternText = () => {
    const { phases } = type;
    if (phases.hold2) return `${phases.inhale}-${phases.hold}-${phases.exhale}-${phases.hold2}`;
    if (phases.hold > 0) return `${phases.inhale}-${phases.hold}-${phases.exhale}`;
    return `${phases.inhale}-${phases.exhale}`;
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
        accessibilityLabel={`${type.name}. ${type.description}. ${type.benefit}. Pattern: ${getPatternText()} seconds.`}
        accessibilityRole="button"
        accessibilityHint="Double tap to select this breathing exercise"
      >
        <LinearGradient
          colors={[SERENE_COLORS.cardMid, SERENE_COLORS.cardDark]}
          style={cardStyles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Icon with soft glow */}
          <View style={[cardStyles.iconWrapper, { backgroundColor: `${type.color}20` }]}>
            <View style={[cardStyles.iconCircle, { backgroundColor: `${type.color}30` }]}>
              <Feather name={type.icon} size={28} color={type.color} />
            </View>
          </View>

          {/* Content */}
          <View style={cardStyles.content}>
            <Text style={cardStyles.cardTitle}>{type.name}</Text>
            <Text style={cardStyles.cardDescription}>{type.description}</Text>

            {/* Benefit badge */}
            <View style={[cardStyles.benefitBadge, { backgroundColor: `${type.color}15` }]}>
              <Feather name="heart" size={12} color={type.color} />
              <Text style={[cardStyles.benefitText, { color: type.color }]}>
                {type.benefit}
              </Text>
            </View>
          </View>

          {/* Pattern indicator */}
          <View style={cardStyles.patternContainer}>
            <Text style={cardStyles.patternLabel}>{getPatternText()}</Text>
            <Feather name="chevron-right" size={20} color={SERENE_COLORS.textMuted} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
    }),
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: SERENE_COLORS.textPrimary,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: SERENE_COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 22,
  },
  benefitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  patternContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  patternLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SERENE_COLORS.textAccent,
    marginBottom: 4,
    letterSpacing: 1,
  },
});

// ============================================================================
// SERENE BREATHING CIRCLE - Multi-Ring Pulsing Design
// ============================================================================

interface SerenBreathingCircleProps {
  size: number;
  isActive: boolean;
  scaleAnim: Animated.Value;
  phase: BreathingPhase;
  count: number;
  reduceMotion: boolean;
}

const SereneBreathingCircle: React.FC<SerenBreathingCircleProps> = ({
  size,
  isActive,
  scaleAnim,
  phase,
  count,
  reduceMotion,
}) => {
  // Multiple ring animations for ethereal effect
  const ring1Opacity = useRef(new Animated.Value(0.2)).current;
  const ring2Opacity = useRef(new Animated.Value(0.15)).current;
  const ring3Opacity = useRef(new Animated.Value(0.1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!isActive || reduceMotion) {
      ring1Opacity.setValue(0.15);
      ring2Opacity.setValue(0.12);
      ring3Opacity.setValue(0.08);
      ring1Scale.setValue(1);
      ring2Scale.setValue(1);
      ring3Scale.setValue(1);
      return;
    }

    // Ultra-smooth ring pulsing with sinusoidal easing (4-6 second cycles)
    // Creates a gentle, meditative ripple effect
    const ring1Anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Opacity, {
            toValue: 0.35,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ring1Scale, {
            toValue: 1.04,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ring1Opacity, {
            toValue: 0.15,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ring1Scale, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const ring2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(1200), // Longer stagger for smoother ripple
        Animated.parallel([
          Animated.timing(ring2Opacity, {
            toValue: 0.28,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ring2Scale, {
            toValue: 1.06,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ring2Opacity, {
            toValue: 0.12,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ring2Scale, {
            toValue: 1,
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const ring3Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(2400), // Even longer stagger
        Animated.parallel([
          Animated.timing(ring3Opacity, {
            toValue: 0.22,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ring3Scale, {
            toValue: 1.08,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ring3Opacity, {
            toValue: 0.08,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ring3Scale, {
            toValue: 1,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Very slow, gentle glow pulse (3.5 second cycle)
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.7,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.4,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    ring1Anim.start();
    ring2Anim.start();
    ring3Anim.start();
    glowAnim.start();

    return () => {
      ring1Anim.stop();
      ring2Anim.stop();
      ring3Anim.stop();
      glowAnim.stop();
    };
  }, [isActive, reduceMotion, ring1Opacity, ring2Opacity, ring3Opacity, ring1Scale, ring2Scale, ring3Scale, glowPulse]);

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return SERENE_COLORS.inhaleColor;
      case 'hold':
      case 'hold2': return SERENE_COLORS.holdColor;
      case 'exhale': return SERENE_COLORS.exhaleColor;
    }
  };

  const ring1Size = size + 40;
  const ring2Size = size + 80;
  const ring3Size = size + 120;

  return (
    <View style={breatheStyles.wrapper}>
      {/* Outermost ring */}
      {isActive && (
        <Animated.View
          renderToHardwareTextureAndroid={true}
          needsOffscreenAlphaCompositing={true}
          collapsable={false}
          style={[
            breatheStyles.ring,
            {
              width: ring3Size,
              height: ring3Size,
              borderRadius: ring3Size / 2,
              borderColor: getPhaseColor(),
              opacity: ring3Opacity,
              transform: [{ scale: ring3Scale }],
            },
          ]}
        />
      )}

      {/* Middle ring */}
      {isActive && (
        <Animated.View
          renderToHardwareTextureAndroid={true}
          needsOffscreenAlphaCompositing={true}
          collapsable={false}
          style={[
            breatheStyles.ring,
            {
              width: ring2Size,
              height: ring2Size,
              borderRadius: ring2Size / 2,
              borderColor: getPhaseColor(),
              opacity: ring2Opacity,
              transform: [{ scale: ring2Scale }],
            },
          ]}
        />
      )}

      {/* Inner ring */}
      {isActive && (
        <Animated.View
          renderToHardwareTextureAndroid={true}
          needsOffscreenAlphaCompositing={true}
          collapsable={false}
          style={[
            breatheStyles.ring,
            {
              width: ring1Size,
              height: ring1Size,
              borderRadius: ring1Size / 2,
              borderColor: getPhaseColor(),
              opacity: ring1Opacity,
              transform: [{ scale: ring1Scale }],
            },
          ]}
        />
      )}

      {/* Main breathing circle - optimized for smooth edges on Android */}
      <Animated.View
        renderToHardwareTextureAndroid={true}
        needsOffscreenAlphaCompositing={true}
        collapsable={false}
        style={[
          breatheStyles.mainCircleOuter,
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
              ? [getPhaseColor(), `${getPhaseColor()}DD`]
              : [SERENE_COLORS.cardMid, SERENE_COLORS.cardDark]
          }
          style={[
            breatheStyles.circleGradient,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          {/* Content displayed directly */}
          {isActive ? (
            <Text
              style={breatheStyles.countdownText}
              accessibilityLabel={`${count} seconds`}
              accessibilityRole="timer"
            >
              {count}
            </Text>
          ) : (
            <>
              <Feather name="wind" size={48} color={SERENE_COLORS.accentSoftTeal} />
              <Text style={breatheStyles.readyLabel}>Ready</Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Phase label - positioned below */}
      {isActive && (
        <View style={[breatheStyles.phaseContainer, { backgroundColor: `${getPhaseColor()}20` }]}>
          <Text style={[breatheStyles.phaseLabel, { color: getPhaseColor() }]}>
            {getPhaseText()}
          </Text>
        </View>
      )}
    </View>
  );
};

const breatheStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  mainCircleOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // These properties help smooth circle edges on Android
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: SERENE_COLORS.breatheGlow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  circleGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: '300',
    color: '#ffffff',  // White for visibility on colored gradient backgrounds
    letterSpacing: -2,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  readyLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0d9488',  // Teal-600 for visibility on light background
    marginTop: 12,
  },
  phaseContainer: {
    marginTop: 32,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  phaseLabel: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

// ============================================================================
// CYCLE PROGRESS - Soft Dots
// ============================================================================

interface CycleProgressProps {
  current: number;
  total: number;
}

const CycleProgress: React.FC<CycleProgressProps> = ({ current, total }) => {
  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.dotsRow}>
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            style={[
              progressStyles.dot,
              index < current && progressStyles.dotFilled,
            ]}
          />
        ))}
      </View>
      <Text style={progressStyles.label}>
        Breath {current} of {total}
      </Text>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: SERENE_COLORS.cardDark,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',  // Slate-400 for light mode
  },
  dotFilled: {
    backgroundColor: SERENE_COLORS.accentSoftTeal,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: SERENE_COLORS.textSecondary,
  },
});

// ============================================================================
// SERENE COMPLETION SCREEN
// ============================================================================

interface CompletionProps {
  onAgain: () => void;
  onDone: () => void;
  cycles: number;
}

const SereneCompletion: React.FC<CompletionProps> = ({ onAgain, onDone, cycles }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle, relaxing completion animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600, // Slower fade
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 30, // Softer spring
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 50, // Gentler bounce
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, checkAnim]);

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
      <LinearGradient
        colors={[SERENE_COLORS.cardMid, SERENE_COLORS.cardDark]}
        style={completionStyles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Success icon */}
        <Animated.View
          style={[
            completionStyles.checkCircle,
            { transform: [{ scale: checkAnim }] },
          ]}
        >
          <View style={completionStyles.checkGradient}>
            <Feather name="check" size={40} color="#fff" />
          </View>
        </Animated.View>

        <Text style={completionStyles.title}>Well Done!</Text>
        <Text style={completionStyles.subtitle}>
          You finished {cycles} breaths
        </Text>

        {/* Motivational message */}
        <View style={completionStyles.messageBox}>
          <Feather name="heart" size={18} color={SERENE_COLORS.accentWarmGlow} />
          <Text style={completionStyles.messageText}>
            Great for your lungs and heart!
          </Text>
        </View>

        {/* Buttons */}
        <View style={completionStyles.buttonRow}>
          <Pressable
            onPress={onAgain}
            accessibilityLabel="Practice again"
            accessibilityRole="button"
            style={({ pressed }) => [
              completionStyles.secondaryBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="refresh-cw" size={20} color="#0d9488" />
            <Text style={completionStyles.secondaryBtnText}>Again</Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            accessibilityLabel="Finish and return"
            accessibilityRole="button"
            style={({ pressed }) => [
              completionStyles.primaryBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={completionStyles.primaryBtnText}>Done</Text>
            <Feather name="check" size={20} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const completionStyles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 360,
  },
  card: {
    borderRadius: 32,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
    }),
  },
  checkCircle: {
    marginBottom: 24,
  },
  checkGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: SERENE_COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    color: SERENE_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 28,
    gap: 12,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ea580c',  // Orange-600 for better contrast on light mode
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
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.2)',
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0d9488',  // Teal-600 for better contrast on light mode
  },
  primaryBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F97316',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TandyBreathingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape } = useResponsive();

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

  // Circle size
  const circleSize = useMemo(() => {
    if (isLandscape) return Math.min(height * 0.45, 200);
    return Math.min(width * 0.55, height * 0.28, 220);
  }, [width, height, isLandscape]);

  // State
  const [selectedType, setSelectedType] = useState<BreathingType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [count, setCount] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  // Refs
  const countRef = useRef(4);
  const phaseRef = useRef<BreathingPhase>('inhale');
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  // Timer
  useEffect(() => {
    if (!isActive || !selectedType || isPaused) return;

    const timer = setInterval(() => {
      countRef.current -= 1;

      if (countRef.current <= 0) {
        const nextPhase = getNextPhase(phaseRef.current);

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

    return () => clearInterval(timer);
  }, [isActive, isPaused, selectedType, getNextPhase, getPhaseDuration, cycleCount]);

  // Breathing animation - follows the timer exactly
  // BIG circle = breathe in, SMALL circle = breathe out
  useEffect(() => {
    if (!isActive || isPaused || reduceMotion) return;

    // Get the duration for this phase in milliseconds
    const phaseDuration = getPhaseDuration(phase) * 1000;

    // Exaggerated scale values for very clear visual feedback
    // Inhale: circle grows BIG (1.35)
    // Exhale: circle shrinks SMALL (0.65)
    // Hold: stays at current size (no animation)
    let toValue: number;
    if (phase === 'inhale') {
      toValue = 1.35; // Big expansion
    } else if (phase === 'exhale') {
      toValue = 0.65; // Significant shrink
    } else {
      // Hold phases - don't animate, keep current size
      return;
    }

    Animated.timing(scaleAnim, {
      toValue,
      duration: phaseDuration, // Match the breathing timer exactly
      easing: Easing.inOut(Easing.sin), // Sinusoidal for natural breathing feel
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
    setPhase('inhale');
    setCount(selectedType.phases.inhale);
    setCycleCount(0);
    setShowCompletion(false);
    setIsPaused(false);
    // Start at small size so the first "breathe in" shows expansion
    scaleAnim.setValue(0.65);
    setIsActive(true);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
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

    // Specific instructions based on exercise type
    if (selectedType?.id === 'pursed') {
      // Pursed lip breathing - specific technique
      switch (phase) {
        case 'inhale': return 'Breathe in through your nose';
        case 'exhale': return 'Breathe out slowly, lips pursed';
        default: return '';
      }
    } else if (selectedType?.id === 'belly') {
      // Belly/diaphragmatic breathing
      switch (phase) {
        case 'inhale': return 'Breathe in, feel your belly rise';
        case 'exhale': return 'Breathe out, feel your belly fall';
        default: return '';
      }
    } else {
      // Default calming breath
      switch (phase) {
        case 'inhale': return 'Breathe in slowly';
        case 'exhale': return 'Breathe out gently';
        default: return '';
      }
    }
  };

  // ============================================================================
  // RENDER: TYPE SELECTION
  // ============================================================================

  if (!selectedType) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={SERENE_COLORS.backgroundDeep} />
        <LinearGradient
          colors={[
            SERENE_COLORS.backgroundDeep,
            SERENE_COLORS.backgroundMid,
            SERENE_COLORS.backgroundLight,
          ]}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          <RelaxingBubbles reduceMotion={reduceMotion} />

          <View style={[styles.safeArea, {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          }]}>
            {/* Back button */}
            <Pressable
              onPress={handleGoBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={styles.backButton}
            >
              <View style={styles.backButtonInner}>
                <Feather name="arrow-left" size={24} color={SERENE_COLORS.textPrimary} />
              </View>
            </Pressable>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconWrapper}>
                <Feather name="wind" size={36} color={SERENE_COLORS.accentSoftTeal} />
              </View>
              <Text style={styles.title}>Breathe</Text>
              <Text style={styles.subtitle}>Choose a breathing style</Text>
            </View>

            {/* Cards */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {BREATHING_TYPES.map((type, index) => (
                <SereneTypeCard
                  key={type.id}
                  type={type}
                  index={index}
                  onSelect={() => handleSelectType(type)}
                />
              ))}
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
      <StatusBar barStyle="dark-content" backgroundColor={SERENE_COLORS.backgroundDeep} />
      <LinearGradient
        colors={[
          SERENE_COLORS.backgroundDeep,
          SERENE_COLORS.backgroundMid,
          SERENE_COLORS.backgroundLight,
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <RelaxingBubbles reduceMotion={reduceMotion} />

        <View style={[styles.safeArea, {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        }]}>
          {/* Back button */}
          <Pressable
            onPress={showCompletion ? handleDone : handleReset}
            accessibilityLabel={showCompletion ? 'Finish' : 'Go back'}
            accessibilityRole="button"
            style={styles.backButton}
          >
            <View style={styles.backButtonInner}>
              <Feather name="arrow-left" size={24} color={SERENE_COLORS.textPrimary} />
            </View>
          </Pressable>

          {/* Progress indicator */}
          {!showCompletion && (
            <View style={styles.topRight}>
              <CycleProgress current={cycleCount} total={TARGET_CYCLES} />
            </View>
          )}

          {/* Main content */}
          {showCompletion ? (
            <View style={styles.centerContent}>
              <SereneCompletion
                onAgain={handleAgain}
                onDone={handleDone}
                cycles={cycleCount}
              />
            </View>
          ) : (
            <View style={styles.centerContent}>
              <SereneBreathingCircle
                size={circleSize}
                isActive={isActive}
                scaleAnim={scaleAnim}
                phase={phase}
                count={count}
                reduceMotion={reduceMotion}
              />

              {/* Instructions */}
              <View style={styles.instructions}>
                <Text style={styles.exerciseName}>{selectedType.name}</Text>
                <Text style={styles.instruction}>
                  {isPaused
                    ? 'Paused - tap Resume to continue'
                    : isActive
                      ? getInstructionText()
                      : 'Sit comfortably and relax'}
                </Text>
                {!isActive && (
                  <Text style={styles.safetyNote}>
                    Stop if you feel dizzy
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Control button */}
          {!showCompletion && (
            <View style={styles.controls}>
              {!isActive ? (
                // Begin button - orange (not started yet)
                <Pressable
                  onPress={handleStart}
                  accessibilityLabel="Begin breathing"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.orangeButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Feather name="play" size={24} color="#fff" />
                  <Text style={styles.orangeButtonText}>Begin</Text>
                </Pressable>
              ) : isPaused ? (
                // Resume button - teal (paused)
                <Pressable
                  onPress={handleResume}
                  accessibilityLabel="Resume breathing"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.tealButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Feather name="play" size={24} color="#fff" />
                  <Text style={styles.tealButtonText}>Resume</Text>
                </Pressable>
              ) : (
                // Pause button - white with teal text (running)
                <Pressable
                  onPress={handlePause}
                  accessibilityLabel="Pause"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.pauseButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Feather name="pause" size={24} color="#0d9488" />
                  <Text style={styles.pauseButtonText}>Pause</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
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
    backgroundColor: SERENE_COLORS.backgroundDeep,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Back button
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SERENE_COLORS.cardDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
  },

  // Top right position
  topRight: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  headerIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: SERENE_COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    color: SERENE_COLORS.textMuted,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instructions
  instructions: {
    marginTop: 40,
    alignItems: 'center',
    maxWidth: 320,
  },
  exerciseName: {
    fontSize: 32,
    fontWeight: '600',
    color: SERENE_COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 20,
    fontWeight: '500',
    color: SERENE_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 30,
  },
  safetyNote: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Controls
  controls: {
    marginTop: 24,
  },
  // Orange button (Begin)
  orangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 60,
    backgroundColor: '#F97316',
    ...Platform.select({
      ios: {
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
    }),
  },
  orangeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Teal button (Resume)
  tealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 60,
    backgroundColor: '#14B8A6',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
    }),
  },
  tealButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  // White button (Pause)
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 60,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  pauseButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0d9488',
  },
});

export default TandyBreathingScreen;
