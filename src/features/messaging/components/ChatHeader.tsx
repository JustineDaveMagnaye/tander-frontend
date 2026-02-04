/**
 * TANDER ChatHeader Component
 * Header for chat screen with user info and call buttons
 *
 * Follows design_system2.md Section 8.3:
 * - Header: Back button + Profile photo + Name
 * - Added: Voice call and Video call buttons
 * - Senior-friendly: Large touch targets (64px)
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { ChatUser } from '../types';
import { FONT_SCALING } from '@shared/styles/fontScaling';

interface ChatHeaderProps {
  user: ChatUser;
  onBack: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onProfilePress?: () => void;
  isTyping?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  user,
  onBack,
  onVoiceCall,
  onVideoCall,
  onProfilePress,
  isTyping = false,
}) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, hp, wp, moderateScale } = useResponsive();

  // Responsive sizes
  const headerHeight = isLandscape
    ? Math.min(hp(16), 64)
    : isTablet
      ? moderateScale(72)
      : moderateScale(64);

  const avatarSize = isLandscape
    ? Math.min(hp(10), 44)
    : isTablet
      ? moderateScale(48)
      : moderateScale(44);

  const nameSize = isLandscape
    ? Math.min(hp(4.5), wp(3), 18)
    : isTablet
      ? moderateScale(20)
      : moderateScale(18);

  const statusSize = isLandscape
    ? Math.min(hp(3), wp(2), 13)
    : isTablet
      ? moderateScale(14)
      : moderateScale(13);

  const iconButtonSize = isLandscape
    ? Math.min(hp(10), 44)
    : isTablet
      ? moderateScale(48)
      : moderateScale(44);

  const iconSize = isLandscape
    ? Math.min(hp(5), 22)
    : isTablet
      ? moderateScale(24)
      : moderateScale(22);

  // Online status text
  const getStatusText = () => {
    if (isTyping) return 'typing...';
    if (user.isOnline) return 'Online';
    if (user.lastSeen) {
      const lastSeen = new Date(user.lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return lastSeen.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    }
    return 'Offline';
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
          height: headerHeight + insets.top,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.surface} />

      {/* Back button */}
      <TouchableOpacity
        onPress={onBack}
        style={[
          styles.backButton,
          { width: iconButtonSize, height: iconButtonSize },
        ]}
        accessible={true}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        accessibilityHint="Double tap to go back to conversations"
      >
        <Text style={[styles.backIcon, { fontSize: iconSize }]}>←</Text>
      </TouchableOpacity>

      {/* User info */}
      <TouchableOpacity
        onPress={onProfilePress}
        style={styles.userInfo}
        disabled={!onProfilePress}
        accessible={true}
        accessibilityLabel={`${user.firstName}'s profile. ${getStatusText()}`}
        accessibilityRole={onProfilePress ? 'button' : 'text'}
        accessibilityHint={onProfilePress ? 'Double tap to view profile' : undefined}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.profilePhoto ? (
            <Image
              source={{ uri: user.profilePhoto }}
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: avatarSize * 0.4 }]}>
                {user.firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Online indicator */}
          {user.isOnline && (
            <View
              style={[
                styles.onlineIndicator,
                {
                  width: avatarSize * 0.3,
                  height: avatarSize * 0.3,
                  borderRadius: avatarSize * 0.15,
                },
              ]}
            />
          )}
        </View>

        {/* Name and status */}
        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <Text
              variant="body"
              style={[styles.name, { fontSize: nameSize }]}
              numberOfLines={1}
            >
              {user.firstName}
              {user.lastName ? ` ${user.lastName}` : ''}
            </Text>
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
              </View>
            )}
          </View>
          <Text
            variant="caption"
            style={[
              styles.status,
              { fontSize: statusSize },
              isTyping && styles.typingStatus,
              user.isOnline && !isTyping && styles.onlineStatus,
            ]}
          >
            {getStatusText()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Call buttons */}
      <View style={styles.callButtons}>
        {/* Voice call */}
        <TouchableOpacity
          onPress={onVoiceCall}
          style={[
            styles.callButton,
            { width: iconButtonSize, height: iconButtonSize },
          ]}
          accessible={true}
          accessibilityLabel="Voice call"
          accessibilityRole="button"
          accessibilityHint={`Double tap to start a voice call with ${user.firstName}`}
        >
          <Text style={[styles.callIcon, { fontSize: iconSize }]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📞</Text>
        </TouchableOpacity>

        {/* Video call */}
        <TouchableOpacity
          onPress={onVideoCall}
          style={[
            styles.callButton,
            { width: iconButtonSize, height: iconButtonSize },
          ]}
          accessible={true}
          accessibilityLabel="Video call"
          accessibilityRole="button"
          accessibilityHint={`Double tap to start a video call with ${user.firstName}`}
        >
          <Text style={[styles.callIcon, { fontSize: iconSize }]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📹</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.s,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    ...shadows.small,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  backIcon: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.s,
  },
  avatar: {
    backgroundColor: colors.neutral.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.neutral.surface,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xxs,
  },
  verifiedIcon: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  status: {
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  typingStatus: {
    color: colors.teal.primary,
    fontStyle: 'italic',
  },
  onlineStatus: {
    color: colors.semantic.success,
  },
  callButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  callButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderRadius: borderRadius.round,
  },
  callIcon: {
    color: colors.teal.primary,
  },
});

export default ChatHeader;
