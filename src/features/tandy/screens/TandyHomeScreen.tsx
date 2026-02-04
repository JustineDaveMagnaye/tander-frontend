/**
 * TANDER TandyHomeScreen - Super Premium iPhone-Like UI/UX
 *
 * Design Philosophy:
 * - Glassmorphism effects with frosted glass cards
 * - Ambient floating orbs for visual depth
 * - Spring physics animations on all interactions
 * - Premium gradient buttons with glow effects
 * - Sophisticated typography hierarchy
 * - Smooth entrance animations
 * - Senior-friendly touch targets (56-64px minimum)
 *
 * Accessibility:
 * - WCAG AAA contrast ratios
 * - Large touch targets for seniors
 * - Screen reader optimized
 * - Reduced motion support
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Linking,
  Platform,
  Animated,
  Pressable,
  AccessibilityInfo,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { TanderLogoIcon } from '@shared/components/icons/TanderLogoIcon';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TandyStackParamList } from '@navigation/types';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  PREMIUM_COLORS,
  AmbientBackground,
  AnimatedEntrance,
  PremiumGradientButton,
  PremiumBadge,
} from '../components/PremiumComponents';

// =============================================================================
// TYPES
// =============================================================================

type TandyHomeNavigationProp = NativeStackNavigationProp<TandyStackParamList, 'TandyHome'>;

interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  url?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SPONSORS: Sponsor[] = [
  {
    id: 'wellness-ph',
    name: 'Wellness PH',
    tagline: 'Your health partner',
    icon: 'heart',
    color: colors.teal[500],
    url: 'https://wellness.ph',
  },
  {
    id: 'mindcare',
    name: 'MindCare',
    tagline: 'Mental wellness support',
    icon: 'sun',
    color: colors.orange[500],
    url: 'https://mindcare.com',
  },
  {
    id: 'senior-health',
    name: 'Senior Health Plus',
    tagline: 'Care for golden years',
    icon: 'shield',
    color: '#8B5CF6',
    url: 'https://seniorhealthplus.com',
  },
];

const WELLNESS_FEATURES = [
  {
    icon: 'message-circle' as const,
    title: 'Friendly Chat',
    description: 'Chat anytime',
    color: colors.teal[500],
    bgColor: colors.teal[50],
  },
  {
    icon: 'wind' as const,
    title: 'Breathing',
    description: 'Calm your mind',
    color: colors.orange[500],
    bgColor: colors.orange[50],
  },
  {
    icon: 'sun' as const,
    title: 'Meditation',
    description: 'Find inner peace',
    color: colors.pink[500],
    bgColor: colors.pink[50],
  },
  {
    icon: 'heart' as const,
    title: 'Wellness Tips',
    description: 'Daily inspiration',
    color: colors.teal[600],
    bgColor: colors.teal[50],
  },
];

// =============================================================================
// PREMIUM AVATAR COMPONENT - Stunning animated avatar with glow
// =============================================================================

interface PremiumAvatarProps {
  size: number;
  reduceMotion: boolean;
}

const PremiumAvatar: React.FC<PremiumAvatarProps> = ({ size, reduceMotion }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduceMotion) return;

    // Slow rotation for gradient ring
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );

    // Subtle pulse for glow
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

    // Glow breathing
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    rotate.start();
    pulse.start();
    glow.start();

    return () => {
      rotate.stop();
      pulse.stop();
      glow.stop();
    };
  }, [reduceMotion, rotateAnim, pulseAnim, glowOpacity]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconSize = size * 0.5;
  const ringSize = size + 12;
  const glowSize = size + 40;

  return (
    <View style={[avatarStyles.container, { width: glowSize, height: glowSize }]}>
      {/* Outer glow */}
      <Animated.View
        style={[
          avatarStyles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: glowOpacity,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Rotating gradient ring */}
      <Animated.View
        style={[
          avatarStyles.ringContainer,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            transform: [{ rotate: rotateInterpolate }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.orange[400], colors.teal[400], colors.orange[500], colors.teal[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            avatarStyles.gradientRing,
            { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
          ]}
        />
      </Animated.View>

      {/* Main avatar */}
      <View
        style={[
          avatarStyles.avatarInner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <TanderLogoIcon size={iconSize} focused />
      </View>
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.teal[300],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[400],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
      },
    }),
  },
  ringContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRing: {
    padding: 4,
  },
  avatarInner: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
});

