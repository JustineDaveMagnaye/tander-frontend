/**
 * PremiumChatInput Component
 * Ultra-premium iOS-style chat input with voice recording, attachments, and smooth animations
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Vibration,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
  SlideInUp,
  runOnJS,
  Layout,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors } from '@/shared/styles/colors';
import {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
} from '../styles/premiumStyles';
import type { Message } from '../types';
import { FONT_SCALING } from '@/shared/styles/fontScaling';

// ============================================================================
// TYPES
// ============================================================================

interface PremiumChatInputProps {
  onSendMessage: (text: string) => void;
  onSendImage?: () => void;
  onSendVoice?: (audioUri: string, duration: number) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onCameraPress?: () => void;
  onAttachmentPress?: () => void;
  onEmojiPress?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_INPUT_HEIGHT = 120;
const MIN_INPUT_HEIGHT = 44;
const BUTTON_SIZE = 36;

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Attachment Button
const AttachmentButton = memo(({
  icon,
  label,
  onPress,
  color = premiumColors.brand.teal,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, premiumAnimations.spring.snappy);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.attachmentButton, animatedStyle]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={[styles.attachmentIcon, { color }]}>{icon}</Text>
    </AnimatedPressable>
  );
});

// Send Button
const SendButton = memo(({
  onPress,
  disabled,
  hasText,
}: {
  onPress: () => void;
  disabled?: boolean;
  hasText: boolean;
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: hasText ? 1 : 0.5,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, premiumAnimations.spring.snappy);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!hasText || disabled) return;
    rotation.value = withSequence(
      withTiming(-15, { duration: 50 }),
      withSpring(0, premiumAnimations.spring.bouncy)
    );
    onPress();
  }, [hasText, disabled, onPress, rotation]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !hasText}
      style={[styles.sendButton, animatedStyle]}
      accessibilityLabel="Send message"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={hasText ? colors.gradient.primaryButton : [premiumColors.system.gray4, premiumColors.system.gray3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sendButtonGradient}
      >
        <Text style={styles.sendIcon}>↑</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
});

// Voice Record Button
const VoiceRecordButton = memo(({
  onPress,
  onLongPressStart,
  onLongPressEnd,
  isRecording,
}: {
  onPress: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  isRecording: boolean;
}) => {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = () => {
        pulseScale.value = withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        );
      };
      const interval = setInterval(pulse, 1000);
      pulse();
      return () => clearInterval(interval);
    }
  }, [isRecording, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (isRecording ? pulseScale.value : 1) },
    ],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, premiumAnimations.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  // Long press gesture for voice recording
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      'worklet';
      if (onLongPressStart) {
        runOnJS(onLongPressStart)();
      }
    })
    .onEnd(() => {
      'worklet';
      if (onLongPressEnd) {
        runOnJS(onLongPressEnd)();
      }
    });

  return (
    <GestureDetector gesture={longPressGesture}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.voiceButton, isRecording && styles.voiceButtonRecording, animatedStyle]}
        accessibilityLabel={isRecording ? 'Stop recording' : 'Record voice message'}
        accessibilityRole="button"
      >
        <Text style={[styles.voiceIcon, isRecording && styles.voiceIconRecording]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>
          {isRecording ? '⏹' : '🎤'}
        </Text>
      </AnimatedPressable>
    </GestureDetector>
  );
});

// Reply Preview Bar
const ReplyPreview = memo(({
  message,
  onCancel,
}: {
  message: Message;
  onCancel: () => void;
}) => {
  return (
    <Animated.View
      entering={SlideInUp.springify().damping(15)}
      exiting={FadeOut.duration(150)}
      style={styles.replyPreview}
    >
      <View style={styles.replyBar} />
      <View style={styles.replyContent}>
        <Text style={styles.replyLabel}>Replying to</Text>
        <Text style={styles.replyText} numberOfLines={1}>
          {message.content}
        </Text>
      </View>
      <Pressable
        onPress={onCancel}
        style={styles.replyCancelButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.replyCancelIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✕</Text>
      </Pressable>
    </Animated.View>
  );
});

// Character Counter
const CharacterCounter = memo(({
  current,
  max,
}: {
  current: number;
  max: number;
}) => {
  const isNearLimit = current >= max * 0.8;
  const isAtLimit = current >= max;

  if (current < max * 0.7) return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.characterCounter}
    >
      <Text
        style={[
          styles.characterCounterText,
          isNearLimit && styles.characterCounterWarning,
          isAtLimit && styles.characterCounterError,
        ]}
      >
        {current}/{max}
      </Text>
    </Animated.View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumChatInput = memo(({
  onSendMessage,
  onSendImage,
  onSendVoice,
  onStartTyping,
  onStopTyping,
  onCameraPress,
  onAttachmentPress,
  onEmojiPress,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Message',
  maxLength = 1000,
}: PremiumChatInputProps) => {
  const insets = useSafeAreaInsets();
  const { moderateScale, isLandscape } = useResponsive();
  const inputRef = useRef<TextInput>(null);

  // State
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Animation values
  const containerHeight = useSharedValue(MIN_INPUT_HEIGHT);
  const attachmentOpacity = useSharedValue(1);

  // Typing indicator management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Handle text change
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);

    // Manage typing indicator
    if (newText.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      onStartTyping?.();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newText.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          onStopTyping?.();
        }
      }, 2000);
    } else {
      isTypingRef.current = false;
      onStopTyping?.();
    }

    // Animate attachment buttons based on text
    attachmentOpacity.value = withTiming(newText.length > 0 ? 0 : 1, { duration: 150 });
  }, [onStartTyping, onStopTyping, attachmentOpacity]);

  // Handle send
  const handleSend = useCallback(() => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled) return;

    onSendMessage(trimmedText);
    setText('');
    setInputHeight(MIN_INPUT_HEIGHT);

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping?.();
    }

    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [text, disabled, onSendMessage, onStopTyping]);

  // Handle content size change
  const handleContentSizeChange = useCallback((event: any) => {
    const height = Math.min(
      Math.max(event.nativeEvent.contentSize.height, MIN_INPUT_HEIGHT),
      MAX_INPUT_HEIGHT
    );
    setInputHeight(height);
    containerHeight.value = withSpring(height, premiumAnimations.spring.gentle);
  }, [containerHeight]);

  // Voice recording handlers
  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    // In production, would send the recorded audio
    // onSendVoice?.(audioUri, recordingDuration);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Animated styles
  const inputContainerStyle = useAnimatedStyle(() => ({
    minHeight: containerHeight.value,
  }));

  const attachmentButtonsStyle = useAnimatedStyle(() => ({
    opacity: attachmentOpacity.value,
    transform: [
      {
        scale: interpolate(
          attachmentOpacity.value,
          [0, 1],
          [0.8, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const hasText = text.trim().length > 0;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Reply preview */}
      {replyingTo && onCancelReply && (
        <ReplyPreview message={replyingTo} onCancel={onCancelReply} />
      )}

      {/* Recording indicator */}
      {isRecording && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.recordingIndicator}
        >
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
          </Text>
        </Animated.View>
      )}

      {/* Main input container */}
      <View style={styles.container}>
        {/* Left side: Attachment buttons */}
        <Animated.View style={[styles.leftSection, attachmentButtonsStyle]}>
          {onAttachmentPress && !hasText && (
            <AttachmentButton
              icon="+"
              label="Add attachment"
              onPress={onAttachmentPress}
              color={premiumColors.brand.teal}
            />
          )}
          {onCameraPress && !hasText && (
            <AttachmentButton
              icon="📷"
              label="Camera"
              onPress={onCameraPress}
            />
          )}
        </Animated.View>

        {/* Input field */}
        <Animated.View
          style={[styles.inputContainer, inputContainerStyle]}
          layout={Layout.springify()}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { minHeight: inputHeight, fontSize: moderateScale(16, 0.2) },
            ]}
            value={text}
            onChangeText={handleTextChange}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor={premiumColors.system.gray}
            multiline
            maxLength={maxLength}
            editable={!disabled && !isRecording}
            returnKeyType="default"
            blurOnSubmit={false}
            textAlignVertical="center"
            accessibilityLabel="Message input"
          />
          {onEmojiPress && (
            <Pressable
              onPress={onEmojiPress}
              style={styles.emojiButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.emojiIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>😊</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Right side: Send or Voice button */}
        <View style={styles.rightSection}>
          {hasText ? (
            <SendButton
              onPress={handleSend}
              disabled={disabled}
              hasText={hasText}
            />
          ) : (
            <VoiceRecordButton
              onPress={() => {}}
              onLongPressStart={handleStartRecording}
              onLongPressEnd={handleStopRecording}
              isRecording={isRecording}
            />
          )}
        </View>
      </View>

      {/* Character counter */}
      <CharacterCounter current={text.length} max={maxLength} />
    </View>
  );
});

