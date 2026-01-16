/**
 * Chat API Service
 * REST endpoints for chat functionality
 * Works alongside STOMP WebSocket for real-time features
 */

import { get, post, del } from './client';

// ============================================================================
// Types (matching backend DTOs)
// ============================================================================

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessageDTO {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  content: string;
  sentAt: string; // ISO date string
  status: MessageStatus;
}

export interface ConversationDTO {
  id: number;
  user1Id: number;
  user1Username: string;
  user1DisplayName: string;
  user1ProfilePhotoUrl: string | null;
  user2Id: number;
  user2Username: string;
  user2DisplayName: string;
  user2ProfilePhotoUrl: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessage: string | null;
  unreadCount: number;
  isActive: boolean;
  isMuted: boolean;
}

export interface ChatUserDTO {
  id: number;
  username: string;
  email: string;
  isOnline: boolean;
}

export interface SendMessageRequest {
  receiverId: number;
  content: string;
}

// ============================================================================
// Conversations
// ============================================================================

/**
 * Get all conversations for the current user
 */
export const getConversations = (): Promise<ConversationDTO[]> => {
  return get<ConversationDTO[]>('/chat/conversations');
};

/**
 * Start or get existing conversation with a user
 * @param userId The ID of the user to chat with
 */
export const startConversation = (userId: number): Promise<ConversationDTO> => {
  return get<ConversationDTO>(`/chat/users/${userId}/start-conversation`);
};

// ============================================================================
// Messages
// ============================================================================

export interface GetMessagesParams {
  page?: number;
  size?: number;
}

/**
 * Get messages for a conversation with pagination
 * @param conversationId The conversation ID
 * @param params Pagination parameters (page, size)
 * @returns Messages sorted by sentAt descending (newest first for pagination)
 */
export const getMessages = (
  conversationId: number,
  params?: GetMessagesParams
): Promise<ChatMessageDTO[]> => {
  return get<ChatMessageDTO[]>(`/chat/conversations/${conversationId}/messages`, {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 50,
    },
  });
};

/**
 * Send a message via REST (fallback when WebSocket unavailable)
 * Note: Prefer using STOMP WebSocket for real-time messaging
 */
export const sendMessage = (request: SendMessageRequest): Promise<ChatMessageDTO> => {
  return post<ChatMessageDTO>('/chat/messages', request);
};

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = (conversationId: number): Promise<void> => {
  return post<void>(`/chat/conversations/${conversationId}/mark-read`);
};

/**
 * Delete a message
 */
export const deleteMessage = (messageId: number): Promise<void> => {
  return del<void>(`/chat/messages/${messageId}`);
};

// ============================================================================
// Mute / Unmute
// ============================================================================

export interface MuteStatusResponse {
  conversationId: number;
  isMuted: boolean;
  success?: boolean;
}

/**
 * Mute a conversation (stop receiving push notifications for it)
 */
export const muteConversation = (conversationId: number): Promise<MuteStatusResponse> => {
  return post<MuteStatusResponse>(`/chat/conversations/${conversationId}/mute`);
};

/**
 * Unmute a conversation (resume receiving push notifications for it)
 */
export const unmuteConversation = (conversationId: number): Promise<MuteStatusResponse> => {
  return post<MuteStatusResponse>(`/chat/conversations/${conversationId}/unmute`);
};

/**
 * Get mute status for a conversation
 */
export const getMuteStatus = (conversationId: number): Promise<MuteStatusResponse> => {
  return get<MuteStatusResponse>(`/chat/conversations/${conversationId}/mute-status`);
};

// ============================================================================
// Users
// ============================================================================

/**
 * Get all users available for chat
 */
export const getChatUsers = (): Promise<ChatUserDTO[]> => {
  return get<ChatUserDTO[]>('/chat/users');
};

/**
 * Get a specific user for chat
 */
export const getChatUser = (userId: number): Promise<ChatUserDTO> => {
  return get<ChatUserDTO>(`/chat/users/${userId}`);
};

// ============================================================================
// Export default
// ============================================================================

export default {
  // Conversations
  getConversations,
  startConversation,
  // Messages
  getMessages,
  sendMessage,
  markConversationAsRead,
  deleteMessage,
  // Mute
  muteConversation,
  unmuteConversation,
  getMuteStatus,
  // Users
  getChatUsers,
  getChatUser,
};
