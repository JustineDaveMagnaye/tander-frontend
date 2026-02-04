/**
 * PremiumTypingIndicator Component
 * Ultra-premium iOS-style typing indicator with fluid bubble animation
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import { colors } from '@/shared/styles/colors';
import {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
} from '../styles/premiumStyles';

// ============================================================================
// TYPES
// ============================================================================

interface PremiumTypingIndicatorProps {
  userName?: string;
  userAvatar?: string;
  showAvatar?: boolean;
  variant?: 'bubble' | 'inline' | 'minimal';
}

// ============================================================================
// ANIMATED DOT COMPONENT
// ============================================================================

const AnimatedDot = memo(({ index }: { index: number }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    const delay = index * 150;

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, [index, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.dot, animatedStyle]} />
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumTypingIndicator = memo(({
  userName,
  userAvatar,
  showAvatar = true,
  variant = 'bubble',
}: PremiumTypingIndicatorProps) => {

  // Minimal variant - just dots
  if (variant === 'minimal') {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.minimalContainer}
      >
        <AnimatedDot index={0} />
        <AnimatedDot index={1} />
        <AnimatedDot index={2} />
      </Animated.View>
    );
  }

  // Inline variant - text style
  if (variant === 'inline') {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.inlineContainer}
      >
        <Text style={styles.inlineText}>
          {userName ? `${userName} is typing` : 'typing'}
        </Text>
        <View style={styles.inlineDots}>
          <AnimatedDot index={0} />
          <AnimatedDot index={1} />
          <AnimatedDot index={2} />
        </View>
      </Animated.View>
    );
  }

  // Bubble variant (default) - message bubble style
  return (
    <Animated.View
      entering={FadeIn.springify().damping(15)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      {/* Avatar */}
      {showAvatar && (
        <View style={styles.avatarContainer}>
          {userAvatar ? (
            <Image
              source={{ uri: userAvatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {userName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Typing bubble */}
      <View style={[styles.bubble, premiumShadows.subtle]}>
        {/* Bubble tail */}
        <View style={styles.bubbleTail} />

        {/* Animated dots */}
        <View style={styles.dotsContainer}>
          <AnimatedDot index={0} />
          <AnimatedDot index={1} />
          <AnimatedDot index={2} />
        </View>
      </View>
    </Animated.View>
  );
});

PremiumTypingIndicator.displayName = 'PremiumTypingIndicator';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Bubble variant
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: premiumSpacing.md,
    paddingVertical: premiumSpacing.sm,
  },

  avatarContainer: {
    marginRight: premiumSpacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: premiumColors.system.gray5,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray4,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  bubble: {
    backgroundColor: premiumColors.bubbles.received.background,
    paddingHorizontal: premiumSpacing.lg,
    paddingVertical: premiumSpacing.md,
    borderRadius: premiumRadius.bubble,
    borderBottomLeftRadius: premiumRadius.bubbleTail,
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: 0,
    left: -6,
    width: 12,
    height: 12,
    backgroundColor: premiumColors.bubbles.received.background,
    borderBottomRightRadius: 10,
    transform: [{ rotate: '20deg' }],
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: premiumSpacing.xs,
    height: 16,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: premiumColors.system.gray,
  },

  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: premiumSpacing.sm,
  },
  inlineText: {
    fontSize: premiumTypography.sizes.footnote,
    color: premiumColors.system.gray,
    marginRight: premiumSpacing.xxs,
  },
  inlineDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // Minimal variant
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: premiumSpacing.xxs,
    paddingHorizontal: premiumSpacing.xs,
  },
});

export default PremiumTypingIndicator;
