/**
 * EmojiReactionPicker Component
 * Premium iOS-style emoji reaction picker with smooth animations
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { colors } from '@/shared/styles/colors';
import {
  premiumColors,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
  EMOJI_REACTIONS,
  EXTENDED_REACTIONS,
} from '../styles/premiumStyles';

// ============================================================================
// TYPES
// ============================================================================

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
  selectedEmoji?: string | null;
  extended?: boolean;
  position?: 'top' | 'bottom';
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Single Emoji Button
const EmojiButton = memo(({
  emoji,
  index,
  onPress,
  isSelected,
}: {
  emoji: string;
  index: number;
  onPress: (emoji: string) => void;
  isSelected: boolean;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(1.3, premiumAnimations.spring.bouncy);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress(emoji);
  }, [emoji, onPress]);

  return (
    <Animated.View
      entering={ZoomIn.delay(index * 30).springify().damping(12)}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.emojiButton,
          isSelected && styles.emojiButtonSelected,
          animatedStyle,
        ]}
        accessibilityLabel={`React with ${emoji}`}
        accessibilityRole="button"
      >
        <Text style={styles.emojiText}>{emoji}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

// More Button
const MoreButton = memo(({
  onPress,
}: {
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, premiumAnimations.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  return (
    <Animated.View entering={ZoomIn.delay(180).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.moreButton, animatedStyle]}
        accessibilityLabel="More reactions"
        accessibilityRole="button"
      >
        <Text style={styles.moreIcon}>+</Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EmojiReactionPicker = memo(({
  onSelect,
  onDismiss,
  selectedEmoji,
  extended = false,
  position = 'top',
}: EmojiReactionPickerProps) => {
  const emojis = extended ? EXTENDED_REACTIONS : EMOJI_REACTIONS;

  const handleEmojiSelect = useCallback((emoji: string) => {
    onSelect(emoji);
  }, [onSelect]);

  const handleMorePress = useCallback(() => {
    // Could open an extended picker
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      style={[
        styles.container,
        position === 'top' ? styles.containerTop : styles.containerBottom,
      ]}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Picker */}
      <Animated.View
        entering={ZoomIn.springify().damping(15)}
        style={[
          styles.picker,
          position === 'top' ? styles.pickerTop : styles.pickerBottom,
          premiumShadows.large,
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="light" style={styles.blurBackground}>
            <View style={styles.emojiRow}>
              {emojis.map((emoji, index) => (
                <EmojiButton
                  key={emoji}
                  emoji={emoji}
                  index={index}
                  onPress={handleEmojiSelect}
                  isSelected={selectedEmoji === emoji}
                />
              ))}
              {!extended && <MoreButton onPress={handleMorePress} />}
            </View>
          </BlurView>
        ) : (
          <View style={[styles.androidBackground, styles.emojiRow]}>
            {emojis.map((emoji, index) => (
              <EmojiButton
                key={emoji}
                emoji={emoji}
                index={index}
                onPress={handleEmojiSelect}
                isSelected={selectedEmoji === emoji}
              />
            ))}
            {!extended && <MoreButton onPress={handleMorePress} />}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
});

EmojiReactionPicker.displayName = 'EmojiReactionPicker';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 1000,
  },
  containerTop: {
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  containerBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 100,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },

  picker: {
    borderRadius: premiumRadius.xxl,
    overflow: 'hidden',
    margin: premiumSpacing.md,
  },
  pickerTop: {
    marginTop: premiumSpacing.xl,
  },
  pickerBottom: {
    marginBottom: premiumSpacing.xl,
  },

  blurBackground: {
    borderRadius: premiumRadius.xxl,
    overflow: 'hidden',
  },
  androidBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: premiumRadius.xxl,
  },

  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: premiumSpacing.md,
    paddingVertical: premiumSpacing.sm,
    gap: premiumSpacing.xs,
  },

  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emojiButtonSelected: {
    backgroundColor: premiumColors.reactions.selected,
  },
  emojiText: {
    fontSize: 28,
  },

  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray5,
  },
  moreIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: premiumColors.system.gray,
  },
});

export default EmojiReactionPicker;
