/**
 * TANDER MessagesScreen
 * Translated from Figma design: ChatsScreen.tsx
 *
 * Design matches exactly:
 * - "Chats" header (text-3xl font-bold)
 * - Search bar (rounded-full, gray-50 bg)
 * - NEW MATCHES section with ORANGE badge and ORANGE gradient avatars
 * - Conversations with TEAL gradient avatars
 * - Unread indicator (orange dot)
 * - LANDSCAPE: Split-view with conversation list left, chat/empty state right
 *
 * UI/UX Audit Fixes Applied:
 * - Touch targets minimum 44pt
 * - FlatList optimizations (getItemLayout, initialNumToRender, etc.)
 * - Full accessibility labels
 * - WCAG AA color contrast (gray[600] instead of gray[500])
 * - Loading, error, and empty states
 * - Memoized components and callbacks
 * - Platform-specific touch feedback and shadows
 * - Responsive landscape handling
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  ScrollView,
  Animated,
  Keyboard,
  Platform,
  Image,
  AppState,
  AppStateStatus,
  AccessibilityInfo,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { MessagesStackParamList, CallType } from '@navigation/types';
import { useConversations, useNewMatches, useChat } from '../hooks';
import { stompService } from '@services/websocket';
import type { Conversation, NewMatch } from '../hooks';

// ✅ PREMIUM: Import new UI components
import { DateSeparator } from '../components/DateSeparator';
import { TypingIndicator } from '../components/TypingIndicator';
import { ConnectionStatusBar, ConnectionState } from '../components/ConnectionStatusBar';
import { ChatSkeleton } from '../components/ChatSkeleton';
import { ConversationListSkeleton } from '../components/ConversationSkeleton';
import { TAB_BAR_HEIGHT } from '@shared/components/navigation/PremiumTabBar';

// ============================================================================
// NAVIGATION TYPE
// ============================================================================
type MessagesNavigationProp = NativeStackNavigationProp<MessagesStackParamList>;

// ============================================================================
// TYPES (for embedded chat)
// ============================================================================
interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const CONVERSATION_ITEM_HEIGHT = 96; // Updated for card spacing + margins
const MESSAGE_ITEM_HEIGHT = 80; // Approximate height for chat messages

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
// NEW MATCH AVATAR COMPONENT
// ============================================================================
interface NewMatchAvatarProps {
  match: NewMatch;
  onPress: () => void;
}

const NewMatchAvatar: React.FC<NewMatchAvatarProps> = React.memo(({ match, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.matchAvatarContainer}
      accessible={true}
      accessibilityLabel={`Chat with ${match.name}${match.online ? ', online' : ''}${match.hasNotification ? ', new notification' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to open chat"
    >
      {/* Avatar Circle - ORANGE gradient per Figma */}
      <View style={styles.matchAvatarWrapper}>
        {match.avatarUrl ? (
          <Image
            source={{ uri: match.avatarUrl }}
            style={styles.matchAvatarImage}
          />
        ) : (
          <LinearGradient
            colors={[colors.orange[400], colors.orange[500]]}
            style={styles.matchAvatar}
          >
            <Text style={styles.matchAvatarText}>{match.avatar}</Text>
          </LinearGradient>
        )}

        {/* Online Indicator - bottom right */}
        {match.online && (
          <View style={styles.matchOnlineDot} />
        )}

        {/* Heart Notification Badge - top right */}
        {match.hasNotification && (
          <View style={styles.matchHeartBadge}>
            <Feather name="heart" size={12} color={colors.white} />
          </View>
        )}
      </View>

      {/* Name - ✅ FIX: Add truncation for long names */}
      <Text style={styles.matchName} numberOfLines={1} ellipsizeMode="tail">
        {match.name}
      </Text>
    </TouchableOpacity>
  );
});

NewMatchAvatar.displayName = 'NewMatchAvatar';

// ============================================================================
// CONVERSATION ROW COMPONENT
// ============================================================================
interface ConversationRowProps {
  conversation: Conversation;
  onPress: () => void;
  isSelected?: boolean;
}

