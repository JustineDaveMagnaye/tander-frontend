/**
 * Story Comments API Service
 * Handles all story comment-related API calls including:
 * - Sending comments (auto swipes right)
 * - Fetching received comments
 * - Like back (creates instant match)
 * - Declining comments
 * - Marking as read
 */

import { get, post, put, del } from './client';
import {
  StoryComment,
  CreateStoryCommentRequest,
  SendStoryCommentResponse,
  ReceivedCommentsResponse,
  LikeBackResponse,
} from '@shared/types/storyComment';

// ============================================================================
// API Endpoints
// ============================================================================

const STORY_COMMENTS_ENDPOINTS = {
  BASE: '/api/story-comments',
  RECEIVED: '/api/story-comments/received',
  UNREAD_COUNT: '/api/story-comments/unread-count',
  READ_ALL: '/api/story-comments/read-all',
  LIKE_BACK: (commentId: number) => `/api/story-comments/${commentId}/like-back`,
  READ: (commentId: number) => `/api/story-comments/${commentId}/read`,
  DELETE: (commentId: number) => `/api/story-comments/${commentId}`,
} as const;

// ============================================================================
// Type Definitions - Backend DTOs
// ============================================================================

/**
 * Backend StoryCommentDTO structure
 */
interface BackendStoryCommentDTO {
  id: number;
  senderId: number;
  senderUsername: string;
  senderName: string;
  senderPhoto: string | null;
  senderAge: number | null;
  senderLocation: string | null;
  message: string;
  createdAt: string;
  isRead: boolean;
  status: 'PENDING' | 'LIKED_BACK' | 'DECLINED' | 'EXPIRED';
  linkedMatchId: number | null;
  expiresAt: string | null;
  // Conversation ID when matched (may be provided by backend)
  conversationId: number | null;
}

/**
 * Backend ReceivedCommentsResponse structure
 */
interface BackendReceivedCommentsResponse {
  comments: BackendStoryCommentDTO[];
  unreadCount: number;
  totalPendingCount: number;
}

/**
 * Backend SendStoryCommentResponse structure
 */
interface BackendSendStoryCommentResponse {
  success: boolean;
  message: string;
  commentId: number | null;
  swipeId: number | null;
}

/**
 * Backend LikeBackResponse structure
 */
