/**
 * TANDER ChatInput Component
 * Message composition input with send button
 *
 * Follows design_system2.md Section 8.3:
 * - Input area: 60dp height minimum
 * - Send button: 60x60dp, orange, paper plane icon
 * - Photo/GIF button: 48x48dp
 * - Senior-friendly: Large touch targets, clear visual feedback
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import type { Message } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendImage?: () => void;
  onStartVoiceMessage?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendImage,
  onStartVoiceMessage,
  replyingTo,
  onCancelReply,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const { isLandscape, isTablet, hp, wp, moderateScale } = useResponsive();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Responsive sizes
  const inputHeight = isLandscape
    ? Math.min(hp(12), 52)
    : isTablet
      ? moderateScale(64)
      : moderateScale(56);

  const buttonSize = isLandscape
    ? Math.min(hp(11), 48)
    : isTablet
      ? moderateScale(56)
      : moderateScale(52);

  const iconButtonSize = isLandscape
    ? Math.min(hp(10), 44)
    : isTablet
      ? moderateScale(48)
      : moderateScale(44);

  const fontSize = isLandscape
    ? Math.min(hp(4), wp(2.5), 16)
    : isTablet
      ? moderateScale(18)
      : moderateScale(16);

  const iconSize = isLandscape
    ? Math.min(hp(5), 22)
    : isTablet
      ? moderateScale(24)
      : moderateScale(22);

  const canSend = text.trim().length > 0;

  const handleSend = () => {
    if (!canSend || disabled) return;

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onSendMessage(text.trim());
    setText('');
    Keyboard.dismiss();
  };

  const handleCancelReply = () => {
    onCancelReply?.();
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Reply preview */}
      {replyingTo && (
        <View style={styles.replyContainer}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>Replying to</Text>
            <Text
              style={styles.replyText}
              numberOfLines={1}
            >
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCancelReply}
            style={styles.cancelReplyButton}
            accessible={true}
            accessibilityLabel="Cancel reply"
            accessibilityRole="button"
          >
            <Text style={styles.cancelIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        {/* Attachment button */}
        {onSendImage && (
          <TouchableOpacity
            onPress={onSendImage}
            style={[
              styles.iconButton,
              { width: iconButtonSize, height: iconButtonSize },
            ]}
            disabled={disabled}
            accessible={true}
            accessibilityLabel="Attach photo"
            accessibilityRole="button"
            accessibilityHint="Double tap to attach a photo or image"
          >
            <Text style={[styles.icon, { fontSize: iconSize }]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📷</Text>
          </TouchableOpacity>
        )}

        {/* Text input */}
        <View
          style={[
            styles.inputContainer,
            { minHeight: inputHeight },
            isFocused && styles.inputFocused,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                fontSize,
                minHeight: inputHeight - spacing.s,
              },
            ]}
            value={text}
            onChangeText={setText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral.placeholder}
            multiline
            maxLength={1000}
            editable={!disabled}
            accessible={true}
            accessibilityLabel="Message input"
            accessibilityHint="Enter your message here"
            returnKeyType="default"
            blurOnSubmit={false}
            maxFontSizeMultiplier={FONT_SCALING.INPUT}
          />
        </View>

        {/* Voice message or Send button */}
        {canSend ? (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleSend}
              disabled={disabled}
              accessible={true}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              accessibilityHint="Double tap to send your message"
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={disabled ? [colors.neutral.disabled, colors.neutral.disabled] : colors.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.sendButton,
                  {
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                  },
                ]}
              >
                <Text style={[styles.sendIcon, { fontSize: iconSize }]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>➤</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : onStartVoiceMessage ? (
          <TouchableOpacity
            onPress={onStartVoiceMessage}
            style={[
              styles.voiceButton,
              {
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
              },
            ]}
            disabled={disabled}
            accessible={true}
            accessibilityLabel="Record voice message"
            accessibilityRole="button"
            accessibilityHint="Press and hold to record a voice message"
          >
            <Text style={[styles.icon, { fontSize: iconSize }]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>🎤</Text>
          </TouchableOpacity>
        ) : (
          // Placeholder to maintain layout
          <View style={{ width: buttonSize, height: buttonSize }} />
        )}
      </View>

      {/* Character count (shown when typing) */}
      {text.length > 800 && (
        <Text style={styles.charCount}>
          {text.length}/1000
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surface,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    ...shadows.small,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal.light + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.teal.primary,
    borderRadius: borderRadius.small,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: colors.teal.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  cancelReplyButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIcon: {
    fontSize: 16,
    color: colors.neutral.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderRadius: borderRadius.round,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.neutral.background,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  inputFocused: {
    borderColor: colors.teal.primary,
    borderWidth: 2,
  },
  input: {
    color: colors.neutral.textPrimary,
    paddingTop: Platform.OS === 'ios' ? spacing.xs : 0,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : 0,
    maxHeight: 120, // Limit multiline height
    textAlignVertical: 'center',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  sendIcon: {
    color: colors.white,
    transform: [{ rotate: '45deg' }],
  },
  voiceButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  icon: {
    color: colors.neutral.textSecondary,
  },
  charCount: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },
});

export default ChatInput;
