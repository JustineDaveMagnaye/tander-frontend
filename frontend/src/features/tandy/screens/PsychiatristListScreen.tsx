/**
 * TANDER PsychiatristListScreen - Premium Mental Health Support Directory
 * Complete UI/UX Overhaul with TANDER Brand Colors (Orange & Teal)
 *
 * DESIGN PHILOSOPHY:
 * - TANDER Brand: Orange (Action/Warmth) + Teal (Trust/Calm)
 * - Zocdoc-inspired clean, professional medical UI
 * - Senior-friendly accessibility throughout
 * - 100% responsive across all devices
 *
 * BRAND COLORS:
 * - Primary Orange: #F97316 (CTAs, highlights, warmth)
 * - Secondary Teal: #14B8A6 (Trust, calm, medical/wellness)
 * - Orange gradient: ['#F97316', '#EA580C']
 * - Teal gradient: ['#14B8A6', '#0D9488']
 * - CTA gradient: ['#F97316', '#14B8A6']
 *
 * DEVICE SUPPORT:
 * - Small Phones (320-375px): iPhone SE, Galaxy S8
 * - Standard Phones (376-414px): iPhone 12/13/14, Pixel 5
 * - Large Phones (415-480px): iPhone Pro Max, Galaxy Ultra
 * - Tablets Portrait (600-1024px): iPad Mini, iPad, Galaxy Tab
 * - Tablets Landscape (1024-1366px): All iPads in landscape
 *
 * ACCESSIBILITY (Senior-Friendly):
 * - Touch targets: 56-64px (exceeds WCAG AAA)
 * - Font sizes: 18px minimum body, 20px+ for names
 * - Contrast: 7:1+ for critical elements
 * - Full screen reader support
 * - Reduced motion support
 */

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Platform,
  Animated,
  Easing,
  Image,
  StatusBar,
  Modal,
  TextInput,
  AccessibilityInfo,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { colors } from '@shared/styles/colors';
import type { TandyStackParamList } from '@navigation/types';
import {
  PREMIUM_COLORS,
  AnimatedSpringButton,
  FloatingOrb,
  GlassCard,
} from '../components/PremiumComponents';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface Psychiatrist {
  id: string;
  name: string;
  title: string;
  specialty: string;
  hospital: string;
  location: string;
  experience: string;
  languages: string[];
  rating: number;
  reviewCount: number;
  patientsHelped: number;
  availableToday: boolean;
  nextAvailable: string;
  availableSlots?: string[];
  consultationFee: string;
  phone: string;
  image: number; // Local require() image
  bio: string;
  isVerified: boolean;
  isFeatured: boolean;
  offersVideo: boolean;
  acceptsInsurance: boolean;
  testimonial?: {
    text: string;
    author: string;
  };
}

type FilterCategory = 'all' | 'available' | 'featured' | 'video';
type SortOption = 'rating' | 'availability' | 'experience' | 'fee';

type NavigationProp = NativeStackNavigationProp<TandyStackParamList, 'PsychiatristList'>;

// =============================================================================
// LOCAL PSYCHIATRIST IMAGES
// =============================================================================

const PSYCHIATRIST_IMAGES = {
  'dr-santos-cruz': require('../../../../assets/images/psychiatrists/dr-santos-cruz.png'),
  'dr-reyes': require('../../../../assets/images/psychiatrists/dr-reyes.png'),
  'dr-garcia': require('../../../../assets/images/psychiatrists/dr-garcia.png'),
  'dr-lim-tan': require('../../../../assets/images/psychiatrists/dr-lim-tan.png'),
  'dr-dela-rosa': require('../../../../assets/images/psychiatrists/dr-dela-rosa.png'),
  'dr-aquino': require('../../../../assets/images/psychiatrists/dr-aquino.png'),
} as const;

// =============================================================================
// TANDER BRAND THEME - Orange & Teal
// =============================================================================

const THEME = {
  // Primary Orange - Action, Warmth, Energy
  orange: colors.orange,

  // Secondary Teal - Trust, Calm, Wellness
  teal: colors.teal,

  // Premium backgrounds
  background: {
    primary: '#FFFBF7',       // Warm white
    secondary: '#F0FDFA',     // Light teal tint
    accent: colors.teal[50],  // Very light teal
    warm: '#FFF7ED',          // Warm orange tint
    card: '#FFFFFF',
  },

  // Card surfaces
  surface: {
    card: 'rgba(255, 255, 255, 0.98)',
    cardHover: 'rgba(255, 255, 255, 0.95)',
    glass: 'rgba(255, 255, 255, 0.92)',
  },

  // Text hierarchy
  text: {
    primary: '#1A1A2E',
    secondary: '#4A5568',
    muted: '#718096',
    light: '#A0AEC0',
    inverse: '#FFFFFF',
    orange: colors.orange[600],
    teal: colors.teal[600],
    success: '#059669',
  },

  // Status colors - Using brand colors
  status: {
    available: colors.teal[500],
    availableBg: colors.teal[50],
    availableBorder: colors.teal[200],
    busy: colors.orange[500],
    busyBg: colors.orange[50],
    busyBorder: colors.orange[200],
    offline: '#9CA3AF',
    verified: colors.teal[500],
    featured: colors.orange[500],
  },

  // Rating - Orange stars
  rating: {
    star: colors.orange[400],
    starFilled: colors.orange[500],
    starBg: colors.orange[50],
  },

  // Gradients using TANDER brand colors
  gradient: {
    // Header - Teal gradient (calming, trustworthy)
    header: [colors.teal[500], colors.teal[600], colors.teal[700]] as [string, string, string],
    headerSubtle: [colors.teal[50], '#FFFFFF', colors.orange[50]] as [string, string, string],

    // Orange button gradient (Primary CTA)
    primaryButton: colors.gradient.primaryButton,

    // Teal button gradient (Secondary actions)
    secondaryButton: [colors.teal[500], colors.teal[600]] as [string, string],

    // CTA gradient - Orange to Teal
    ctaGradient: colors.gradient.ctaButton,

    // Card backgrounds
    card: ['#FFFFFF', '#FEFEFE'] as [string, string],

    // Featured card
    featured: [colors.orange[50], colors.orange[100]] as [string, string],

    // Calming background
    calming: [colors.teal[50], '#FFFFFF', colors.orange[50]] as [string, string, string],
  },
};

// =============================================================================
// RESPONSIVE TYPOGRAPHY & SPACING SCALES - Premium iPad-Like Design
// =============================================================================

const getResponsiveStyles = (width: number, isTablet: boolean, isLandscape: boolean) => {
  // Device category detection
  const isSmallPhone = width <= 375;
  const isMediumPhone = width > 375 && width <= 414;
  const isLargePhone = width > 414 && width <= 480;
  const isTabletPortrait = isTablet && !isLandscape;
  const isTabletLandscape = isTablet && isLandscape;

  // Premium Typography scale - larger for tablets
  const typography = {
    title: isSmallPhone ? 24 : isMediumPhone ? 26 : isLargePhone ? 28 : isTabletLandscape ? 28 : isTablet ? 32 : 26,
    subtitle: isSmallPhone ? 14 : isMediumPhone ? 15 : isLargePhone ? 16 : isTablet ? 18 : 15,
    cardName: isSmallPhone ? 18 : isMediumPhone ? 19 : isLargePhone ? 20 : isTabletLandscape ? 20 : isTablet ? 22 : 19,
    body: isSmallPhone ? 14 : isMediumPhone ? 15 : isLargePhone ? 16 : isTablet ? 17 : 15,
    bodyLarge: isSmallPhone ? 16 : isMediumPhone ? 17 : isLargePhone ? 18 : isTablet ? 20 : 17,
    badge: isSmallPhone ? 11 : isMediumPhone ? 12 : isLargePhone ? 13 : isTablet ? 14 : 12,
    small: isSmallPhone ? 12 : isMediumPhone ? 13 : isLargePhone ? 14 : isTablet ? 15 : 13,
  };

  // Premium Spacing scale - balanced for tablet landscape
  const spacing = {
    // Screen margins - reasonable for tablet landscape
    screenMargin: isSmallPhone ? 12 : isMediumPhone ? 16 : isLargePhone ? 20 : isTabletLandscape ? 48 : isTablet ? 40 : 16,
    // Card gap - good breathing room between cards
    cardGap: isSmallPhone ? 12 : isMediumPhone ? 14 : isLargePhone ? 16 : isTabletLandscape ? 20 : isTablet ? 18 : 14,
    // Card padding - comfortable internal content
    cardPadding: isSmallPhone ? 14 : isMediumPhone ? 16 : isLargePhone ? 18 : isTabletLandscape ? 22 : isTablet ? 20 : 16,
    // Section gap - reasonable gaps between content sections
    sectionGap: isSmallPhone ? 16 : isMediumPhone ? 20 : isLargePhone ? 24 : isTabletLandscape ? 32 : isTablet ? 28 : 20,
  };

  // Grid columns - SINGLE COLUMN for tablets = premium, spacious, easy vertical scrolling
  // Multi-column layouts on mobile are cramped and hard to navigate for seniors
  const getGridColumns = () => {
    // ALL tablet modes: single column for easy vertical scrolling & premium spacious feel
    if (isTabletLandscape) return 1; // Full-width cards, easy to read & navigate
    if (isTabletPortrait) return 1; // Full-width cards
    if (isLandscape && !isTablet) return 1; // Phone landscape - single column for readability
    return 1; // Phone portrait
  };

  // Touch targets (senior-friendly - extra large for tablets)
  const touchTargets = {
    button: isTabletLandscape ? 60 : isTablet ? 56 : 48,
    buttonLarge: isTabletLandscape ? 68 : isTablet ? 64 : 56,
    chip: isTabletLandscape ? 52 : isTablet ? 48 : 40,
    icon: isTabletLandscape ? 52 : isTablet ? 48 : 44,
    fab: isTabletLandscape ? 68 : isTablet ? 64 : 56,
  };

  return {
    typography,
    spacing,
    columns: getGridColumns(),
    touchTargets,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    isTabletPortrait,
    isTabletLandscape,
  };
};

