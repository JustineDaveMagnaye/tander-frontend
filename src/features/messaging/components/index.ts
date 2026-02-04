/**
 * TANDER Messaging Components
 * Centralized exports for all messaging-related components
 * Includes premium iOS-style components for ultra-smooth UX
 */

// ============================================================================
// LEGACY COMPONENTS (kept for backwards compatibility)
// ============================================================================
export { ConversationItem } from './ConversationItem';
export { MessageBubble } from './MessageBubble';
export { ChatInput } from './ChatInput';
export { ChatHeader } from './ChatHeader';
export { IncomingCallModal } from './IncomingCallModal';
export { NewMatchesList } from './NewMatchesList';
export { SearchBar } from './SearchBar';

// ============================================================================
// PREMIUM COMPONENTS (new iOS-style components)
// ============================================================================

// Premium Message Components
export { PremiumMessageBubble } from './PremiumMessageBubble';
export { SwipeableConversationItem } from './SwipeableConversationItem';
export { PremiumChatHeader } from './PremiumChatHeader';
export { PremiumChatInput } from './PremiumChatInput';
export { PremiumTypingIndicator } from './PremiumTypingIndicator';

// Premium Interactive Components
export { EmojiReactionPicker } from './EmojiReactionPicker';
export { MessageContextMenu } from './MessageContextMenu';
export { ImageGalleryModal } from './ImageGalleryModal';

// ============================================================================
// PREMIUM STYLES
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
} from '../styles/premiumStyles';
