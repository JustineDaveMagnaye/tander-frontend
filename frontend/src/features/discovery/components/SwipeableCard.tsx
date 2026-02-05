/**
 * TANDER Swipeable Card Component
 * Animated swipeable profile card with gesture support
 * Senior-friendly: Higher swipe threshold (40%), visual feedback, haptics
 *
 * Follows design_system2.md:
 * - Distance threshold: 40% of screen width
 * - Velocity: 300ms minimum swipe duration
 * - Visual feedback at decision thresholds
 * - Haptic feedback at decision threshold
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ProfileCard, ProfileData } from './ProfileCard';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

const ROTATION_ANGLE = 15;

interface SwipeableCardProps {
  profile: ProfileData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPress?: () => void;
  isTopCard?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  isTopCard = true,
}) => {
  const { hp, width, isLandscape } = useResponsive();

  // Senior-friendly: Higher threshold (40% vs standard 20%)
  const SWIPE_THRESHOLD = width * 0.4;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(isTopCard ? 1 : 0.95);
  const hasReachedThreshold = useSharedValue(false);

  // Reset animation position on orientation change
  useEffect(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    hasReachedThreshold.value = false;
  }, [width, translateX, translateY, hasReachedThreshold]);

  // Haptic feedback when threshold reached
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Handle swipe completion
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight]);

  // Gesture handler
  const panGesture = Gesture.Pan()
    .enabled(isTopCard)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3; // Reduced vertical movement

      // Check threshold and trigger haptic
      const reachedThreshold = Math.abs(event.translationX) > SWIPE_THRESHOLD;
      if (reachedThreshold && !hasReachedThreshold.value) {
        hasReachedThreshold.value = true;
        runOnJS(triggerHaptic)();
      } else if (!reachedThreshold && hasReachedThreshold.value) {
        hasReachedThreshold.value = false;
      }
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD;
      const direction = event.translationX > 0 ? 'right' : 'left';

      if (shouldSwipe) {
        // Swipe off screen
        translateX.value = withTiming(
          direction === 'right' ? width * 1.5 : -width * 1.5,
          { duration: 300 },
          () => {
            runOnJS(handleSwipeComplete)(direction);
          }
        );
        translateY.value = withTiming(event.translationY * 0.5, { duration: 300 });
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
        hasReachedThreshold.value = false;
      }
    });

  // Card animation style
  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  // Like overlay animation
  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD],
      [0, 0.3, 0.8],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  // Pass overlay animation
  const passOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0],
      [0.8, 0.3, 0],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  const cardHeight = isLandscape ? hp(75) : hp(62);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, cardStyle]}>
        <ProfileCard
          profile={profile}
          onPress={onPress}
          height={cardHeight}
        />

        {/* Like Overlay */}
        <Animated.View style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}>
          <View style={styles.likeLabel}>
            <Text variant="h1" color={colors.semantic.success} style={styles.labelText}>
              LIKE
            </Text>
          </View>
        </Animated.View>

        {/* Pass Overlay */}
        <Animated.View style={[styles.overlay, styles.passOverlay, passOverlayStyle]}>
          <View style={styles.passLabel}>
            <Text variant="h1" color={colors.semantic.error} style={styles.labelText}>
              NOPE
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.xlarge,
  },
  likeOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  passOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  likeLabel: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.l,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 4,
    borderColor: colors.semantic.success,
    borderRadius: borderRadius.small,
    padding: spacing.s,
  },
  passLabel: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.l,
    transform: [{ rotate: '20deg' }],
    borderWidth: 4,
    borderColor: colors.semantic.error,
    borderRadius: borderRadius.small,
    padding: spacing.s,
  },
  labelText: {
    fontWeight: '900',
    fontSize: 32,
    letterSpacing: 2,
  },
});

export default SwipeableCard;
