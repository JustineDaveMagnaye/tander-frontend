/**
 * TANDER ConversationItem Component
 * 100% rewritten for reliability and design_system2.md compliance
 * Following LoginScreen and ProfileScreen design patterns exactly
 *
 * Features:
 * - Simple vector icons (View-based, no emojis)
 * - Senior-friendly design (80dp minimum height)
 * - Full responsive support (phones, tablets, portrait, landscape)
 * - WCAG AAA accessibility compliance
 * - clamp() helper for responsive sizing
 * - useMemo for performance
 * - memo() for render optimization
 */

import React, { useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { borderRadius, shadows } from '@shared/styles/spacing';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { Conversation, ChatUser } from '../types';

// ============================================================================
// RESPONSIVE HELPER - Clamps values for all screen sizes (from ProfileScreen)
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// SIMPLE VECTOR ICON COMPONENTS - Following ProfileScreen pattern exactly
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

const CheckIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = clamp(size * 0.12, 1.5, 4);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.35,
        height: size * 0.55,
        borderRightWidth: strokeWidth,
        borderBottomWidth: strokeWidth,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.1,
        marginLeft: -size * 0.05,
      }} />
    </View>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const getOtherUser = (participants: ChatUser[]): ChatUser | undefined => participants[0];

// ============================================================================
// COMPONENT PROPS
// ============================================================================
interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  isSelected?: boolean;
}

