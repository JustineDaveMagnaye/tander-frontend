/**
 * PremiumMessageBubble Component
 * Ultra-premium iOS-style message bubble with reactions, animations, and rich media
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Vibration,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeInUp,
  ZoomIn,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors } from '@/shared/styles/colors';
import {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
  getBubbleRadius,
  formatMessageTime,
  EMOJI_REACTIONS,
} from '../styles/premiumStyles';
import type { Message, MessageStatus } from '../types';
import { FONT_SCALING } from '@/shared/styles/fontScaling';

// ============================================================================
// TYPES
// ============================================================================

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface PremiumMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  userName?: string;
  reactions?: Reaction[];
  onLongPress?: (message: Message) => void;
  onDoubleTap?: (message: Message) => void;
  onImagePress?: (imageUrl: string) => void;
  onReactionPress?: (emoji: string) => void;
  onReplyPress?: (message: Message) => void;
  onProfilePress?: () => void;
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Message Status Indicator
const MessageStatusIndicator = memo(({ status }: { status: MessageStatus }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <ActivityIndicator size={10} color={premiumColors.messageStatus.sending} />;
      case 'sent':
        return (
          <Text style={styles.statusIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
        );
      case 'delivered':
        return (
          <Text style={[styles.statusIcon, { color: premiumColors.messageStatus.delivered }]}>
            ✓✓
          </Text>
        );
      case 'read':
        return (
          <Text style={[styles.statusIcon, { color: premiumColors.messageStatus.read }]}>
            ✓✓
          </Text>
        );
      case 'failed':
        return (
          <Text style={[styles.statusIcon, { color: premiumColors.messageStatus.failed }]}>!</Text>
        );
      default:
        return null;
    }
  };

  return <View style={styles.statusContainer}>{getStatusIcon()}</View>;
});

// Reactions Display
const ReactionsDisplay = memo(({
  reactions,
  isOwn,
  onPress,
}: {
  reactions: Reaction[];
  isOwn: boolean;
  onPress?: (emoji: string) => void;
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(15)}
      style={[
        styles.reactionsContainer,
        isOwn ? styles.reactionsOwn : styles.reactionsOther,
      ]}
    >
      {reactions.map((reaction, index) => (
        <Pressable
          key={`${reaction.emoji}-${index}`}
          style={({ pressed }) => [
            styles.reactionBubble,
            reaction.reacted && styles.reactionBubbleActive,
            pressed && styles.reactionPressed,
          ]}
          onPress={() => onPress?.(reaction.emoji)}
        >
          <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
          {reaction.count > 1 && (
            <Text style={styles.reactionCount}>{reaction.count}</Text>
          )}
        </Pressable>
      ))}
    </Animated.View>
  );
});

// Reply Preview
const ReplyPreview = memo(({
  replyTo,
  isOwn,
}: {
  replyTo: Message;
  isOwn: boolean;
}) => {
  return (
    <View style={[styles.replyContainer, isOwn ? styles.replyOwn : styles.replyOther]}>
      <View style={[styles.replyBar, isOwn ? styles.replyBarOwn : styles.replyBarOther]} />
      <View style={styles.replyContent}>
        <Text
          style={[styles.replyName, isOwn && styles.replyNameOwn]}
          numberOfLines={1}
        >
          {replyTo.senderId === 'self' ? 'You' : 'Them'}
        </Text>
        <Text
          style={[styles.replyText, isOwn && styles.replyTextOwn]}
          numberOfLines={2}
        >
          {replyTo.content}
        </Text>
      </View>
    </View>
  );
});

// Image Message
const ImageMessage = memo(({
  imageUrl,
  thumbnail,
  caption,
  isOwn,
  onPress,
}: {
  imageUrl: string;
  thumbnail?: string;
  caption?: string;
  isOwn: boolean;
  onPress?: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Pressable onPress={onPress} style={styles.imageContainer}>
      <Image
        source={{ uri: thumbnail || imageUrl }}
        style={styles.messageImage}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {loading && (
        <View style={styles.imageLoadingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      )}
      {error && (
        <View style={styles.imageErrorOverlay}>
          <Text style={styles.imageErrorText}>Failed to load image</Text>
        </View>
      )}
      {caption && (
        <Text style={[styles.imageCaption, isOwn && styles.imageCaptionOwn]}>
          {caption}
        </Text>
      )}
    </Pressable>
  );
});

// Voice Message
const VoiceMessage = memo(({
  duration,
  isOwn,
  isPlaying,
  progress,
  onPlayPause,
}: {
  duration: number;
  isOwn: boolean;
  isPlaying?: boolean;
  progress?: number;
  onPlayPause?: () => void;
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate waveform bars
  const waveformBars = useMemo(() => {
    const bars = [];
    for (let i = 0; i < 30; i++) {
      const height = 8 + Math.random() * 20;
      bars.push(height);
    }
    return bars;
  }, []);

  return (
    <View style={styles.voiceContainer}>
      <Pressable
        style={[styles.playButton, isOwn ? styles.playButtonOwn : styles.playButtonOther]}
        onPress={onPlayPause}
      >
        <Text style={[styles.playIcon, isOwn && styles.playIconOwn]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>
          {isPlaying ? '❚❚' : '▶'}
        </Text>
      </Pressable>
      <View style={styles.waveformContainer}>
        {waveformBars.map((height, index) => {
          const isActive = progress ? (index / waveformBars.length) <= progress : false;
          return (
            <View
              key={index}
              style={[
                styles.waveformBar,
                { height },
                isActive && (isOwn ? styles.waveformBarActiveOwn : styles.waveformBarActive),
                !isActive && (isOwn ? styles.waveformBarInactiveOwn : styles.waveformBarInactive),
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.voiceDuration, isOwn && styles.voiceDurationOwn]}>
        {formatDuration(duration)}
      </Text>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumMessageBubble = memo(({
  message,
  isOwn,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = false,
  avatarUrl,
  userName,
  reactions,
  onLongPress,
  onDoubleTap,
  onImagePress,
  onReactionPress,
  onReplyPress,
  onProfilePress,
}: PremiumMessageBubbleProps) => {
  const { moderateScale, isTablet, isLandscape } = useResponsive();

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(0);
  const showHeart = useSharedValue(false);

  // Calculate bubble radius based on position
  const bubbleRadius = useMemo(
    () => getBubbleRadius(isOwn, isFirstInGroup, isLastInGroup),
    [isOwn, isFirstInGroup, isLastInGroup]
  );

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(
        type === 'light'
          ? Haptics.ImpactFeedbackStyle.Light
          : type === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Heavy
      );
    } else {
      Vibration.vibrate(type === 'light' ? 10 : type === 'medium' ? 20 : 30);
    }
  }, []);

  // Double tap gesture for quick reaction
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      'worklet';
      runOnJS(triggerHaptic)('medium');
      showHeart.value = true;
      heartScale.value = withSequence(
        withSpring(1.2, premiumAnimations.spring.bouncy),
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 300 })
      );
      if (onDoubleTap) {
        runOnJS(onDoubleTap)(message);
      }
    });

  // Long press gesture
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      runOnJS(triggerHaptic)('heavy');
      scale.value = withSpring(0.95, premiumAnimations.spring.gentle);
      if (onLongPress) {
        runOnJS(onLongPress)(message);
      }
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, premiumAnimations.spring.gentle);
    });

  // Combined gestures
  const composedGestures = Gesture.Race(doubleTapGesture, longPressGesture);

  // Animated styles
  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: showHeart.value ? 1 : 0,
    transform: [{ scale: heartScale.value }],
  }));

  // Max width based on screen
  const maxWidth = useMemo(() => {
    if (isTablet) return '60%';
    if (isLandscape) return '45%';
    return '75%';
  }, [isTablet, isLandscape]);

  // Render message content based on type
  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <ImageMessage
            imageUrl={message.mediaUrl || ''}
            thumbnail={message.mediaThumbnail}
            caption={message.content}
            isOwn={isOwn}
            onPress={() => onImagePress?.(message.mediaUrl || '')}
          />
        );

      case 'voice':
        return (
          <VoiceMessage
            duration={message.duration || 0}
            isOwn={isOwn}
          />
        );

      default:
        return (
          <>
            {/* Reply preview */}
            {message.replyTo && (
              <Pressable onPress={() => onReplyPress?.(message.replyTo!)}>
                <ReplyPreview replyTo={message.replyTo} isOwn={isOwn} />
              </Pressable>
            )}

            {/* Text content */}
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
                { fontSize: moderateScale(16, 0.3) },
              ]}
            >
              {message.content}
            </Text>
          </>
        );
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(15).delay(50)}
      style={[
        styles.container,
        isOwn ? styles.containerOwn : styles.containerOther,
      ]}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Pressable onPress={onProfilePress} style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {userName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Avatar spacer when not showing avatar but need alignment */}
      {!showAvatar && !isOwn && isLastInGroup && (
        <View style={styles.avatarSpacer} />
      )}

      <View style={[styles.bubbleWrapper, { maxWidth }]}>
        <GestureDetector gesture={composedGestures}>
          <AnimatedPressable style={[styles.bubbleContainer, bubbleAnimatedStyle]}>
            {/* Bubble */}
            {isOwn ? (
              <AnimatedLinearGradient
                colors={premiumColors.bubbles.sent.backgroundGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.bubble,
                  styles.bubbleOwn,
                  bubbleRadius,
                  premiumShadows.small,
                ]}
              >
                {renderContent()}
              </AnimatedLinearGradient>
            ) : (
              <View
                style={[
                  styles.bubble,
                  styles.bubbleOther,
                  bubbleRadius,
                  premiumShadows.subtle,
                ]}
              >
                {renderContent()}
              </View>
            )}

            {/* Heart animation for double-tap */}
            <Animated.View style={[styles.heartOverlay, heartAnimatedStyle]}>
              <Text style={styles.heartEmoji} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>❤️</Text>
            </Animated.View>
          </AnimatedPressable>
        </GestureDetector>

        {/* Message info (time + status) */}
        <View style={[styles.messageInfo, isOwn ? styles.messageInfoOwn : styles.messageInfoOther]}>
          <Text style={styles.timestamp}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {isOwn && <MessageStatusIndicator status={message.status} />}
        </View>

        {/* Reactions */}
        {reactions && reactions.length > 0 && (
          <ReactionsDisplay
            reactions={reactions}
            isOwn={isOwn}
            onPress={onReactionPress}
          />
        )}
      </View>
    </Animated.View>
  );
});