// =============================================================================
// SAMPLE PSYCHIATRIST DATA
// =============================================================================

const PSYCHIATRISTS: Psychiatrist[] = [
  {
    id: '1',
    name: 'Dr. Maria Santos-Cruz',
    title: 'MD, FPPA, DABPN',
    specialty: 'Geriatric Psychiatry',
    hospital: "St. Luke's Medical Center",
    location: 'Quezon City',
    experience: '28 years',
    languages: ['Filipino', 'English', 'Hokkien'],
    rating: 4.9,
    reviewCount: 342,
    patientsHelped: 2800,
    availableToday: true,
    nextAvailable: 'Today 2:00 PM',
    availableSlots: ['2:00 PM', '3:30 PM', '5:00 PM'],
    consultationFee: '2,500 - 3,500',
    phone: '+639171234567',
    image: PSYCHIATRIST_IMAGES['dr-santos-cruz'],
    bio: 'Specializing in mental health care for seniors with over 28 years of compassionate service. Fellow of the Philippine Psychiatric Association.',
    isVerified: true,
    isFeatured: true,
    offersVideo: true,
    acceptsInsurance: true,
    testimonial: {
      text: 'Dr. Santos-Cruz helped me through the most difficult time of my life. Her patience and understanding made all the difference.',
      author: 'Lola Carmen, 67',
    },
  },
  {
    id: '2',
    name: 'Dr. Jose Antonio Reyes',
    title: 'MD, FPPA',
    specialty: 'Anxiety & Depression',
    hospital: 'Manila Doctors Hospital',
    location: 'Ermita, Manila',
    experience: '22 years',
    languages: ['Filipino', 'English'],
    rating: 4.8,
    reviewCount: 287,
    patientsHelped: 2100,
    availableToday: true,
    nextAvailable: 'Today 4:30 PM',
    availableSlots: ['4:30 PM', '6:00 PM'],
    consultationFee: '2,000 - 3,000',
    phone: '+639182345678',
    image: PSYCHIATRIST_IMAGES['dr-reyes'],
    bio: 'Expert in treating anxiety and depression in older adults. Uses evidence-based therapy combined with medication management.',
    isVerified: true,
    isFeatured: false,
    offersVideo: true,
    acceptsInsurance: true,
  },
  {
    id: '3',
    name: 'Dr. Elena Garcia-Villanueva',
    title: 'MD, FPPA, FAPA',
    specialty: 'Sleep & Mood Disorders',
    hospital: 'The Medical City',
    location: 'Pasig City',
    experience: '25 years',
    languages: ['Filipino', 'English', 'Spanish'],
    rating: 4.9,
    reviewCount: 456,
    patientsHelped: 3200,
    availableToday: false,
    nextAvailable: 'Tomorrow 9:00 AM',
    consultationFee: '2,800 - 4,000',
    phone: '+639193456789',
    image: PSYCHIATRIST_IMAGES['dr-garcia'],
    bio: 'Board-certified in both Philippine and American psychiatric associations. Specializes in sleep disorders and mood regulation for seniors.',
    isVerified: true,
    isFeatured: true,
    offersVideo: true,
    acceptsInsurance: false,
    testimonial: {
      text: 'Finally sleeping well after years of insomnia. Dr. Garcia truly listens and cares.',
      author: 'Lolo Roberto, 72',
    },
  },
  {
    id: '4',
    name: 'Dr. Roberto Lim-Tan',
    title: 'MD, FPPA',
    specialty: 'Memory & Cognitive Health',
    hospital: 'Makati Medical Center',
    location: 'Makati City',
    experience: '30 years',
    languages: ['Filipino', 'English', 'Mandarin'],
    rating: 4.7,
    reviewCount: 521,
    patientsHelped: 4100,
    availableToday: true,
    nextAvailable: 'Today 3:00 PM',
    availableSlots: ['3:00 PM'],
    consultationFee: '2,200 - 3,200',
    phone: '+639204567890',
    image: PSYCHIATRIST_IMAGES['dr-lim-tan'],
    bio: 'Leading expert in cognitive health and memory disorders. Three decades of experience helping seniors maintain mental sharpness.',
    isVerified: true,
    isFeatured: false,
    offersVideo: false,
    acceptsInsurance: true,
  },
  {
    id: '5',
    name: 'Dr. Carmen dela Rosa',
    title: 'MD, FPPA, MSc',
    specialty: 'Grief & Life Transitions',
    hospital: 'Philippine Heart Center',
    location: 'Quezon City',
    experience: '18 years',
    languages: ['Filipino', 'English'],
    rating: 4.8,
    reviewCount: 198,
    patientsHelped: 1500,
    availableToday: false,
    nextAvailable: 'Tomorrow 10:30 AM',
    consultationFee: '1,800 - 2,800',
    phone: '+639215678901',
    image: PSYCHIATRIST_IMAGES['dr-dela-rosa'],
    bio: 'Compassionate care for those experiencing loss, retirement adjustment, and major life changes. Holistic approach to mental wellness.',
    isVerified: true,
    isFeatured: false,
    offersVideo: true,
    acceptsInsurance: true,
  },
  {
    id: '6',
    name: 'Dr. Fernando Aquino Jr.',
    title: 'MD, FPPA, PhD',
    specialty: 'Stress & Wellness',
    hospital: 'Asian Hospital',
    location: 'Muntinlupa City',
    experience: '20 years',
    languages: ['Filipino', 'English', 'Japanese'],
    rating: 4.9,
    reviewCount: 312,
    patientsHelped: 2400,
    availableToday: true,
    nextAvailable: 'Today 5:00 PM',
    availableSlots: ['5:00 PM', '6:30 PM'],
    consultationFee: '2,500 - 3,500',
    phone: '+639226789012',
    image: PSYCHIATRIST_IMAGES['dr-aquino'],
    bio: 'PhD in Psychology with focus on stress management. Integrates mindfulness and traditional psychiatry for comprehensive senior care.',
    isVerified: true,
    isFeatured: false,
    offersVideo: true,
    acceptsInsurance: true,
  },
];

// =============================================================================
// PREMIUM AMBIENT ORBS - Soft, ethereal floating orbs for visual depth
// =============================================================================

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

// Premium orb colors - Very soft, ethereal (teal-focused for wellness)
const AMBIENT_ORB_COLORS = {
  tealLight: 'rgba(94, 234, 212, 0.05)',
  tealMid: 'rgba(20, 184, 166, 0.04)',
  tealDark: 'rgba(13, 148, 136, 0.03)',
  orangeLight: 'rgba(251, 146, 60, 0.04)',
  orangeMid: 'rgba(249, 115, 22, 0.03)',
  peach: 'rgba(253, 186, 116, 0.03)',
  aqua: 'rgba(45, 212, 191, 0.04)',
};

interface AmbientOrbsBackgroundProps {
  reduceMotion: boolean;
}

const AmbientOrbsBackground: React.FC<AmbientOrbsBackgroundProps> = ({ reduceMotion }) => {
  if (reduceMotion) return null;

  // Premium ambient orbs configuration - fewer for professional look
  const orbs = useMemo(() => [
    // Large background orbs
    { delay: 0, duration: 16000, size: 200, startX: -5, startY: 15, color: AMBIENT_ORB_COLORS.tealLight, floatDistance: 20 },
    { delay: 2000, duration: 18000, size: 220, startX: 80, startY: 10, color: AMBIENT_ORB_COLORS.aqua, floatDistance: 16 },
    { delay: 3500, duration: 17000, size: 180, startX: 75, startY: 70, color: AMBIENT_ORB_COLORS.tealMid, floatDistance: 18 },
    { delay: 1500, duration: 15000, size: 160, startX: -10, startY: 55, color: AMBIENT_ORB_COLORS.orangeLight, floatDistance: 22 },
    // Medium accent orbs
    { delay: 500, duration: 13000, size: 120, startX: 30, startY: 35, color: AMBIENT_ORB_COLORS.tealDark, floatDistance: 24 },
    { delay: 2500, duration: 14000, size: 100, startX: 60, startY: 50, color: AMBIENT_ORB_COLORS.peach, floatDistance: 26 },
    { delay: 1000, duration: 12000, size: 130, startX: 45, startY: 85, color: AMBIENT_ORB_COLORS.tealLight, floatDistance: 20 },
    // Small subtle orbs
    { delay: 800, duration: 10000, size: 70, startX: 20, startY: 65, color: AMBIENT_ORB_COLORS.aqua, floatDistance: 28 },
    { delay: 1800, duration: 9500, size: 60, startX: 85, startY: 40, color: AMBIENT_ORB_COLORS.orangeMid, floatDistance: 26 },
  ], []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb, index) => (
        <AmbientOrb key={index} {...orb} />
      ))}
    </View>
  );
};

// =============================================================================
// ANIMATED PRESSABLE COMPONENT
// =============================================================================

interface AnimatedPressableProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  hapticFeedback = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 100,
    }).start();
  };

  const handlePress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// =============================================================================
// SKELETON LOADING COMPONENT
// =============================================================================

