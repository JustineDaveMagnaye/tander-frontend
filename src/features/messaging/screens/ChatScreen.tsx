/**
 * TANDER ChatScreen (ConversationScreen)
 * Real-time chat with STOMP WebSocket integration
 *
 * Design Specification:
 * - Header: Back button, avatar with online indicator, name, status, action buttons
 * - Messages: Orange gradient for sent, gray for received, rounded-3xl bubbles
 * - Input: Emoji button, rounded input, send/thumbs-up button
 * - Info Sidebar: Profile actions, media & files, privacy & support
 * - Modals: Search, Media & Files, Privacy & Support
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  Animated,
  Keyboard,
  Alert,
  Linking,
  Image,
  AppState,
  AppStateStatus,
  AccessibilityInfo,
} from 'react-native';
import { toast } from '@store/toastStore';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { useChat, Message } from '../hooks/useChat';
import { blockUser, reportUser } from '@services/api/profileApi';
import { muteConversation, unmuteConversation, getMuteStatus } from '@services/api/chatApi';
import { stompService } from '@services/websocket';
import type { MessagesStackParamList } from '@navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ✅ PREMIUM: Import new UI components
import { DateSeparator } from '../components/DateSeparator';
import { TypingIndicator } from '../components/TypingIndicator';
import { ConnectionStatusBar, ConnectionState } from '../components/ConnectionStatusBar';
import { ChatSkeleton } from '../components/ChatSkeleton';

// ============================================================================
// TYPES
// ============================================================================
type ChatScreenRouteProp = RouteProp<MessagesStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'Chat'>;

// ============================================================================
// CHAT LOADING MESSAGES - Rotating encouraging messages for seniors
// ============================================================================
const CHAT_LOADING_MESSAGES = [
  'Loading your conversation...',
  'Fetching messages...',
  'Connecting to chat...',
  'Almost ready...',
];

// ============================================================================
// HELPERS
// ============================================================================
/**
 * Decode HTML entities in text (e.g., &#39; -> ', &amp; -> &)
 * Handles common HTML entities that may come from backend
 */
const decodeHTMLEntities = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
};

// ============================================================================
// CHAT LOADING STATE COMPONENT - Enhanced with animations
// ============================================================================
const ChatLoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Rotate through loading messages
  useEffect(() => {
    const messageTimer = setInterval(() => {
      // Fade out, change message, fade in
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setMessageIndex((prev) => (prev + 1) % CHAT_LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(messageTimer);
  }, [fadeAnim]);

  // Animated dots
  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(dotsTimer);
  }, []);

  // Bounce animation for icon
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -6,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [bounceAnim]);

  return (
    <View style={chatLoadingStyles.container}>
      {/* Animated gradient circle with bouncing icon */}
      <LinearGradient
        colors={[colors.orange[100], colors.teal[100]]}
        style={chatLoadingStyles.circle}
      >
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <Feather name="message-circle" size={36} color={colors.orange[500]} />
        </Animated.View>
      </LinearGradient>

      {/* Rotating message with animated dots */}
      <Animated.Text style={[chatLoadingStyles.text, { opacity: fadeAnim }]}>
        {CHAT_LOADING_MESSAGES[messageIndex]}
      </Animated.Text>
      <Text style={chatLoadingStyles.dots}>{dots || ' '}</Text>
    </View>
  );
};

// Styles for ChatLoadingState
const chatLoadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.gray[700],
    textAlign: 'center',
  },
  dots: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.orange[500],
    height: 28,
    marginTop: 4,
  },
});

// ============================================================================
// CALL MESSAGE BUBBLE COMPONENT
// Enhanced UI/UX with directional indicators, tap-to-call, and senior-friendly design
// ============================================================================
interface CallMessageBubbleProps {
  message: Message;
  onCallBack?: (callType: 'AUDIO' | 'VIDEO') => void;
}

