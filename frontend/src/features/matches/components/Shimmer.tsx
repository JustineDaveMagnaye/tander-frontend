/**
 * TANDER Shimmer Component
 * Animated loading placeholder with shimmer effect
 *
 * Design System Compliance (design_system2.md):
 * - Smooth animations for better UX
 * - Respects reduced motion accessibility setting
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  reduceMotion?: boolean;
  /** Use warm orange/teal tinted background for premium feel */
  warmTint?: boolean;
  /** Delay before animation starts (for staggering) */
  delay?: number;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width,
  height,
  borderRadius = 8,
  reduceMotion = false,
  warmTint = false,
  delay = 0,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Skip animation if reduce motion is enabled
    if (reduceMotion) {
      shimmerAnim.setValue(0.5);
      pulseAnim.setValue(1);
      return;
    }

    // Shimmer sweep animation - faster for better feedback
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulse animation for depth
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    pulseAnimation.start();

    return () => {
      shimmerAnimation.stop();
      pulseAnimation.stop();
    };
  }, [shimmerAnim, pulseAnim, reduceMotion, delay]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  // Convert width to proper style value
  const widthStyle = typeof width === 'string' ? (width as `${number}%`) : width;
  const numericWidth = typeof width === 'number' ? width : 300;

  // Premium warm-tinted or neutral background
  const bgColors = warmTint
    ? [colors.orange[50], colors.gray[100], colors.teal[50]]
    : [colors.gray[100], colors.gray[200], colors.gray[100]];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: widthStyle,
          height,
          borderRadius,
          overflow: 'hidden',
          opacity: pulseAnim,
        },
      ]}
    >
      {/* Base gradient background */}
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Shimmer highlight sweep */}
      <Animated.View
        style={[
          styles.gradient,
          {
            width: numericWidth * 0.6,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.15)',
            'rgba(255,255,255,0.6)',
            'rgba(255,255,255,0.15)',
            'transparent',
          ]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  gradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});

export default Shimmer;