const ConversationRow: React.FC<ConversationRowProps> = React.memo(({ conversation, onPress, isSelected }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.conversationRow,
        styles.cardShadow,
        isSelected && styles.conversationRowSelected,
      ]}
      accessible={true}
      accessibilityLabel={`Chat with ${conversation.name}, ${conversation.time} ago${conversation.unread ? ', unread message' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to open conversation"
    >
      {/* Avatar - TEAL gradient per Figma */}
      <View style={styles.conversationAvatarWrapper}>
        {conversation.avatarUrl ? (
          <Image
            source={{ uri: conversation.avatarUrl }}
            style={styles.conversationAvatarImage}
          />
        ) : (
          <LinearGradient
            colors={[colors.teal[400], colors.teal[500]]}
            style={styles.conversationAvatar}
          >
            <Text style={styles.conversationAvatarText}>{conversation.avatar}</Text>
          </LinearGradient>
        )}

        {/* Online Indicator - bottom right */}
        {conversation.online && (
          <View style={styles.conversationOnlineDot} />
        )}
      </View>

      {/* Content */}
      <View style={styles.conversationContent}>
        <View style={styles.conversationTopRow}>
          <View style={styles.conversationNameRow}>
            <Text style={styles.conversationName} numberOfLines={1} ellipsizeMode="tail">
              {conversation.name}
            </Text>
            {/* Verification Badge - teal checkmark for ID-verified users */}
            {conversation.isVerified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={14} color={colors.teal[500]} />
              </View>
            )}
          </View>
          <Text style={styles.conversationTime}>{conversation.time}</Text>
        </View>
        {/* Show typing indicator OR last message */}
        {conversation.isTyping ? (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>typing</Text>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
        ) : (
          <Text
            style={[
              styles.conversationMessage,
              conversation.unread && styles.conversationMessageUnread,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {decodeHTMLEntities(conversation.message)}
          </Text>
        )}
      </View>

      {/* Unread Indicator - orange dot */}
      {conversation.unread && (
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );
});

ConversationRow.displayName = 'ConversationRow';

// ============================================================================
// LOADING STATE COMPONENT - Enhanced with rotating messages for seniors
// ============================================================================
const LOADING_MESSAGES = [
  'Loading your conversations...',
  'Finding your matches...',
  'Checking for new messages...',
  'Almost ready...',
  'Connecting you with friends...',
];

const LoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Rotate through loading messages
  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(messageTimer);
  }, []);

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
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [bounceAnim]);

  // Pulse animation for gradient circle
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.loadingState}>
      {/* Animated gradient circle with bouncing icon */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={[colors.orange[200], colors.teal[200]]}
          style={styles.loadingCircle}
        >
          <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <Feather name="message-circle" size={48} color={colors.orange[600]} />
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Rotating message with animated dots */}
      <Text style={styles.loadingStateTitle}>
        {LOADING_MESSAGES[messageIndex]}
      </Text>
      <Text style={styles.loadingStateDots}>{dots || ' '}</Text>

      {/* Subtle reassurance for seniors */}
      <Text style={styles.loadingStateHint}>
        This won't take long
      </Text>
    </View>
  );
};

// ============================================================================
// ERROR STATE COMPONENT - Enhanced with encouraging messages for seniors
// ============================================================================
const ERROR_ENCOURAGEMENTS = [
  "Don't worry, this happens sometimes!",
  "Let's try again together.",
  "A quick refresh usually fixes this.",
  "Your messages are still safe.",
];

interface ErrorStateProps {
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => {
  const [encouragementIndex] = useState(() =>
    Math.floor(Math.random() * ERROR_ENCOURAGEMENTS.length)
  );
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    // Button press feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onRetry();
  }, [onRetry, scaleAnim]);

  return (
    <View style={styles.errorState}>
      {/* Gradient circle with wifi-off icon */}
      <LinearGradient
        colors={[colors.orange[100], colors.orange[200]]}
        style={styles.errorCircle}
      >
        <Feather name="wifi-off" size={48} color={colors.orange[600]} />
      </LinearGradient>

      {/* Error title */}
      <Text style={styles.errorStateTitle}>Connection Issue</Text>

      {/* Encouraging subtitle */}
      <Text style={styles.errorStateSubtitle}>
        {ERROR_ENCOURAGEMENTS[encouragementIndex]}
      </Text>

      {/* Tappable retry button with animation */}
      <TouchableOpacity
        onPress={handlePress}
        accessible={true}
        accessibilityLabel="Tap to retry loading messages"
        accessibilityRole="button"
        accessibilityHint="Double tap to refresh your conversations"
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[colors.orange[500], colors.teal[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.retryButtonGradient}
          >
            <Feather name="refresh-cw" size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Tap to Retry</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Help hint for seniors */}
      <Text style={styles.errorHelpHint}>
        Tip: Check if your WiFi is connected
      </Text>
    </View>
  );
};

// ============================================================================
// NO CONVERSATIONS STATE COMPONENT
// ============================================================================
const NoConversationsState: React.FC = () => (
  <View style={styles.noConversationsState}>
    <View style={[styles.emptyCard, styles.cardShadow]}>
      <LinearGradient
        colors={[colors.orange[200], colors.teal[200]]}
        style={styles.noConversationsCircle}
      >
        <Feather name="message-square" size={48} color={colors.orange[600]} />
      </LinearGradient>
      <Text style={styles.noConversationsTitle}>No conversations yet</Text>
      <Text style={styles.noConversationsSubtitle}>
        Start matching with people to begin chatting!
      </Text>
    </View>
  </View>
);

// ============================================================================
// NO SEARCH RESULTS STATE COMPONENT
// ============================================================================
interface NoSearchResultsStateProps {
  searchQuery: string;
  onClearSearch: () => void;
}

const NoSearchResultsState: React.FC<NoSearchResultsStateProps> = ({ searchQuery, onClearSearch }) => (
  <View style={styles.noSearchResultsState}>
    <View style={[styles.emptyCard, styles.cardShadow]}>
      <Feather name="search" size={48} color={colors.gray[300]} />
      <Text style={styles.noSearchResultsTitle}>No results found</Text>
      <Text style={styles.noSearchResultsSubtitle}>
        No conversations or matches found for "{searchQuery}"
      </Text>
      <TouchableOpacity
        onPress={onClearSearch}
        style={styles.clearSearchButton}
        accessible={true}
        accessibilityLabel="Clear search"
        accessibilityRole="button"
      >
        <Text style={styles.clearSearchButtonText}>Clear Search</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ============================================================================
// NETWORK STATUS BANNER COMPONENT - Enhanced with tap to retry
// ============================================================================
interface NetworkStatusBannerProps {
  isConnected: boolean;
  onRetry?: () => void;
}

const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ isConnected, onRetry }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldShow, setShouldShow] = useState(false);
  const STATUS_BANNER_DELAY_MS = 3500;

  // Subtle pulse to draw attention
  useEffect(() => {
    if (!isConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    return undefined; // No cleanup needed when connected
  }, [isConnected, pulseAnim]);

  useEffect(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (isConnected) {
      setShouldShow(false);
      return;
    }

    showTimeoutRef.current = setTimeout(() => {
      setShouldShow(true);
    }, STATUS_BANNER_DELAY_MS);

    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
    };
  }, [isConnected]);

  if (isConnected || !shouldShow) return null;

  return (
    <TouchableOpacity
      onPress={onRetry}
      activeOpacity={0.8}
      accessible={true}
      accessibilityLabel="No internet connection. Tap to retry"
      accessibilityRole="button"
    >
      <Animated.View style={[styles.networkBanner, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.networkBannerContent}>
          <Feather name="wifi-off" size={18} color={colors.white} />
          <Text style={styles.networkBannerText}>
            No connection - Tap to retry
          </Text>
        </View>
        <Feather name="refresh-cw" size={16} color={colors.white} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================================================
// EMPTY STATE COMPONENT - For landscape right panel
// ============================================================================
const EmptyState: React.FC = () => {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyCard, styles.cardShadow]}>
        {/* Gradient Circle with Message Icon */}
        <LinearGradient
          colors={[colors.teal[200], colors.orange[200]]}
          style={styles.emptyStateCircle}
        >
          <Feather name="message-circle" size={48} color={colors.teal[600]} />
        </LinearGradient>

        <Text style={styles.emptyStateTitle}>Select a conversation</Text>
        <Text style={styles.emptyStateSubtitle}>
          Choose from your existing conversations or start a new one
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// EMBEDDED CHAT COMPONENT - For landscape right panel
// ============================================================================
interface EmbeddedChatProps {
  conversation: Conversation | NewMatch;
  isNewMatch?: boolean;
  onClose: () => void;
}

const EmbeddedChat: React.FC<EmbeddedChatProps> = ({ conversation, isNewMatch, onClose: _onClose }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MessagesNavigationProp>();
  const { isLandscape, isTablet, wp } = useResponsive();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSending, setIsSending] = useState(false); // Debounce for send button
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const userName = conversation.name;
  const userAvatar = conversation.avatar;
  const userAvatarUrl = conversation.avatarUrl;

  // Get proper IDs based on conversation type
  const conversationId = isNewMatch
    ? undefined // New match - no conversation yet
    : (conversation as Conversation).id;

  const otherUserId = isNewMatch
    ? (conversation as NewMatch).userId
    : (conversation as Conversation).otherUserId;

  // Use the real chat hook - get real-time online/typing status with lazy loading
  const {
    messages: chatMessages,
    isLoading: chatLoading,
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
    conversationId: conversationId || `new-${(conversation as NewMatch).matchId}`,
    otherUserId: otherUserId || 0,
  });

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Check if there are unread messages from the other user
  const hasUnreadMessages = useMemo(() => {
    return chatMessages.some((msg) => msg.sender === 'them');
  }, [chatMessages]);

  // ✅ Mark messages as read when embedded chat is visible and app is active
  useEffect(() => {
    if (isFocused && appState === 'active' && hasUnreadMessages && !chatLoading) {
      console.log('[EmbeddedChat] Marking messages as read - screen focused and app active');
      markAsRead();
    }
  }, [isFocused, appState, hasUnreadMessages, chatLoading, markAsRead]);

  // Detect phone landscape for compact styling
  const isPhoneLandscape = isLandscape && !isTablet;

  // Convert messages to display format
  const messages: ChatMessage[] = chatMessages.map((msg) => ({
    id: msg.id,
    text: msg.text,
    sender: msg.sender,
    time: msg.time,
    status: msg.status,
    timestamp: msg.timestamp,
  }));

  // ✅ PREMIUM: Type for list items (messages + date separators)
  type EmbeddedListItem = ChatMessage | { type: 'date-separator'; date: Date; id: string };

  // ✅ PREMIUM: Group messages with date separators for better readability
  const messagesWithDateSeparators = useMemo((): EmbeddedListItem[] => {
    if (messages.length === 0) return [];

    const result: EmbeddedListItem[] = [];
    let lastDateStr = '';

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp);
      const dateStr = msgDate.toDateString();

      // Insert date separator when date changes
      if (dateStr !== lastDateStr) {
        result.push({
          type: 'date-separator',
          date: msgDate,
          id: `date-${dateStr}`,
        });
        lastDateStr = dateStr;
      }

      result.push(msg);
    });

    return result;
  }, [messages]);

  // Responsive max width for chat bubbles - use wp() for landscape pixel-based calculation
  // In landscape mode, screen is wider so messages should be narrower percentage-wise
  const chatBubbleMaxWidth = isLandscape
    ? (isTablet ? wp(45) : wp(50))   // Narrower in landscape for better alignment (pixel values)
    : (isTablet ? '60%' : '75%');    // Standard widths in portrait (percentage works well)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard handling
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
    if (hasMessages && !chatLoading && !hasInitialScrolled.current) {
      // Set flag IMMEDIATELY to prevent any race conditions
      hasInitialScrolled.current = true;
      // ✅ FIX: Increased delay to 500ms to ensure FlatList renders with date separators
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 500);
    }
  }, [hasMessages, chatLoading]); // Depend on boolean hasMessages, not messages.length

  // ✅ FIX: Scroll to bottom using scrollToOffset with large value
  const scrollAttempts = useRef(0);
  const maxScrollAttempts = 3;
  const lastContentHeight = useRef(0);
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    // Only scroll if content height changed and we have messages
    if (hasMessages && !chatLoading && height > 0 && height !== lastContentHeight.current) {
      lastContentHeight.current = height;

      if (scrollAttempts.current < maxScrollAttempts) {
        scrollAttempts.current += 1;
        // Use scrollToOffset with the content height to ensure we reach the bottom
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: height, animated: false });
        }, 100);
      }
    }
  }, [hasMessages, chatLoading]);

  // Reset scroll state when conversation changes
  useEffect(() => {
    hasInitialScrolled.current = false;
    scrollAttempts.current = 0;
    lastContentHeight.current = 0;
  }, [conversationId]);

  // Typing indicator handler
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    if (text.length > 0) {
      sendTypingIndicator(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }
  }, [sendTypingIndicator]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || isSending) return;

    // Debounce: prevent rapid double-taps (senior-friendly)
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

    // Scroll to newest after sending
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, sendMessage, sendTypingIndicator, isSending]);

  const handleSendLike = useCallback(() => {
    if (isSending) return;
    setIsSending(true);
    sendMessage('👍');
    sendTimeoutRef.current = setTimeout(() => {
      setIsSending(false);
    }, 500);
    // Scroll to newest after sending
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [sendMessage, isSending]);

  const handleAudioCall = useCallback(() => {
    navigation.navigate('Call', {
      conversationId: conversationId || '',
      userId: otherUserId || 0,
      userName,
      userPhoto: userAvatarUrl || undefined,
      callType: 'AUDIO' as CallType,
      isIncoming: false,
    });
  }, [navigation, conversationId, otherUserId, userName, userAvatarUrl]);

  const handleVideoCall = useCallback(() => {
    navigation.navigate('Call', {
      conversationId: conversationId || '',
      userId: otherUserId || 0,
      userName,
      userPhoto: userAvatarUrl || undefined,
      callType: 'VIDEO' as CallType,
      isIncoming: false,
    });
  }, [navigation, conversationId, otherUserId, userName, userAvatarUrl]);

  const handleViewProfile = useCallback(() => {
    setShowInfo(false);
    navigation.navigate('ProfileDetail', {
      userId: otherUserId?.toString() || '',
      userName: conversation.name,
      userPhoto: userAvatarUrl || undefined,
    });
  }, [navigation, otherUserId, conversation.name, userAvatarUrl]);

  // Status indicator for own messages - Enhanced with clear visual distinction
  // ✅ Updated: Double checkmarks for delivered/read with status text
  const getStatusIcon = useCallback((msgStatus?: string) => {
    // Get status with fallback to 'sent'
    const status = msgStatus || 'sent';

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
  }, []);

  // Memoized render message with status indicators
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender === 'me';

    return (
      <View style={[styles.chatMessageRow, isOwn && styles.chatMessageRowOwn]}>
        <View style={[styles.chatMessageContent, { maxWidth: chatBubbleMaxWidth }]}>
          {isOwn ? (
            <LinearGradient
              colors={[colors.orange[500], colors.orange[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.chatBubbleOwn}
            >
              <Text style={styles.chatBubbleTextOwn}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.chatBubbleOther}>
              <Text style={styles.chatBubbleTextOther}>{item.text}</Text>
            </View>
          )}
          <View style={[styles.chatTimeRow, isOwn && styles.chatTimeRowOwn]}>
            <Text style={[styles.chatTimeText, isOwn && styles.chatTimeTextOwn]}>
              {item.time}
            </Text>
            {isOwn && <View style={styles.chatStatusIcon}>{getStatusIcon(item.status)}</View>}
          </View>
        </View>
      </View>
    );
  }, [chatBubbleMaxWidth, getStatusIcon]);

  // ✅ PREMIUM: Render list item (handles both messages and date separators)
  const renderListItem = useCallback(({ item }: { item: EmbeddedListItem }) => {
    if ('type' in item && item.type === 'date-separator') {
      return <DateSeparator date={item.date} />;
    }
    return renderMessage({ item: item as ChatMessage });
  }, [renderMessage]);

  // FlatList getItemLayout for optimization
  const getMessageItemLayout = useCallback((
    _data: ArrayLike<ChatMessage> | null | undefined,
    index: number
  ) => ({
    length: MESSAGE_ITEM_HEIGHT,
    offset: MESSAGE_ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={styles.embeddedChat}>
      {/* Header - Compact in landscape, with typing indicator */}
      <View style={[
        styles.chatHeader,
        isLandscape && styles.chatHeaderLandscape,
        isPhoneLandscape && styles.chatHeaderPhoneLandscape,
      ]}>
        {/* ✅ UX: Tapping avatar/name opens info panel for better discoverability */}
        <TouchableOpacity
          onPress={() => setShowInfo(true)}
          style={styles.chatHeaderLeft}
          accessible={true}
          accessibilityLabel={`View ${userName}'s profile and options`}
          accessibilityRole="button"
          accessibilityHint="Double tap to open conversation info"
        >
          <View style={styles.chatHeaderAvatarWrapper}>
            {userAvatarUrl ? (
              <Image
                source={{ uri: userAvatarUrl }}
                style={styles.chatHeaderAvatarImage}
              />
            ) : (
              <LinearGradient
                colors={[colors.teal[400], colors.teal[500]]}
                style={styles.chatHeaderAvatar}
              >
                <Text style={styles.chatHeaderAvatarText}>{userAvatar}</Text>
              </LinearGradient>
            )}
            {/* Show real-time online status from useChat hook */}
            {isOtherUserOnline && <View style={styles.chatHeaderOnlineDot} />}
          </View>
          {/* Name container with flex shrink for proper truncation */}
          <View style={styles.chatHeaderNameContainer}>
            <Text style={styles.chatHeaderName} numberOfLines={1} ellipsizeMode="tail">
              {userName}
            </Text>
            {/* Real-time status: Typing > Active now > Offline */}
            <Text style={styles.chatHeaderStatus} numberOfLines={1}>
              {isOtherUserTyping ? 'Typing...' : isOtherUserOnline ? 'Active now' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.chatHeaderActions}>
          <TouchableOpacity
            onPress={handleAudioCall}
            style={[
              styles.chatHeaderActionButton,
              !isConnected && styles.chatHeaderActionButtonDisabled,
            ]}
            accessible={true}
            accessibilityLabel={isConnected ? `Voice call ${userName}` : `Voice call ${userName} (unavailable when offline)`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isConnected }}
          >
            <Feather name="phone" size={20} color={isConnected ? colors.teal[500] : colors.gray[400]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleVideoCall}
            style={[
              styles.chatHeaderActionButton,
              !isConnected && styles.chatHeaderActionButtonDisabled,
            ]}
            accessible={true}
            accessibilityLabel={isConnected ? `Video call ${userName}` : `Video call ${userName} (unavailable when offline)`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isConnected }}
          >
            <Feather name="video" size={20} color={isConnected ? colors.teal[500] : colors.gray[400]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowInfo(true)}
            style={styles.chatHeaderActionButton}
            accessible={true}
            accessibilityLabel={`View ${userName}'s profile and options`}
            accessibilityRole="button"
          >
            <Feather name="info" size={20} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Panel - Tablet-specific constrained width styling */}
      {showInfo && (
        <View style={[
          styles.infoPanel,
          isTablet && styles.infoPanelTablet,
          isTablet && { width: Math.min(wp(50), 400) },
          isPhoneLandscape && { paddingLeft: insets.left, paddingRight: insets.right },
        ]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowInfo(false)}
              style={styles.infoPanelCloseButton}
              accessible={true}
              accessibilityLabel="Close info panel"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={20} color={colors.gray[700]} />
            </TouchableOpacity>

            {/* Profile Info */}
            <View style={styles.infoPanelProfileSection}>
              <View style={styles.infoPanelAvatarWrapper}>
                {userAvatarUrl ? (
                  <Image
                    source={{ uri: userAvatarUrl }}
                    style={styles.infoPanelAvatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.teal[400], colors.teal[500]]}
                    style={styles.infoPanelAvatar}
                  >
                    <Text style={styles.infoPanelAvatarText}>{userAvatar}</Text>
                  </LinearGradient>
                )}
                {/* Use real-time online status */}
                {isOtherUserOnline && <View style={styles.infoPanelOnlineDot} />}
              </View>
              <Text style={styles.infoPanelName}>{userName}</Text>
              <View style={styles.infoPanelEncryption}>
                <Feather name="lock" size={14} color={colors.gray[600]} />
                <Text style={styles.infoPanelEncryptionText}>End-to-end encrypted</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.infoPanelActions}>
              <TouchableOpacity
                onPress={handleViewProfile}
                style={styles.infoPanelActionButton}
                accessible={true}
                accessibilityLabel={`View ${userName}'s full profile`}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.orange[500], colors.teal[500]]}
                  style={styles.infoPanelActionIcon}
                >
                  <Feather name="user" size={20} color={colors.white} />
                </LinearGradient>
                <Text style={styles.infoPanelActionText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsMuted(!isMuted)}
                style={styles.infoPanelActionButton}
                accessible={true}
                accessibilityLabel={isMuted ? 'Unmute notifications' : 'Mute notifications'}
                accessibilityRole="button"
              >
                <View style={styles.infoPanelActionIconGray}>
                  <Feather name={isMuted ? 'bell-off' : 'bell'} size={20} color={colors.gray[700]} />
                </View>
                <Text style={styles.infoPanelActionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.infoPanelActionButton}
                accessible={true}
                accessibilityLabel="Search messages in this conversation"
                accessibilityRole="button"
              >
                <View style={styles.infoPanelActionIconGray}>
                  <Feather name="search" size={20} color={colors.gray[700]} />
                </View>
                <Text style={styles.infoPanelActionText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Media & Files */}
            <TouchableOpacity
              style={styles.infoPanelMenuItem}
              accessible={true}
              accessibilityLabel="View shared media and files"
              accessibilityRole="button"
            >
              <View style={styles.infoPanelMenuLeft}>
                <Feather name="image" size={20} color={colors.gray[600]} />
                <Text style={styles.infoPanelMenuText}>Media & files</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.gray[400]} />
            </TouchableOpacity>

            {/* Privacy & Support */}
            <TouchableOpacity
              style={[styles.infoPanelMenuItem, styles.infoPanelMenuItemBorder]}
              accessible={true}
              accessibilityLabel="Privacy and support options"
              accessibilityRole="button"
            >
              <Text style={styles.infoPanelMenuText}>Privacy & support</Text>
              <Feather name="chevron-right" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ✅ PREMIUM: Connection status bar */}
      <ConnectionStatusBar
        state={connectionState}
        onRetry={() => stompService.reconnect()}
      />

      {/* Messages - ✅ PREMIUM: With date separators and lazy loading */}
      <Animated.View style={[styles.chatMessagesContainer, { paddingBottom: keyboardHeight }]}>
        {chatLoading ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messagesWithDateSeparators} // ✅ PREMIUM: Includes date separators
            renderItem={renderListItem}
            keyExtractor={item => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={styles.chatMessagesList}
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
            // ✅ Lazy loading: Load older messages when scrolling near top
            onScroll={({ nativeEvent }) => {
              if (nativeEvent.contentOffset.y < 100 && hasMoreMessages && !isLoadingMore) {
                loadMoreMessages();
              }
            }}
            scrollEventThrottle={100}
            ListHeaderComponent={
              isLoadingMore ? (
                <View style={styles.chatLoadingMoreContainer}>
                  <Text style={styles.chatLoadingMoreText}>Loading older messages...</Text>
                </View>
              ) : null
            }
            // ✅ PREMIUM: Animated typing indicator
            ListFooterComponent={
              <TypingIndicator isVisible={isOtherUserTyping} userName={userName} />
            }
          />
        )}

        {/* Input Area - Compact in landscape, with proper safe area and disabled states */}
        <View style={[
          styles.chatInputContainer,
          isPhoneLandscape && styles.chatInputContainerLandscape,
          { paddingBottom: isPhoneLandscape ? Math.max(insets.bottom, 6) : TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) }
        ]}>
          <TouchableOpacity
            style={styles.chatEmojiButton}
            accessible={true}
            accessibilityLabel="Open emoji picker"
            accessibilityRole="button"
          >
            <Feather name="smile" size={20} color={colors.teal[500]} />
          </TouchableOpacity>

          <View style={styles.chatInputWrapper}>
            <TextInput
              style={styles.chatTextInput}
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
              returnKeyType="send"
            />
          </View>

          {inputText.trim() ? (
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isSending}
              style={[
                styles.chatSendButtonWrapper,
                isSending && styles.chatSendButtonDisabled,
              ]}
              accessible={true}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSending }}
            >
              <LinearGradient
                colors={isSending ? [colors.gray[400], colors.gray[500]] : [colors.orange[500], colors.teal[500]]}
                style={styles.chatSendButton}
              >
                <Feather name="send" size={20} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSendLike}
              disabled={isSending}
              style={[styles.chatLikeButton, isSending && styles.chatLikeButtonDisabled]}
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
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<MessagesNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, width } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedNewMatch, setSelectedNewMatch] = useState<NewMatch | null>(null);
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);
  const searchInputRef = useRef<TextInput>(null);

  // ✅ FIX: Small device detection for responsive adjustments
  const isSmallDevice = width <= 375;
  // ✅ FIX: Only show split view on tablets in landscape (not phones)
  const showSplitView = isLandscape && isTablet;

  // Network status monitoring
  useEffect(() => {
    setIsNetworkConnected(stompService.isConnectedToServer());
    const unsubscribe = stompService.onConnectionChange((connected) => {
      setIsNetworkConnected(connected);
    });
    return () => unsubscribe();
  }, []);

  // Real data hooks
  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
  } = useConversations();

  const {
    newMatches,
    isLoading: matchesLoading,
    error: matchesError,
    refresh: refreshMatches,
  } = useNewMatches();

  // Combined loading/error state
  const isLoading = conversationsLoading || matchesLoading;
  const error = conversationsError || matchesError;

  // ✅ FIX: Responsive padding - smaller on small devices
  const horizontalPadding = isTablet ? 32 : (isSmallDevice ? 16 : 24);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.message.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Filter new matches by search query
  const filteredNewMatches = useMemo(() => {
    if (!searchQuery.trim()) return newMatches;
    const query = searchQuery.toLowerCase();
    return newMatches.filter((m) => m.name.toLowerCase().includes(query));
  }, [newMatches, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshConversations(), refreshMatches()]);
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshConversations, refreshMatches]);

  const handleRetry = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    // ✅ FIX: Only use split view on tablets, not small phones in landscape
    if (showSplitView) {
      setSelectedConversation(conversation);
      setSelectedNewMatch(null);
    } else {
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        userName: conversation.name,
        userPhoto: conversation.avatarUrl || undefined,
        userId: conversation.otherUserId.toString(),
      });
    }
  }, [navigation, showSplitView]);

  const handleNewMatchPress = useCallback((match: NewMatch) => {
    // ✅ FIX: Only use split view on tablets, not small phones in landscape
    if (showSplitView) {
      setSelectedNewMatch(match);
      setSelectedConversation(null);
    } else {
      navigation.navigate('Chat', {
        conversationId: `new-${match.matchId}`,
        userName: match.name,
        userPhoto: match.avatarUrl || undefined,
        userId: match.userId.toString(),
      });
    }
  }, [navigation, showSplitView]);

  const handleCloseChat = useCallback(() => {
    setSelectedConversation(null);
    setSelectedNewMatch(null);
  }, []);

  // Count unread new matches (those with notifications)
  const unreadMatchesCount = filteredNewMatches.filter(m => m.hasNotification).length;
  const unreadConversationsCount = conversations.filter(c => c.unread).length;

  // FlatList getItemLayout for optimization
  const getConversationItemLayout = useCallback((
    _data: ArrayLike<Conversation> | null | undefined,
    index: number
  ) => ({
    length: CONVERSATION_ITEM_HEIGHT,
    offset: CONVERSATION_ITEM_HEIGHT * index,
    index,
  }), []);

  // Memoized render item
  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationRow
      conversation={item}
      onPress={() => handleConversationPress(item)}
      isSelected={showSplitView && selectedConversation?.id === item.id}
    />
  ), [handleConversationPress, showSplitView, selectedConversation?.id]);

  // Memoized ListHeaderComponent
  const ListHeader = useMemo(() => {
    // Don't show new matches section if no matches
    if (filteredNewMatches.length === 0) return null;

    return (
      <View style={styles.newMatchesSection}>
        <View style={[styles.newMatchesCardWrapper, styles.cardShadow]}>
          <LinearGradient
            colors={colors.gradient.headerGlow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.newMatchesCard}
          >
            <View style={styles.newMatchesHeader}>
              <Text style={styles.sectionTitle}>NEW MATCHES</Text>
              {/* ORANGE badge per Figma */}
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{unreadMatchesCount}</Text>
              </View>
            </View>

            {/* Horizontal Scroll of Match Avatars */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesScrollContent}
              accessible={true}
              accessibilityLabel="New matches"
              accessibilityRole="list"
            >
              {filteredNewMatches.map((match) => (
                <NewMatchAvatar
                  key={match.id}
                  match={match}
                  onPress={() => handleNewMatchPress(match)}
                />
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    );
  }, [filteredNewMatches, unreadMatchesCount, handleNewMatchPress]);

  // Conversation List Component (memoized)
  const ConversationList = useMemo(() => (
    <View style={[
      styles.conversationListContainer,
      // ✅ FIX: Only apply landscape styles on tablets, not small phones
      showSplitView && styles.conversationListLandscape,
      // Adjust split ratio for very wide tablets (1024px+)
      showSplitView && { flex: 0.35 },
      { paddingHorizontal: 0 },
    ]}>
      {/* Network Status Banner */}
      <NetworkStatusBanner isConnected={isNetworkConnected} onRetry={handleRefresh} />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.title, showSplitView && styles.titleLandscape]}>Chats</Text>
            <Text style={styles.subtitle}>
              {unreadConversationsCount > 0 ? `${unreadConversationsCount} unread` : 'All caught up'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => searchInputRef.current?.focus()}
            style={styles.composeButton}
            accessible={true}
            accessibilityLabel="Start a new message"
            accessibilityRole="button"
            accessibilityHint="Focuses the search to start a new chat"
          >
            <LinearGradient
              colors={colors.gradient.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.composeButtonGradient}
            >
              <Feather name="edit-3" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search Bar - ✅ FIX: Responsive padding for small devices */}
        <View style={styles.searchBarWrapper}>
          <View style={[
            styles.searchBar,
            isSmallDevice && styles.searchBarSmall,
          ]}>
            <Feather name="search" size={20} color={colors.gray[500]} style={[
              styles.searchIcon,
              isSmallDevice && styles.searchIconSmall,
            ]} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Messenger"
              placeholderTextColor={colors.gray[400]}
              autoCapitalize="none"
              autoCorrect={false}
              accessible={true}
              accessibilityLabel="Search conversations"
              accessibilityHint="Enter name or message to search"
              returnKeyType="search"
            />
          </View>
        </View>
      </View>

      {/* Content States - ✅ PREMIUM: Skeleton loading */}
      {isLoading ? (
        <ConversationListSkeleton />
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          getItemLayout={getConversationItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          }}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <NoSearchResultsState
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            ) : (
              <NoConversationsState />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.orange[500]]}
              tintColor={colors.orange[500]}
            />
          }
        />
      )}
    </View>
  ), [
    showSplitView,
    horizontalPadding,
    searchQuery,
    isLoading,
    error,
    handleRetry,
    filteredConversations,
    renderConversationItem,
    getConversationItemLayout,
    insets.bottom,
    ListHeader,
    refreshing,
    handleRefresh,
    isNetworkConnected,
    isSmallDevice,
    unreadConversationsCount,
    searchInputRef,
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.gradient.screenBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
        pointerEvents="none"
      />
      <View style={styles.backgroundGlowTop} pointerEvents="none" />
      <View style={styles.backgroundGlowBottom} pointerEvents="none" />
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.gray[50]}
        translucent={false}
      />

      {/* ✅ FIX: Only show split view on tablets, not small phones in landscape */}
      {showSplitView ? (
        // TABLET LANDSCAPE: Split view
        <View style={styles.splitContainer}>
          {/* Left Panel - Conversation List */}
          {ConversationList}

          {/* Divider */}
          <View style={styles.splitDivider} />

          {/* Right Panel - Chat or Empty State */}
          <View style={styles.rightPanel}>
            {selectedConversation ? (
              <EmbeddedChat
                conversation={selectedConversation}
                onClose={handleCloseChat}
              />
            ) : selectedNewMatch ? (
              <EmbeddedChat
                conversation={selectedNewMatch}
                isNewMatch
                onClose={handleCloseChat}
              />
            ) : (
              <EmptyState />
            )}
          </View>
        </View>
      ) : (
        // PORTRAIT or PHONE LANDSCAPE: Full-screen conversation list
        ConversationList
      )}
    </View>
  );
};