const CallMessageBubble: React.FC<CallMessageBubbleProps> = ({ message, onCallBack }) => {
  const isOutgoing = message.sender === 'me';

  // Parse call info from message text if not available in structured fields
  // Format: "📞 Video call - 2m 34s" or "📞 Missed voice call" etc.
  const parseCallInfo = () => {
    // If structured data is available, use it
    if (message.callType && message.callStatus) {
      return {
        isVideo: message.callType === 'VIDEO',
        isCompleted: message.callStatus === 'completed',
        isMissed: message.callStatus === 'missed',
        isDeclined: message.callStatus === 'declined',
        isCancelled: message.callStatus === 'cancelled',
        duration: message.callDuration,
      };
    }

    // Parse from text (for messages loaded from backend)
    const text = message.text.replace('📞 ', '').toLowerCase();
    const isVideo = text.includes('video');

    // Check status
    const isMissed = text.includes('missed') || text.includes('no answer');
    const isDeclined = text.includes('declined');
    const isCancelled = text.includes('cancelled');
    const isCompleted = !isMissed && !isDeclined && !isCancelled;

    // Parse duration if present (e.g., "2m 34s" or "45s")
    let duration: number | undefined;
    const durationMatch = text.match(/(\d+)m\s*(\d+)?s?|(\d+)s/);
    if (durationMatch) {
      if (durationMatch[1] && durationMatch[2]) {
        duration = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
      } else if (durationMatch[1]) {
        duration = parseInt(durationMatch[1]) * 60;
      } else if (durationMatch[3]) {
        duration = parseInt(durationMatch[3]);
      }
    }

    return { isVideo, isCompleted, isMissed, isDeclined, isCancelled, duration };
  };

  const callInfo = parseCallInfo();
  const { isVideo, isCompleted, isMissed, isDeclined, isCancelled, duration: parsedDuration } = callInfo;

  // Determine styling based on call status
  const getCallStyle = () => {
    if (isCompleted) {
      return {
        iconBg: colors.teal[500],
        iconColor: colors.white,
        textColor: colors.gray[800],
        subtextColor: colors.teal[600],
        bgColor: colors.white,
        borderColor: colors.teal[200],
        arrowColor: colors.teal[500],
      };
    }
    if (isMissed && !isOutgoing) {
      // Incoming missed call - more prominent red styling
      return {
        iconBg: '#EF4444', // Red
        iconColor: colors.white,
        textColor: '#DC2626',
        subtextColor: colors.gray[500],
        bgColor: '#FEF2F2', // Red-50
        borderColor: '#FECACA', // Red-200
        arrowColor: '#EF4444',
      };
    }
    // Outgoing no answer, declined, cancelled - neutral gray
    return {
      iconBg: colors.gray[400],
      iconColor: colors.white,
      textColor: colors.gray[700],
      subtextColor: colors.gray[500],
      bgColor: colors.gray[50],
      borderColor: colors.gray[200],
      arrowColor: colors.gray[400],
    };
  };

  // Format duration nicely
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds === 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
  };

  // Get descriptive status text
  const getStatusText = () => {
    const callLabel = isVideo ? 'Video' : 'Voice';

    if (isCompleted) {
      return `${callLabel} call`;
    }
    if (isMissed) {
      return isOutgoing ? 'No answer' : 'Missed call';
    }
    if (isDeclined) {
      return 'Call declined';
    }
    if (isCancelled) {
      return 'Call cancelled';
    }
    return `${callLabel} call`;
  };

  const style = getCallStyle();
  const duration = formatDuration(parsedDuration);
  const statusText = getStatusText();

  // Handle tap to call back
  const handleCallBack = () => {
    if (onCallBack) {
      onCallBack(isVideo ? 'VIDEO' : 'AUDIO');
    }
  };

  const BubbleContent = (
    <View
      style={[
        styles.callBubbleContainer,
        { backgroundColor: style.bgColor, borderColor: style.borderColor },
      ]}
    >
      {/* Left side: Icon with direction arrow */}
      <View style={styles.callBubbleLeft}>
        <View style={[styles.callBubbleIconWrapper, { backgroundColor: style.iconBg }]}>
          <Feather
            name={isVideo ? 'video' : 'phone'}
            size={18}
            color={style.iconColor}
          />
        </View>
        {/* Direction arrow indicator */}
        <View style={[styles.callDirectionArrow, { backgroundColor: style.arrowColor }]}>
          <Feather
            name={isOutgoing ? 'arrow-up-right' : 'arrow-down-left'}
            size={10}
            color={colors.white}
          />
        </View>
      </View>

      {/* Center: Call info */}
      <View style={styles.callBubbleCenter}>
        <Text
          style={[styles.callBubbleTitle, { color: style.textColor }]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
        <View style={styles.callBubbleSubtitle}>
          {duration && (
            <>
              <Text style={[styles.callBubbleDuration, { color: style.subtextColor }]}>
                {duration}
              </Text>
              <Text style={styles.callBubbleDot}>•</Text>
            </>
          )}
          <Text style={styles.callBubbleTime}>{message.time}</Text>
        </View>
      </View>

      {/* ✅ FIX: Removed redundant callback button - whole bubble is touchable */}
    </View>
  );

  // Wrap in touchable if callback is provided
  if (onCallBack && (isMissed || isDeclined) && !isOutgoing) {
    return (
      <View style={styles.callMessageRow}>
        <View style={styles.callBubbleWrapper}>
          <TouchableOpacity
            onPress={handleCallBack}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`${statusText}${duration ? `, ${duration}` : ''}, at ${message.time}. Tap to call back.`}
            accessibilityRole="button"
            accessibilityHint="Double tap to call back"
          >
            {BubbleContent}
          </TouchableOpacity>
          <Text style={styles.callBackHint}>Tap to call back</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.callMessageRow}>
      <View
        accessible={true}
        accessibilityLabel={`${statusText}${duration ? `, ${duration}` : ''}, at ${message.time}`}
      >
        {BubbleContent}
      </View>
    </View>
  );
};

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================
interface MessageBubbleProps {
  message: Message;
  onCallBack?: (callType: 'AUDIO' | 'VIDEO') => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onCallBack }) => {
  // Check if this is a call message (by type or by 📞 prefix)
  const isCallMessage = message.type === 'call' || message.text.startsWith('📞');

  // Render call message bubble for call messages
  if (isCallMessage) {
    return <CallMessageBubble message={message} onCallBack={onCallBack} />;
  }

  const isOwn = message.sender === 'me';
  const { isTablet, isLandscape, wp } = useResponsive();

  // ✅ LANDSCAPE FIX: Responsive maxWidth based on device and orientation
  // In landscape mode, screen is wider so messages should be narrower percentage-wise
  // to prevent them from spanning too much horizontal space
  // Using wp() for precise pixel-based width calculation in landscape
  const messageBubbleMaxWidth = isLandscape
    ? (isTablet ? wp(45) : wp(50))   // Narrower in landscape for better alignment (pixel values)
    : (isTablet ? '60%' : '75%');    // Standard widths in portrait (percentage works well)

  // Status indicator for own messages - Enhanced with clear visual distinction
  // ✅ Updated: Double checkmarks for delivered/read with status text
  const getStatusIcon = () => {
    if (!isOwn) return null;

    // Get status with fallback to 'sent'
    const status = message.status || 'sent';

    switch (status) {
      case 'sending':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="clock" size={14} color={colors.gray[500]} />
            <Text style={{ fontSize: 13, color: colors.gray[500] }}>Sending...</Text>
          </View>
        );
      case 'sent':
        // Single checkmark - Message reached server
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="check" size={14} color={colors.gray[500]} />
            <Text style={{ fontSize: 13, color: colors.gray[500] }}>Sent</Text>
          </View>
        );
      case 'delivered':
        // Double checkmark (gray) - Message delivered to recipient
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row' }}>
              <Feather name="check" size={14} color={colors.gray[600]} />
              <Feather name="check" size={14} color={colors.gray[600]} style={{ marginLeft: -8 }} />
            </View>
            <Text style={{ fontSize: 13, color: colors.gray[600] }}>Delivered</Text>
          </View>
        );
      case 'read':
        // Double checkmark (teal) - Message seen by recipient
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row' }}>
              <Feather name="check" size={14} color={colors.teal[500]} />
              <Feather name="check" size={14} color={colors.teal[500]} style={{ marginLeft: -8 }} />
            </View>
            <Text style={{ fontSize: 13, color: colors.teal[500], fontWeight: '600' }}>Seen</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="alert-circle" size={14} color={colors.semantic.error} />
            <Text style={{ fontSize: 13, color: colors.semantic.error }}>Failed</Text>
          </View>
        );
      default:
        // Fallback - show as sent
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="check" size={14} color={colors.gray[500]} />
            <Text style={{ fontSize: 13, color: colors.gray[500] }}>Sent</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
      <View style={[styles.messageContent, { maxWidth: messageBubbleMaxWidth }]}>
        {isOwn ? (
          // Sent message - Orange gradient
          <LinearGradient
            colors={[colors.orange[500], colors.orange[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bubbleOwn}
          >
            <Text style={styles.bubbleTextOwn}>{decodeHTMLEntities(message.text)}</Text>
          </LinearGradient>
        ) : (
          // Received message - Gray background
          <View style={styles.bubbleOther}>
            <Text style={styles.bubbleTextOther}>{decodeHTMLEntities(message.text)}</Text>
          </View>
        )}
        <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
          <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
            {message.time}
          </Text>
        </View>
        {/* Status indicator - shown below time for better visibility */}
        {isOwn && (
          <View style={[styles.timeRow, styles.timeRowOwn, { marginTop: 2 }]}>
            {getStatusIcon()}
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// INFO SIDEBAR COMPONENT
// ============================================================================
interface InfoSidebarProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userAvatar: string;
  userPhotoUrl?: string;
  isOnline: boolean;
  onViewProfile: () => void;
  onMuteToggle: () => void;
  isMuted: boolean;
  onSearch: () => void;
  onMediaFiles: () => void;
  onPrivacySupport: () => void;
}

const InfoSidebar: React.FC<InfoSidebarProps> = ({
  visible,
  onClose,
  userName,
  userAvatar,
  userPhotoUrl,
  isOnline,
  onViewProfile,
  onMuteToggle,
  isMuted,
  onSearch,
  onMediaFiles,
  onPrivacySupport,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, wp } = useResponsive();

  if (!visible) return null;

  // ✅ LANDSCAPE FIX: Detect phone landscape for safe area handling
  const isPhoneLandscape = isLandscape && !isTablet;

  // On tablets, constrain sidebar width and position it on the right
  // ✅ LANDSCAPE FIX: Apply horizontal safe area insets for phone landscape (notch handling)
  const sidebarStyle = isTablet
    ? [styles.infoSidebar, styles.infoSidebarTablet, { paddingTop: insets.top, width: Math.min(wp(50), 400) }]
    : [
        styles.infoSidebar,
        {
          paddingTop: insets.top,
          paddingLeft: isPhoneLandscape ? insets.left : 0,
          paddingRight: isPhoneLandscape ? insets.right : 0,
        }
      ];

  return (
    <View style={sidebarStyle}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.infoCloseButton}
          accessible={true}
          accessibilityLabel="Close info panel"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={20} color={colors.gray[700]} />
        </TouchableOpacity>

        {/* Profile Info */}
        <View style={styles.infoProfileSection}>
          <View style={styles.infoAvatarWrapper}>
            {userPhotoUrl ? (
              <Image
                source={{ uri: userPhotoUrl }}
                style={styles.infoAvatarImage}
              />
            ) : (
              <LinearGradient
                colors={[colors.teal[400], colors.teal[500]]}
                style={styles.infoAvatar}
              >
                <Text style={styles.infoAvatarText}>{userAvatar}</Text>
              </LinearGradient>
            )}
            {isOnline && <View style={styles.infoOnlineDot} />}
          </View>
          <Text style={styles.infoName}>{userName}</Text>
          <View style={styles.infoEncryption}>
            <Feather name="lock" size={14} color={colors.gray[500]} />
            <Text style={styles.infoEncryptionText}>End-to-end encrypted</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.infoActions}>
          <TouchableOpacity
            onPress={onViewProfile}
            style={styles.infoActionButton}
            accessible={true}
            accessibilityLabel="View profile"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.orange[500], colors.teal[500]]}
              style={styles.infoActionIcon}
            >
              <Feather name="info" size={20} color={colors.white} />
            </LinearGradient>
            <Text style={styles.infoActionText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onMuteToggle}
            style={styles.infoActionButton}
            accessible={true}
            accessibilityLabel={isMuted ? 'Unmute notifications' : 'Mute notifications'}
            accessibilityRole="button"
          >
            <View style={styles.infoActionIconGray}>
              <Feather name={isMuted ? 'bell-off' : 'bell'} size={20} color={colors.gray[700]} />
            </View>
            <Text style={styles.infoActionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSearch}
            style={styles.infoActionButton}
            accessible={true}
            accessibilityLabel="Search messages"
            accessibilityRole="button"
          >
            <View style={styles.infoActionIconGray}>
              <Feather name="search" size={20} color={colors.gray[700]} />
            </View>
            <Text style={styles.infoActionText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Media & Files */}
        <TouchableOpacity
          onPress={onMediaFiles}
          style={styles.infoMenuItem}
          accessible={true}
          accessibilityLabel="View media and files"
          accessibilityRole="button"
        >
          <View style={styles.infoMenuLeft}>
            <Feather name="image" size={20} color={colors.gray[600]} />
            <Text style={styles.infoMenuText}>Media & files</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        {/* Privacy & Support */}
        <TouchableOpacity
          onPress={onPrivacySupport}
          style={[styles.infoMenuItem, styles.infoMenuItemBorder]}
          accessible={true}
          accessibilityLabel="Privacy and support options"
          accessibilityRole="button"
        >
          <Text style={styles.infoMenuText}>Privacy & support</Text>
          <Feather name="chevron-right" size={20} color={colors.gray[400]} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// SEARCH MODAL COMPONENT
// ============================================================================
interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  messages: Message[];
}

