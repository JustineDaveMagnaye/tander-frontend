/**
 * TANDER Messaging Feature
 * Complete messaging solution with premium iOS-style UI/UX
 *
 * Includes:
 * - Premium message bubbles with reactions
 * - Swipeable conversation list items
 * - Glassmorphism chat header
 * - Voice recording with waveform
 * - Image gallery with pinch-to-zoom
 * - Context menus and emoji reactions
 * - Real-time typing indicators
 * - STOMP WebSocket integration
 * - Twilio call integration
 */

// ============================================================================
// SCREENS
// ============================================================================
export {
  // Legacy screens
  ConversationsScreen,
  MessagesScreen,
  ChatScreen,
  CallScreen,
  CallHistoryScreen,
  ProfileDetailScreen,
  // Premium screens
  PremiumMessagesScreen,
  PremiumChatScreen,
} from './screens';

// ============================================================================
// COMPONENTS
// ============================================================================
export {
  // Legacy components
  ConversationItem,
  MessageBubble,
  ChatInput,
  ChatHeader,
  IncomingCallModal,
  NewMatchesList,
  SearchBar,
  // Premium components
  PremiumMessageBubble,
  SwipeableConversationItem,
  PremiumChatHeader,
  PremiumChatInput,
  PremiumTypingIndicator,
  EmojiReactionPicker,
  MessageContextMenu,
  ImageGalleryModal,
} from './components';

// ============================================================================
// HOOKS
// ============================================================================
export {
  useChat,
  useConversations,
  useNewMatches,
  useStompConnection,
  useTwilioCall,
} from './hooks';

// ============================================================================
// TYPES
// ============================================================================
export type {
  Message,
  MessageStatus,
  MessageType,
  Conversation,
  ChatUser,
  TypingIndicator,
  Call,
  ActiveCall,
  IncomingCall,
  CallType,
  CallStatus,
  PresenceStatus,
  ChatScreenParams,
  CallScreenParams,
} from './types';

// ============================================================================
// STYLES
// ============================================================================
export {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
  premiumStyles,
  getBubbleRadius,
  formatMessageTime,
  getRelativeTime,
  getDateSeparatorText,
  isSameDay,
  EMOJI_REACTIONS,
  EXTENDED_REACTIONS,
  MESSAGE_TYPES,
} from './styles';
