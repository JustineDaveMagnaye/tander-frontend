/**
 * SwipeableConversationItem Component
 * Premium iOS-style conversation list item with swipe actions
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  Vibration,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
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
  getRelativeTime,
} from '../styles/premiumStyles';
import type { Conversation } from '../types';
import { FONT_SCALING } from '@/shared/styles/fontScaling';

// ============================================================================
// TYPES
// ============================================================================

interface SwipeableConversationItemProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
  onDelete?: (conversation: Conversation) => void;
  onMute?: (conversation: Conversation) => void;
  onPin?: (conversation: Conversation) => void;
  onArchive?: (conversation: Conversation) => void;
  isSelected?: boolean;
  index?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SWIPE_THRESHOLD = 80;
const FULL_SWIPE_THRESHOLD = 200;
const ACTION_WIDTH = 80;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Online Status Badge
const OnlineStatusBadge = memo(({ isOnline }: { isOnline: boolean }) => (
  <View
    style={[
      styles.onlineBadge,
      isOnline ? styles.onlineBadgeActive : styles.onlineBadgeInactive,
    ]}
  />
));

// Unread Badge
const UnreadBadge = memo(({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <Animated.View
      entering={FadeIn.springify()}
      style={styles.unreadBadge}
    >
      <LinearGradient
        colors={colors.gradient.romantic}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.unreadBadgeGradient}
      >
        <Text style={styles.unreadBadgeText}>
          {count > 99 ? '99+' : count}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
});

// Pinned Indicator
const PinnedIndicator = memo(() => (
  <View style={styles.pinnedIndicator}>
    <Text style={styles.pinnedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📌</Text>
  </View>
));

// Muted Indicator
const MutedIndicator = memo(() => (
  <View style={styles.mutedIndicator}>
    <Text style={styles.mutedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>🔕</Text>
  </View>
));

// Verified Badge
const VerifiedBadge = memo(() => (
  <View style={styles.verifiedBadge}>
    <Text style={styles.verifiedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
  </View>
));

// ============================================================================
// SWIPE ACTION BUTTONS
// ============================================================================

const SwipeAction = memo(({
  icon,
  label,
  backgroundColor,
  onPress,
  progress,
  position,
  totalActions,
}: {
  icon: string;
  label: string;
  backgroundColor: string;
  onPress: () => void;
  progress: Animated.SharedValue<number>;
  position: number;
  totalActions: number;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.value,
      [0, 50, 100],
      [0.5, 0.8, 1],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      progress.value,
      [0, 30, 60],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.swipeAction, { backgroundColor }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={styles.swipeActionButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.swipeActionIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>{icon}</Text>
        <Text style={styles.swipeActionLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SwipeableConversationItem = memo(({
  conversation,
  onPress,
  onDelete,
  onMute,
  onPin,
  onArchive,
  isSelected = false,
  index = 0,
}: SwipeableConversationItemProps) => {
  const { moderateScale, isTablet, wp } = useResponsive();

  // Get the other participant
  const otherUser = useMemo(() => {
    return conversation.participants.find((p) => p.id !== 'currentUserId') || conversation.participants[0];
  }, [conversation.participants]);

  // Animation values
  const translateX = useSharedValue(0);
  const swipeProgress = useSharedValue(0);
  const scale = useSharedValue(1);

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

  // Handle actions
  const handleDelete = useCallback(() => {
    triggerHaptic('heavy');
    onDelete?.(conversation);
    translateX.value = withSpring(0, premiumAnimations.spring.snappy);
  }, [conversation, onDelete, triggerHaptic, translateX]);

  const handleMute = useCallback(() => {
    triggerHaptic('medium');
    onMute?.(conversation);
    translateX.value = withSpring(0, premiumAnimations.spring.snappy);
  }, [conversation, onMute, triggerHaptic, translateX]);

  const handlePin = useCallback(() => {
    triggerHaptic('medium');
    onPin?.(conversation);
    translateX.value = withSpring(0, premiumAnimations.spring.snappy);
  }, [conversation, onPin, triggerHaptic, translateX]);

  const handleArchive = useCallback(() => {
    triggerHaptic('medium');
    onArchive?.(conversation);
    translateX.value = withSpring(0, premiumAnimations.spring.snappy);
  }, [conversation, onArchive, triggerHaptic, translateX]);

  // Pan gesture for swipe
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      'worklet';
      // Only allow left swipe (negative values)
      const clampedTranslation = Math.min(0, Math.max(event.translationX, -ACTION_WIDTH * 3));
      translateX.value = clampedTranslation;
      swipeProgress.value = Math.abs(clampedTranslation);
    })
    .onEnd((event) => {
      'worklet';
      const shouldSnap = Math.abs(translateX.value) > SWIPE_THRESHOLD;
      const shouldFullSwipe = Math.abs(translateX.value) > FULL_SWIPE_THRESHOLD;

      if (shouldFullSwipe) {
        // Full swipe - delete
        translateX.value = withTiming(-wp(100), { duration: 200 });
        runOnJS(handleDelete)();
      } else if (shouldSnap) {
        // Snap to show actions
        translateX.value = withSpring(-ACTION_WIDTH * 2.5, premiumAnimations.spring.snappy);
        runOnJS(triggerHaptic)('light');
      } else {
        // Snap back
        translateX.value = withSpring(0, premiumAnimations.spring.snappy);
        swipeProgress.value = withTiming(0);
      }
    });

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      scale.value = withTiming(0.98, { duration: 50 });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, premiumAnimations.spring.gentle);
      runOnJS(onPress)(conversation);
    });

  // Combined gestures
  const composedGestures = Gesture.Race(panGesture, tapGesture);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const rightActionsStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [-ACTION_WIDTH * 3, 0],
          [0, ACTION_WIDTH * 3],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Format last message
  const lastMessagePreview = useMemo(() => {
    if (!conversation.lastMessage) return 'Start a conversation';

    const { content, type } = conversation.lastMessage;
    if (type === 'image') return '📷 Photo';
    if (type === 'voice') return '🎤 Voice message';
    if (type === 'video') return '🎬 Video';

    // Truncate long messages
    const maxLength = isTablet ? 80 : 45;
    if (content.length > maxLength) {
      return content.substring(0, maxLength) + '...';
    }
    return content;
  }, [conversation.lastMessage, isTablet]);

  // Time string
  const timeString = useMemo(() => {
    if (conversation.lastMessage?.createdAt) {
      return getRelativeTime(conversation.lastMessage.createdAt);
    }
    return '';
  }, [conversation.lastMessage?.createdAt]);

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 30).springify().damping(15)}
      style={styles.wrapper}
    >
      {/* Right swipe actions */}
      <Animated.View style={[styles.rightActionsContainer, rightActionsStyle]}>
        <SwipeAction
          icon="📌"
          label={conversation.isPinned ? 'Unpin' : 'Pin'}
          backgroundColor={premiumColors.brand.orange}
          onPress={handlePin}
          progress={swipeProgress}
          position={0}
          totalActions={3}
        />
        <SwipeAction
          icon={conversation.isMuted ? '🔔' : '🔕'}
          label={conversation.isMuted ? 'Unmute' : 'Mute'}
          backgroundColor={colors.teal[600]}
          onPress={handleMute}
          progress={swipeProgress}
          position={1}
          totalActions={3}
        />
        <SwipeAction
          icon="🗑️"
          label="Delete"
          backgroundColor={premiumColors.system.error}
          onPress={handleDelete}
          progress={swipeProgress}
          position={2}
          totalActions={3}
        />
      </Animated.View>

      {/* Main content */}
      <GestureDetector gesture={composedGestures}>
        <Animated.View
          style={[
            styles.container,
            isSelected && styles.containerSelected,
            containerAnimatedStyle,
          ]}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {otherUser.profilePhoto ? (
              <Image
                source={{ uri: otherUser.profilePhoto }}
                style={styles.avatar}
              />
            ) : (
              <LinearGradient
                colors={colors.gradient.romantic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {otherUser.firstName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </LinearGradient>
            )}
            <OnlineStatusBadge isOnline={otherUser.isOnline} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Top row: Name + Time */}
            <View style={styles.topRow}>
              <View style={styles.nameContainer}>
                <Text
                  style={[
                    styles.name,
                    conversation.unreadCount > 0 && styles.nameUnread,
                  ]}
                  numberOfLines={1}
                >
                  {otherUser.firstName} {otherUser.lastName}
                </Text>
                {otherUser.isVerified && <VerifiedBadge />}
                {conversation.isPinned && <PinnedIndicator />}
              </View>
              <View style={styles.timeContainer}>
                <Text
                  style={[
                    styles.time,
                    conversation.unreadCount > 0 && styles.timeUnread,
                  ]}
                >
                  {timeString}
                </Text>
              </View>
            </View>

            {/* Bottom row: Message + Badge */}
            <View style={styles.bottomRow}>
              <View style={styles.messageContainer}>
                {conversation.isMuted && <MutedIndicator />}
                <Text
                  style={[
                    styles.message,
                    conversation.unreadCount > 0 && styles.messageUnread,
                  ]}
                  numberOfLines={2}
                >
                  {lastMessagePreview}
                </Text>
              </View>
              <UnreadBadge count={conversation.unreadCount} />
            </View>
          </View>

          {/* Chevron */}
          <View style={styles.chevronContainer}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

SwipeableConversationItem.displayName = 'SwipeableConversationItem';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: premiumSpacing.screenPadding,
    paddingVertical: premiumSpacing.md,
    minHeight: 76,
  },
  containerSelected: {
    backgroundColor: premiumColors.system.gray6,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: premiumSpacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray5,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.white,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  onlineBadgeActive: {
    backgroundColor: premiumColors.status.online,
  },
  onlineBadgeInactive: {
    backgroundColor: premiumColors.status.offline,
  },

  // Content
  content: {
    flex: 1,
    marginRight: premiumSpacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: premiumSpacing.xxs,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: premiumSpacing.sm,
  },
  name: {
    fontSize: premiumTypography.sizes.headline,
    fontWeight: '600',
    color: colors.gray[900],
    flexShrink: 1,
  },
  nameUnread: {
    fontWeight: '700',
  },
  timeContainer: {
    flexShrink: 0,
  },
  time: {
    fontSize: premiumTypography.sizes.footnote,
    color: premiumColors.system.gray,
  },
  timeUnread: {
    color: colors.orange[500],
    fontWeight: '600',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: premiumSpacing.sm,
  },
  message: {
    fontSize: premiumTypography.sizes.subheadline,
    color: premiumColors.system.gray,
    flex: 1,
    lineHeight: premiumTypography.sizes.subheadline * 1.4,
  },
  messageUnread: {
    color: colors.gray[700],
    fontWeight: '500',
  },

  // Badges
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: premiumColors.brand.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: premiumSpacing.xxs,
  },
  verifiedIcon: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
  },
  pinnedIndicator: {
    marginLeft: premiumSpacing.xxs,
  },
  pinnedIcon: {
    fontSize: 12,
  },
  mutedIndicator: {
    marginRight: premiumSpacing.xxs,
  },
  mutedIcon: {
    fontSize: 12,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
  },
  unreadBadgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },

  // Chevron
  chevronContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 22,
    color: premiumColors.system.gray3,
    fontWeight: '400',
  },

  // Swipe actions
  rightActionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  swipeAction: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  swipeActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  swipeActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
});

export default SwipeableConversationItem;
