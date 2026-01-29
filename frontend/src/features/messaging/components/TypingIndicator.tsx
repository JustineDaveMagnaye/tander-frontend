/**
 * TypingIndicator Component
 * Animated bouncing dots that show when the other user is typing
 * Premium UI polish with smooth animations
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, AccessibilityInfo } from 'react-native';
import { colors } from '@shared/styles/colors';

interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, userName }) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Fade in
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Bouncing dots animation with staggered timing
      const createBounce = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: -8,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.delay(450 - delay), // Total cycle time: 950ms
          ])
        );
      };

      const anim1 = createBounce(dot1Anim, 0);
      const anim2 = createBounce(dot2Anim, 150);
      const anim3 = createBounce(dot3Anim, 300);

      animationsRef.current = [anim1, anim2, anim3];

      anim1.start();
      anim2.start();
      anim3.start();

      // Announce to screen readers
      if (userName) {
        AccessibilityInfo.announceForAccessibility(`${userName} is typing`);
      }
    } else {
      // Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Stop all animations
      animationsRef.current.forEach((anim) => anim.stop());
      animationsRef.current = [];

      // Reset dot positions
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    }

    return () => {
      // Cleanup animations on unmount
      animationsRef.current.forEach((anim) => anim.stop());
    };
  }, [isVisible, userName, containerOpacity, dot1Anim, dot2Anim, dot3Anim]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      accessible={true}
      accessibilityLabel={userName ? `${userName} is typing` : 'Someone is typing'}
      accessibilityRole="text"
    >
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot1Anim }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot2Anim }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot3Anim }] }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bubble: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    borderBottomLeftRadius: 8, // Message tail effect
    gap: 6,
    alignItems: 'center',
    // Subtle shadow for depth
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal[500],
  },
});

export default TypingIndicator;
