/**
 * TANDER EliteMatchCardSkeleton
 *
 * Loading skeleton that matches the EliteMatchCard layout exactly.
 * Uses animated shimmer effect for premium feel.
 *
 * Structure mirrors EliteMatchCard:
 * ┌─────────────────────────────┐
 * │                             │
 * │    PHOTO SKELETON           │  Photo height: width * 1.25
 * │    (Shimmer animation)      │
 * │                             │
 * └─────────────────────────────┘
 * ┌─────────────────────────────┐
 * │ ████████████  ███  ██       │  Row 1 skeleton
 * │ █████████████                │  Row 2 skeleton
 * │ ██████████                   │  Row 3 skeleton
 * └─────────────────────────────┘
 *
 * 80px info section height (matches EliteMatchCard)
 */

import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  Easing,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  INFO_HEIGHT: 90,
  BORDER_RADIUS: 14,
  PHOTO_RATIO: 1.0,
  SHIMMER_DURATION: 1500,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface EliteMatchCardSkeletonProps {
  width: number;
  height?: number;
  style?: ViewStyle;
  reduceMotion?: boolean;
}

// ============================================================================
// SHIMMER COMPONENT
// ============================================================================

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const Shimmer: React.FC<{
  width: number;
  height: number;
  borderRadius?: number;
  reduceMotion?: boolean;
}> = memo(({ width, height, borderRadius = 4, reduceMotion = false }) => {
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (reduceMotion) {
      translateX.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: CONFIG.SHIMMER_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [translateX, width, reduceMotion]);

  return (
    <View
      style={[
        shimmerStyles.container,
        { width, height, borderRadius, overflow: 'hidden' },
      ]}
    >
      <View style={[shimmerStyles.base, { borderRadius }]} />
      {!reduceMotion && (
        <AnimatedLinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.4)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            shimmerStyles.shimmer,
            {
              width: width * 0.6,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
    </View>
  );
});

const shimmerStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  base: {
    flex: 1,
    backgroundColor: colors.gray[200],
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EliteMatchCardSkeleton: React.FC<EliteMatchCardSkeletonProps> = memo(
  ({ width, height: providedHeight, style, reduceMotion = false }) => {
    // Calculate dimensions
    const photoHeight = providedHeight
      ? providedHeight - CONFIG.INFO_HEIGHT
      : width * CONFIG.PHOTO_RATIO;
    const totalHeight = photoHeight + CONFIG.INFO_HEIGHT;

    return (
      <View
        style={[
          styles.container,
          { width, height: totalHeight },
          style,
        ]}
        accessibilityLabel="Loading match card"
        accessibilityRole="none"
      >
        {/* Photo skeleton */}
        <View style={[styles.photoSection, { height: photoHeight }]}>
          <Shimmer
            width={width}
            height={photoHeight}
            borderRadius={0}
            reduceMotion={reduceMotion}
          />
        </View>

        {/* Info section skeleton */}
        <View style={styles.infoSection}>
          {/* Row 1: Name + badges */}
          <View style={styles.row1}>
            <Shimmer
              width={width * 0.55}
              height={18}
              borderRadius={4}
              reduceMotion={reduceMotion}
            />
            <View style={styles.badgeRow}>
              <Shimmer
                width={32}
                height={18}
                borderRadius={4}
                reduceMotion={reduceMotion}
              />
              <Shimmer
                width={20}
                height={20}
                borderRadius={10}
                reduceMotion={reduceMotion}
              />
            </View>
          </View>

          {/* Row 2: Location */}
          <View style={styles.row2}>
            <Shimmer
              width={width * 0.7}
              height={14}
              borderRadius={4}
              reduceMotion={reduceMotion}
            />
          </View>

          {/* Row 3: Time */}
          <View style={styles.row3}>
            <Shimmer
              width={width * 0.5}
              height={12}
              borderRadius={4}
              reduceMotion={reduceMotion}
            />
          </View>
        </View>
      </View>
    );
  }
);

EliteMatchCardSkeleton.displayName = 'EliteMatchCardSkeleton';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: CONFIG.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  photoSection: {
    width: '100%',
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: CONFIG.BORDER_RADIUS,
    borderTopRightRadius: CONFIG.BORDER_RADIUS,
    overflow: 'hidden',
  },

  infoSection: {
    height: CONFIG.INFO_HEIGHT,
    padding: 10,
    backgroundColor: colors.white,
    gap: 8,
  },

  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  row2: {
    height: 14,
  },

  row3: {
    height: 12,
  },
});

export default EliteMatchCardSkeleton;
