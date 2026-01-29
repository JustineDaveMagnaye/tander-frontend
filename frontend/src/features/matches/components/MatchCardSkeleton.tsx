/**
 * TANDER MatchCardSkeleton - Loading Skeleton Component
 *
 * Premium shimmer loading animation that matches
 * the PremiumMatchCard layout with fixed 100px info section
 * (includes status badges row at bottom)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';

// Must match PremiumMatchCard INFO_SECTION_HEIGHT
const INFO_SECTION_HEIGHT = 95;
const BORDER_RADIUS = 16;

interface MatchCardSkeletonProps {
  width: number;
  height: number;
}

export const MatchCardSkeleton: React.FC<MatchCardSkeletonProps> = ({
  width,
  height,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  // Fixed info section height, photo takes remaining space
  const photoHeight = height - INFO_SECTION_HEIGHT;

  return (
    <View style={[styles.skeleton, { width, height }]}>
      {/* Photo Skeleton */}
      <View style={[styles.photoSkeleton, { height: photoHeight }]}>
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* Info Skeleton - Fixed Height */}
      <View style={styles.infoSkeleton}>
        <View style={styles.nameSkeleton} />
        <View style={styles.locationSkeleton} />
        {/* Status Row Skeleton */}
        <View style={styles.statusRowSkeleton}>
          <View style={styles.badgeSkeleton} />
          <View style={styles.badgeSkeleton} />
          <View style={styles.spacer} />
          <View style={styles.timeSkeleton} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  photoSkeleton: {
    backgroundColor: colors.gray[200],
    overflow: 'hidden',
    borderTopLeftRadius: BORDER_RADIUS,
    borderTopRightRadius: BORDER_RADIUS,
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  infoSkeleton: {
    height: INFO_SECTION_HEIGHT,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.romantic?.warmWhite || '#FFF9F5',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.orange[50],
    overflow: 'hidden',
  },
  nameSkeleton: {
    height: 15,
    width: '55%',
    backgroundColor: colors.gray[200],
    borderRadius: 8,
  },
  locationSkeleton: {
    height: 12,
    width: '70%',
    backgroundColor: colors.gray[200],
    borderRadius: 6,
  },
  statusRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badgeSkeleton: {
    height: 18,
    width: 50,
    backgroundColor: colors.gray[200],
    borderRadius: 10,
  },
  spacer: {
    flex: 1,
  },
  timeSkeleton: {
    height: 12,
    width: 40,
    backgroundColor: colors.gray[200],
    borderRadius: 6,
  },
});

export default MatchCardSkeleton;