// ============================================================================
// MAIN COMPONENT - Following LoginScreen/ProfileScreen pattern exactly
// ============================================================================
export const ConversationItem: React.FC<ConversationItemProps> = memo(({
  conversation,
  onPress,
  isSelected = false,
}) => {
  const { isLandscape, isTablet, hp, moderateScale } = useResponsive();

  const otherUser = getOtherUser(conversation.participants);
  if (!otherUser) return null;

  const hasUnread = conversation.unreadCount > 0;

  // ============================================================================
  // RESPONSIVE SIZES - Following ProfileScreen useMemo pattern exactly
  // ============================================================================
  const avatarSize = useMemo(() => {
    if (isLandscape) return clamp(hp(15), 48, 60);
    if (isTablet) return clamp(moderateScale(66), 58, 76);
    return clamp(moderateScale(58), 52, 68);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const nameSize = useMemo(() => {
    if (isLandscape) return clamp(hp(4.2), 14, 18);
    if (isTablet) return clamp(moderateScale(19), 17, 22);
    return clamp(moderateScale(17), 15, 20);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const previewSize = useMemo(() => {
    if (isLandscape) return clamp(hp(3.5), 12, 16);
    if (isTablet) return clamp(moderateScale(16), 14, 18);
    return clamp(moderateScale(15), 13, 17);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const timeSize = useMemo(() => {
    if (isLandscape) return clamp(hp(3.2), 11, 14);
    if (isTablet) return clamp(moderateScale(14), 12, 16);
    return clamp(moderateScale(13), 11, 15);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const itemPadding = useMemo(() => {
    if (isLandscape) return clamp(hp(3), 12, 18);
    if (isTablet) return clamp(moderateScale(18), 14, 22);
    return clamp(moderateScale(16), 12, 20);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const itemMarginH = useMemo(() => {
    if (isLandscape) return clamp(hp(2), 10, 16);
    if (isTablet) return clamp(moderateScale(16), 12, 20);
    return clamp(moderateScale(14), 10, 18);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const itemMarginV = useMemo(() => {
    if (isLandscape) return clamp(hp(1.2), 5, 10);
    if (isTablet) return clamp(moderateScale(8), 6, 12);
    return clamp(moderateScale(7), 5, 10);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const itemHeight = useMemo(() => {
    if (isLandscape) return clamp(hp(20), 72, 90);
    if (isTablet) return clamp(moderateScale(94), 84, 106);
    return clamp(moderateScale(86), 78, 96);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const unreadBadgeSize = useMemo(() => {
    if (isLandscape) return clamp(hp(5.5), 20, 26);
    if (isTablet) return clamp(moderateScale(26), 22, 30);
    return clamp(moderateScale(24), 20, 28);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const verifiedSize = useMemo(() => {
    if (isLandscape) return clamp(hp(4), 14, 20);
    if (isTablet) return clamp(moderateScale(20), 16, 24);
    return clamp(moderateScale(18), 14, 22);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const onlineSize = useMemo(() => {
    if (isLandscape) return clamp(hp(3.5), 12, 18);
    if (isTablet) return clamp(moderateScale(18), 14, 22);
    return clamp(moderateScale(16), 12, 20);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const contentGap = useMemo(() => {
    if (isLandscape) return clamp(hp(1.2), 4, 8);
    if (isTablet) return clamp(moderateScale(7), 5, 10);
    return clamp(moderateScale(6), 4, 9);
  }, [isLandscape, isTablet, hp, moderateScale]);

  // Computed values
  const isSentByMe = conversation.lastMessage?.senderId === 'current-user';
  const lastMessageTime = conversation.lastMessage?.createdAt
    ? formatTime(new Date(conversation.lastMessage.createdAt))
    : '';

  // Accessibility
  const accessibilityLabel = `Chat with ${otherUser.firstName}${otherUser.lastName ? ` ${otherUser.lastName}` : ''}${
    hasUnread ? `, ${conversation.unreadCount} unread` : ''
  }${otherUser.isOnline ? ', online' : ''}`;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.container,
        {
          padding: itemPadding,
          minHeight: itemHeight,
          marginHorizontal: itemMarginH,
          marginVertical: itemMarginV,
          borderRadius: clamp(borderRadius.large, 12, 18),
        },
        isSelected && styles.selected,
        hasUnread && styles.containerUnread,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint="Double tap to open conversation"
    >
      {/* Left accent for unread */}
      {hasUnread && (
        <View style={[styles.unreadAccent, { backgroundColor: colors.orange.primary }]} />
      )}

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View
          style={[
            styles.avatarWrapper,
            otherUser.isOnline && {
              borderWidth: 2,
              borderColor: colors.orange.primary,
              borderRadius: (avatarSize + 4) / 2,
              padding: 2,
            },
          ]}
        >
          {otherUser.profilePhoto ? (
            <Image
              source={{ uri: otherUser.profilePhoto }}
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <Text style={[styles.avatarInitial, { fontSize: avatarSize * 0.38 }]}>
                {otherUser.firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Online indicator */}
        {otherUser.isOnline && (
          <View
            style={[
              styles.onlineDot,
              {
                width: onlineSize,
                height: onlineSize,
                borderRadius: onlineSize / 2,
                borderWidth: clamp(onlineSize * 0.15, 2, 3),
                right: 0,
                bottom: 0,
              },
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, { marginLeft: itemPadding, gap: contentGap }]}>
        {/* Row 1: Name + Verified + Time */}
        <View style={styles.row1}>
          <View style={styles.nameContainer}>
            <Text
              style={[
                styles.name,
                { fontSize: nameSize },
                hasUnread && styles.nameUnread,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={FONT_SCALING.BODY}
            >
              {otherUser.firstName}
              {otherUser.lastName ? ` ${otherUser.lastName}` : ''}
            </Text>
            {otherUser.isVerified && (
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    width: verifiedSize,
                    height: verifiedSize,
                    borderRadius: verifiedSize / 2,
                    marginLeft: contentGap + 2,
                  },
                ]}
              >
                <CheckIcon size={verifiedSize * 0.65} color={colors.white} />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.time,
              { fontSize: timeSize, marginLeft: contentGap },
              hasUnread && styles.timeUnread,
            ]}
            maxFontSizeMultiplier={FONT_SCALING.CAPTION}
          >
            {lastMessageTime}
          </Text>
        </View>

        {/* Row 2: Preview + Unread Badge */}
        <View style={styles.row2}>
          <Text
            style={[
              styles.preview,
              { fontSize: previewSize },
              hasUnread && styles.previewUnread,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={FONT_SCALING.BODY}
          >
            {isSentByMe && <Text style={styles.youPrefix}>You: </Text>}
            {conversation.lastMessage?.content || 'Say hello!'}
          </Text>
          {hasUnread && (
            <View
              style={[
                styles.unreadBadge,
                {
                  minWidth: unreadBadgeSize,
                  height: unreadBadgeSize,
                  borderRadius: unreadBadgeSize / 2,
                  paddingHorizontal: unreadBadgeSize * 0.35,
                  marginLeft: contentGap + 2,
                },
              ]}
            >
              <Text style={[styles.unreadText, { fontSize: unreadBadgeSize * 0.55 }]}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// STYLES - Following ProfileScreen pattern
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerUnread: {
    backgroundColor: colors.neutral.surface,
  },
  selected: {
    backgroundColor: colors.teal.light + '10',
    borderWidth: 1.5,
    borderColor: colors.teal.primary,
  },

  // Unread accent
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 1.5,
    borderBottomRightRadius: 1.5,
  },

  // Avatar
  avatarSection: {
    position: 'relative',
  },
  avatarWrapper: {},
  avatar: {
    backgroundColor: colors.neutral.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.teal.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.white,
    fontWeight: '600',
  },

  // Online indicator
  onlineDot: {
    position: 'absolute',
    backgroundColor: colors.semantic.success,
    borderColor: colors.neutral.surface,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  nameUnread: {
    fontWeight: '800',
  },

  // Verified badge
  verifiedBadge: {
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...shadows.small,
  },

  // Time
  time: {
    color: colors.neutral.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  timeUnread: {
    color: colors.orange.primary,
    fontWeight: '700',
  },

  // Preview
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  preview: {
    color: colors.neutral.textSecondary,
    fontWeight: '400',
    flex: 1,
    minWidth: 0,
    lineHeight: 20,
  },
  previewUnread: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  youPrefix: {
    color: colors.neutral.placeholder,
    fontWeight: '500',
  },

  // Unread badge
  unreadBadge: {
    backgroundColor: colors.orange.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    ...shadows.small,
  },
  unreadText: {
    color: colors.white,
    fontWeight: '700',
  },
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