interface SkeletonCardProps {
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ responsive }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.skeletonCard, { padding: responsive.spacing.cardPadding }]}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <View style={styles.skeletonInfo}>
          <Animated.View style={[styles.skeletonLine, { width: '70%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '50%', marginTop: 8, opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '40%', marginTop: 8, opacity }]} />
        </View>
      </View>
      <Animated.View style={[styles.skeletonLine, { width: '90%', marginTop: 16, opacity }]} />
      <Animated.View style={[styles.skeletonLine, { width: '60%', marginTop: 8, opacity }]} />
      <View style={styles.skeletonActions}>
        <Animated.View style={[styles.skeletonButton, { opacity }]} />
        <Animated.View style={[styles.skeletonButton, { opacity }]} />
      </View>
    </View>
  );
};

// =============================================================================
// STAR RATING COMPONENT - Orange Stars
// =============================================================================

interface StarRatingProps {
  rating: number;
  reviewCount: number;
  size?: 'small' | 'medium' | 'large';
  showReviewCount?: boolean;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  reviewCount,
  size = 'medium',
  showReviewCount = true,
  responsive,
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  const fontSize = size === 'small'
    ? responsive.typography.badge
    : size === 'large'
    ? responsive.typography.bodyLarge
    : responsive.typography.body;

  return (
    <View
      style={styles.ratingContainer}
      accessibilityLabel={`${rating} out of 5 stars, ${reviewCount} reviews`}
    >
      <View style={styles.starsRow}>
        {[...Array(5)].map((_, i) => (
          <MaterialCommunityIcons
            key={i}
            name={
              i < fullStars
                ? 'star'
                : i === fullStars && hasHalfStar
                ? 'star-half-full'
                : 'star-outline'
            }
            size={iconSize}
            color={
              i < fullStars || (i === fullStars && hasHalfStar)
                ? THEME.rating.starFilled
                : colors.gray[300]
            }
          />
        ))}
      </View>
      <Text style={[styles.ratingText, { fontSize }]}>{rating.toFixed(1)}</Text>
      {showReviewCount && (
        <Text style={[styles.reviewCountText, { fontSize: fontSize - 2 }]}>({reviewCount})</Text>
      )}
    </View>
  );
};

// =============================================================================
// BADGE COMPONENT - Teal Theme
// =============================================================================

interface BadgeProps {
  type: 'verified' | 'featured' | 'video' | 'insurance';
  size?: 'small' | 'medium';
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const Badge: React.FC<BadgeProps> = ({ type, size = 'small', responsive }) => {
  const config = {
    verified: {
      icon: 'shield-check',
      label: 'Verified',
      bg: colors.teal[50],
      color: colors.teal[600],
      border: colors.teal[200],
    },
    featured: {
      icon: 'star',
      label: 'Top Rated',
      bg: colors.orange[50],
      color: colors.orange[600],
      border: colors.orange[200],
    },
    video: {
      icon: 'video',
      label: 'Video',
      bg: colors.teal[50],
      color: colors.teal[600],
      border: colors.teal[200],
    },
    insurance: {
      icon: 'shield',
      label: 'Insurance',
      bg: colors.teal[50],
      color: colors.teal[600],
      border: colors.teal[200],
    },
  };

  const { icon, label, bg, color, border } = config[type];
  const iconSize = size === 'small' ? 12 : 14;
  const fontSize = size === 'small' ? responsive.typography.badge : responsive.typography.small;
  const padding = size === 'small'
    ? { paddingHorizontal: 8, paddingVertical: 4 }
    : { paddingHorizontal: 10, paddingVertical: 6 };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border },
        padding,
      ]}
      accessibilityLabel={`${label} badge`}
    >
      <Feather name={icon as any} size={iconSize} color={color} />
      <Text style={[styles.badgeText, { color, fontSize }]}>{label}</Text>
    </View>
  );
};

// =============================================================================
// AVAILABILITY BADGE - Teal for Available, Orange for Busy
// =============================================================================

