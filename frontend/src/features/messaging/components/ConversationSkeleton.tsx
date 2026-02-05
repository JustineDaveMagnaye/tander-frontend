/**
 * ConversationSkeleton Component
 * Shimmer loading skeleton for conversation list items
 * Premium loading state with smooth animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';

/**
 * Single conversation item skeleton
 */
export const ConversationSkeleton: React.FC = () => {
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
    outputRange: [-200, 400],
  });

  const SkeletonElement = ({ style }: { style: object }) => (
    <View style={[styles.skeletonBase, style]}>
      <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container} accessible={false}>
      {/* Avatar */}
      <SkeletonElement style={styles.avatar} />

      {/* Content */}
      <View style={styles.content}>
        <SkeletonElement style={styles.name} />
        <SkeletonElement style={styles.message} />
      </View>

      {/* Time */}
      <SkeletonElement style={styles.time} />
    </View>
  );
};

/**
 * Full conversation list skeleton (shows 6 items)
 */
export const ConversationListSkeleton: React.FC = () => (
  <View accessible={true} accessibilityLabel="Loading conversations">
    {[...Array(6)].map((_, i) => (
      <ConversationSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  skeletonBase: {
    backgroundColor: colors.gray[200],
    overflow: 'hidden',
    borderRadius: 4,
  },
  shimmer: {
    width: 200,
    height: '100%',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  content: {
    flex: 1,
    gap: 10,
  },
  name: {
    width: '55%',
    height: 18,
    borderRadius: 4,
  },
  message: {
    width: '75%',
    height: 14,
    borderRadius: 4,
  },
  time: {
    width: 42,
    height: 12,
    borderRadius: 4,
  },
});

export default ConversationSkeleton;