interface BackendLikeBackResponse {
  success: boolean;
  message: string;
  isMatch: boolean;
  match: {
    id: number;
    matchedUserId: number;
    matchedUsername: string;
    matchedUserDisplayName: string | null;
    matchedUserProfilePhotoUrl: string | null;
    matchedUserAge: number | null;
    matchedUserLocation: string | null;
    matchedAt: string;
    conversationId: number | null;
  } | null;
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert backend DTO to frontend StoryComment
 */
const convertToStoryComment = (dto: BackendStoryCommentDTO): StoryComment => ({
  id: String(dto.id),
  senderId: String(dto.senderId),
  senderUsername: dto.senderUsername,
  senderName: dto.senderName,
  senderPhoto: dto.senderPhoto ?? undefined,
  senderAge: dto.senderAge ?? undefined,
  senderLocation: dto.senderLocation ?? undefined,
  message: dto.message,
  createdAt: dto.createdAt,
  isRead: dto.isRead,
  status: dto.status,
  linkedMatchId: dto.linkedMatchId ?? undefined,
  expiresAt: dto.expiresAt ?? undefined,
  // Map conversationId if backend provides it (for LIKED_BACK status)
  conversationId: dto.conversationId ? String(dto.conversationId) : undefined,
});

// ============================================================================
// API Functions
// ============================================================================

/**
 * Send a story comment to another user.
 * This automatically creates a RIGHT swipe from sender to recipient.
 */
export const sendStoryComment = async (
  request: CreateStoryCommentRequest
): Promise<SendStoryCommentResponse> => {
  try {
    const response = await post<BackendSendStoryCommentResponse>(
      STORY_COMMENTS_ENDPOINTS.BASE,
      {
        recipientId: Number(request.recipientId),
        message: request.message,
      }
    );
    return {
      success: response.success,
      message: response.message,
      commentId: response.commentId ?? undefined,
      swipeId: response.swipeId ?? undefined,
    };
  } catch (error) {
    console.warn('Send story comment error:', error);
    throw error;
  }
};

/**
 * Get all received comments for the current user.
 * Returns pending and liked_back comments.
 */
export const getReceivedComments = async (): Promise<ReceivedCommentsResponse> => {
  try {
    const response = await get<BackendReceivedCommentsResponse>(
      STORY_COMMENTS_ENDPOINTS.RECEIVED
    );
    return {
      comments: response.comments.map(convertToStoryComment),
      unreadCount: response.unreadCount,
      totalPendingCount: response.totalPendingCount,
    };
  } catch (error) {
    console.warn('Get received comments error:', error);
    throw error;
  }
};

/**
 * Like back a comment sender - creates an instant match.
 * Since the sender already swiped RIGHT, this creates a mutual match.
 */
export const likeBackComment = async (commentId: string): Promise<LikeBackResponse> => {
  try {
    const response = await post<BackendLikeBackResponse>(
      STORY_COMMENTS_ENDPOINTS.LIKE_BACK(Number(commentId))
    );
    return {
      success: response.success,
      message: response.message,
      isMatch: response.isMatch,
      match: response.match
        ? {
            id: response.match.id,
            matchedUserId: response.match.matchedUserId,
            matchedUsername: response.match.matchedUsername,
            matchedUserDisplayName: response.match.matchedUserDisplayName,
            matchedUserProfilePhotoUrl: response.match.matchedUserProfilePhotoUrl,
            matchedUserAge: response.match.matchedUserAge,
            matchedUserLocation: response.match.matchedUserLocation,
            matchedAt: response.match.matchedAt,
            conversationId: response.match.conversationId ?? undefined,
          }
        : undefined,
    };
  } catch (error) {
    console.warn('Like back comment error:', error);
    throw error;
  }
};

/**
 * Decline a comment (soft delete/hide).
 * The comment will no longer appear in the recipient's list.
 */
export const declineComment = async (
  commentId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await del<{ success: boolean; message: string }>(
      STORY_COMMENTS_ENDPOINTS.DELETE(Number(commentId))
    );
    return response;
  } catch (error) {
    console.warn('Decline comment error:', error);
    throw error;
  }
};

/**
 * Mark a comment as read.
 */
export const markCommentAsRead = async (
  commentId: string
): Promise<{ success: boolean }> => {
  try {
    const response = await put<{ success: boolean }>(
      STORY_COMMENTS_ENDPOINTS.READ(Number(commentId))
    );
    return response;
  } catch (error) {
    console.warn('Mark comment as read error:', error);
    throw error;
  }
};

/**
 * Mark all comments as read for the current user.
 */
export const markAllCommentsAsRead = async (): Promise<{ success: boolean; markedCount: number }> => {
  try {
    const response = await put<{ success: boolean; markedCount: number }>(
      STORY_COMMENTS_ENDPOINTS.READ_ALL
    );
    return response;
  } catch (error) {
    console.warn('Mark all comments as read error:', error);
    throw error;
  }
};

/**
 * Get the count of unread comments.
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const response = await get<{ unreadCount: number }>(
      STORY_COMMENTS_ENDPOINTS.UNREAD_COUNT
    );
    return response.unreadCount;
  } catch (error) {
    console.warn('Get unread count error:', error);
    throw error;
  }
};

// ============================================================================
// Export API Service Object
// ============================================================================

export const storyCommentsApi = {
  sendStoryComment,
  getReceivedComments,
  likeBackComment,
  declineComment,
  markCommentAsRead,
  markAllCommentsAsRead,
  getUnreadCount,
};

export default storyCommentsApi;