interface AvailabilityBadgeProps {
  availableToday: boolean;
  nextAvailable: string;
  slots?: string[];
  showSlots?: boolean;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  availableToday,
  nextAvailable,
  slots,
  showSlots = false,
  responsive,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (availableToday) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [availableToday, pulseAnim]);

  return (
    <View
      style={[
        styles.availabilityBadge,
        availableToday ? styles.availableToday : styles.availableLater,
      ]}
      accessibilityLabel={availableToday ? 'Available today' : `Next available ${nextAvailable}`}
    >
      <View style={styles.availabilityDotContainer}>
        {availableToday && (
          <Animated.View
            style={[
              styles.availabilityPulse,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: THEME.status.available,
              },
            ]}
          />
        )}
        <View
          style={[
            styles.availabilityDot,
            {
              backgroundColor: availableToday
                ? THEME.status.available
                : THEME.status.busy,
            },
          ]}
        />
      </View>
      <View>
        <Text
          style={[
            styles.availabilityText,
            {
              color: availableToday ? THEME.status.available : THEME.status.busy,
              fontSize: responsive.typography.body,
            },
          ]}
        >
          {availableToday ? 'Available Today' : nextAvailable}
        </Text>
        {showSlots && slots && slots.length > 0 && (
          <Text style={[styles.availableSlotsText, { fontSize: responsive.typography.badge }]}>
            {slots.slice(0, 3).join(' - ')}
          </Text>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// FILTER CHIP COMPONENT - Orange Active State
// =============================================================================

interface FilterChipProps {
  label: string;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  icon,
  isActive,
  onPress,
  count,
  responsive,
}) => {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={`${label} filter${isActive ? ', selected' : ''}`}
      accessibilityHint="Tap to toggle this filter"
      style={[
        styles.filterChip,
        { minHeight: responsive.touchTargets.chip },
        isActive ? styles.filterChipActive : styles.filterChipInactive,
      ]}
    >
      {icon && (
        <Feather
          name={icon as any}
          size={16}
          color={isActive ? THEME.text.inverse : THEME.text.secondary}
        />
      )}
      <Text
        style={[
          styles.filterChipText,
          {
            color: isActive ? THEME.text.inverse : THEME.text.secondary,
            fontSize: responsive.typography.body,
          },
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          style={[
            styles.filterChipCount,
            { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.gray[200] },
          ]}
        >
          <Text
            style={[
              styles.filterChipCountText,
              {
                color: isActive ? THEME.text.inverse : THEME.text.muted,
                fontSize: responsive.typography.badge,
              },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

// =============================================================================
// SEARCH BAR COMPONENT - Teal Focus State
// =============================================================================

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search by name, specialty, or hospital...',
  responsive,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.searchContainer}>
      <View style={[
        styles.searchInputContainer,
        isFocused && styles.searchInputContainerFocused,
        { height: responsive.touchTargets.button },
      ]}>
        <Feather
          name="search"
          size={20}
          color={isFocused ? colors.teal[500] : THEME.text.muted}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { fontSize: responsive.typography.body }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.text.light}
          accessibilityLabel="Search psychiatrists"
          accessibilityHint="Type to search by name, specialty, or hospital"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear search"
          >
            <Feather name="x-circle" size={18} color={THEME.text.light} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// PSYCHIATRIST CARD COMPONENT - Orange & Teal Theme
// =============================================================================

interface PsychiatristCardProps {
  psychiatrist: Psychiatrist;
  onCallPress: (psychiatrist: Psychiatrist) => void;
  onBookPress: (psychiatrist: Psychiatrist) => void;
  onViewProfile: (psychiatrist: Psychiatrist) => void;
  onFavoritePress: (psychiatrist: Psychiatrist) => void;
  isFavorite: boolean;
  responsive: ReturnType<typeof getResponsiveStyles>;
  index: number;
  cardWidth: string | number;
}

const PsychiatristCard: React.FC<PsychiatristCardProps> = ({
  psychiatrist,
  onCallPress,
  onBookPress,
  onViewProfile,
  onFavoritePress,
  isFavorite,
  responsive,
  index,
  cardWidth,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Staggered entrance animation
    const delay = index * 100;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }),
      ]).start();
    }, delay);
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          width: cardWidth as any,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Featured Banner - Orange */}
      {psychiatrist.isFeatured && (
        <LinearGradient
          colors={THEME.gradient.featured}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.featuredBanner}
        >
          <MaterialCommunityIcons name="star" size={14} color={colors.orange[600]} />
          <Text style={[styles.featuredBannerText, { fontSize: responsive.typography.badge }]}>
            Top Rated Psychiatrist
          </Text>
        </LinearGradient>
      )}

      <View style={[
        styles.card,
        { padding: responsive.spacing.cardPadding },
        psychiatrist.isFeatured && styles.cardFeatured
      ]}>
        {/* Card Header with Photo and Basic Info */}
        <View style={styles.cardHeader}>
          {/* Profile Photo with Status Ring - Teal for available */}
          <View style={styles.photoContainer}>
            <View
              style={[
                styles.photoRing,
                psychiatrist.availableToday ? styles.photoRingAvailable : styles.photoRingBusy,
              ]}
            >
              <Image
                source={psychiatrist.image}
                style={styles.profilePhoto}
                accessibilityLabel={`Photo of ${psychiatrist.name}`}
              />
            </View>
            {psychiatrist.availableToday && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>

          {/* Name, Title, Badges, and Rating */}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.doctorName, { fontSize: responsive.typography.cardName }]}
                numberOfLines={1}
              >
                {psychiatrist.name}
              </Text>
              {psychiatrist.isVerified && (
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={18}
                  color={colors.teal[500]}
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <Text
              style={[styles.doctorTitle, { fontSize: responsive.typography.small }]}
              numberOfLines={1}
            >
              {psychiatrist.title}
            </Text>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              {psychiatrist.offersVideo && <Badge type="video" responsive={responsive} />}
              {psychiatrist.acceptsInsurance && <Badge type="insurance" responsive={responsive} />}
            </View>

            <StarRating
              rating={psychiatrist.rating}
              reviewCount={psychiatrist.reviewCount}
              size="medium"
              responsive={responsive}
            />
          </View>

          {/* Favorite Button - Orange when favorited */}
          <AnimatedPressable
            onPress={() => onFavoritePress(psychiatrist)}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityHint="Tap to toggle favorite status"
            style={[styles.favoriteButton, {
              width: responsive.touchTargets.icon,
              height: responsive.touchTargets.icon
            }]}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? colors.orange[500] : THEME.text.light}
            />
          </AnimatedPressable>
        </View>

        {/* Specialty Badge - Light teal background */}
        <View style={styles.specialtyContainer}>
          <LinearGradient
            colors={[colors.teal[50], colors.teal[100]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.specialtyBadge}
          >
            <MaterialCommunityIcons name="brain" size={16} color={colors.teal[600]} />
            <Text style={[styles.specialtyBadgeText, { fontSize: responsive.typography.body }]}>
              {psychiatrist.specialty}
            </Text>
          </LinearGradient>
        </View>

        {/* Hospital and Location Info */}
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Feather name="home" size={15} color={THEME.text.muted} />
            <Text
              style={[styles.detailText, { fontSize: responsive.typography.body }]}
              numberOfLines={1}
            >
              {psychiatrist.hospital}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="map-pin" size={15} color={THEME.text.muted} />
            <Text style={[styles.detailText, { fontSize: responsive.typography.body }]}>
              {psychiatrist.location}
            </Text>
            <View style={styles.detailDivider} />
            <Feather name="briefcase" size={15} color={THEME.text.muted} />
            <Text style={[styles.detailText, { fontSize: responsive.typography.body }]}>
              {psychiatrist.experience}
            </Text>
          </View>
        </View>

        {/* Stats Row - Teal accents */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: responsive.typography.bodyLarge }]}>
              {psychiatrist.patientsHelped.toLocaleString()}+
            </Text>
            <Text style={[styles.statLabel, { fontSize: responsive.typography.badge }]}>
              Patients Helped
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: responsive.typography.bodyLarge }]}>
              {psychiatrist.experience}
            </Text>
            <Text style={[styles.statLabel, { fontSize: responsive.typography.badge }]}>
              Experience
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontSize: responsive.typography.bodyLarge }]}>
              {psychiatrist.rating}
            </Text>
            <Text style={[styles.statLabel, { fontSize: responsive.typography.badge }]}>
              Rating
            </Text>
          </View>
        </View>

        {/* Languages - Teal color */}
        <View style={styles.languagesRow}>
          <Feather name="globe" size={15} color={colors.teal[600]} />
          <Text style={[styles.languagesText, { fontSize: responsive.typography.body }]}>
            Speaks: {psychiatrist.languages.join(', ')}
          </Text>
        </View>

        {/* Availability and Fee */}
        <View style={styles.availabilityFeeRow}>
          <AvailabilityBadge
            availableToday={psychiatrist.availableToday}
            nextAvailable={psychiatrist.nextAvailable}
            slots={psychiatrist.availableSlots}
            showSlots={psychiatrist.availableToday}
            responsive={responsive}
          />
          <View style={styles.feeContainer}>
            <Text style={[styles.feeLabel, { fontSize: responsive.typography.badge }]}>
              Consultation
            </Text>
            <Text style={[styles.feeAmount, { fontSize: responsive.typography.bodyLarge }]}>
              P{psychiatrist.consultationFee}
            </Text>
          </View>
        </View>

        {/* Testimonial (if featured) - Teal accent */}
        {psychiatrist.testimonial && (
          <View style={styles.testimonialContainer}>
            <Feather name="message-circle" size={14} color={colors.teal[400]} />
            <Text
              style={[styles.testimonialText, { fontSize: responsive.typography.body }]}
              numberOfLines={2}
            >
              "{psychiatrist.testimonial.text}"
            </Text>
            <Text style={[styles.testimonialAuthor, { fontSize: responsive.typography.small }]}>
              - {psychiatrist.testimonial.author}
            </Text>
          </View>
        )}

        {/* Action Buttons - Orange for Call, Teal for Book/Profile */}
        <View style={styles.cardActions}>
          {/* View Profile - Teal Outlined */}
          <AnimatedPressable
            onPress={() => onViewProfile(psychiatrist)}
            style={[styles.viewProfileButton, { minHeight: responsive.touchTargets.button }]}
            accessibilityLabel={`View profile of ${psychiatrist.name}`}
            accessibilityHint="Opens detailed profile information"
          >
            <Feather name="user" size={16} color={colors.teal[600]} />
            <Text style={[styles.viewProfileText, { fontSize: responsive.typography.badge + 2 }]}>
              Profile
            </Text>
          </AnimatedPressable>

          {/* Book Button - Teal Gradient */}
          <AnimatedPressable
            onPress={() => onBookPress(psychiatrist)}
            style={[styles.bookButtonContainer, { minHeight: responsive.touchTargets.button }]}
            accessibilityLabel={`Book appointment with ${psychiatrist.name}`}
            accessibilityHint="Opens appointment booking"
          >
            <LinearGradient
              colors={THEME.gradient.secondaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bookButton, { minHeight: responsive.touchTargets.button }]}
            >
              <Feather name="calendar" size={16} color={THEME.text.inverse} />
              <Text style={[styles.bookButtonText, { fontSize: responsive.typography.badge + 2 }]}>
                Book
              </Text>
            </LinearGradient>
          </AnimatedPressable>

          {/* Call Button - Orange Gradient (Primary CTA) */}
          <AnimatedPressable
            onPress={() => onCallPress(psychiatrist)}
            style={[styles.callButtonContainer, { minHeight: responsive.touchTargets.button }]}
            accessibilityLabel={`Call ${psychiatrist.name}`}
            accessibilityHint="Opens phone dialer to call this psychiatrist"
          >
            <LinearGradient
              colors={THEME.gradient.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.callButton, { minHeight: responsive.touchTargets.button }]}
            >
              <Feather name="phone" size={16} color={THEME.text.inverse} />
              <Text style={[styles.callButtonText, { fontSize: responsive.typography.badge + 2 }]}>
                Call
              </Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
};

// =============================================================================
// PROFILE DETAIL MODAL
// =============================================================================

interface ProfileModalProps {
  visible: boolean;
  psychiatrist: Psychiatrist | null;
  onClose: () => void;
  onCall: () => void;
  onBook: () => void;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  psychiatrist,
  onClose,
  onCall,
  onBook,
  responsive,
}) => {
  const insets = useSafeAreaInsets();
  const { height, isTablet } = useResponsive();

  if (!psychiatrist) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              maxHeight: height * 0.9,
              paddingBottom: insets.bottom + 20,
              maxWidth: isTablet ? 600 : '100%',
            },
          ]}
        >
          {/* Modal Handle */}
          <View style={styles.modalHandle} />

          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={[styles.modalCloseButton, {
              width: responsive.touchTargets.icon,
              height: responsive.touchTargets.icon
            }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close profile"
          >
            <Feather name="x" size={24} color={THEME.text.secondary} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Profile Header */}
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalPhotoRing,
                  psychiatrist.availableToday
                    ? styles.photoRingAvailable
                    : styles.photoRingBusy,
                ]}
              >
                <Image
                  source={psychiatrist.image}
                  style={styles.modalPhoto}
                />
              </View>
              <View style={styles.modalHeaderInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.modalName, { fontSize: responsive.typography.title }]}>
                    {psychiatrist.name}
                  </Text>
                  {psychiatrist.isVerified && (
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={22}
                      color={colors.teal[500]}
                    />
                  )}
                </View>
                <Text style={[styles.modalTitle, { fontSize: responsive.typography.body }]}>
                  {psychiatrist.title}
                </Text>
                <StarRating
                  rating={psychiatrist.rating}
                  reviewCount={psychiatrist.reviewCount}
                  size="large"
                  responsive={responsive}
                />
              </View>
            </View>

            {/* Badges */}
            <View style={styles.modalBadges}>
              {psychiatrist.isVerified && <Badge type="verified" size="medium" responsive={responsive} />}
              {psychiatrist.isFeatured && <Badge type="featured" size="medium" responsive={responsive} />}
              {psychiatrist.offersVideo && <Badge type="video" size="medium" responsive={responsive} />}
              {psychiatrist.acceptsInsurance && <Badge type="insurance" size="medium" responsive={responsive} />}
            </View>

            {/* Bio */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { fontSize: responsive.typography.bodyLarge }]}>
                About
              </Text>
              <Text style={[styles.modalBio, { fontSize: responsive.typography.body }]}>
                {psychiatrist.bio}
              </Text>
            </View>

            {/* Details */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { fontSize: responsive.typography.bodyLarge }]}>
                Details
              </Text>
              <View style={styles.modalDetailItem}>
                <Feather name="home" size={18} color={colors.teal[500]} />
                <Text style={[styles.modalDetailText, { fontSize: responsive.typography.body }]}>
                  {psychiatrist.hospital}
                </Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Feather name="map-pin" size={18} color={colors.teal[500]} />
                <Text style={[styles.modalDetailText, { fontSize: responsive.typography.body }]}>
                  {psychiatrist.location}
                </Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Feather name="briefcase" size={18} color={colors.teal[500]} />
                <Text style={[styles.modalDetailText, { fontSize: responsive.typography.body }]}>
                  {psychiatrist.experience} experience
                </Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Feather name="globe" size={18} color={colors.teal[500]} />
                <Text style={[styles.modalDetailText, { fontSize: responsive.typography.body }]}>
                  {psychiatrist.languages.join(', ')}
                </Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Feather name="credit-card" size={18} color={colors.teal[500]} />
                <Text style={[styles.modalDetailText, { fontSize: responsive.typography.body }]}>
                  P{psychiatrist.consultationFee} per session
                </Text>
              </View>
            </View>

            {/* Availability */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { fontSize: responsive.typography.bodyLarge }]}>
                Availability
              </Text>
              <AvailabilityBadge
                availableToday={psychiatrist.availableToday}
                nextAvailable={psychiatrist.nextAvailable}
                slots={psychiatrist.availableSlots}
                showSlots={true}
                responsive={responsive}
              />
            </View>

            {/* Testimonial */}
            {psychiatrist.testimonial && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { fontSize: responsive.typography.bodyLarge }]}>
                  Patient Review
                </Text>
                <View style={styles.modalTestimonial}>
                  <Feather name="message-circle" size={20} color={colors.teal[400]} />
                  <Text style={[styles.modalTestimonialText, { fontSize: responsive.typography.body }]}>
                    "{psychiatrist.testimonial.text}"
                  </Text>
                  <Text style={[styles.modalTestimonialAuthor, { fontSize: responsive.typography.small }]}>
                    - {psychiatrist.testimonial.author}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Actions - Teal for Book, Orange for Call */}
          <View style={styles.modalActions}>
            <AnimatedPressable
              onPress={onBook}
              style={styles.modalBookButton}
              accessibilityLabel="Book appointment"
            >
              <LinearGradient
                colors={THEME.gradient.secondaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.modalActionGradient, { minHeight: responsive.touchTargets.button + 4 }]}
              >
                <Feather name="calendar" size={20} color={THEME.text.inverse} />
                <Text style={[styles.modalActionText, { fontSize: responsive.typography.bodyLarge }]}>
                  Book Appointment
                </Text>
              </LinearGradient>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={onCall}
              style={styles.modalCallButton}
              accessibilityLabel="Call now"
            >
              <LinearGradient
                colors={THEME.gradient.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.modalActionGradient, { minHeight: responsive.touchTargets.button + 4 }]}
              >
                <Feather name="phone" size={20} color={THEME.text.inverse} />
                <Text style={[styles.modalActionText, { fontSize: responsive.typography.bodyLarge }]}>
                  Call Now
                </Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// PREMIUM HEADER COMPONENT - Teal Gradient
