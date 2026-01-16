/**
 * Story Comment type definitions
 * Used for the "Rewrite Their Story" feature where users can leave
 * thoughtful messages on someone's profile story before matching.
 */

/**
 * Story comment status enum
 */
export type StoryCommentStatus = 'PENDING' | 'LIKED_BACK' | 'DECLINED' | 'EXPIRED';

export interface StoryComment {
  id: string;
  senderId: string;
  senderUsername?: string;
  senderName: string;
  senderPhoto?: string;
  senderAge?: number;
  senderLocation?: string;
  recipientId?: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  hasReplied?: boolean;
  // Current status of the comment
  status: StoryCommentStatus;
  // Linked match ID when status is LIKED_BACK
  linkedMatchId?: number;
  // When the comment expires (for PENDING status)
  expiresAt?: string;
  // If replied, this links to the conversation
  conversationId?: string;
}

export interface StoryCommentSender {
  id: string;
  name: string;
  photo?: string;
  age?: number;
  location?: string;
}

// For creating a new story comment
export interface CreateStoryCommentRequest {
  recipientId: string;
  message: string;
}

// Response when sending a story comment
export interface SendStoryCommentResponse {
  success: boolean;
  message: string;
  commentId?: number;
  swipeId?: number;
}

// Response when fetching received story comments
export interface ReceivedCommentsResponse {
  comments: StoryComment[];
  unreadCount: number;
  totalPendingCount: number;
}

// Response when liking back a comment (creates instant match)
export interface LikeBackResponse {
  success: boolean;
  message: string;
  isMatch: boolean;
  match?: {
    id: number;
    matchedUserId: number;
    matchedUsername: string;
    matchedUserDisplayName: string | null;
    matchedUserProfilePhotoUrl: string | null;
    matchedUserAge: number | null;
    matchedUserLocation: string | null;
    matchedAt: string;
    conversationId?: number;
  };
}