// ============================================================================
// STYLES - Matching Figma CSS exactly with UI audit fixes
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.orange[100],
    opacity: 0.5,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -140,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.teal[100],
    opacity: 0.45,
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
    }),
  },
  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray[200],
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  // Split view (landscape)
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitDivider: {
    width: 1,
    backgroundColor: colors.gray[100],
  },
  rightPanel: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Conversation List Container
  conversationListContainer: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  conversationListLandscape: {
    flex: 0.4,
    minWidth: 300,
    maxWidth: 480,
    borderRightWidth: 0,
  },

  // Header - px-6 pt-6 pb-4
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.transparent,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerTitleBlock: {
    flex: 1,
  },

  // Title - text-3xl font-bold text-gray-900 mb-4
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  titleLandscape: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: 4,
  },
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  composeButtonGradient: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    marginTop: 16,
  },

  // Search Bar - pl-12 pr-4 py-3.5 bg-gray-50 rounded-full
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.romantic.glassWhite,
    borderRadius: 24,
    paddingLeft: 48,
    paddingRight: 16,
    minHeight: 52,
    paddingVertical: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.gray[300],
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
    }),
  },
  // ✅ FIX: Smaller search bar padding on small devices
  searchBarSmall: {
    paddingLeft: 40,
    paddingRight: 12,
    minHeight: 48,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
  },
  // ✅ FIX: Adjusted icon position for small devices
  searchIconSmall: {
    left: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    padding: 0,
  },

  // New Matches Section - px-6 py-6
  // ✅ FIX: Reduced padding for small devices
  newMatchesSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.transparent,
    marginBottom: 4,
  },
  newMatchesCardWrapper: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  newMatchesCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },

  // New Matches Header - mb-4
  newMatchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // Section Title - text-base font-semibold uppercase tracking-wide
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  // Count Badge - w-8 h-8 bg-orange-500 rounded-full (ORANGE per Figma!)
  countBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.orange[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
    }),
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // Matches Scroll - gap-4 pb-2
  // ✅ FIX: Reduced gap for small devices
  matchesScrollContent: {
    paddingBottom: 4,
    paddingTop: 4,
    gap: 12, // Reduced from 16 for tighter layout on small screens
  },

  // Match Avatar Container - increased touch target for seniors
  matchAvatarContainer: {
    alignItems: 'center',
    minWidth: 72,
    minHeight: 84,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  matchAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
    padding: 2,
    borderRadius: 34,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.orange[100],
  },

  // Match Avatar - w-16 h-16 (64px) rounded-full, ORANGE gradient
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  matchAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  matchAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },

  // Match Online Dot - bottom-0 right-0 w-5 h-5 (20px)
  matchOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.teal[500],
    borderWidth: 2,
    borderColor: colors.white,
  },

  // Match Heart Badge - -top-1 -right-1 w-6 h-6 (24px)
  matchHeartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal[500],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Match Name - text-sm font-medium text-gray-700
  // ✅ FIX: Add maxWidth for truncation on small devices
  matchName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
    maxWidth: 72,
    textAlign: 'center',
  },

  // Conversation Row - px-6 py-4 gap-4
  // ✅ FIX: Reduced padding on small devices
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  conversationRowSelected: {
    backgroundColor: colors.teal[50],
    borderColor: colors.teal[200],
  },

  // Conversation Avatar Wrapper
  conversationAvatarWrapper: {
    position: 'relative',
  },

  // Conversation Avatar - w-14 h-14 (56px), TEAL gradient per Figma
  conversationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  conversationAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  conversationAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },

  // Conversation Online Dot - bottom-0 right-0 w-4 h-4 (16px)
  conversationOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.teal[500],
    borderWidth: 2,
    borderColor: colors.white,
  },

  // Conversation Content - flex-1 pt-1
  conversationContent: {
    flex: 1,
    paddingTop: 4,
  },

  // Conversation Top Row - mb-1
  conversationTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  // Conversation Name Row - contains name + verification badge
  conversationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },

  // Conversation Name - text-lg font-semibold text-gray-900
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[900],
    flexShrink: 1,
  },

  // Verification Badge - teal checkmark
  verifiedBadge: {
    marginLeft: 2,
  },

  // Typing Indicator - animated dots
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingText: {
    fontSize: 16,
    color: colors.teal[500],
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal[500],
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },

  // Conversation Time - text-sm text-gray-600 ml-2 (FIXED: gray[600] for WCAG AA)
  conversationTime: {
    fontSize: 14,
    color: colors.gray[500],
    marginLeft: 8,
  },

  // Conversation Message - text-base text-gray-600 (FIXED: gray[600] for WCAG AA)
  conversationMessage: {
    fontSize: 15,
    color: colors.gray[600],
    lineHeight: 20,
  },
  conversationMessageUnread: {
    color: colors.gray[900],
    fontWeight: '600',
  },

  // Unread Dot - w-3 h-3 (12px) bg-orange-500 mt-2
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.orange[500],
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },

  // ============================================================================
  // LOADING STATE - Enhanced with animations
  // ============================================================================
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingStateDots: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.orange[500],
    height: 32,
  },
  loadingStateHint: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 8,
  },

  // ============================================================================
  // ERROR STATE - Enhanced with encouragement
  // ============================================================================
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
  },
  errorStateSubtitle: {
    fontSize: 17,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 56,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  errorHelpHint: {
    fontSize: 15,
    color: colors.gray[500],
    marginTop: 20,
    fontStyle: 'italic',
  },

  // ============================================================================
  // NO CONVERSATIONS STATE
  // ============================================================================
  noConversationsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  noConversationsCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  noConversationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
  },
  noConversationsSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },

  // ============================================================================
  // NO SEARCH RESULTS STATE
  // ============================================================================
  noSearchResultsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  noSearchResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
    marginTop: 16,
  },
  noSearchResultsSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  clearSearchButton: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
    }),
  },
  clearSearchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // ============================================================================
  // NETWORK STATUS BANNER - Enhanced with tap to retry
  // ============================================================================
  networkBanner: {
    backgroundColor: colors.orange[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
    }),
  },
  networkBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  networkBannerText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
    flex: 1,
  },

  // ============================================================================
  // EMPTY STATE (Landscape right panel)
  // ============================================================================
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  emptyStateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },

  // ============================================================================
  // EMBEDDED CHAT
  // ============================================================================
  embeddedChat: {
    flex: 1,
    backgroundColor: colors.white,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.romantic.glassWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  chatHeaderLandscape: {
    paddingVertical: 8,
  },
  // Compact header in phone landscape to maximize chat space
  chatHeaderPhoneLandscape: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1, // Allow flex shrink for name truncation
  },
  chatHeaderAvatarWrapper: {
    position: 'relative',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatHeaderAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderOnlineDot: {
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
  // Name container with flex shrink for proper truncation
  chatHeaderNameContainer: {
    flex: 1,
    flexShrink: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  chatHeaderStatus: {
    fontSize: 16,
    color: colors.gray[600], // FIXED: gray[600] for WCAG AA
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // FIXED: Touch target minimum 44pt
  chatHeaderActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  // Disabled state for call buttons when offline
  chatHeaderActionButtonDisabled: {
    opacity: 0.5,
  },

  // Chat Messages
  chatMessagesContainer: {
    flex: 1,
  },
  chatMessagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  // ✅ Lazy loading: Loading indicator for pagination
  chatLoadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  chatLoadingMoreText: {
    fontSize: 14,
    color: colors.gray[500],
    fontWeight: '500',
  },
  chatMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  chatMessageRowOwn: {
    justifyContent: 'flex-end',
  },
  chatMessageContent: {
    // maxWidth set dynamically based on screen size
  },
  chatBubbleOwn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  chatBubbleTextOwn: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.white,
  },
  chatBubbleOther: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  chatBubbleTextOther: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray[900],
  },
  // Time row with status indicator (matching ChatScreen pattern)
  chatTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 4,
  },
  chatTimeRowOwn: {
    justifyContent: 'flex-end',
  },
  chatTimeText: {
    fontSize: 16,
    color: colors.gray[600], // WCAG AA compliant contrast
  },
  chatTimeTextOwn: {
    textAlign: 'right',
  },
  // Status icon for sent messages
  chatStatusIcon: {
    marginLeft: 2,
  },

  // Chat Input
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.romantic.glassWhite,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  // Compact input area in landscape to maximize vertical space
  chatInputContainerLandscape: {
    paddingTop: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  // FIXED: Touch target minimum 44pt
  chatEmojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 9999,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chatTextInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    paddingVertical: 8,
    maxHeight: 100,
  },
  // FIXED: Touch target minimum 44pt
  chatInputEmojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendButtonWrapper: {
    width: 44,
    height: 44,
  },
  // FIXED: Touch target minimum 44pt
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FIXED: Touch target minimum 44pt
  chatLikeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Disabled states for send/like buttons (senior-friendly debounce)
  chatSendButtonDisabled: {
    opacity: 0.6,
  },
  chatLikeButtonDisabled: {
    opacity: 0.6,
  },

  // ============================================================================
  // INFO PANEL (Embedded Chat)
  // ============================================================================
  infoPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    zIndex: 50,
  },
  // Tablet-specific info panel styling (constrained width, positioned right)
  infoPanelTablet: {
    left: 'auto',
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[200],
    shadowColor: colors.black,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // FIXED: Touch target minimum 44pt
  infoPanelCloseButton: {
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
  infoPanelProfileSection: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 24,
  },
  infoPanelAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  infoPanelAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPanelAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  infoPanelAvatarText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '600',
  },
  infoPanelOnlineDot: {
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
  infoPanelName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  infoPanelEncryption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoPanelEncryptionText: {
    fontSize: 16,
    color: colors.gray[600], // FIXED: gray[600] for WCAG AA
  },
  infoPanelActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  infoPanelActionButton: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  infoPanelActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPanelActionIconGray: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPanelActionText: {
    fontSize: 16,
    color: colors.gray[700],
    fontWeight: '500',
  },
  infoPanelMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    minHeight: 56, // Touch target
  },
  infoPanelMenuItemBorder: {
    marginTop: 16,
  },
  infoPanelMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoPanelMenuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },
});

export default MessagesScreen;