// =============================================================================
// PREMIUM FEATURE CARD - Glass-effect feature card
// =============================================================================

interface PremiumFeatureCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  index: number;
  reduceMotion: boolean;
}

const PremiumFeatureCard: React.FC<PremiumFeatureCardProps> = ({
  icon,
  title,
  description,
  color,
  bgColor,
  onPress,
  index,
  reduceMotion,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 30)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100 + 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 100 + 400,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index, reduceMotion]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={[
        featureCardStyles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${title}. ${description}`}
        accessibilityRole="button"
        style={{ flex: 1 }}
      >
        <View style={featureCardStyles.card}>
          {/* Glass overlay for iOS */}
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={40}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={featureCardStyles.content}>
            <View style={[featureCardStyles.iconContainer, { backgroundColor: bgColor }]}>
              <Feather name={icon} size={26} color={color} />
            </View>
            <Text style={featureCardStyles.title} numberOfLines={1}>{title}</Text>
            <Text style={featureCardStyles.description} numberOfLines={2}>{description}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const featureCardStyles = StyleSheet.create({
  wrapper: {
    width: '48%', // 2 cards per row
    minWidth: 150,
  },
  card: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: PREMIUM_COLORS.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    color: PREMIUM_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// =============================================================================
// PREMIUM ACTION CARD - Large action button with gradient
// =============================================================================

interface PremiumActionCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  gradientColors: [string, string];
  onPress: () => void;
  index: number;
  reduceMotion: boolean;
}

const PremiumActionCard: React.FC<PremiumActionCardProps> = ({
  icon,
  title,
  subtitle,
  gradientColors,
  onPress,
  index,
  reduceMotion,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 40)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 150 + 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 150 + 200,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index, reduceMotion]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        flex: 1,
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={actionCardStyles.gradient}
        >
          <View style={actionCardStyles.iconContainer}>
            <Feather name={icon} size={28} color={colors.white} />
          </View>
          <Text style={actionCardStyles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
          <Text style={actionCardStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const actionCardStyles = StyleSheet.create({
  gradient: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
});

// =============================================================================
// PREMIUM SPONSOR CARD - Glassmorphic sponsor card
// =============================================================================

interface PremiumSponsorCardProps {
  sponsor: Sponsor;
  onPress: () => void;
  index: number;
  reduceMotion: boolean;
}

const PremiumSponsorCard: React.FC<PremiumSponsorCardProps> = ({
  sponsor,
  onPress,
  index,
  reduceMotion,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100 + 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index, reduceMotion]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        width: 130, // Fixed width for consistent sizing
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${sponsor.name}. ${sponsor.tagline}`}
        accessibilityRole="button"
        accessibilityHint="Opens sponsor website"
      >
        <View style={sponsorCardStyles.card}>
          <View style={[sponsorCardStyles.iconContainer, { backgroundColor: `${sponsor.color}15` }]}>
            <Feather name={sponsor.icon} size={22} color={sponsor.color} />
          </View>
          <Text style={sponsorCardStyles.name} numberOfLines={1}>{sponsor.name}</Text>
          <Text style={sponsorCardStyles.tagline} numberOfLines={1}>{sponsor.tagline}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const sponsorCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    minHeight: 110,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: PREMIUM_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: PREMIUM_COLORS.text.muted,
    textAlign: 'center',
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TandyHomeScreen: React.FC = () => {
  const navigation = useNavigation<TandyHomeNavigationProp>();
  const insets = useSafeAreaInsets();
  const { width, isLandscape, isTablet, getScreenMargin, hp, wp } = useResponsive();

  const isSmallDevice = width <= 375;
  const isPhoneLandscape = isLandscape && !isTablet;

  // Accessibility: Reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

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
    return () => subscription?.remove();
  }, []);

  // Responsive values
  const horizontalPadding = useMemo(() => {
    if (isPhoneLandscape) return Math.max(insets.left + 20, 28);
    return getScreenMargin();
  }, [isPhoneLandscape, insets.left, getScreenMargin]);

  const avatarSize = useMemo(() => {
    if (isPhoneLandscape) return 70;
    if (isTablet) return 120;
    return 100;
  }, [isPhoneLandscape, isTablet]);

  // Navigation handlers
  const handleStartChat = () => navigation.navigate('TandyChat');
  const handleStartBreathing = () => navigation.navigate('TandyBreathing');
  const handleStartMeditation = () => navigation.navigate('TandyMeditation');
  const handleContactPsychiatrist = () => navigation.navigate('PsychiatristList');

  const handleSponsorPress = (sponsor: Sponsor) => {
    if (sponsor.url) {
      Linking.openURL(sponsor.url).catch(() => {});
    }
  };

  // Entrance animations
  const headerFade = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const headerSlide = useRef(new Animated.Value(reduceMotion ? 0 : -30)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
    ]).start();
  }, [headerFade, headerSlide, reduceMotion]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Gradient Background */}
      <LinearGradient
        colors={PREMIUM_COLORS.gradient.screenBg}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Floating Orbs */}
      {!reduceMotion && <AmbientBackground variant="mixed" />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: horizontalPadding,
            paddingLeft: Math.max(horizontalPadding, insets.left + 16),
            paddingRight: Math.max(horizontalPadding, insets.right + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main content wrapper for landscape layout */}
        <View style={isPhoneLandscape && styles.landscapeContentRow}>
          {/* Left column in landscape: Avatar + Title */}
          <View style={isPhoneLandscape && styles.landscapeLeftColumn}>
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                isPhoneLandscape && styles.headerLandscape,
                {
                  opacity: headerFade,
                  transform: [{ translateY: headerSlide }],
                },
              ]}
            >
              {/* Premium Avatar */}
              <PremiumAvatar size={avatarSize} reduceMotion={reduceMotion} />

              {/* Online Badge */}
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>

              <Text style={[styles.headerTitle, isPhoneLandscape && styles.headerTitleLandscape]} accessibilityRole="header">
                Tandy
              </Text>
              <Text style={[styles.headerSubtitle, isPhoneLandscape && styles.headerSubtitleLandscape]}>
                Your Wellness Companion
              </Text>
            </Animated.View>
          </View>

          {/* Right column in landscape: Actions */}
          <View style={isPhoneLandscape && styles.landscapeRightColumn}>
            {/* Welcome Card - Glass Effect */}
            <AnimatedEntrance delay={100} direction="up" style={styles.welcomeCardWrapper}>
              <View style={styles.welcomeCard}>
                {Platform.OS === 'ios' && (
                  <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                )}
                <View style={styles.welcomeContent}>
                  <Text style={[styles.welcomeTitle, isPhoneLandscape && styles.welcomeTitleLandscape]}>
                    Hi there! I'm Tandy
                  </Text>
                  <Text style={[styles.welcomeText, isPhoneLandscape && styles.welcomeTextLandscape]}>
                    Your personal wellness companion. I'm here to chat, listen, and help you relax whenever you need support.
                  </Text>
                </View>
              </View>
            </AnimatedEntrance>

            {/* Primary CTA - Chat with Tandy */}
            <AnimatedEntrance delay={200} direction="up" style={styles.primaryCTAWrapper}>
              <PremiumGradientButton
                onPress={handleStartChat}
                label="Chat with Tandy"
                icon="message-circle"
                variant="primary"
                size="xlarge"
                fullWidth
                accessibilityHint="Opens a conversation with Tandy"
              />
            </AnimatedEntrance>

            {/* Quick Actions Grid */}
            <View style={[styles.quickActionsGrid, isPhoneLandscape && styles.quickActionsGridLandscape]}>
              <PremiumActionCard
                icon="wind"
                title="Breathing"
                subtitle="Calm your mind"
                gradientColors={[colors.teal[400], colors.teal[600]]}
                onPress={handleStartBreathing}
                index={0}
                reduceMotion={reduceMotion}
              />
              <PremiumActionCard
                icon="sun"
                title="Meditation"
                subtitle="Find peace"
                gradientColors={[colors.orange[400], colors.orange[600]]}
                onPress={handleStartMeditation}
                index={1}
                reduceMotion={reduceMotion}
              />
            </View>

            {/* Contact Psychiatrist */}
            <AnimatedEntrance delay={500} direction="up" style={styles.psychiatristWrapper}>
              <Pressable
                onPress={handleContactPsychiatrist}
                accessibilityLabel="Contact our psychiatrist"
                accessibilityHint="Opens list of mental health professionals"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.psychiatristCard,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.psychiatristIconContainer}>
                  <Feather name="phone" size={22} color={colors.teal[600]} />
                </View>
                <View style={styles.psychiatristTextContainer}>
                  <Text style={styles.psychiatristTitle}>Contact Our Psychiatrist</Text>
                  <Text style={styles.psychiatristSubtitle}>
                    Professional mental health support
                  </Text>
                </View>
                <View style={styles.psychiatristArrow}>
                  <Feather name="chevron-right" size={20} color={colors.teal[600]} />
                </View>
              </Pressable>
            </AnimatedEntrance>
          </View>
        </View>

        {/* Features Section */}
        <AnimatedEntrance delay={300} direction="up">
          <View style={styles.sectionHeader}>
            <Feather name="zap" size={18} color={colors.orange[500]} />
            <Text style={styles.sectionTitle}>What I can help with</Text>
          </View>
        </AnimatedEntrance>

        <View style={[styles.featuresGrid, isTablet && styles.featuresGridTablet]}>
          {WELLNESS_FEATURES.map((feature, index) => (
            <PremiumFeatureCard
              key={feature.title}
              {...feature}
              onPress={
                feature.title === 'Breathing'
                  ? handleStartBreathing
                  : feature.title === 'Meditation'
                  ? handleStartMeditation
                  : handleStartChat
              }
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>

        {/* Sponsors Section */}
        <AnimatedEntrance delay={600} direction="up">
          <View style={styles.sponsorsSection}>
            <View style={[styles.sectionHeader, { marginLeft: 24 }]}>
              <Feather name="award" size={18} color={colors.gray[600]} />
              <Text style={[styles.sectionTitle, { color: colors.gray[600] }]}>
                Our Partners
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sponsorsScrollContent}
            >
              {SPONSORS.map((sponsor, index) => (
                <PremiumSponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  onPress={() => handleSponsorPress(sponsor)}
                  index={index}
                  reduceMotion={reduceMotion}
                />
              ))}
            </ScrollView>

            <Text style={styles.sponsorsDisclaimer}>
              These partners help make Tandy possible
            </Text>
          </View>
        </AnimatedEntrance>
      </ScrollView>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Landscape layout
  landscapeContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
    marginBottom: 20,
  },
  landscapeLeftColumn: {
    alignItems: 'center',
    width: 150,
  },
  landscapeRightColumn: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerLandscape: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: PREMIUM_COLORS.text.primary,
    letterSpacing: 1,
    marginTop: 16,
  },
  headerTitleLandscape: {
    fontSize: 24,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: PREMIUM_COLORS.text.secondary,
    marginTop: 4,
  },
  headerSubtitleLandscape: {
    fontSize: 14,
  },

  // Online badge
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.teal[50],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal[500],
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // Welcome card
  welcomeCardWrapper: {
    marginBottom: 20,
  },
  welcomeCard: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.75)' : colors.white,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  welcomeContent: {
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: PREMIUM_COLORS.text.primary,
    marginBottom: 8,
  },
  welcomeTitleLandscape: {
    fontSize: 18,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 24,
    color: PREMIUM_COLORS.text.secondary,
  },
  welcomeTextLandscape: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Primary CTA
  primaryCTAWrapper: {
    marginBottom: 20,
  },

  // Quick actions grid
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  quickActionsGridLandscape: {
    gap: 10,
  },

  // Psychiatrist card
  psychiatristWrapper: {
    marginBottom: 28,
  },
  psychiatristCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
    borderRadius: 24,
    padding: 18,
    gap: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.teal[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
    }),
  },
  psychiatristIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.teal[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  psychiatristTextContainer: {
    flex: 1,
  },
  psychiatristTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.teal[700],
    marginBottom: 3,
  },
  psychiatristSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.teal[600],
    lineHeight: 20,
  },
  psychiatristArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.teal[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PREMIUM_COLORS.text.primary,
    letterSpacing: 0.3,
  },

  // Features grid - 2x2 layout
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  featuresGridTablet: {
    gap: 16,
  },
  featureCardWrapper: {
    width: '47%', // 2 cards per row with gap
    minWidth: 150,
  },

  // Sponsors section
  sponsorsSection: {
    marginBottom: 20,
    marginHorizontal: -24, // Allow scroll to edge
  },
  sponsorsScrollContent: {
    gap: 12,
    paddingLeft: 24, // Align with content above
    paddingRight: 48, // Extra padding to prevent truncation
  },
  sponsorsDisclaimer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600], // Better contrast
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 24, // Re-add margin since section has negative margin
  },
});

export default TandyHomeScreen;