PremiumMessageBubble.displayName = 'PremiumMessageBubble';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: premiumSpacing.messageGap,
    paddingHorizontal: premiumSpacing.md,
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatarContainer: {
    marginRight: premiumSpacing.avatarGap,
    alignSelf: 'flex-end',
    marginBottom: 20, // Account for message info
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: premiumColors.system.gray5,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray4,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: premiumColors.system.gray,
  },
  avatarSpacer: {
    width: 32 + premiumSpacing.avatarGap,
  },

  // Bubble wrapper
  bubbleWrapper: {
    position: 'relative',
  },
  bubbleContainer: {
    position: 'relative',
  },

  // Bubble
  bubble: {
    paddingHorizontal: premiumSpacing.messagePadding,
    paddingVertical: premiumSpacing.sm + 2,
    minWidth: 60,
  },
  bubbleOwn: {
    backgroundColor: premiumColors.bubbles.sent.background,
  },
  bubbleOther: {
    backgroundColor: premiumColors.bubbles.received.background,
  },

  // Message text
  messageText: {
    fontSize: premiumTypography.sizes.body,
    lineHeight: premiumTypography.sizes.body * premiumTypography.lineHeights.relaxed,
    letterSpacing: premiumTypography.letterSpacing.normal,
  },
  messageTextOwn: {
    color: premiumColors.bubbles.sent.text,
  },
  messageTextOther: {
    color: premiumColors.bubbles.received.text,
  },

  // Message info
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: premiumSpacing.xxs,
    paddingHorizontal: premiumSpacing.xxs,
  },
  messageInfoOwn: {
    justifyContent: 'flex-end',
  },
  messageInfoOther: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: premiumTypography.sizes.caption2,
    color: premiumColors.system.gray,
    marginRight: premiumSpacing.xxs,
  },

  // Status
  statusContainer: {
    marginLeft: premiumSpacing.xxs,
  },
  statusIcon: {
    fontSize: 10,
    color: premiumColors.messageStatus.sent,
    fontWeight: '600',
  },

  // Heart overlay
  heartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: 48,
  },

  // Reactions
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: premiumSpacing.xs,
    gap: premiumSpacing.xxs,
  },
  reactionsOwn: {
    justifyContent: 'flex-end',
  },
  reactionsOther: {
    justifyContent: 'flex-start',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: premiumColors.reactions.background,
    paddingHorizontal: premiumSpacing.sm,
    paddingVertical: premiumSpacing.xxs,
    borderRadius: premiumRadius.round,
    borderWidth: 1,
    borderColor: premiumColors.system.gray5,
    ...premiumShadows.subtle,
  },
  reactionBubbleActive: {
    backgroundColor: premiumColors.reactions.selected,
    borderColor: premiumColors.reactions.selectedBorder,
  },
  reactionPressed: {
    opacity: 0.7,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: premiumColors.system.gray,
    marginLeft: premiumSpacing.xxs,
    fontWeight: '500',
  },

  // Reply
  replyContainer: {
    flexDirection: 'row',
    marginBottom: premiumSpacing.sm,
    paddingVertical: premiumSpacing.xs,
    borderRadius: premiumRadius.sm,
  },
  replyOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  replyOther: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    marginRight: premiumSpacing.sm,
  },
  replyBarOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  replyBarOther: {
    backgroundColor: premiumColors.brand.teal,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: premiumTypography.sizes.caption1,
    fontWeight: '600',
    color: premiumColors.brand.teal,
    marginBottom: 2,
  },
  replyNameOwn: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  replyText: {
    fontSize: premiumTypography.sizes.footnote,
    color: premiumColors.system.gray,
  },
  replyTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Image
  imageContainer: {
    borderRadius: premiumRadius.md,
    overflow: 'hidden',
    marginHorizontal: -premiumSpacing.messagePadding,
    marginVertical: -premiumSpacing.sm,
  },
  messageImage: {
    width: 220,
    height: 280,
    borderRadius: premiumRadius.md,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    color: colors.white,
    fontSize: 14,
  },
  imageCaption: {
    fontSize: premiumTypography.sizes.footnote,
    color: premiumColors.system.gray,
    paddingHorizontal: premiumSpacing.sm,
    paddingVertical: premiumSpacing.xs,
  },
  imageCaptionOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Voice
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: premiumSpacing.sm,
  },
  playButtonOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  playButtonOther: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  playIcon: {
    fontSize: 14,
    color: premiumColors.system.gray,
  },
  playIconOwn: {
    color: colors.white,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  waveformBarActive: {
    backgroundColor: premiumColors.brand.teal,
  },
  waveformBarActiveOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  waveformBarInactive: {
    backgroundColor: premiumColors.system.gray4,
  },
  waveformBarInactiveOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  voiceDuration: {
    fontSize: premiumTypography.sizes.caption1,
    color: premiumColors.system.gray,
    marginLeft: premiumSpacing.sm,
    minWidth: 36,
  },
  voiceDurationOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default PremiumMessageBubble;
