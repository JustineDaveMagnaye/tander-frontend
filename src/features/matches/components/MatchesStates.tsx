/**
 * TANDER MatchesStates - PREMIUM REDESIGN
 * Beautiful loading, error, and empty state components
 *
 * Design Inspiration: Premium dating apps with warm, romantic aesthetics
 *
 * Features:
 * - Stunning skeleton loading with shimmer
 * - Animated heart pulse for loading state
 * - Warm, encouraging empty states with romantic messaging
 * - Friendly error states with clear CTAs
 * - Senior-friendly touch targets and font sizes
 * - WCAG AA contrast compliance
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { BREAKPOINTS } from '@shared/hooks/useResponsive';
import type { FilterType } from '../types';
import type { MatchesFontSizes, MatchesSpacing, CardDimensions } from '../hooks/useMatchesResponsive';
import { Shimmer } from './Shimmer';

// ============================================================================
// LOADING STATE - Premium Skeleton Loading
// ============================================================================

interface LoadingStateProps {
  fontSizes: MatchesFontSizes;
  spacing: MatchesSpacing;
  isTablet?: boolean;
  reduceMotion?: boolean;
  cardDimensions: CardDimensions;
}

/**
 * Animated Heart with Heartbeat Effect
 */
const AnimatedHeart: React.FC<{
  size: number;
  containerSize: number;
  reduceMotion: boolean;
}> = ({ size, containerSize, reduceMotion }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.5);
      return;
    }

    // Heartbeat animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [pulseAnim, glowAnim, reduceMotion]);

  return (
    <View style={[styles.heartContainer, { width: containerSize, height: containerSize }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.heartGlow,
          {
            width: containerSize * 1.5,
            height: containerSize * 1.5,
            borderRadius: containerSize * 0.75,
            opacity: glowAnim,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.orange[400], colors.teal[400]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Main heart */}
      <Animated.View
        style={[
          styles.heartInner,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={colors.gradient.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: containerSize / 2 }]}
        />
        <Feather name="heart" size={size} color={colors.white} />
      </Animated.View>
    </View>
  );
};

/**
 * Enhanced Skeleton Card - Matches actual card layout exactly
 */
const SkeletonCard: React.FC<{
  width: number;
  height: number;
  reduceMotion: boolean;
  index: number;
}> = ({ width, height, reduceMotion, index }) => {
  const INFO_SECTION_HEIGHT = 115;
  const imageHeight = height - INFO_SECTION_HEIGHT;
  const borderRadius = 20;
  const MINI_AVATAR_SIZE = 38;

  // Staggered entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    const delay = index * 100; // Staggered delay
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        {
          width,
          height,
          borderRadius,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Photo skeleton - matches UltraPremiumMatchCard photo section */}
      <View
        style={[
          styles.skeletonImage,
          {
            height: imageHeight,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          },
        ]}
      >
        <Shimmer
          width={width}
          height={imageHeight}
          borderRadius={0}
          reduceMotion={reduceMotion}
          warmTint
          delay={index * 80}
        />

        {/* Fake online indicator placeholder */}
        <View style={styles.skeletonOnlineDot} />
      </View>

      {/* Info section skeleton - matches UltraPremiumMatchCard info section exactly */}
      <View style={[styles.skeletonInfo, { height: INFO_SECTION_HEIGHT }]}>
        {/* Row 1: Mini avatar + Name + Badges */}
        <View style={styles.skeletonPrimaryRow}>
          {/* Mini avatar */}
          <Shimmer
            width={MINI_AVATAR_SIZE}
            height={MINI_AVATAR_SIZE}
            borderRadius={MINI_AVATAR_SIZE / 2}
            reduceMotion={reduceMotion}
            delay={index * 80 + 100}
          />
          {/* Name skeleton */}
          <View style={styles.skeletonNameContainer}>
            <Shimmer
              width="75%"
              height={18}
              borderRadius={6}
              reduceMotion={reduceMotion}
              delay={index * 80 + 150}
            />
          </View>
          {/* Badge placeholder */}
          <Shimmer
            width={48}
            height={22}
            borderRadius={11}
            reduceMotion={reduceMotion}
            warmTint
            delay={index * 80 + 200}
          />
        </View>

        {/* Row 2: Location skeleton */}
        <View style={styles.skeletonLocationRow}>
          <Shimmer
            width={14}
            height={14}
            borderRadius={3}
            reduceMotion={reduceMotion}
            delay={index * 80 + 250}
          />
          <Shimmer
            width="55%"
            height={14}
            borderRadius={4}
            reduceMotion={reduceMotion}
            delay={index * 80 + 300}
          />
        </View>

        {/* Row 3: Time skeleton */}
        <View style={styles.skeletonMetaRow}>
          <Shimmer
            width={12}
            height={12}
            borderRadius={3}
            reduceMotion={reduceMotion}
            delay={index * 80 + 350}
          />
          <Shimmer
            width="40%"
            height={13}
            borderRadius={4}
            reduceMotion={reduceMotion}
            delay={index * 80 + 400}
          />
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Animated loading dots for visual feedback
 */
const LoadingDots: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const animateDot = (dotAnim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 200);
    const anim3 = animateDot(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3, reduceMotion]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.loadingDotsContainer}>
      <Animated.View style={[styles.loadingDot, dotStyle(dot1)]} />
      <Animated.View style={[styles.loadingDot, dotStyle(dot2)]} />
      <Animated.View style={[styles.loadingDot, dotStyle(dot3)]} />
    </View>
  );
};