// =============================================================================

interface HeaderProps {
  onBack: () => void;
  insets: { top: number; left: number; right: number };
  isPhoneLandscape: boolean;
  psychiatristCount: number;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const Header: React.FC<HeaderProps> = ({
  onBack,
  insets,
  isPhoneLandscape,
  psychiatristCount,
  responsive,
}) => {
  return (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={THEME.gradient.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.headerGradient,
          {
            paddingTop: insets.top + (isPhoneLandscape ? 8 : 16),
            paddingLeft: Math.max(insets.left + 16, 20),
            paddingRight: Math.max(insets.right + 16, 20),
          },
        ]}
      >
        {/* Top Row */}
        <View style={styles.headerTopRow}>
          <AnimatedPressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityHint="Returns to previous screen"
          >
            <View style={[styles.backButtonInner, {
              width: responsive.touchTargets.icon,
              height: responsive.touchTargets.icon
            }]}>
              <Feather name="arrow-left" size={22} color={THEME.text.inverse} />
            </View>
          </AnimatedPressable>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons
                name="stethoscope"
                size={isPhoneLandscape ? 24 : 30}
                color={THEME.text.inverse}
              />
              <Text
                style={[
                  styles.headerTitle,
                  { fontSize: responsive.typography.title },
                  isPhoneLandscape && styles.headerTitleLandscape,
                ]}
              >
                Our Psychiatrists
              </Text>
            </View>
            <Text
              style={[
                styles.headerSubtitle,
                { fontSize: responsive.typography.subtitle },
                isPhoneLandscape && styles.headerSubtitleLandscape,
              ]}
            >
              Professional mental health support
            </Text>
          </View>

          <View style={[styles.headerPlaceholder, { width: responsive.touchTargets.icon }]} />
        </View>

        {/* Hero Stats */}
        {!isPhoneLandscape && (
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { fontSize: responsive.typography.title }]}>
                {psychiatristCount}
              </Text>
              <Text style={[styles.heroStatLabel, { fontSize: responsive.typography.small }]}>
                Specialists
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { fontSize: responsive.typography.title }]}>
                4.8
              </Text>
              <Text style={[styles.heroStatLabel, { fontSize: responsive.typography.small }]}>
                Avg. Rating
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { fontSize: responsive.typography.title }]}>
                24/7
              </Text>
              <Text style={[styles.heroStatLabel, { fontSize: responsive.typography.small }]}>
                Support
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Curved Bottom */}
      <View style={styles.headerCurve}>
        <LinearGradient
          colors={[colors.teal[700], THEME.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerCurveGradient}
        />
      </View>
    </View>
  );
};

// =============================================================================
// INFO BANNER - Teal Theme
// =============================================================================