PremiumChatInput.displayName = 'PremiumChatInput';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: premiumColors.glass.light,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.system.separator,
  },

  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: premiumSpacing.sm,
    paddingVertical: premiumSpacing.sm,
    gap: premiumSpacing.xs,
  },

  // Left section
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: premiumSpacing.xxs,
    marginBottom: premiumSpacing.xxs,
  },
  attachmentButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray6,
  },
  attachmentIcon: {
    fontSize: 20,
    fontWeight: '600',
  },

  // Input container
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: premiumColors.system.gray6,
    borderRadius: premiumRadius.input,
    paddingHorizontal: premiumSpacing.md,
    paddingVertical: premiumSpacing.xs,
    minHeight: MIN_INPUT_HEIGHT,
  },
  input: {
    flex: 1,
    fontSize: premiumTypography.sizes.body,
    color: colors.gray[900],
    lineHeight: premiumTypography.sizes.body * premiumTypography.lineHeights.normal,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  emojiButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: premiumSpacing.xs,
    marginBottom: 2,
  },
  emojiIcon: {
    fontSize: 22,
  },

  // Right section
  rightSection: {
    marginBottom: premiumSpacing.xxs,
  },
  sendButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginTop: -2,
  },

  // Voice button
  voiceButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray6,
  },
  voiceButtonRecording: {
    backgroundColor: premiumColors.system.error,
  },
  voiceIcon: {
    fontSize: 18,
  },
  voiceIconRecording: {
    color: colors.white,
  },

  // Reply preview
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: premiumSpacing.md,
    paddingVertical: premiumSpacing.sm,
    backgroundColor: premiumColors.system.gray6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.system.separator,
  },
  replyBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: premiumColors.brand.teal,
    marginRight: premiumSpacing.sm,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: premiumTypography.sizes.caption1,
    fontWeight: '600',
    color: premiumColors.brand.teal,
    marginBottom: 2,
  },
  replyText: {
    fontSize: premiumTypography.sizes.footnote,
    color: premiumColors.system.gray,
  },
  replyCancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray5,
    marginLeft: premiumSpacing.sm,
  },
  replyCancelIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: premiumColors.system.gray,
  },

  // Recording indicator
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: premiumSpacing.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: premiumColors.system.error,
    marginRight: premiumSpacing.sm,
  },
  recordingText: {
    fontSize: premiumTypography.sizes.footnote,
    fontWeight: '600',
    color: premiumColors.system.error,
  },

  // Character counter
  characterCounter: {
    position: 'absolute',
    top: -20,
    right: premiumSpacing.md,
  },
  characterCounterText: {
    fontSize: premiumTypography.sizes.caption2,
    color: premiumColors.system.gray,
  },
  characterCounterWarning: {
    color: premiumColors.brand.orange,
  },
  characterCounterError: {
    color: premiumColors.system.error,
    fontWeight: '600',
  },
});

export default PremiumChatInput;
