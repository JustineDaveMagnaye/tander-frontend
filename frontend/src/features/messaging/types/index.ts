/**
 * TANDER Messaging Types
 * TypeScript interfaces for conversations, messages, and calls
 *
 * Follows design_system2.md Section 8.3: Messaging Flow
 */

// Presence status for enhanced online tracking
export type PresenceStatus = 'online' | 'recently_active' | 'offline';

// User info displayed in conversations
export interface ChatUser {
  id: string;
  firstName: string;
  lastName?: string;
  profilePhoto?: string;
  isOnline: boolean;
  lastSeen?: Date;
  lastActive?: Date;
  /** Enhanced presence status: 'online', 'recently_active', or 'offline' */
  presenceStatus?: PresenceStatus;
  isVerified?: boolean;
}

// Message status states
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// Message types
export type MessageType = 'text' | 'image' | 'gif' | 'voice' | 'video' | 'system';

// Individual message
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaThumbnail?: string;
  duration?: number; // For voice/video messages in seconds
  status: MessageStatus;
  createdAt: Date;
  readAt?: Date;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
}

// Conversation/Chat thread
export interface Conversation {
  id: string;
  participants: ChatUser[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Typing indicator
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

// Call types
export type CallType = 'voice' | 'video';
export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'on_hold'
  | 'ended'
  | 'missed'
  | 'declined'
  | 'failed';

// Call record
export interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // In seconds
  missedReason?: 'no_answer' | 'declined' | 'busy' | 'network_error';
}

// Active call state
export interface ActiveCall {
  id: string;
  conversationId: string;
  remoteUser: ChatUser;
  type: CallType;
  status: CallStatus;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  duration: number; // Running duration in seconds
  startTime?: Date;
}

// BUG-106: Flexible caller info for incoming calls
export interface IncomingCallCaller {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
}

// Incoming call notification - BUG-106: Consolidated type
export interface IncomingCall {
  id: string;
  conversationId: string;
  caller: IncomingCallCaller | ChatUser;
  type: CallType;
  timestamp: Date;
}

// Chat input state
export interface ChatInputState {
  text: string;
  replyingTo?: Message;
  isRecording: boolean;
  recordingDuration?: number;
}

// Conversation list filter
export type ConversationFilter = 'all' | 'unread' | 'online';

// Message group for display (grouped by date)
export interface MessageGroup {
  date: string; // Display date like "Today", "Yesterday", "Dec 28"
  messages: Message[];
}

// Navigation params for Chat screen
export interface ChatScreenParams {
  conversationId: string;
  userName: string;
  userPhoto?: string;
  userId?: string;
}

// Navigation params for Call screen
export interface CallScreenParams {
  conversationId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  callType: CallType;
  isIncoming: boolean;
  callId?: string;
}

// Mock data helper type
export interface MockConversation extends Conversation {
  otherUser: ChatUser; // Helper for displaying the other participant
}