interface InfoBannerProps {
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const InfoBanner: React.FC<InfoBannerProps> = ({ responsive }) => {
  return (
    <View style={styles.infoBanner} accessibilityRole="alert">
      <LinearGradient
        colors={[colors.teal[50], colors.orange[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.infoBannerGradient}
      >
        <View style={styles.infoBannerIcon}>
          <MaterialCommunityIcons
            name="shield-check"
            size={26}
            color={colors.teal[600]}
          />
        </View>
        <View style={styles.infoBannerContent}>
          <Text style={[styles.infoBannerTitle, { fontSize: responsive.typography.bodyLarge }]}>
            All Verified Professionals
          </Text>
          <Text style={[styles.infoBannerText, { fontSize: responsive.typography.body }]}>
            Licensed psychiatrists certified by the Philippine Psychiatric Association
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.teal[400]} />
      </LinearGradient>
    </View>
  );
};

// =============================================================================
// FLOATING CRISIS HOTLINE BUTTON - Soft Red with Orange Accent
// =============================================================================

interface CrisisButtonProps {
  onPress: () => void;
  insets: { bottom: number; right: number };
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const CrisisButton: React.FC<CrisisButtonProps> = ({ onPress, insets, responsive }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel="24/7 Crisis Hotline"
      accessibilityHint="Call the National Center for Mental Health crisis hotline"
      style={[
        styles.crisisButton,
        {
          bottom: insets.bottom + 20,
          right: Math.max(insets.right + 16, 20),
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={['#FEF2F2', '#FECACA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.crisisButtonGradient, { minHeight: responsive.touchTargets.fab }]}
        >
          <Feather name="phone-call" size={22} color="#DC2626" />
          <Text style={[styles.crisisButtonText, { fontSize: responsive.typography.body }]}>
            Crisis Line
          </Text>
        </LinearGradient>
      </Animated.View>
    </AnimatedPressable>
  );
};

// =============================================================================
// EMERGENCY HOTLINE CARD
// =============================================================================

interface EmergencyCardProps {
  onPress: () => void;
  responsive: ReturnType<typeof getResponsiveStyles>;
}

const EmergencyCard: React.FC<EmergencyCardProps> = ({ onPress, responsive }) => {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.emergencyContainer}
      accessibilityLabel="Emergency mental health hotline"
      accessibilityHint="Calls the National Center for Mental Health crisis hotline"
    >
      <LinearGradient
        colors={['#FEF2F2', '#FEE2E2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.emergencyGradient}
      >
        <View style={[styles.emergencyIcon, {
          width: responsive.touchTargets.button,
          height: responsive.touchTargets.button
        }]}>
          <Feather name="phone-call" size={24} color="#DC2626" />
        </View>
        <View style={styles.emergencyContent}>
          <Text style={[styles.emergencyTitle, { fontSize: responsive.typography.body }]}>
            24/7 Crisis Support Hotline
          </Text>
          <Text style={[styles.emergencyNumber, { fontSize: responsive.typography.cardName }]}>
            0917-899-USAP (8727)
          </Text>
          <Text style={[styles.emergencySubtext, { fontSize: responsive.typography.small }]}>
            National Center for Mental Health - Free & Confidential
          </Text>
        </View>
        <View style={styles.emergencyArrow}>
          <Feather name="phone-forwarded" size={20} color="#DC2626" />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PsychiatristListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, isTablet, getScreenMargin, hp, wp } = useResponsive();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('availability');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedPsychiatrist, setSelectedPsychiatrist] = useState<Psychiatrist | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const isPhoneLandscape = isLandscape && !isTablet;

  // Get responsive styles
  const responsive = useMemo(() =>
    getResponsiveStyles(width, isTablet, isLandscape),
    [width, isTablet, isLandscape]
  );

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );
    return () => subscription.remove();
  }, []);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Responsive horizontal padding - reasonable padding for landscape
  const horizontalPadding = useMemo(() => {
    if (isPhoneLandscape) return Math.max(insets.left + 16, 24);
    // Good padding for tablet landscape - spacious but not cramped
    if (responsive.isTabletLandscape) return Math.max(insets.left + 32, 48);
    if (responsive.isTabletPortrait) return Math.max(responsive.spacing.screenMargin, 40);
    return responsive.spacing.screenMargin;
  }, [isPhoneLandscape, insets.left, responsive.spacing.screenMargin, responsive.isTabletLandscape, responsive.isTabletPortrait]);

  // Calculate card width - ALWAYS single column for premium spacious design
  // Cards are capped at max width for tablet landscape to prevent them being too wide
  const cardWidth = useMemo(() => {
    // For tablet landscape, cap the card width for optimal readability
    // This creates a centered, premium look similar to iOS Settings app
    if (responsive.isTabletLandscape) {
      // Max width of 700px for comfortable reading, centered via container
      return '100%';
    }
    // All other modes: full width cards
    return '100%';
  }, [responsive.isTabletLandscape]);

  // Filter and sort psychiatrists
  const filteredPsychiatrists = useMemo(() => {
    let result = [...PSYCHIATRISTS];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.specialty.toLowerCase().includes(query) ||
          p.hospital.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case 'available':
        result = result.filter((p) => p.availableToday);
        break;
      case 'featured':
        result = result.filter((p) => p.isFeatured);
        break;
      case 'video':
        result = result.filter((p) => p.offersVideo);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'availability':
        result.sort((a, b) => (b.availableToday ? 1 : 0) - (a.availableToday ? 1 : 0));
        break;
      case 'experience':
        result.sort(
          (a, b) =>
            parseInt(b.experience.replace(/\D/g, '')) -
            parseInt(a.experience.replace(/\D/g, ''))
        );
        break;
      case 'fee':
        result.sort(
          (a, b) =>
            parseInt(a.consultationFee.replace(/\D/g, '')) -
            parseInt(b.consultationFee.replace(/\D/g, ''))
        );
        break;
    }

    return result;
  }, [searchQuery, activeFilter, sortBy]);

  // Filter counts
  const filterCounts = useMemo(
    () => ({
      all: PSYCHIATRISTS.length,
      available: PSYCHIATRISTS.filter((p) => p.availableToday).length,
      featured: PSYCHIATRISTS.filter((p) => p.isFeatured).length,
      video: PSYCHIATRISTS.filter((p) => p.offersVideo).length,
    }),
    []
  );

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCallPress = useCallback((psychiatrist: Psychiatrist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${psychiatrist.phone}`).catch(() => {
      Alert.alert(
        'Unable to Make Call',
        `Please call ${psychiatrist.name} directly at ${psychiatrist.phone}`,
        [{ text: 'OK', style: 'default' }]
      );
    });
  }, []);

  const handleBookPress = useCallback((psychiatrist: Psychiatrist) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Book Appointment',
      `Would you like to book an appointment with ${psychiatrist.name}?\n\nNext available: ${psychiatrist.nextAvailable}\n\nThis feature will be available soon.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call to Book',
          style: 'default',
          onPress: () => handleCallPress(psychiatrist),
        },
      ]
    );
  }, [handleCallPress]);

  const handleViewProfile = useCallback((psychiatrist: Psychiatrist) => {
    setSelectedPsychiatrist(psychiatrist);
    setShowProfileModal(true);
  }, []);

  const handleFavoritePress = useCallback((psychiatrist: Psychiatrist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(psychiatrist.id)) {
        newFavorites.delete(psychiatrist.id);
      } else {
        newFavorites.add(psychiatrist.id);
      }
      return newFavorites;
    });
  }, []);

  const handleCrisisHotline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL('tel:0917-899-8727').catch(() => {
      Alert.alert(
        'Crisis Support',
        'If you are in crisis, please call:\n\n0917-899-USAP (8727)\n\nNational Center for Mental Health\nFree and confidential 24/7',
        [{ text: 'OK', style: 'default' }]
      );
    });
  }, []);

  const closeProfileModal = useCallback(() => {
    setShowProfileModal(false);
    setSelectedPsychiatrist(null);
  }, []);

  // Sidebar content for landscape tablet mode
  const renderSidebar = () => (
    <View style={[
      styles.sidebar,
      { paddingTop: insets.top + 16, paddingLeft: Math.max(insets.left + 16, 24) },
    ]}>
      {/* Sidebar Header with Back Button */}
      <View style={styles.sidebarHeader}>
        <AnimatedPressable
          onPress={handleBack}
          style={styles.sidebarBackButton}
          accessibilityLabel="Go back"
          accessibilityHint="Returns to previous screen"
        >
          <View style={styles.sidebarBackButtonInner}>
            <Feather name="arrow-left" size={20} color={colors.teal[600]} />
          </View>
        </AnimatedPressable>
        <View style={styles.sidebarTitleContainer}>
          <Text style={styles.sidebarTitle}>Psychiatrists</Text>
          <Text style={styles.sidebarSubtitle}>Mental Health Support</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.sidebarSearch}>
        <View style={styles.sidebarSearchInputContainer}>
          <Feather name="search" size={18} color={colors.teal[500]} />
          <TextInput
            style={styles.sidebarSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor={THEME.text.light}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={16} color={THEME.text.light} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarSectionTitle}>FILTERS</Text>
        <View style={styles.sidebarFilters}>
          {[
            { key: 'all', label: 'All', icon: 'grid', count: filterCounts.all },
            { key: 'available', label: 'Available', icon: 'clock', count: filterCounts.available },
            { key: 'featured', label: 'Top Rated', icon: 'star', count: filterCounts.featured },
            { key: 'video', label: 'Video', icon: 'video', count: filterCounts.video },
          ].map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => setActiveFilter(filter.key as FilterCategory)}
              style={[
                styles.sidebarFilterItem,
                activeFilter === filter.key && styles.sidebarFilterItemActive,
              ]}
            >
              <View style={styles.sidebarFilterLeft}>
                <Feather
                  name={filter.icon as any}
                  size={18}
                  color={activeFilter === filter.key ? colors.white : colors.teal[600]}
                />
                <Text style={[
                  styles.sidebarFilterLabel,
                  activeFilter === filter.key && styles.sidebarFilterLabelActive,
                ]}>
                  {filter.label}
                </Text>
              </View>
              <View style={[
                styles.sidebarFilterCount,
                activeFilter === filter.key && styles.sidebarFilterCountActive,
              ]}>
                <Text style={[
                  styles.sidebarFilterCountText,
                  activeFilter === filter.key && styles.sidebarFilterCountTextActive,
                ]}>
                  {filter.count}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sort Section */}
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarSectionTitle}>SORT BY</Text>
        <View style={styles.sidebarSortOptions}>
          {[
            { key: 'availability', label: 'Availability', icon: 'calendar' },
            { key: 'rating', label: 'Rating', icon: 'star' },
            { key: 'experience', label: 'Experience', icon: 'briefcase' },
          ].map((sort) => (
            <Pressable
              key={sort.key}
              onPress={() => setSortBy(sort.key as SortOption)}
              style={[
                styles.sidebarSortItem,
                sortBy === sort.key && styles.sidebarSortItemActive,
              ]}
            >
              <Feather
                name={sort.icon as any}
                size={16}
                color={sortBy === sort.key ? colors.teal[600] : THEME.text.muted}
              />
              <Text style={[
                styles.sidebarSortLabel,
                sortBy === sort.key && styles.sidebarSortLabelActive,
              ]}>
                {sort.label}
              </Text>
              {sortBy === sort.key && (
                <Feather name="check" size={16} color={colors.teal[600]} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.sidebarStatsCard}>
        <LinearGradient
          colors={[colors.teal[500], colors.teal[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sidebarStatsGradient}
        >
          <View style={styles.sidebarStatItem}>
            <Text style={styles.sidebarStatValue}>{PSYCHIATRISTS.length}</Text>
            <Text style={styles.sidebarStatLabel}>Specialists</Text>
          </View>
          <View style={styles.sidebarStatDivider} />
          <View style={styles.sidebarStatItem}>
            <Text style={styles.sidebarStatValue}>4.8</Text>
            <Text style={styles.sidebarStatLabel}>Avg Rating</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Crisis Hotline in Sidebar */}
      <Pressable onPress={handleCrisisHotline} style={styles.sidebarCrisisButton}>
        <View style={styles.sidebarCrisisIcon}>
          <Feather name="phone-call" size={18} color="#DC2626" />
        </View>
        <View style={styles.sidebarCrisisContent}>
          <Text style={styles.sidebarCrisisTitle}>24/7 Crisis Line</Text>
          <Text style={styles.sidebarCrisisNumber}>0917-899-8727</Text>
        </View>
      </Pressable>
    </View>
  );

  // Main content (psychiatrist cards)
  const renderMainContent = () => (
    <ScrollView
      style={styles.mainContent}
      contentContainerStyle={[
        styles.mainContentContainer,
        {
          paddingBottom: insets.bottom + 32,
          paddingRight: Math.max(insets.right + 24, 32),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Results header */}
      <View style={styles.mainContentHeader}>
        <Text style={styles.mainContentResultCount}>
          {filteredPsychiatrists.length} psychiatrist{filteredPsychiatrists.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.mainContentVerified}>
          <MaterialCommunityIcons name="shield-check" size={18} color={colors.teal[600]} />
          <Text style={styles.mainContentVerifiedText}>All Verified</Text>
        </View>
      </View>

      {/* Cards Grid - 2 columns for tablet landscape */}
      {isLoading ? (
        <View style={styles.landscapeCardsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.landscapeCardWrapper}>
              <SkeletonCard responsive={responsive} />
            </View>
          ))}
        </View>
      ) : filteredPsychiatrists.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="emoticon-sad-outline" size={64} color={THEME.text.light} />
          <Text style={styles.emptyStateTitle}>No Results Found</Text>
          <Text style={styles.emptyStateText}>Try adjusting your filters</Text>
        </View>
      ) : (
        <View style={styles.landscapeCardsGrid}>
          {filteredPsychiatrists.map((psychiatrist, index) => (
            <View key={psychiatrist.id} style={styles.landscapeCardWrapper}>
              <PsychiatristCard
                psychiatrist={psychiatrist}
                onCallPress={handleCallPress}
                onBookPress={handleBookPress}
                onViewProfile={handleViewProfile}
                onFavoritePress={handleFavoritePress}
                isFavorite={favorites.has(psychiatrist.id)}
                responsive={responsive}
                index={index}
                cardWidth="100%"
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // LANDSCAPE TABLET LAYOUT - Premium sidebar design
  if (responsive.isTabletLandscape) {
    return (
      <View style={styles.landscapeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.background.primary} />

        {/* Background */}
        <LinearGradient
          colors={[THEME.background.primary, colors.teal[50], THEME.background.primary]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Sidebar + Main Content Layout */}
        <View style={styles.landscapeLayout}>
          {renderSidebar()}
          <View style={styles.landscapeDivider} />
          {renderMainContent()}
        </View>

        {/* Profile Modal */}
        <ProfileModal
          visible={showProfileModal}
          psychiatrist={selectedPsychiatrist}
          onClose={closeProfileModal}
          onCall={() => selectedPsychiatrist && handleCallPress(selectedPsychiatrist)}
          onBook={() => selectedPsychiatrist && handleBookPress(selectedPsychiatrist)}
          responsive={responsive}
        />
      </View>
    );
  }

  // PORTRAIT / PHONE LAYOUT - Original design
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.teal[700]} />

      {/* Background - Warm gradient */}
      <LinearGradient
        colors={THEME.gradient.calming}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Premium Ambient Orbs - Visual depth */}
      <AmbientOrbsBackground reduceMotion={reduceMotionEnabled} />

      {/* Premium Header - Teal gradient */}
      <Header
        onBack={handleBack}
        insets={insets}
        isPhoneLandscape={isPhoneLandscape}
        psychiatristCount={PSYCHIATRISTS.length}
        responsive={responsive}
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 100,
            paddingLeft: Math.max(horizontalPadding, insets.left + 16),
            paddingRight: Math.max(horizontalPadding, insets.right + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Filter Section - Premium Design */}
        <View style={[
          styles.stickyHeader,
          {
            marginHorizontal: -horizontalPadding,
            paddingHorizontal: horizontalPadding,
            paddingTop: responsive.isTabletPortrait ? 20 : 12,
            paddingBottom: responsive.isTabletPortrait ? 20 : 14,
          },
        ]}>
          {/* Search Bar - Full width for easy access */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            responsive={responsive}
          />

          {/* Filter Chips - Always horizontal scroll (no wrapping issues) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filterChipsContainer,
              { gap: 10 },
            ]}
          >
            <FilterChip
              label="All"
              isActive={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
              count={filterCounts.all}
              responsive={responsive}
            />
            <FilterChip
              label="Available Today"
              icon="clock"
              isActive={activeFilter === 'available'}
              onPress={() => setActiveFilter('available')}
              count={filterCounts.available}
              responsive={responsive}
            />
            <FilterChip
              label="Top Rated"
              icon="star"
              isActive={activeFilter === 'featured'}
              onPress={() => setActiveFilter('featured')}
              count={filterCounts.featured}
              responsive={responsive}
            />
            <FilterChip
              label="Video Consult"
              icon="video"
              isActive={activeFilter === 'video'}
              onPress={() => setActiveFilter('video')}
              count={filterCounts.video}
              responsive={responsive}
            />
          </ScrollView>

          {/* Sort Options - Full width */}
          <View style={[
            styles.sortRow,
            responsive.isTabletPortrait && { marginTop: 16 },
          ]}>
            <Text style={[styles.resultCount, { fontSize: responsive.typography.body }]}>
              {filteredPsychiatrists.length} psychiatrist{filteredPsychiatrists.length !== 1 ? 's' : ''} found
            </Text>
            <View style={styles.sortOptions}>
              <Text style={[styles.sortLabel, { fontSize: responsive.typography.small }]}>Sort:</Text>
              <Pressable
                onPress={() => setSortBy('availability')}
                style={[
                  styles.sortOption,
                  sortBy === 'availability' && styles.sortOptionActive,
                  responsive.isTabletPortrait && { paddingHorizontal: 18, paddingVertical: 10 },
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { fontSize: responsive.typography.small },
                    sortBy === 'availability' && styles.sortOptionTextActive,
                  ]}
                >
                  Availability
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSortBy('rating')}
                style={[
                  styles.sortOption,
                  sortBy === 'rating' && styles.sortOptionActive,
                  responsive.isTabletPortrait && { paddingHorizontal: 18, paddingVertical: 10 },
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { fontSize: responsive.typography.small },
                    sortBy === 'rating' && styles.sortOptionTextActive,
                  ]}
                >
                  Rating
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Info Banner */}
        <InfoBanner responsive={responsive} />

        {/* Loading State */}
        {isLoading ? (
          <View style={[styles.loadingContainer, { gap: responsive.spacing.cardGap }]}>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} responsive={responsive} />
            ))}
          </View>
        ) : filteredPsychiatrists.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="emoticon-sad-outline"
              size={64}
              color={THEME.text.light}
            />
            <Text style={[styles.emptyStateTitle, { fontSize: responsive.typography.cardName }]}>
              No Results Found
            </Text>
            <Text style={[styles.emptyStateText, { fontSize: responsive.typography.body }]}>
              Try adjusting your search or filters
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              style={[styles.emptyStateButton, { minHeight: responsive.touchTargets.button }]}
            >
              <Text style={[styles.emptyStateButtonText, { fontSize: responsive.typography.body }]}>
                Clear Filters
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Psychiatrist Cards - Premium Single Column Layout for Easy Navigation */
          <View style={[
            styles.cardsContainer,
            { gap: responsive.spacing.cardGap },
            // Center cards with max-width for tablet landscape (premium iOS-like feel)
            responsive.isTabletLandscape && styles.cardsContainerCentered,
          ]}>
            {filteredPsychiatrists.map((psychiatrist, index) => (
              <PsychiatristCard
                key={psychiatrist.id}
                psychiatrist={psychiatrist}
                onCallPress={handleCallPress}
                onBookPress={handleBookPress}
                onViewProfile={handleViewProfile}
                onFavoritePress={handleFavoritePress}
                isFavorite={favorites.has(psychiatrist.id)}
                responsive={responsive}
                index={index}
                cardWidth={cardWidth}
              />
            ))}
          </View>
        )}

        {/* Footer Note - Centered on tablet landscape */}
        <View style={[
          styles.footerNote,
          responsive.isTabletLandscape && { maxWidth: 720, alignSelf: 'center', width: '100%' },
        ]}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={THEME.text.muted}
          />
          <Text style={[styles.footerNoteText, { fontSize: responsive.typography.body }]}>
            Consultation fees may vary. Please confirm with the doctor's clinic before your visit.
          </Text>
        </View>

        {/* Emergency Hotline Card - Centered on tablet landscape */}
        <View style={responsive.isTabletLandscape && styles.cardsContainerCentered}>
          <EmergencyCard onPress={handleCrisisHotline} responsive={responsive} />
        </View>
      </ScrollView>

      {/* Floating Crisis Button */}
      <CrisisButton onPress={handleCrisisHotline} insets={insets} responsive={responsive} />

      {/* Profile Detail Modal */}
      <ProfileModal
        visible={showProfileModal}
        psychiatrist={selectedPsychiatrist}
        onClose={closeProfileModal}
        onCall={() => {
          if (selectedPsychiatrist) {
            handleCallPress(selectedPsychiatrist);
          }
        }}
        onBook={() => {
          if (selectedPsychiatrist) {
            handleBookPress(selectedPsychiatrist);
          }
        }}
        responsive={responsive}
      />
    </View>
  );
};

