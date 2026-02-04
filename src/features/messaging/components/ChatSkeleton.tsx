/**
 * ChatSkeleton Component
 * Shimmer loading skeleton for chat messages
 * Shows alternating left/right message bubbles
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MessageSkeletonProps {
  isOwn: boolean;
  width: number;
}

/**
 * Single message bubble skeleton
 */
const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ isOwn, width }) => {
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
    outputRange: [-100, width + 100],
  });

  return (
    <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowThem]}>
      <View
        style={[
          styles.bubbleSkeleton,
          isOwn ? styles.bubbleOwn : styles.bubbleThem,
          { width },
        ]}
      >
        <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
};

/**
 * Full chat skeleton with alternating messages
 */
export const ChatSkeleton: React.FC = () => {
  // Predefined pattern of messages to look realistic
  const messagePattern = [
    { isOwn: false, widthPercent: 0.65 },
    { isOwn: false, widthPercent: 0.45 },
    { isOwn: true, widthPercent: 0.55 },
    { isOwn: false, widthPercent: 0.7 },
    { isOwn: true, widthPercent: 0.4 },
    { isOwn: true, widthPercent: 0.6 },
    { isOwn: false, widthPercent: 0.5 },
    { isOwn: true, widthPercent: 0.75 },
  ];

  const maxBubbleWidth = SCREEN_WIDTH * 0.75;

  return (
    <View style={styles.container} accessible={true} accessibilityLabel="Loading messages">
      {messagePattern.map((msg, index) => (
        <MessageSkeleton
          key={index}
          isOwn={msg.isOwn}
          width={maxBubbleWidth * msg.widthPercent}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  bubbleSkeleton: {
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  bubbleOwn: {
    backgroundColor: colors.orange[100],
    borderBottomRightRadius: 8,
  },
  bubbleThem: {
    backgroundColor: colors.gray[200],
    borderBottomLeftRadius: 8,
  },
  shimmer: {
    width: 100,
    height: '100%',
  },
});

export default ChatSkeleton;
