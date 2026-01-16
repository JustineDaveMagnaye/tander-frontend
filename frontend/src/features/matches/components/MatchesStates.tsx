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

import React, { useRef, useEffect, useMemo } from 'react';
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
 * Skeleton Card for Loading State
 */
const SkeletonCard: React.FC<{
  width: number;
  height: number;
  reduceMotion: boolean;
}> = ({ width, height, reduceMotion }) => {
  const infoHeight = height * 0.28;
  const imageHeight = height - infoHeight;
  const borderRadius = Math.min(24, width * 0.1);

  return (
    <View style={[styles.skeletonCard, { width, height, borderRadius }]}>
      {/* Image skeleton */}
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
          width="100%"
          height={imageHeight}
          borderRadius={0}
          reduceMotion={reduceMotion}
        />
      </View>

      {/* Info skeleton */}
      <View
        style={[
          styles.skeletonInfo,
          {
            height: infoHeight,
            borderBottomLeftRadius: borderRadius,
            borderBottomRightRadius: borderRadius,
            padding: 12,
          },
        ]}
      >
        <Shimmer width="70%" height={18} borderRadius={6} reduceMotion={reduceMotion} />
        <View style={{ height: 8 }} />
        <Shimmer width="50%" height={14} borderRadius={4} reduceMotion={reduceMotion} />
        <View style={{ height: 6 }} />
        <Shimmer width="40%" height={12} borderRadius={4} reduceMotion={reduceMotion} />
      </View>
    </View>
  );
};

export const MatchesLoadingState: React.FC<LoadingStateProps> = ({
  fontSizes,
  spacing,
  isTablet = false,
  reduceMotion = false,
  cardDimensions,
}) => {
  const iconSize = isTablet ? 56 : 48;
  const containerSize = isTablet ? 110 : 95;

  // Calculate skeleton cards to show
  const numSkeletons = cardDimensions.numColumns * 2;

  return (
    <View style={styles.loadingContainer}>
      {/* Animated Heart */}
      <AnimatedHeart
        size={iconSize}
        containerSize={containerSize}
        reduceMotion={reduceMotion}
      />

      {/* Loading Text */}
      <Text
        style={[
          styles.loadingTitle,
          {
            fontSize: Math.max(fontSizes.body, 20),
            marginTop: spacing.l,
          },
        ]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading your matches"
      >
        Finding your matches...
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
        Love is just around the corner
      </Text>

      {/* Skeleton Cards Grid */}
      <View
        style={[
          styles.skeletonGrid,
          {
            marginTop: spacing.xl,
            gap: cardDimensions.cardGap,
            paddingHorizontal: spacing.l,
          },
        ]}
      >
        {Array.from({ length: Math.min(numSkeletons, 4) }).map((_, index) => (
          <SkeletonCard
            key={index}
            width={cardDimensions.cardWidth * 0.85}
            height={cardDimensions.cardHeight * 0.8}
            reduceMotion={reduceMotion}
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

  return (
    <View style={styles.errorContainer}>
      {/* Error Icon */}
      <View
        style={[
          styles.errorIconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
        ]}
      >
        <LinearGradient
          colors={isOffline ? [colors.gray[100], colors.gray[200]] : [colors.orange[50], colors.orange[100]]}
          style={[StyleSheet.absoluteFill, { borderRadius: containerSize / 2 }]}
        />
        <Feather
          name={isOffline ? 'wifi-off' : 'alert-circle'}
          size={iconSize}
          color={isOffline ? colors.gray[500] : colors.orange[500]}
        />
      </View>

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
        {isOffline ? "You're Offline" : 'Oops! Something Went Wrong'}
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
        {isOffline
          ? "Please check your connection. We'll show your matches once you're back online."
          : "We couldn't load your matches. Don't worry, your connections are safe!"}
      </Text>

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
          accessibilityLabel="Try again"
          accessibilityRole="button"
          accessibilityHint="Double tap to retry loading matches"
        >
          <LinearGradient
            colors={colors.gradient.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: minButtonHeight / 2 }]}
          />
          <Feather name="refresh-cw" size={Math.max(fontSizes.body, 18)} color={colors.white} />
          <Text style={[styles.retryButtonText, { fontSize: Math.max(fontSizes.body, 18) }]}>
            Try Again
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

// Empty state content configuration - Orange/Teal Theme
const EMPTY_STATE_CONTENT: Record<FilterType, {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  buttonText: string;
  buttonIcon: keyof typeof Feather.glyphMap;
  gradientColors: readonly [string, string];
}> = {
  all: {
    icon: 'heart',
    title: 'Your Love Story Starts Here',
    message: "You haven't matched with anyone yet, but that's about to change! Start swiping to find your perfect match.",
    buttonText: 'Start Discovering',
    buttonIcon: 'search',
    gradientColors: colors.gradient.ctaButton as unknown as [string, string], // Orange to Teal
  },
  new: {
    icon: 'star',
    title: 'No New Matches Yet',
    message: "Keep your heart open! New connections are waiting to be made. Check back soon for exciting new matches.",
    buttonText: 'View All Matches',
    buttonIcon: 'heart',
    gradientColors: colors.gradient.primaryButton as unknown as [string, string], // Orange gradient
  },
  online: {
    icon: 'users',
    title: 'No One Online Right Now',
    message: "Your matches are currently away, but they'll be back! In the meantime, why not view all your connections?",
    buttonText: 'View All Matches',
    buttonIcon: 'heart',
    gradientColors: [colors.teal[500], colors.teal[600]] as [string, string], // Teal gradient
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
            colors={content.gradientColors}
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
              marginBottom: isLandscape && !isTablet ? spacing.m : spacing.l,
              maxWidth: isTablet ? 480 : 340,
            },
          ]}
        >
          {content.message}
        </Text>

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
              colors={content.gradientColors}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
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
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    opacity: 0.6,
  },
  skeletonCard: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  skeletonImage: {
    backgroundColor: colors.gray[100],
    overflow: 'hidden',
  },
  skeletonInfo: {
    backgroundColor: colors.white,
    justifyContent: 'center',
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
});

export default {
  MatchesLoadingState,
  MatchesErrorState,
  MatchesEmptyState,
};
