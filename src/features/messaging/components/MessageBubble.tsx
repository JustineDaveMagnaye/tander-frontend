/**
 * TANDER MessageBubble Component
 * Displays a single chat message
 *
 * Follows design_system2.md Section 6.4:
 * - Sent: Orange gradient, white text, right-aligned
 * - Received: Light gray, dark text, left-aligned
 * - Min Height: 48px
 * - Border Radius: 16px
 * - Font Size: 20px (senior-friendly)
 * - Line Height: 1.5
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { Message, MessageStatus } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  onLongPress?: () => void;
  onImagePress?: (imageUrl: string) => void;
}

// Format timestamp for display
const formatMessageTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Status icon component
const StatusIcon: React.FC<{ status: MessageStatus }> = ({ status }) => {
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return '○'; // Hollow circle
      case 'sent':
        return '✓'; // Single check
      case 'delivered':
        return '✓✓'; // Double check
      case 'read':
        return '✓✓'; // Double check (blue)
      case 'failed':
        return '!'; // Exclamation
      default:
        return '';
    }
  };

  const getColor = () => {
    if (status === 'read') return colors.teal.primary;
    if (status === 'failed') return colors.semantic.error;
    return 'rgba(255,255,255,0.7)';
  };

  return (
    <Text style={[styles.statusIcon, { color: getColor() }]}>
      {getIcon()}
    </Text>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  avatarUrl,
  onLongPress,
  onImagePress,
}) => {
  const { isLandscape, isTablet, hp, wp, moderateScale } = useResponsive();

  // Responsive sizes following design_system2.md
  const messageSize = isLandscape
    ? Math.min(hp(4.5), wp(3), 18)
    : isTablet
      ? moderateScale(20)
      : moderateScale(18);

  const timeSize = isLandscape
    ? Math.min(hp(3), wp(1.8), 12)
    : isTablet
      ? moderateScale(13)
      : moderateScale(12);

  const avatarSize = isLandscape
    ? Math.min(hp(8), wp(5), 32)
    : isTablet
      ? moderateScale(36)
      : moderateScale(32);

  const maxWidth = isLandscape
    ? wp(35)
    : isTablet
      ? wp(60)
      : wp(75);

  const bubblePadding = isLandscape
    ? hp(2)
    : isTablet
      ? moderateScale(16)
      : moderateScale(12);

  const messageTime = formatMessageTime(new Date(message.createdAt));

  // Render image message
  const renderImageMessage = () => (
    <TouchableOpacity
      onPress={() => message.mediaUrl && onImagePress?.(message.mediaUrl)}
      onLongPress={onLongPress}
      accessible={true}
      accessibilityLabel={`Image message. ${message.content || 'No description'}`}
      accessibilityRole="image"
    >
      <Image
        source={{ uri: message.mediaThumbnail || message.mediaUrl }}
        style={[styles.messageImage, { maxWidth: maxWidth - bubblePadding * 2 }]}
        resizeMode="cover"
      />
      {message.content && (
        <Text
          style={[
            styles.imageCaption,
            { fontSize: messageSize, color: isOwn ? colors.white : colors.neutral.textPrimary },
          ]}
        >
          {message.content}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Render text message
  const renderTextMessage = () => (
    <Text
      style={[
        styles.messageText,
        {
          fontSize: messageSize,
          lineHeight: messageSize * 1.5,
          color: isOwn ? colors.white : colors.neutral.textPrimary,
        },
      ]}
      accessible={true}
      accessibilityLabel={message.content}
    >
      {message.content}
    </Text>
  );

  // Render reply preview if this message is replying to another
  const renderReplyPreview = () => {
    if (!message.replyTo) return null;

    return (
      <View
        style={[
          styles.replyPreview,
          {
            borderLeftColor: isOwn ? 'rgba(255,255,255,0.5)' : colors.teal.primary,
          },
        ]}
      >
        <Text
          style={[
            styles.replyName,
            { color: isOwn ? 'rgba(255,255,255,0.8)' : colors.teal.primary },
          ]}
        >
          {message.replyTo.senderName}
        </Text>
        <Text
          style={[
            styles.replyContent,
            { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.neutral.textSecondary },
          ]}
          numberOfLines={1}
        >
          {message.replyTo.content}
        </Text>
      </View>
    );
  };

  // Bubble content
  const BubbleContent = () => (
    <View style={styles.bubbleInner}>
      {renderReplyPreview()}
      {message.type === 'image' ? renderImageMessage() : renderTextMessage()}
      <View style={styles.metaRow}>
        <Text
          style={[
            styles.timeText,
            {
              fontSize: timeSize,
              color: isOwn ? 'rgba(255,255,255,0.7)' : colors.neutral.textSecondary,
            },
          ]}
        >
          {messageTime}
        </Text>
        {isOwn && <StatusIcon status={message.status} />}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && (
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
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
            />
          )}
        </View>
      )}

      {/* Message bubble */}
      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.8}
        style={[styles.bubbleWrapper, { maxWidth }]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`${isOwn ? 'You' : 'They'} said: ${message.content}`}
        accessibilityHint="Long press for message options"
      >
        {isOwn ? (
          // Sent message - Orange gradient
          <LinearGradient
            colors={colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.bubble,
              styles.ownBubble,
              { padding: bubblePadding },
            ]}
          >
            <BubbleContent />
          </LinearGradient>
        ) : (
          // Received message - Light gray
          <View
            style={[
              styles.bubble,
              styles.otherBubble,
              { padding: bubblePadding },
            ]}
          >
            <BubbleContent />
          </View>
        )}
      </TouchableOpacity>

      {/* Spacer for own messages (where avatar would be) */}
      {isOwn && showAvatar && <View style={{ width: avatarSize + spacing.xs }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xxs,
    paddingHorizontal: spacing.s,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: spacing.xs,
    alignSelf: 'flex-end',
  },
  avatar: {
    backgroundColor: colors.neutral.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.teal.light,
  },
  bubbleWrapper: {
    flexShrink: 1,
  },
  bubble: {
    borderRadius: borderRadius.large,
    minHeight: 48,
  },
  ownBubble: {
    borderBottomRightRadius: spacing.xxs,
  },
  otherBubble: {
    backgroundColor: colors.neutral.background,
    borderBottomLeftRadius: spacing.xxs,
  },
  bubbleInner: {
    flexDirection: 'column',
  },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: spacing.xs,
    marginBottom: spacing.xs,
    opacity: 0.9,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyContent: {
    fontSize: 12,
  },
  messageText: {
    fontWeight: '400',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xxs,
  },
  imageCaption: {
    marginTop: spacing.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  timeText: {
    marginRight: spacing.xxs,
  },
  statusIcon: {
    fontSize: 12,
  },
});

export default MessageBubble;