const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose, messages }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  // Reset search when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages.filter(m =>
      m.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, messages]);

  // Escape regex special characters to prevent injection
  const escapeRegex = useCallback((str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }, []);

  // Highlight matching text in search results
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return <Text style={styles.searchResultText}>{text}</Text>;

    // Escape special regex characters to prevent injection attacks
    const escapedQuery = escapeRegex(query);
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <Text style={styles.searchResultText}>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={index} style={styles.searchHighlight}>{part}</Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  }, [escapeRegex]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContent, { marginTop: insets.top + 40 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Search in Conversation</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                  accessible={true}
                  accessibilityLabel="Close search"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={24} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View style={styles.searchInputContainer}>
                <Feather name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search messages..."
                  placeholderTextColor={colors.gray[400]}
                  autoFocus
                  accessible={true}
                  accessibilityLabel="Search messages"
                  accessibilityHint="Type to search through messages"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.searchClearButton}
                    accessible={true}
                    accessibilityLabel="Clear search"
                    accessibilityRole="button"
                  >
                    <Feather name="x" size={18} color={colors.gray[500]} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Results */}
              <ScrollView style={styles.searchResults}>
                {searchQuery.trim() ? (
                  filteredMessages.length > 0 ? (
                    <>
                      <Text style={styles.searchResultsCount}>
                        {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} found
                      </Text>
                      {filteredMessages.map(message => (
                        <View key={message.id} style={styles.searchResultItem}>
                          {highlightText(message.text, searchQuery)}
                          <Text style={styles.searchResultTime}>{message.time}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={styles.searchEmpty}>
                      <Feather name="search" size={48} color={colors.gray[300]} />
                      <Text style={styles.searchEmptyText}>No messages found</Text>
                      <Text style={styles.searchEmptyHint}>Try a different search term</Text>
                    </View>
                  )
                ) : (
                  <View style={styles.searchEmpty}>
                    <Feather name="search" size={64} color={colors.gray[300]} />
                    <Text style={styles.searchEmptyText}>Type to search messages</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================================================
// MEDIA FILES MODAL COMPONENT
// ============================================================================
interface MediaFilesModalProps {
  visible: boolean;
  onClose: () => void;
}

const MediaFilesModal: React.FC<MediaFilesModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const sampleFiles = ['Orchid_Care_Guide.pdf', 'Restaurant_Menu.pdf', 'Event_Details.docx'];

  const handleDownload = useCallback((fileName: string) => {
    Alert.alert(
      'Download File',
      `Download "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => {
            // TODO: Implement actual file download
            toast.success('Download Complete', `"${fileName}" has been downloaded.`);
          }
        },
      ]
    );
  }, []);

  const handleMediaPress = useCallback((itemIndex: number) => {
    toast.info('Media Preview', `Opening media item ${itemIndex}...`);
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContent, styles.modalLarge, { marginTop: insets.top + 40 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Media & Files</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                  accessible={true}
                  accessibilityLabel="Close media files"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={24} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Photos & Videos Section */}
                <View style={styles.mediaSection}>
                  <View style={styles.mediaSectionHeader}>
                    <Feather name="image" size={20} color={colors.orange[500]} />
                    <Text style={styles.mediaSectionTitle}>Photos & Videos</Text>
                  </View>
                  <View style={styles.mediaGrid}>
                    {[1, 2, 3, 4, 5, 6].map(item => (
                      <TouchableOpacity
                        key={item}
                        style={styles.mediaGridItem}
                        onPress={() => handleMediaPress(item)}
                        accessible={true}
                        accessibilityLabel={`Media item ${item}`}
                        accessibilityRole="button"
                      >
                        <LinearGradient
                          colors={[colors.gray[100], colors.gray[200]]}
                          style={styles.mediaGridItemInner}
                        >
                          <Feather name="image" size={32} color={colors.gray[400]} />
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Documents Section */}
                <View style={styles.mediaSection}>
                  <View style={styles.mediaSectionHeader}>
                    <Feather name="file" size={20} color={colors.teal[500]} />
                    <Text style={styles.mediaSectionTitle}>Documents</Text>
                  </View>
                  {sampleFiles.map((file, idx) => (
                    <View key={idx} style={styles.fileItem}>
                      <View style={styles.fileIconContainer}>
                        <LinearGradient
                          colors={[colors.orange[500], colors.teal[500]]}
                          style={styles.fileIcon}
                        >
                          <Feather name="file" size={24} color={colors.white} />
                        </LinearGradient>
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{file}</Text>
                        <Text style={styles.fileSize}>{(Math.random() * 2 + 0.5).toFixed(1)} MB</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() => handleDownload(file)}
                        accessible={true}
                        accessibilityLabel={`Download ${file}`}
                        accessibilityRole="button"
                      >
                        <Feather name="download" size={20} color={colors.gray[600]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================================================
// PRIVACY SUPPORT MODAL COMPONENT
// ============================================================================
interface PrivacySupportModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userId: string;
  onUserBlocked?: () => void;
}

const REPORT_REASONS = [
  'Inappropriate messages',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Offensive content',
  'Other',
];

const PrivacySupportModal: React.FC<PrivacySupportModalProps> = ({ visible, onClose, userName, userId, onUserBlocked }) => {
  const insets = useSafeAreaInsets();

  const handleBlockUser = useCallback(() => {
    Alert.alert(
      `Block ${userName}?`,
      `${userName} will no longer be able to contact you or see your profile. You can unblock them later from settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(userId);
              toast.success('User Blocked', `${userName} has been blocked.`);
              onUserBlocked?.();
              onClose();
            } catch (error) {
              console.warn('Failed to block user:', error);
              toast.error('Block Failed', 'Failed to block user. Please try again.');
            }
          }
        },
      ]
    );
  }, [userName, userId, onClose, onUserBlocked]);

  const handleReportConversation = useCallback(() => {
    Alert.alert(
      'Report Conversation',
      'Please select a reason for reporting:',
      [
        ...REPORT_REASONS.map(reason => ({
          text: reason,
          onPress: () => {
            Alert.alert(
              'Confirm Report',
              `Are you sure you want to report this conversation for "${reason}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Report',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await reportUser({
                        userId,
                        reason,
                        details: `Reported from conversation with ${userName}`,
                      });
                      toast.success(
                        'Report Submitted',
                        'Our team will review it within 24 hours.'
                      );
                      onClose();
                    } catch (error) {
                      console.warn('Failed to report user:', error);
                      toast.error('Report Failed', 'Failed to submit report. Please try again.');
                    }
                  }
                },
              ]
            );
          }
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [userId, userName, onClose]);

  const handleSafetyTips = useCallback(() => {
    toast.info(
      'Safety Tips',
      'Never share financial info. Meet in public. Tell a friend. Trust your instincts.',
      6000
    );
  }, []);

  const handleGetHelp = useCallback(() => {
    Alert.alert(
      'Contact Support',
      'How would you like to get help?',
      [
        {
          text: 'Email Support',
          onPress: () => Linking.openURL('mailto:support@tander.com')
        },
        {
          text: 'Visit Help Center',
          onPress: () => Linking.openURL('https://tander.com/help')
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://tander.com/privacy');
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContent, styles.modalLarge, { marginTop: insets.top + 40 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Privacy & Support</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                  accessible={true}
                  accessibilityLabel="Close privacy and support"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={24} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Privacy Settings */}
                <View style={styles.privacySection}>
                  <View style={styles.privacySectionHeader}>
                    <Feather name="shield" size={20} color={colors.teal[500]} />
                    <Text style={styles.privacySectionTitle}>Privacy Settings</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.privacyOption}
                    onPress={handleBlockUser}
                    accessible={true}
                    accessibilityLabel={`Block ${userName}`}
                    accessibilityRole="button"
                  >
                    <Feather name="lock" size={20} color={colors.gray[600]} />
                    <View style={styles.privacyOptionText}>
                      <Text style={styles.privacyOptionTitle}>Block {userName}</Text>
                      <Text style={styles.privacyOptionDesc}>Prevent this user from contacting you</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.privacyOption}
                    onPress={handleReportConversation}
                    accessible={true}
                    accessibilityLabel="Report conversation"
                    accessibilityRole="button"
                  >
                    <Feather name="alert-circle" size={20} color={colors.orange[500]} />
                    <View style={styles.privacyOptionText}>
                      <Text style={styles.privacyOptionTitle}>Report Conversation</Text>
                      <Text style={styles.privacyOptionDesc}>Report inappropriate content or behavior</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Support & Help */}
                <View style={[styles.privacySection, styles.privacySectionBorder]}>
                  <View style={styles.privacySectionHeader}>
                    <Feather name="help-circle" size={20} color={colors.orange[500]} />
                    <Text style={styles.privacySectionTitle}>Support & Help</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.privacyOption}
                    onPress={handleSafetyTips}
                    accessible={true}
                    accessibilityLabel="View safety tips"
                    accessibilityRole="button"
                  >
                    <Feather name="shield" size={20} color={colors.gray[600]} />
                    <View style={styles.privacyOptionText}>
                      <Text style={styles.privacyOptionTitle}>Safety Tips</Text>
                      <Text style={styles.privacyOptionDesc}>Learn about staying safe online</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.privacyOption}
                    onPress={handleGetHelp}
                    accessible={true}
                    accessibilityLabel="Get help from support"
                    accessibilityRole="button"
                  >
                    <Feather name="headphones" size={20} color={colors.gray[600]} />
                    <View style={styles.privacyOptionText}>
                      <Text style={styles.privacyOptionTitle}>Get Help</Text>
                      <Text style={styles.privacyOptionDesc}>Contact our support team</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.privacyOption}
                    onPress={handlePrivacyPolicy}
                    accessible={true}
                    accessibilityLabel="View privacy policy"
                    accessibilityRole="button"
                  >
                    <Feather name="file-text" size={20} color={colors.gray[600]} />
                    <View style={styles.privacyOptionText}>
                      <Text style={styles.privacyOptionTitle}>Privacy Policy</Text>
                      <Text style={styles.privacyOptionDesc}>View our privacy policy</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================================================
// ICE BREAKER BUTTONS COMPONENT
// One-tap conversation starters for first chats (senior-friendly)
// ============================================================================
interface IceBreakerButtonsProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ICE_BREAKER_MESSAGES = [
  { emoji: String.fromCodePoint(0x1F44B), text: 'Hi there!', label: 'Wave hello' },
  { emoji: String.fromCodePoint(0x1F60A), text: 'Nice to meet you!', label: 'Friendly greeting' },
  { emoji: String.fromCodePoint(0x2615), text: 'Coffee chat?', label: 'Invite for coffee' },
  { emoji: String.fromCodePoint(0x1F4AC), text: 'Tell me about yourself', label: 'Get to know them' },
];

const IceBreakerButtons: React.FC<IceBreakerButtonsProps> = ({ onSendMessage, disabled }) => {
  const { isTablet } = useResponsive();

  const handlePress = useCallback((message: string) => {
    if (!disabled) {
      onSendMessage(message);
    }
  }, [onSendMessage, disabled]);

  return (
    <View style={styles.iceBreakerContainer}>
      <Text style={styles.iceBreakerTitle}>Quick Greetings</Text>
      <Text style={styles.iceBreakerSubtitle}>Tap to send instantly</Text>
      <View style={styles.iceBreakerButtonsRow}>
        {ICE_BREAKER_MESSAGES.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.iceBreakerButton,
              disabled && styles.iceBreakerButtonDisabled,
              isTablet && styles.iceBreakerButtonTablet,
            ]}
            onPress={() => handlePress(`${item.emoji} ${item.text}`)}
            disabled={disabled}
            accessible={true}
            accessibilityLabel={`Send ${item.label}: ${item.emoji} ${item.text}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to send this message immediately"
          >
            <Text style={styles.iceBreakerEmoji}>{item.emoji}</Text>
            <Text style={[styles.iceBreakerText, disabled && styles.iceBreakerTextDisabled]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// SUGGESTED PHRASES COMPONENT
// Tappable phrase chips that insert text into input (senior-friendly)
// ============================================================================
interface SuggestedPhrasesProps {
  onSelectPhrase: (phrase: string) => void;
}

const SUGGESTED_PHRASES = [
  "How's your day going?",
  'I loved your profile!',
  'What brings you to TANDER?',
  'What do you enjoy doing?',
  'Where are you from?',
  'Do you have any hobbies?',
];

const SuggestedPhrases: React.FC<SuggestedPhrasesProps> = ({ onSelectPhrase }) => {
  const { isTablet } = useResponsive();

  return (
    <View style={styles.suggestedPhrasesContainer}>
      <Text style={styles.suggestedPhrasesTitle}>Conversation Starters</Text>
      <Text style={styles.suggestedPhrasesSubtitle}>Tap to add to your message</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestedPhrasesScroll}
      >
        {SUGGESTED_PHRASES.map((phrase, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestedPhraseChip, isTablet && styles.suggestedPhraseChipTablet]}
            onPress={() => onSelectPhrase(phrase)}
            accessible={true}
            accessibilityLabel={`Add phrase: ${phrase}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to add this phrase to your message"
          >
            <Text style={styles.suggestedPhraseText}>{phrase}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// WARM WELCOME SECTION COMPONENT
// Prominent display for first conversation (senior-friendly)
// ============================================================================
interface WarmWelcomeSectionProps {
  userName: string;
  userAvatar: string;
  userPhotoUrl?: string;
  onSendIceBreaker: (message: string) => void;
  onSelectPhrase: (phrase: string) => void;
  isSending?: boolean;
}

const WarmWelcomeSection: React.FC<WarmWelcomeSectionProps> = ({
  userName,
  userAvatar,
  userPhotoUrl,
  onSendIceBreaker,
  onSelectPhrase,
  isSending,
}) => {
  const { isTablet, isLandscape, hp, wp } = useResponsive();

  // ✅ LANDSCAPE FIX: Detect phone landscape for compact layout
  const isPhoneLandscape = isLandscape && !isTablet;

  // ✅ LANDSCAPE FIX: Use Math.min(hp, wp) pattern for landscape-safe avatar sizing
  const avatarSize = isPhoneLandscape
    ? Math.min(hp(25), wp(15), 80)  // Compact in phone landscape
    : isTablet
      ? 140                          // Large on tablets
      : 120;                         // Standard on phones portrait

  return (
    <ScrollView
      style={styles.warmWelcomeScrollView}
      contentContainerStyle={[
        styles.warmWelcomeScrollContent,
        isPhoneLandscape && styles.warmWelcomeScrollContentLandscape,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[
        styles.warmWelcomeContainer,
        isPhoneLandscape && styles.warmWelcomeContainerLandscape,
      ]}>
        {/* Large Avatar - ✅ LANDSCAPE FIX: Dynamic size based on orientation */}
        <View style={[
          styles.warmWelcomeAvatarWrapper,
          isPhoneLandscape && styles.warmWelcomeAvatarWrapperLandscape,
        ]}>
          {userPhotoUrl ? (
            <Image
              source={{ uri: userPhotoUrl }}
              style={[
                styles.warmWelcomeAvatarImage,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
              accessible={true}
              accessibilityLabel={`${userName}'s profile photo`}
            />
          ) : (
            <LinearGradient
              colors={[colors.teal[400], colors.teal[500]]}
              style={[
                styles.warmWelcomeAvatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            >
              <Text style={[
                styles.warmWelcomeAvatarText,
                isPhoneLandscape && styles.warmWelcomeAvatarTextLandscape,
                isTablet && !isPhoneLandscape && styles.warmWelcomeAvatarTextTablet,
              ]}>
                {userAvatar}
              </Text>
            </LinearGradient>
          )}
          {/* Decorative ring - ✅ LANDSCAPE FIX: Scale with avatar */}
          <View style={[
            styles.warmWelcomeAvatarRing,
            isPhoneLandscape && { borderRadius: (avatarSize / 2) + 6 },
          ]} />
        </View>

        {/* Warm Greeting - ✅ LANDSCAPE FIX: Smaller text in landscape */}
        <Text
          style={[
            styles.warmWelcomeGreeting,
            isPhoneLandscape && styles.warmWelcomeGreetingLandscape,
            isTablet && !isPhoneLandscape && styles.warmWelcomeGreetingTablet,
          ]}
          accessible={true}
          accessibilityRole="header"
        >
          Start your conversation with {userName}!
        </Text>
        <Text style={[
          styles.warmWelcomeSubtext,
          isPhoneLandscape && styles.warmWelcomeSubtextLandscape,
          isTablet && !isPhoneLandscape && styles.warmWelcomeSubtextTablet,
        ]}>
          Break the ice with a friendly message
        </Text>

        {/* Heart decoration */}
        <View style={styles.warmWelcomeHeartRow}>
          <Feather name="heart" size={16} color={colors.romantic.pink} />
          <View style={styles.warmWelcomeHeartLine} />
          <Feather name="heart" size={16} color={colors.romantic.pink} />
        </View>

        {/* Ice Breaker Buttons */}
        <IceBreakerButtons onSendMessage={onSendIceBreaker} disabled={isSending} />

        {/* Suggested Phrases */}
        <SuggestedPhrases onSelectPhrase={onSelectPhrase} />
      </View>
    </ScrollView>
  );
};

// ============================================================================
// EXPIRATION BANNER - 24-hour match countdown
// ============================================================================
interface ExpirationBannerProps {
  expiresAt: string;
  userName: string;
}

const ExpirationBanner: React.FC<ExpirationBannerProps> = ({ expiresAt, userName }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const expiresAtMs = new Date(expiresAt).getTime();
      const remaining = expiresAtMs - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
      setIsUrgent(remaining < 6 * 60 * 60 * 1000); // < 6 hours
      setIsCritical(remaining < 1 * 60 * 60 * 1000); // < 1 hour
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeRemaining === 'Expired') {
    return null; // Don't show banner if expired
  }

  return (
    <View
      style={[
        styles.expirationBanner,
        isUrgent && styles.expirationBannerUrgent,
        isCritical && styles.expirationBannerCritical,
      ]}
      accessibilityLabel={`You have ${timeRemaining} to send a message and keep this match`}
      accessibilityRole="alert"
    >
      <Feather
        name="clock"
        size={18}
        color={isCritical ? colors.white : isUrgent ? colors.white : colors.orange[600]}
      />
      <Text
        style={[
          styles.expirationBannerText,
          isUrgent && styles.expirationBannerTextUrgent,
        ]}
      >
        {isCritical
          ? `Hurry! Only ${timeRemaining} left to message ${userName}!`
          : isUrgent
          ? `Send a message within ${timeRemaining} to keep this match!`
          : `You have ${timeRemaining} to start chatting with ${userName}`}
      </Text>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { width, isLandscape, isTablet, hp, wp } = useResponsive();
  const flatListRef = useRef<FlatList>(null);

  // ✅ FIX: Small device detection for responsive adjustments
  const isSmallDevice = width <= 375;

  // ✅ LANDSCAPE FIX: Detect landscape mode for phones (tablets handle landscape well)
  const isPhoneLandscape = isLandscape && !isTablet;

  // Route params
  const { conversationId, userName, userPhoto, userId, expiresAt, isNewMatch } = route.params;
  const userAvatar = userName?.charAt(0) || 'U';

  // Real-time chat hook with lazy loading support
  const {
    messages,
    isLoading,
    isLoadingMore, // ✅ Lazy loading: pagination loading state
    isConnected,
    isOtherUserTyping,
    isOtherUserOnline,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    loadMoreMessages, // ✅ Lazy loading: load older messages
    hasMoreMessages, // ✅ Lazy loading: more messages available
  } = useChat({
    conversationId,
    otherUserId: typeof userId === 'string' ? parseInt(userId, 10) : userId || 0,
  });

  // Local state
  const [inputText, setInputText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMuteLoading, setIsMuteLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMediaFiles, setShowMediaFiles] = useState(false);
  const [showPrivacySupport, setShowPrivacySupport] = useState(false);
  const [isSending, setIsSending] = useState(false); // Debounce for send button

  // ✅ PREMIUM: Connection state for status bar
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');

  // ✅ PREMIUM: Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = stompService.onConnectionState((state) => {
      setConnectionState(state);
    });
    return unsubscribe;
  }, []);

  // Accessibility: Reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const checkReduceMotion = async () => {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isReduceMotionEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => setReduceMotion(isEnabled)
    );

    return () => subscription?.remove();
  }, []);

  // ✅ Visibility-based read marking
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Check if there are unread messages from the other user
  const hasUnreadMessages = useMemo(() => {
    return messages.some((msg) => msg.sender === 'them');
  }, [messages]);

  // ✅ PREMIUM: Messages with date separators for better timeline awareness
  type ListItem = Message | { type: 'date-separator'; date: Date; id: string };

  const messagesWithDateSeparators = useMemo((): ListItem[] => {
    if (messages.length === 0) return [];

    const result: ListItem[] = [];
    let lastDateKey: string | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp);
      const dateKey = messageDate.toDateString();

      // Add date separator if this is a new day
      if (dateKey !== lastDateKey) {
        result.push({
          type: 'date-separator',
          date: messageDate,
          id: `date-${dateKey}`,
        });
        lastDateKey = dateKey;
      }
      result.push(message);
    });

    return result;
  }, [messages]);

  // ✅ Mark messages as read when screen is focused and app is active
  useEffect(() => {
    if (isFocused && appState === 'active' && hasUnreadMessages && !isLoading) {
      console.log('[ChatScreen] Marking messages as read - screen focused and app active');
      markAsRead();
    }
  }, [isFocused, appState, hasUnreadMessages, isLoading, markAsRead]);

  // Fetch mute status on mount
  useEffect(() => {
    const fetchMuteStatus = async () => {
      if (!conversationId) return;
      try {
        const convId = parseInt(conversationId, 10);
        if (isNaN(convId)) return;
        const response = await getMuteStatus(convId);
        setIsMuted(response.isMuted);
      } catch (error) {
        console.warn('[ChatScreen] Failed to fetch mute status:', error);
        // Default to unmuted on error
        setIsMuted(false);
      }
    };
    fetchMuteStatus();
  }, [conversationId]);

  // Handle mute toggle with API call
  const handleMuteToggle = useCallback(async () => {
    if (!conversationId || isMuteLoading) return;

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId)) return;

    setIsMuteLoading(true);
    const newMuteState = !isMuted;

    try {
      if (newMuteState) {
        await muteConversation(convId);
      } else {
        await unmuteConversation(convId);
      }
      setIsMuted(newMuteState);
    } catch (error) {
      console.warn('[ChatScreen] Failed to toggle mute:', error);
      toast.error('Mute Failed', 'Failed to update mute setting. Please try again.');
    } finally {
      setIsMuteLoading(false);
    }
  }, [conversationId, isMuted, isMuteLoading]);

  // Typing indicator debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard handling
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      if (reduceMotion) {
        keyboardHeight.setValue(e.endCoordinates.height);
      } else {
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 200,
          useNativeDriver: false,
        }).start();
      }
      // Scroll to newest when keyboard shows
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: !reduceMotion }), 100);
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      if (reduceMotion) {
        keyboardHeight.setValue(0);
      } else {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [keyboardHeight, reduceMotion]);

  // ✅ Track if initial scroll has been done (only once per chat open)
  const hasInitialScrolled = useRef(false);
  const isLoadingMoreRef = useRef(false); // Track if we're loading older messages

  // Update ref when isLoadingMore changes
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  // ✅ Scroll to bottom ONCE on initial load only
  const hasMessages = messages.length > 0;
  useEffect(() => {
    if (hasMessages && !isLoading && !hasInitialScrolled.current) {
      // Set flag IMMEDIATELY to prevent any race conditions
      hasInitialScrolled.current = true;
      // ✅ FIX: Increased delay to 500ms to ensure FlatList renders with date separators
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 500);
    }
  }, [hasMessages, isLoading]); // Depend on boolean hasMessages, not messages.length

  // ✅ FIX: Scroll to bottom using scrollToOffset with large value
  const scrollAttempts = useRef(0);
  const maxScrollAttempts = 3;
  const lastContentHeight = useRef(0);
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    // Only scroll if content height changed and we have messages
    if (hasMessages && !isLoading && height > 0 && height !== lastContentHeight.current) {
      lastContentHeight.current = height;

      if (scrollAttempts.current < maxScrollAttempts) {
        scrollAttempts.current += 1;
        // Use scrollToOffset with the content height to ensure we reach the bottom
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: height, animated: false });
        }, 100);
      }
    }
  }, [hasMessages, isLoading]);

  // Reset scroll state when conversation changes
  useEffect(() => {
    scrollAttempts.current = 0;
    lastContentHeight.current = 0;
  }, [conversationId]);

  // ✅ Scroll to bottom only when SENDING a new message (not loading older messages)
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0 || !hasInitialScrolled.current) return;

    const lastMessage = messages[messages.length - 1];
    const isNewMessageAtEnd = lastMessage && lastMessage.id !== lastMessageIdRef.current;
    const isOwnNewMessage = lastMessage?.sender === 'me';

    // Only scroll if:
    // 1. There's a new message at the end (not loading older at top)
    // 2. It's our own message OR we're already near the bottom
    // 3. We're NOT loading more messages (which adds at top)
    if (isNewMessageAtEnd && isOwnNewMessage && !isLoadingMoreRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }

    lastMessageIdRef.current = lastMessage?.id || null;
  }, [messages]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Handle input text change with typing indicator
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    // Send typing indicator
    if (text.length > 0) {
      sendTypingIndicator(true);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }
  }, [sendTypingIndicator]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  // Handlers
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If no screen to go back to, navigate to ConversationsList
      navigation.navigate('ConversationsList');
    }
  }, [navigation]);

  // Parse userId once for call handlers
  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId || 0;

  const handleAudioCall = useCallback(() => {
    if (!isConnected) {
      toast.warning(
        'Connection Required',
        'Please check your internet connection to make a call.'
      );
      return;
    }
    if (!numericUserId || isNaN(numericUserId)) {
      toast.error('Call Error', 'Cannot identify user to call.');
      return;
    }
    (navigation as NativeStackNavigationProp<MessagesStackParamList>).navigate('Call', {
      conversationId,
      userId: numericUserId,
      userName,
      userPhoto,
      callType: 'voice',
      isIncoming: false,
    });
  }, [navigation, conversationId, numericUserId, userName, userPhoto, isConnected]);

  const handleVideoCall = useCallback(() => {
    if (!isConnected) {
      toast.warning(
        'Connection Required',
        'Please check your internet connection to make a video call.'
      );
      return;
    }
    if (!numericUserId || isNaN(numericUserId)) {
      toast.error('Call Error', 'Cannot identify user to call.');
      return;
    }
    (navigation as NativeStackNavigationProp<MessagesStackParamList>).navigate('Call', {
      conversationId,
      userId: numericUserId,
      userName,
      userPhoto,
      callType: 'video',
      isIncoming: false,
    });
  }, [navigation, conversationId, numericUserId, userName, userPhoto, isConnected]);

  // Emoji picker handler (placeholder until actual picker is implemented)
  const handleEmojiPress = useCallback(() => {
    toast.info(
      'Coming Soon',
      'Emoji picker is coming! For now, you can copy/paste emojis.'
    );
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || isSending) return;

    // Debounce: prevent rapid double-taps
    setIsSending(true);
    sendMessage(inputText.trim());
    setInputText('');
    sendTypingIndicator(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Re-enable send after 500ms
    sendTimeoutRef.current = setTimeout(() => {
      setIsSending(false);
    }, 500);
  }, [inputText, sendMessage, sendTypingIndicator, isSending]);

  const handleSendLike = useCallback(() => {
    if (isSending) return;
    setIsSending(true);
    sendMessage('👍');
    sendTimeoutRef.current = setTimeout(() => {
      setIsSending(false);
    }, 500);
  }, [sendMessage, isSending]);

  const handleViewProfile = useCallback(() => {
    setShowInfo(false);
    navigation.navigate('ProfileDetail', {
      userId: userId || 'user-1',
      userName,
      userPhoto,
    });
  }, [navigation, userId, userName, userPhoto]);

  // Handle ice breaker message send (for first conversation)
  const handleSendIceBreaker = useCallback((message: string) => {
    if (isSending) return;
    setIsSending(true);
    sendMessage(message);
    sendTimeoutRef.current = setTimeout(() => {
      setIsSending(false);
    }, 500);
  }, [sendMessage, isSending]);

  // Handle selecting a suggested phrase (adds to input)
  const handleSelectPhrase = useCallback((phrase: string) => {
    setInputText(prev => {
      // If input is empty, just set the phrase
      if (!prev.trim()) return phrase;
      // Otherwise append with a space
      return `${prev.trim()} ${phrase}`;
    });
  }, []);

  // Handle call back from call message bubble
  const handleCallBack = useCallback((callType: 'AUDIO' | 'VIDEO') => {
    if (!isConnected) {
      toast.warning(
        'Connection Required',
        'Please check your internet connection to make a call.'
      );
      return;
    }
    if (!numericUserId || isNaN(numericUserId)) {
      toast.error('Call Error', 'Cannot identify user to call.');
      return;
    }
    // Convert backend format (AUDIO/VIDEO) to frontend format (voice/video)
    const frontendCallType = callType === 'AUDIO' ? 'voice' : 'video';
    (navigation as NativeStackNavigationProp<MessagesStackParamList>).navigate('Call', {
      conversationId,
      userId: numericUserId,
      userName,
      userPhoto,
      callType: frontendCallType,
      isIncoming: false,
    });
  }, [navigation, conversationId, numericUserId, userName, userPhoto, isConnected]);

  // Render message
  // ✅ PREMIUM: Render item handles both messages and date separators
  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
    // Check if it's a date separator
    if ('type' in item && item.type === 'date-separator') {
      return <DateSeparator date={item.date} />;
    }
    // It's a message
    return <MessageBubble message={item as Message} onCallBack={handleCallBack} />;
  }, [handleCallBack]);

  // Legacy render for backwards compatibility
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} onCallBack={handleCallBack} />
  ), [handleCallBack]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.container}>
        {/* Main Content - ✅ LANDSCAPE FIX: Add horizontal safe area insets in landscape */}
        <View style={[
          styles.mainContent,
          { paddingTop: insets.top },
          isPhoneLandscape && { paddingLeft: insets.left, paddingRight: insets.right },
        ]}>
        {/* Header - ✅ FIX: Responsive for small devices and landscape */}
        <View style={[
          styles.header,
          isSmallDevice && styles.headerSmall,
          isPhoneLandscape && styles.headerLandscape,
        ]}>
          <View style={styles.headerLeft}>
            {/* Back Button */}
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerBackButton}
              accessible={true}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={24} color={colors.gray[700]} />
            </TouchableOpacity>

            {/* User Info - ✅ FIX: Add flex shrink for name truncation */}
            {/* ✅ UX: Tapping avatar/name opens info panel for better discoverability */}
            <TouchableOpacity
              onPress={() => setShowInfo(true)}
              style={[styles.headerUserInfo, isSmallDevice && styles.headerUserInfoSmall]}
              accessible={true}
              accessibilityLabel={`View ${userName}'s profile and options`}
              accessibilityRole="button"
              accessibilityHint="Double tap to open conversation info"
            >
              <View style={styles.headerAvatarWrapper}>
                {userPhoto ? (
                  <Image
                    source={{ uri: userPhoto }}
                    style={styles.headerAvatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.teal[400], colors.teal[500]]}
                    style={styles.headerAvatar}
                  >
                    <Text style={styles.headerAvatarText}>{userAvatar}</Text>
                  </LinearGradient>
                )}
                {/* ✅ FIX: Show OTHER user's online status, not own connection */}
                {isOtherUserOnline && <View style={styles.headerOnlineDot} />}
              </View>
              {/* ✅ FIX: Name container with flex shrink for truncation */}
              <View style={styles.headerNameContainer}>
                <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
                  {userName}
                </Text>
                <Text style={styles.headerStatus} numberOfLines={1}>
                  {isOtherUserTyping ? 'Typing...' : isOtherUserOnline ? 'Active now' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleAudioCall}
              style={[styles.headerActionButton, !isConnected && styles.headerActionButtonDisabled]}
              accessible={true}
              accessibilityLabel={isConnected ? "Voice call" : "Voice call (unavailable when offline)"}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isConnected }}
            >
              <Feather name="phone" size={20} color={isConnected ? colors.teal[500] : colors.gray[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleVideoCall}
              style={[styles.headerActionButton, !isConnected && styles.headerActionButtonDisabled]}
              accessible={true}
              accessibilityLabel={isConnected ? "Video call" : "Video call (unavailable when offline)"}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isConnected }}
            >
              <Feather name="video" size={20} color={isConnected ? colors.teal[500] : colors.gray[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowInfo(true)}
              style={styles.headerActionButton}
              accessible={true}
              accessibilityLabel="Conversation info"
              accessibilityRole="button"
            >
              <Feather name="info" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <Animated.View style={[styles.messagesContainer, { paddingBottom: keyboardHeight }]}>
          {/* ✅ PREMIUM: Connection status bar */}
          <ConnectionStatusBar
            state={connectionState}
            onRetry={() => stompService.reconnect()}
          />

          {/* 24-hour expiration banner for new matches */}
          {isNewMatch && expiresAt && messages.length === 0 && (
            <ExpirationBanner expiresAt={expiresAt} userName={userName} />
          )}

          {isLoading ? (
            <ChatSkeleton />
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messagesWithDateSeparators} // ✅ PREMIUM: Includes date separators
                renderItem={renderListItem}
                keyExtractor={item => 'type' in item ? item.id : item.id}
                contentContainerStyle={[
                  styles.messagesList,
                  messages.length === 0 && styles.emptyMessagesList,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                // ✅ FIX: Scroll to bottom when content loads
                onContentSizeChange={handleContentSizeChange}
                // ✅ Maintain scroll position when prepending older messages (iOS)
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10,
                }}
                // ✅ Lazy loading: Load older messages when scrolling to top
                onScroll={({ nativeEvent }) => {
                  // Trigger load more when near the top (older messages)
                  if (nativeEvent.contentOffset.y < 100 && hasMoreMessages && !isLoadingMore) {
                    loadMoreMessages();
                  }
                }}
                scrollEventThrottle={100}
                ListHeaderComponent={
                  isLoadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <Text style={styles.loadingMoreText}>Loading older messages...</Text>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <WarmWelcomeSection
                    userName={userName}
                    userAvatar={userAvatar}
                    userPhotoUrl={userPhoto}
                    onSendIceBreaker={handleSendIceBreaker}
                    onSelectPhrase={handleSelectPhrase}
                    isSending={isSending}
                  />
                }
                ListFooterComponent={
                  // ✅ PREMIUM: Animated typing indicator
                  <TypingIndicator isVisible={isOtherUserTyping} userName={userName} />
                }
              />
            </>
          )}

          {/* Input Area - ✅ FIX: Responsive padding for small devices and landscape */}
          <View style={[
            styles.inputContainer,
            isSmallDevice && styles.inputContainerSmall,
            isPhoneLandscape && styles.inputContainerLandscape,
            { paddingBottom: isPhoneLandscape ? Math.max(insets.bottom, 6) : Math.max(insets.bottom, 12) }
          ]}>
            {/* Emoji Button */}
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={handleEmojiPress}
              accessible={true}
              accessibilityLabel="Open emoji picker"
              accessibilityRole="button"
            >
              <Feather name="smile" size={20} color={colors.teal[500]} />
            </TouchableOpacity>

            {/* Text Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Aa"
                placeholderTextColor={colors.gray[400]}
                multiline
                maxLength={1000}
                onSubmitEditing={handleSendMessage}
                accessible={true}
                accessibilityLabel="Message input"
                accessibilityHint="Type your message here"
              />
            </View>

            {/* Send/Like Button */}
            {inputText.trim() ? (
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={isSending}
                style={isSending ? styles.sendButtonDisabled : undefined}
                accessible={true}
                accessibilityLabel="Send message"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSending }}
              >
                <LinearGradient
                  colors={isSending ? [colors.gray[400], colors.gray[500]] : [colors.orange[500], colors.teal[500]]}
                  style={styles.sendButton}
                >
                  <Feather name="send" size={20} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSendLike}
                disabled={isSending}
                style={[styles.likeButton, isSending && styles.likeButtonDisabled]}
                accessible={true}
                accessibilityLabel="Send thumbs up"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSending }}
              >
                <Feather name="thumbs-up" size={20} color={isSending ? colors.gray[400] : colors.teal[500]} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
        </View>
      </View>

      {/* Info Sidebar - Outside container for proper overlay */}
      <InfoSidebar
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        userName={userName}
        userAvatar={userAvatar}
        userPhotoUrl={userPhoto}
        isOnline={isOtherUserOnline}
        onViewProfile={handleViewProfile}
        onMuteToggle={handleMuteToggle}
        isMuted={isMuted}
        onSearch={() => {
          setShowInfo(false);
          setShowSearch(true);
        }}
        onMediaFiles={() => {
          setShowInfo(false);
          setShowMediaFiles(true);
        }}
        onPrivacySupport={() => {
          setShowInfo(false);
          setShowPrivacySupport(true);
        }}
      />

      {/* Modals */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        messages={messages}
      />
      <MediaFilesModal
        visible={showMediaFiles}
        onClose={() => setShowMediaFiles(false)}
      />
      <PrivacySupportModal
        visible={showPrivacySupport}
        onClose={() => setShowPrivacySupport(false)}
        userName={userName}
        userId={typeof userId === 'number' ? userId.toString() : userId || ''}
        onUserBlocked={() => navigation.goBack()}
      />
    </View>
  );
};