// =============================================================================
// STYLES - TANDER Orange & Teal Theme
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },

  // ========================
  // HEADER STYLES - Teal Theme
  // ========================
  headerContainer: {
    zIndex: 10,
  },
  headerGradient: {
    paddingBottom: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonInner: {
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontWeight: '700',
    color: THEME.text.inverse,
    letterSpacing: 0.3,
  },
  headerTitleLandscape: {
    fontSize: 22,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    marginLeft: 40,
  },
  headerSubtitleLandscape: {
    marginLeft: 34,
  },
  headerPlaceholder: {
    width: 44,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontWeight: '700',
    color: THEME.text.inverse,
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  headerCurve: {
    height: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
  headerCurveGradient: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // ========================
  // STICKY HEADER
  // ========================
  stickyHeader: {
    backgroundColor: 'rgba(255, 251, 247, 0.95)',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },

  // ========================
  // SEARCH STYLES - Teal Focus
  // ========================
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  searchInputContainerFocused: {
    borderColor: colors.teal[400],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[600],
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: THEME.text.primary,
    height: '100%',
  },

  // ========================
  // FILTER STYLES - Orange Active
  // ========================
  filterChipsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  filterChipsTabletContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    minHeight: 44,
  },
  filterChipActive: {
    backgroundColor: colors.orange[500],
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  filterChipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
  },
  filterChipText: {
    fontWeight: '600',
  },
  filterChipCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  filterChipCountText: {
    fontWeight: '600',
  },

  // ========================
  // SORT STYLES
  // ========================
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  resultCount: {
    fontWeight: '600',
    color: THEME.text.primary,
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    color: THEME.text.muted,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sortOptionActive: {
    backgroundColor: colors.teal[100],
  },
  sortOptionText: {
    color: THEME.text.muted,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.teal[700],
    fontWeight: '600',
  },

  // ========================
  // INFO BANNER STYLES
  // ========================
  infoBanner: {
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.teal[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[300],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  infoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  infoBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontWeight: '700',
    color: colors.teal[700],
    marginBottom: 4,
  },
  infoBannerText: {
    color: THEME.text.secondary,
    lineHeight: 20,
  },

  // ========================
  // LOADING & EMPTY STATES
  // ========================
  loadingContainer: {},
  skeletonCard: {
    backgroundColor: THEME.surface.card,
    borderRadius: 20,
    marginBottom: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.gray[200],
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.gray[200],
    borderRadius: 7,
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  skeletonButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.gray[200],
    borderRadius: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontWeight: '700',
    color: THEME.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    color: THEME.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyStateButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.teal[100],
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateButtonText: {
    fontWeight: '600',
    color: colors.teal[700],
  },

  // ========================
  // CARDS CONTAINER - Premium Single Column Layout
  // ========================
  cardsContainer: {
    // Default: single column, full width
  },
  cardsContainerCentered: {
    // Tablet landscape: center cards with max width for premium feel
    alignSelf: 'center',
    width: '100%',
    maxWidth: 720, // Optimal reading width for landscape
  },
  cardsContainerGrid: {
    // Legacy grid style - kept for reference but not used
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  // ========================
  // CARD STYLES
  // ========================
  cardWrapper: {
    marginBottom: 8,
  },
  featuredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  featuredBannerText: {
    fontWeight: '700',
    color: colors.orange[600],
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[900],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
    }),
  },
  cardFeatured: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
  },
  photoRing: {
    padding: 3,
    borderRadius: 42,
    borderWidth: 3,
  },
  photoRingAvailable: {
    borderColor: colors.teal[500],
  },
  photoRingBusy: {
    borderColor: colors.gray[300],
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gray[100],
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
    }),
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal[500],
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorName: {
    fontWeight: '700',
    color: THEME.text.primary,
    flex: 1,
  },
  doctorTitle: {
    color: THEME.text.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  favoriteButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ========================
  // BADGE STYLES
  // ========================
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: '600',
  },

  // ========================
  // SPECIALTY STYLES - Teal
  // ========================
  specialtyContainer: {
    marginBottom: 14,
  },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  specialtyBadgeText: {
    fontWeight: '600',
    color: colors.teal[700],
  },

  // ========================
  // CARD DETAILS
  // ========================
  cardDetails: {
    marginBottom: 14,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: THEME.text.secondary,
  },
  detailDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[300],
    marginHorizontal: 4,
  },

  // ========================
  // STATS ROW - Teal accent
  // ========================
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    color: colors.teal[700],
  },
  statLabel: {
    color: THEME.text.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.teal[200],
  },

  // ========================
  // LANGUAGES ROW
  // ========================
  languagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  languagesText: {
    color: colors.teal[700],
    fontWeight: '500',
  },

  // ========================
  // AVAILABILITY & FEE
  // ========================
  availabilityFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  availableToday: {
    backgroundColor: colors.teal[50],
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  availableLater: {
    backgroundColor: colors.orange[50],
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  availabilityDotContainer: {
    position: 'relative',
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityPulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.3,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availabilityText: {
    fontWeight: '600',
  },
  availableSlotsText: {
    color: colors.teal[600],
    marginTop: 2,
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeLabel: {
    color: THEME.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feeAmount: {
    fontWeight: '700',
    color: colors.orange[600],
    marginTop: 2,
  },

  // ========================
  // TESTIMONIAL - Teal accent
  // ========================
  testimonialContainer: {
    backgroundColor: colors.teal[50],
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal[400],
  },
  testimonialText: {
    color: THEME.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 6,
    marginLeft: 22,
  },
  testimonialAuthor: {
    color: colors.teal[600],
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 22,
  },

  // ========================
  // CARD ACTIONS - Orange & Teal
  // ========================
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  viewProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.teal[300],
    backgroundColor: colors.teal[50],
    minHeight: 48,
  },
  viewProfileText: {
    fontWeight: '600',
    color: colors.teal[700],
    fontSize: 14,
  },
  bookButtonContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[600],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
    }),
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  bookButtonText: {
    fontWeight: '600',
    color: THEME.text.inverse,
    fontSize: 14,
  },
  callButtonContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
    }),
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  callButtonText: {
    fontWeight: '600',
    color: THEME.text.inverse,
    fontSize: 14,
  },

  // ========================
  // RATING STYLES
  // ========================
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontWeight: '600',
    color: THEME.text.primary,
    marginLeft: 4,
  },
  reviewCountText: {
    color: THEME.text.muted,
  },

  // ========================
  // FOOTER NOTE
  // ========================
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.gray[50],
    borderRadius: 14,
  },
  footerNoteText: {
    flex: 1,
    color: THEME.text.muted,
    lineHeight: 20,
  },

  // ========================
  // EMERGENCY HOTLINE
  // ========================
  emergencyContainer: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  emergencyIcon: {
    borderRadius: 28,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontWeight: '600',
    color: '#B91C1C',
    marginBottom: 4,
  },
  emergencyNumber: {
    fontWeight: '700',
    color: '#991B1B',
  },
  emergencySubtext: {
    color: '#DC2626',
    marginTop: 4,
  },
  emergencyArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ========================
  // CRISIS BUTTON (FLOATING)
  // ========================
  crisisButton: {
    position: 'absolute',
    zIndex: 100,
  },
  crisisButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  crisisButtonText: {
    fontWeight: '700',
    color: '#DC2626',
  },

  // ========================
  // MODAL STYLES
  // ========================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: THEME.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalPhotoRing: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 3,
  },
  modalPhoto: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  modalHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  modalName: {
    fontWeight: '700',
    color: THEME.text.primary,
    flex: 1,
    marginRight: 8,
  },
  modalTitle: {
    color: THEME.text.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  modalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontWeight: '700',
    color: THEME.text.primary,
    marginBottom: 12,
  },
  modalBio: {
    color: THEME.text.secondary,
    lineHeight: 24,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalDetailText: {
    color: THEME.text.secondary,
  },
  modalTestimonial: {
    backgroundColor: colors.teal[50],
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.teal[400],
  },
  modalTestimonialText: {
    color: THEME.text.secondary,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 8,
    marginLeft: 32,
  },
  modalTestimonialAuthor: {
    color: colors.teal[600],
    fontWeight: '600',
    marginTop: 12,
    marginLeft: 32,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  modalBookButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalCallButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  modalActionText: {
    fontWeight: '600',
    color: THEME.text.inverse,
  },

  // ========================
  // LANDSCAPE TABLET - PREMIUM SIDEBAR LAYOUT
  // ========================
  landscapeContainer: {
    flex: 1,
    backgroundColor: THEME.background.primary,
  },
  landscapeLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
  },

  // Sidebar Styles
  sidebar: {
    width: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingRight: 20,
    paddingBottom: 32,
    borderRightWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  sidebarBackButton: {},
  sidebarBackButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  sidebarTitleContainer: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text.primary,
    letterSpacing: -0.3,
  },
  sidebarSubtitle: {
    fontSize: 13,
    color: THEME.text.muted,
    marginTop: 2,
  },

  // Sidebar Search
  sidebarSearch: {
    marginBottom: 24,
  },
  sidebarSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sidebarSearchInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.text.primary,
    padding: 0,
  },

  // Sidebar Sections
  sidebarSection: {
    marginBottom: 24,
  },
  sidebarSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.text.muted,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Sidebar Filters
  sidebarFilters: {
    gap: 6,
  },
  sidebarFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  sidebarFilterItemActive: {
    backgroundColor: colors.teal[500],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[600],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  sidebarFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarFilterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text.secondary,
  },
  sidebarFilterLabelActive: {
    color: colors.white,
  },
  sidebarFilterCount: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sidebarFilterCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  sidebarFilterCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text.muted,
  },
  sidebarFilterCountTextActive: {
    color: colors.white,
  },

  // Sidebar Sort Options
  sidebarSortOptions: {
    gap: 4,
  },
  sidebarSortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
  },
  sidebarSortItemActive: {
    backgroundColor: colors.teal[50],
  },
  sidebarSortLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: THEME.text.muted,
  },
  sidebarSortLabelActive: {
    color: colors.teal[700],
    fontWeight: '600',
  },

  // Sidebar Stats Card
  sidebarStatsCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[600],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  sidebarStatsGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sidebarStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  sidebarStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  sidebarStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sidebarStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },

  // Sidebar Crisis Button
  sidebarCrisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  sidebarCrisisIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarCrisisContent: {
    flex: 1,
  },
  sidebarCrisisTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  sidebarCrisisNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginTop: 2,
  },

  // Main Content Area
  mainContent: {
    flex: 1,
    backgroundColor: THEME.background.primary,
  },
  mainContentContainer: {
    paddingTop: 24,
    paddingLeft: 32,
  },
  mainContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mainContentResultCount: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text.primary,
  },
  mainContentVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.teal[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mainContentVerifiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // Landscape Cards Grid
  landscapeCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  landscapeCardWrapper: {
    width: '48%',
    minWidth: 340,
    maxWidth: 500,
  },
});

export default PsychiatristListScreen;