/**
 * Senior-friendly loading messages that rotate
 */
const LOADING_MESSAGES = [
  { title: 'Finding your matches...', subtitle: 'Good things take a moment' },
  { title: 'Preparing profiles...', subtitle: 'Someone special is waiting' },
  { title: 'Almost there...', subtitle: 'Love is just around the corner' },
];

export const MatchesLoadingState: React.FC<LoadingStateProps> = ({
  fontSizes,
  spacing,
  isTablet = false,
  reduceMotion = false,
  cardDimensions,
}) => {
  const iconSize = isTablet ? 56 : 48;
  const containerSize = isTablet ? 110 : 95;
  const [messageIndex, setMessageIndex] = React.useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Rotate through loading messages
  useEffect(() => {
    if (reduceMotion) return;

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim, reduceMotion]);

  // Calculate skeleton cards to show - use FULL dimensions
  const numSkeletons = Math.min(cardDimensions.numColumns * 2, 6);
  const currentMessage = LOADING_MESSAGES[messageIndex];

  return (
    <View style={styles.loadingContainer}>
      {/* Header with Heart and Message */}
      <View style={styles.loadingHeader}>
        {/* Animated Heart */}
        <AnimatedHeart
          size={iconSize}
          containerSize={containerSize}
          reduceMotion={reduceMotion}
        />

        {/* Loading Text with fade animation */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text
            style={[
              styles.loadingTitle,
              {
                fontSize: Math.max(fontSizes.body, 20),
                marginTop: spacing.m,
              },
            ]}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your matches"
          >
            {currentMessage.title}
          </Text>
          <Text
            style={[
              styles.loadingSubtext,
              {
                fontSize: Math.max(fontSizes.caption, 16),
                marginTop: spacing.xs,
              },
            ]}
          >
            {currentMessage.subtitle}
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <LoadingDots reduceMotion={reduceMotion} />
      </View>

      {/* Full-Size Skeleton Cards Grid */}
      <View
        style={[
          styles.skeletonGrid,
          {
            marginTop: spacing.l,
            gap: cardDimensions.cardGap,
            paddingHorizontal: spacing.l,
          },
        ]}
      >
        {Array.from({ length: numSkeletons }).map((_, index) => (
          <SkeletonCard
            key={index}
            width={cardDimensions.cardWidth}
            height={cardDimensions.cardHeight}
            reduceMotion={reduceMotion}
            index={index}
          />
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// ERROR STATE - Friendly Error with Retry
// ============================================================================

interface ErrorStateProps {
  isOffline: boolean;
  onRetry: () => void;
  fontSizes: MatchesFontSizes;
  spacing: MatchesSpacing;
  buttonHeight: number;
  isLandscape: boolean;
  isTablet?: boolean;
}

export const MatchesErrorState: React.FC<ErrorStateProps> = ({
  isOffline,
  onRetry,
  fontSizes,
  spacing,
  buttonHeight,
  isLandscape,
  isTablet = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation for the icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onRetry();
  };

  const iconSize = isLandscape && !isTablet ? 44 : isTablet ? 64 : 56;
  const containerSize = isLandscape && !isTablet ? 90 : isTablet ? 125 : 110;
  const minButtonHeight = Math.max(buttonHeight, 60);

  // Senior-friendly error content
  const errorContent = isOffline
    ? {
        icon: 'wifi-off' as const,
        title: "You're Currently Offline",
        message: "No worries! Check your internet connection and try again. Your matches will be here waiting for you.",
        tip: "Tip: Try turning Wi-Fi off and on again",
        buttonText: 'Try Again',
        buttonIcon: 'refresh-cw' as const,
      }
    : {
        icon: 'cloud-off' as const,
        title: "Having Trouble Loading",
        message: "We're having a little trouble right now, but don't worry - all your matches and conversations are safe!",
        tip: "This usually fixes itself in a moment",
        buttonText: 'Refresh',
        buttonIcon: 'refresh-cw' as const,
      };

  return (
    <View style={styles.errorContainer}>
      {/* Error Icon with subtle pulse */}
      <Animated.View
        style={[
          styles.errorIconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isOffline ? [colors.gray[100], colors.gray[200]] : [colors.orange[50], colors.orange[100]]}
          style={[StyleSheet.absoluteFill, { borderRadius: containerSize / 2 }]}
        />
        <Feather
          name={errorContent.icon}
          size={iconSize}
          color={isOffline ? colors.gray[500] : colors.orange[500]}
        />
      </Animated.View>

      {/* Error Title */}
      <Text
        style={[
          styles.errorTitle,
          {
            fontSize: Math.max(fontSizes.sectionTitle, 24),
            marginTop: spacing.l,
          },
        ]}
        accessible
        accessibilityRole="header"
      >
        {errorContent.title}
      </Text>

      {/* Error Message */}
      <Text
        style={[
          styles.errorMessage,
          {
            fontSize: Math.max(fontSizes.body, 18),
            lineHeight: Math.max(fontSizes.body, 18) * 1.55,
            marginTop: spacing.s,
            maxWidth: isTablet ? 420 : 320,
          },
        ]}
      >
        {errorContent.message}
      </Text>

      {/* Helpful Tip */}
      <View style={[styles.errorTipBadge, { marginTop: spacing.m }]}>
        <Feather name="info" size={14} color={colors.teal[600]} />
        <Text style={styles.errorTipText}>{errorContent.tip}</Text>
      </View>

      {/* Retry Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: spacing.xl }}>
        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              height: minButtonHeight,
              paddingHorizontal: spacing.xl,
              borderRadius: minButtonHeight / 2,
              minWidth: 200,
            },
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessible
          accessibilityLabel={errorContent.buttonText}
          accessibilityRole="button"
          accessibilityHint="Double tap to retry loading matches"
        >
          <LinearGradient
            colors={colors.gradient.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: minButtonHeight / 2 }]}
          />
          <Feather name={errorContent.buttonIcon} size={Math.max(fontSizes.body, 18)} color={colors.white} />
          <Text style={[styles.retryButtonText, { fontSize: Math.max(fontSizes.body, 18) }]}>
            {errorContent.buttonText}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// EMPTY STATE - Warm, Encouraging Empty States
// ============================================================================

interface EmptyStateProps {
  activeFilter: FilterType;
  onFilterPress: (filter: FilterType) => void;
  onDiscoverPress: () => void;
  fontSizes: MatchesFontSizes;
  spacing: MatchesSpacing;
  buttonHeight: number;
  isLandscape: boolean;
  isTablet?: boolean;
  screenWidth?: number;
  reduceMotion?: boolean;
}

// Empty state content configuration - Senior-friendly, warm messaging
const EMPTY_STATE_CONTENT: Record<FilterType, {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  encouragement: string;
  buttonText: string;
  buttonIcon: keyof typeof Feather.glyphMap;
  gradientColors: readonly [string, string];
}> = {
  all: {
    icon: 'heart',
    title: 'Your Love Story Starts Here',
    message: "You haven't matched with anyone yet, but that's perfectly okay! Every beautiful relationship begins with a first step.",
    encouragement: "Take your time - the right person is worth waiting for",
    buttonText: 'Start Discovering',
    buttonIcon: 'compass',
    gradientColors: colors.gradient.ctaButton as unknown as [string, string],
  },
  new: {
    icon: 'star',
    title: 'No New Matches Yet',
    message: "New matches take time to bloom. Keep your profile shining and someone special will notice you soon!",
    encouragement: "Good things come to those who wait",
    buttonText: 'View All Matches',
    buttonIcon: 'heart',
    gradientColors: colors.gradient.primaryButton as unknown as [string, string],
  },
  online: {
    icon: 'coffee',
    title: 'Your Matches Are Away',
    message: "Everyone's taking a break right now. Why not browse your connections or update your profile while you wait?",
    encouragement: "They'll be back soon - grab a coffee!",
    buttonText: 'View All Matches',
    buttonIcon: 'heart',
    gradientColors: [colors.teal[500], colors.teal[600]] as [string, string],
  },
};

export const MatchesEmptyState = React.memo<EmptyStateProps>(
  ({
    activeFilter,
    onFilterPress,
    onDiscoverPress,
    fontSizes,
    spacing,
    buttonHeight,
    isLandscape,
    isTablet = false,
    screenWidth = 375,
    reduceMotion = false,
  }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const content = EMPTY_STATE_CONTENT[activeFilter];

    // Heartbeat animation for icon
    useEffect(() => {
      if (reduceMotion) {
        pulseAnim.setValue(1);
        return;
      }

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, [pulseAnim, reduceMotion]);

    const handlePress = () => {
      if (activeFilter === 'all') {
        onDiscoverPress();
      } else {
        onFilterPress('all');
      }
    };

    const handlePressIn = () => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
      }).start();
    };

    const handlePressOut = () => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    };

    const isVerySmall = screenWidth < BREAKPOINTS.xs + 40;
    const iconContainerSize = isLandscape && !isTablet
      ? Math.min(80, screenWidth * 0.12)
      : isVerySmall
        ? 100
        : isTablet
          ? 160
          : 130;
    const iconSize = isLandscape && !isTablet
      ? Math.min(40, iconContainerSize * 0.48)
      : isVerySmall
        ? 52
        : isTablet
          ? 80
          : 68;

    const minButtonHeight = Math.max(buttonHeight, 60);

    return (
      <View
        style={[
          styles.emptyContainer,
          {
            paddingVertical: isLandscape && !isTablet ? 32 : isTablet ? 64 : 48,
            paddingHorizontal: isVerySmall ? spacing.m : spacing.xl,
            marginHorizontal: spacing.l,
          },
        ]}
      >
        {/* Animated Icon */}
        <Animated.View
          style={[
            styles.emptyIconContainer,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: iconContainerSize / 2,
              marginBottom: isLandscape && !isTablet ? spacing.m : spacing.l,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[...content.gradientColors]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: iconContainerSize / 2 }]}
          />
          <Feather name={content.icon} size={iconSize} color={colors.white} />
        </Animated.View>

        {/* Title */}
        <Text
          style={[
            styles.emptyTitle,
            {
              fontSize: Math.max(fontSizes.emptyTitle, 22),
              lineHeight: Math.max(fontSizes.emptyTitle, 22) * 1.25,
            },
          ]}
          accessible
          accessibilityRole="header"
        >
          {content.title}
        </Text>

        {/* Message */}
        <Text
          style={[
            styles.emptyMessage,
            {
              fontSize: Math.max(fontSizes.emptyBody, 17),
              lineHeight: Math.max(fontSizes.emptyBody, 17) * 1.55,
              marginTop: spacing.s,
              maxWidth: isTablet ? 480 : 340,
            },
          ]}
        >
          {content.message}
        </Text>

        {/* Encouragement - Senior-friendly warm message */}
        <View
          style={[
            styles.encouragementBadge,
            { marginTop: spacing.m, marginBottom: isLandscape && !isTablet ? spacing.m : spacing.l },
          ]}
        >
          <Feather name="sun" size={14} color={colors.orange[500]} />
          <Text style={styles.encouragementText}>{content.encouragement}</Text>
        </View>

        {/* Action Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.emptyButton,
              {
                height: minButtonHeight,
                paddingHorizontal: isVerySmall ? spacing.l : spacing.xl,
                borderRadius: minButtonHeight / 2,
                minWidth: isVerySmall ? 220 : 260,
              },
            ]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessible
            accessibilityLabel={content.buttonText}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[...content.gradientColors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: minButtonHeight / 2 }]}
            />
            <Feather name={content.buttonIcon} size={Math.max(fontSizes.body, 18)} color={colors.white} />
            <Text style={[styles.emptyButtonText, { fontSize: Math.max(fontSizes.body, 17) }]}>
              {content.buttonText}
            </Text>
            <Feather name="arrow-right" size={Math.max(fontSizes.body, 18)} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>

        {/* Secondary text for "all" filter */}
        {activeFilter === 'all' && (
          <Text
            style={[
              styles.emptyHint,
              {
                fontSize: Math.max(fontSizes.caption, 15),
                marginTop: spacing.m,
              },
            ]}
          >
            Swipe right to like, left to pass
          </Text>
        )}
      </View>
    );
  }
);

MatchesEmptyState.displayName = 'MatchesEmptyState';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Loading State
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  heartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartGlow: {
    position: 'absolute',
    overflow: 'hidden',
  },
  heartInner: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingTitle: {
    fontWeight: '700',
    color: colors.gray[800],
    textAlign: 'center',
  },
  loadingSubtext: {
    color: colors.gray[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange[400],
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  skeletonCard: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  skeletonImage: {
    backgroundColor: colors.gray[50],
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonOnlineDot: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.gray[200],
    borderWidth: 2,
    borderColor: colors.white,
  },
  skeletonInfo: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  skeletonPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonNameContainer: {
    flex: 1,
    minWidth: 0,
  },
  skeletonLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 48, // 38 (avatar) + 10 (gap)
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 48,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  errorTitle: {
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.gray[600],
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  retryButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  errorTipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.teal[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  errorTipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.teal[700],
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
  },
  emptyIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontWeight: '800',
    color: colors.gray[900],
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyMessage: {
    color: colors.gray[600],
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  emptyHint: {
    color: colors.gray[400],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  encouragementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.orange[50],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.orange[100],
  },
  encouragementText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.orange[700],
    fontStyle: 'italic',
  },
});

export default {
  MatchesLoadingState,
  MatchesErrorState,
  MatchesEmptyState,
};