// ============================================================================
// STYLES - Matching Figma CSS Exactly
// ============================================================================
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },

  // ============================================================================
  // HEADER - bg-white px-4 py-3 border-b border-gray-100 shadow-sm
  // ============================================================================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // ✅ FIX: Smaller header padding on small devices
  headerSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // ✅ LANDSCAPE FIX: Compact header in landscape to maximize chat space
  headerLandscape: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1, // ✅ FIX: Allow flex shrink for name truncation
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1, // ✅ FIX: Allow shrinking for name truncation
  },
  // ✅ FIX: Tighter gap on small devices
  headerUserInfoSmall: {
    gap: 8,
  },
  // ✅ FIX: Name container allows truncation
  headerNameContainer: {
    flex: 1,
    flexShrink: 1,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal[500],
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  headerStatus: {
    fontSize: 16,
    color: colors.gray[500],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButtonDisabled: {
    opacity: 0.5,
  },

  // ============================================================================
  // MESSAGES - flex-1 overflow-y-auto px-4 py-4 space-y-2
  // ============================================================================
  messagesContainer: {
    flex: 1,
  },

  // ============================================================================
  // EXPIRATION BANNER - 24-hour countdown for new matches
  // ============================================================================
  expirationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.orange[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.orange[200],
  },
  expirationBannerUrgent: {
    backgroundColor: colors.orange[500],
    borderBottomColor: colors.orange[600],
  },
  expirationBannerCritical: {
    backgroundColor: colors.romantic.heartRed,
    borderBottomColor: colors.romantic.rose,
  },
  expirationBannerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.orange[700],
    textAlign: 'center',
    flex: 1,
  },
  expirationBannerTextUrgent: {
    color: colors.white,
  },

  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    flexGrow: 1,
  },
  emptyMessagesList: {
    flex: 1,
    justifyContent: 'center',
  },
  // ✅ Lazy loading: Loading indicator for pagination
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.gray[500],
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[500],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[500],
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.gray[400],
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    maxWidth: '75%',
  },
  // Sent bubble - bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-3xl px-4 py-2.5
  bubbleOwn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  bubbleTextOwn: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.white,
  },
  // Received bubble - bg-gray-100 text-gray-900 rounded-3xl px-4 py-2.5
  bubbleOther: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  bubbleTextOther: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray[900],
  },
  // Time - text-xs text-gray-400 mt-1 px-3
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 4,
  },
  timeRowOwn: {
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    color: colors.gray[600], // WCAG AA compliant contrast
  },
  timeTextOwn: {
    textAlign: 'right',
  },
  statusIcon: {
    marginLeft: 2,
  },

  // ============================================================================
  // CALL MESSAGE BUBBLE - Enhanced UI/UX with direction indicators
  // ============================================================================
  callMessageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  callBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 10,
    minWidth: 240,
    maxWidth: '85%', // ✅ FIX: Increased to prevent text wrapping on narrow screens
    // Subtle shadow for depth
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  callBubbleLeft: {
    position: 'relative',
  },
  callBubbleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callDirectionArrow: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  callBubbleCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  callBubbleTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  callBubbleSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callBubbleDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  callBubbleDot: {
    fontSize: 10,
    color: colors.gray[400],
  },
  callBubbleTime: {
    fontSize: 13,
    color: colors.gray[400],
  },
  callBubbleRight: {
    paddingLeft: 8,
  },
  callBackButtonContainer: {
    width: 44, // ✅ FIX: Reduced from 56 to fit better on narrow screens
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal[50],
    borderWidth: 1.5,
    borderColor: colors.teal[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBubbleWrapper: {
    alignItems: 'center',
  },
  callBackHint: {
    fontSize: 12,
    color: colors.teal[500],
    marginTop: 4,
    fontWeight: '500',
  },

  // ============================================================================
  // INPUT AREA - bg-white border-t border-gray-100 px-4 py-3
  // ============================================================================
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  // ✅ FIX: Tighter spacing on small devices
  inputContainerSmall: {
    paddingHorizontal: 12,
    gap: 6,
  },
  // ✅ LANDSCAPE FIX: Compact input area in landscape to maximize vertical space
  inputContainerLandscape: {
    paddingTop: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 9999,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    paddingVertical: 8,
    maxHeight: 100,
  },
  inputEmojiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 56, // Senior-friendly touch target (increased from 44)
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  likeButton: {
    width: 56, // Senior-friendly touch target (increased from 44)
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonDisabled: {
    opacity: 0.6,
  },

  // ============================================================================
  // INFO SIDEBAR
  // ============================================================================
  infoSidebar: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    zIndex: 50,
    elevation: 50,
  },
  infoSidebarTablet: {
    left: 'auto',
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[200],
    shadowColor: colors.black,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoProfileSection: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 24,
  },
  infoAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  infoAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  infoAvatarText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '600',
  },
  infoOnlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal[500],
    borderWidth: 4,
    borderColor: colors.white,
  },
  infoName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  infoEncryption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoEncryptionText: {
    fontSize: 16,
    color: colors.gray[500],
  },
  infoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  infoActionButton: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  infoActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoActionIconGray: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoActionText: {
    fontSize: 16,
    color: colors.gray[700],
  },
  infoMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  infoMenuItemBorder: {
    marginTop: 16,
  },
  infoMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoMenuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },

  // ============================================================================
  // MODALS
  // ============================================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 12, // ✅ FIX: Reduced from 16 for small devices
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 500, // Constrain width on tablets for better readability
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalLarge: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Modal
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: colors.gray[900],
    paddingVertical: 16,
  },
  searchResults: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  searchResultItem: {
    padding: 16,
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    marginBottom: 12,
  },
  searchResultText: {
    fontSize: 16,
    color: colors.gray[900],
    marginBottom: 4,
  },
  searchResultTime: {
    fontSize: 16,
    color: colors.gray[500],
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  searchEmptyText: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 12,
  },
  searchEmptyHint: {
    fontSize: 16,
    color: colors.gray[400],
    marginTop: 4,
  },
  searchClearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultsCount: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  searchHighlight: {
    backgroundColor: colors.orange[100],
    color: colors.orange[700],
    fontWeight: '600',
  },

  // Media Files Modal
  mediaSection: {
    padding: 20,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mediaSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  mediaGridItem: {
    width: 100,
    minWidth: 80,
    maxWidth: 120,
    flexGrow: 1,
    flexBasis: '30%',
    aspectRatio: 1,
  },
  mediaGridItemInner: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  fileIconContainer: {
    marginRight: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },
  fileSize: {
    fontSize: 16,
    color: colors.gray[500],
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Privacy Support Modal
  privacySection: {
    padding: 20,
  },
  privacySectionBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  privacySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    minHeight: 56, // Touch target compliance
  },
  privacyOptionText: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },
  privacyOptionDesc: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 2,
  },

  // ============================================================================
  // WARM WELCOME SECTION - First conversation experience (senior-friendly)
  // ============================================================================
  warmWelcomeScrollView: {
    flex: 1,
  },
  warmWelcomeScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  warmWelcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  warmWelcomeAvatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  warmWelcomeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for depth
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  warmWelcomeAvatarTablet: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  warmWelcomeAvatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.white,
    // Shadow for depth
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  warmWelcomeAvatarImageTablet: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  warmWelcomeAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.white,
  },
  warmWelcomeAvatarTextTablet: {
    fontSize: 56,
  },
  warmWelcomeAvatarRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 66,
    borderWidth: 3,
    borderColor: colors.orange[200],
    borderStyle: 'dashed',
  },
  warmWelcomeGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  warmWelcomeGreetingTablet: {
    fontSize: 26,
    lineHeight: 34,
  },
  warmWelcomeSubtext: {
    fontSize: 17,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  warmWelcomeSubtextTablet: {
    fontSize: 18,
    lineHeight: 26,
  },
  // ✅ LANDSCAPE FIX: Compact styles for phone landscape orientation
  warmWelcomeScrollContentLandscape: {
    paddingVertical: 12,
  },
  warmWelcomeContainerLandscape: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  warmWelcomeAvatarWrapperLandscape: {
    marginBottom: 12,
    marginRight: 16,
  },
  warmWelcomeAvatarTextLandscape: {
    fontSize: 32,
  },
  warmWelcomeGreetingLandscape: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  warmWelcomeSubtextLandscape: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  warmWelcomeHeartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  warmWelcomeHeartLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.romantic.pinkLight,
    borderRadius: 1,
  },

  // ============================================================================
  // ICE BREAKER BUTTONS - One-tap conversation starters (senior-friendly)
  // ============================================================================
  iceBreakerContainer: {
    width: '100%',
    marginBottom: 24,
  },
  iceBreakerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  iceBreakerSubtitle: {
    fontSize: 15,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  iceBreakerButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  iceBreakerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 8,
    minHeight: 56, // Senior-friendly touch target
    // Border for visual definition
    borderWidth: 2,
    borderColor: colors.orange[200],
    // Shadow for depth
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  iceBreakerButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    minHeight: 60,
  },
  iceBreakerButtonDisabled: {
    opacity: 0.6,
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[200],
  },
  iceBreakerEmoji: {
    fontSize: 22,
  },
  iceBreakerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  iceBreakerTextDisabled: {
    color: colors.gray[500],
  },

  // ============================================================================
  // SUGGESTED PHRASES - Tappable phrase chips (senior-friendly)
  // ============================================================================
  suggestedPhrasesContainer: {
    width: '100%',
  },
  suggestedPhrasesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  suggestedPhrasesSubtitle: {
    fontSize: 15,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 12,
  },
  suggestedPhrasesScroll: {
    paddingHorizontal: 4,
    gap: 10,
  },
  suggestedPhraseChip: {
    backgroundColor: colors.teal[50],
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 56, // Senior-friendly touch target
    justifyContent: 'center',
    // Border for visual definition
    borderWidth: 1.5,
    borderColor: colors.teal[200],
  },
  suggestedPhraseChipTablet: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    minHeight: 60,
  },
  suggestedPhraseText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.teal[700],
  },
});

export default ChatScreen;
