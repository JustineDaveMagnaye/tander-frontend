/**
 * TANDER Shimmer Component
 * Animated loading placeholder with shimmer effect
 *
 * Design System Compliance (design_system2.md):
 * - Smooth animations for better UX
 * - Respects reduced motion accessibility setting
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  reduceMotion?: boolean;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width,
  height,
  borderRadius = 8,
  reduceMotion = false,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Skip animation if reduce motion is enabled
    if (reduceMotion) {
      shimmerAnim.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, reduceMotion]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  // Convert width to proper style value
  const widthStyle = typeof width === 'string' ? (width as `${number}%`) : width;

  return (
    <View
      style={[
        styles.container,
        { width: widthStyle, height, borderRadius, overflow: 'hidden' },
      ]}
    >
      <Animated.View
        style={[
          styles.gradient,
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
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[200],
  },
  gradient: {
    width: 200,
    height: '100%',
  },
});

export default Shimmer;
