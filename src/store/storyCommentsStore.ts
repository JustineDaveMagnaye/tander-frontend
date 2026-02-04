/**
 * TANDER Story Comments Store
 * Zustand store for managing "Rewrite Their Story" comments
 *
 * This handles comments that users leave on others' profiles/stories
 * before starting a conversation.
 */

import { create } from 'zustand';
import { StoryComment, LikeBackResponse } from '@shared/types';
import { storyCommentsApi } from '@services/api/storyCommentsApi';

interface StoryCommentsState {
  // Comments received by the current user
  receivedComments: StoryComment[];

  // Comments sent by the current user (for tracking)
  sentComments: StoryComment[];

  // Unread count for badge display
  unreadCount: number;

  // Total pending comments count
  totalPendingCount: number;

  // Loading state
  isLoading: boolean;

  // Sending comment state
  isSending: boolean;

  // Last fetch timestamp
  lastFetched: number;

  // Error state
  error: string | null;
}

interface StoryCommentsActions {
  // Fetch received comments from API
  fetchReceivedComments: () => Promise<void>;

  // Send a story comment (calls API and auto swipes right)
  sendComment: (recipientId: string, message: string) => Promise<{ success: boolean; message: string }>;

  // Like back a comment (creates instant match)
  likeBack: (commentId: string) => Promise<LikeBackResponse>;

  // Decline a comment
  declineComment: (commentId: string) => Promise<boolean>;

  // Set received comments (from API)
  setReceivedComments: (comments: StoryComment[]) => void;

  // Add a new received comment (real-time)
  addReceivedComment: (comment: StoryComment) => void;

  // Add a sent comment
  addSentComment: (comment: StoryComment) => void;

  // Update comment status locally (and optionally set match/conversation IDs)
  updateCommentStatus: (commentId: string, status: StoryComment['status'], linkedMatchId?: number, conversationId?: string) => void;

  // Mark a comment as read (calls API)
  markAsRead: (commentId: string) => Promise<void>;

  // Mark all as read (calls API)
  markAllAsRead: () => Promise<void>;

  // Mark a comment as replied (and set conversation ID)
  markAsReplied: (commentId: string, conversationId: string) => void;

  // Get unread comments
  getUnreadComments: () => StoryComment[];

  // Get pending comments only
  getPendingComments: () => StoryComment[];

  // Set loading state
  setLoading: (loading: boolean) => void;

  // Set error state
  setError: (error: string | null) => void;

  // Clear all data (on logout)
  clear: () => void;
}

type StoryCommentsStore = StoryCommentsState & StoryCommentsActions;

export const useStoryCommentsStore = create<StoryCommentsStore>((set, get) => ({
  // Initial state
  receivedComments: [],
  sentComments: [],
  unreadCount: 0,
  totalPendingCount: 0,
  isLoading: false,
  isSending: false,
  lastFetched: 0,
  error: null,

  // Actions

  fetchReceivedComments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await storyCommentsApi.getReceivedComments();
      set({
        receivedComments: response.comments,
        unreadCount: response.unreadCount,
        totalPendingCount: response.totalPendingCount,
        lastFetched: Date.now(),
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch comments';
      set({ error: message, isLoading: false });
      console.warn('Failed to fetch received comments:', error);
    }
  },

  sendComment: async (recipientId: string, message: string) => {
    set({ isSending: true, error: null });
    try {
      const response = await storyCommentsApi.sendStoryComment({
        recipientId,
        message,
      });
      set({ isSending: false });

      if (response.success) {
        // Add to sent comments for local tracking
        const newComment: StoryComment = {
          id: String(response.commentId),
          senderId: '', // Will be filled by backend
          senderName: '', // Current user
          message,
          createdAt: new Date().toISOString(),
          isRead: true,
          status: 'PENDING',
        };
        get().addSentComment(newComment);
      }

      return { success: response.success, message: response.message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send comment';
      set({ error: message, isSending: false });
      console.warn('Failed to send comment:', error);
      return { success: false, message };
    }
  },

  likeBack: async (commentId: string) => {
    try {
      const response = await storyCommentsApi.likeBackComment(commentId);

      if (response.success && response.isMatch) {
        // Update comment status locally with match ID and conversation ID
        const conversationId = response.match?.conversationId
          ? String(response.match.conversationId)
          : undefined;
        get().updateCommentStatus(commentId, 'LIKED_BACK', response.match?.id, conversationId);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to like back';
      console.warn('Failed to like back:', error);
      return {
        success: false,
        message,
        isMatch: false,
      };
    }
  },

  declineComment: async (commentId: string) => {
    try {
      const response = await storyCommentsApi.declineComment(commentId);

      if (response.success) {
        // Remove comment from list locally
        set((state) => ({
          receivedComments: state.receivedComments.filter((c) => c.id !== commentId),
          totalPendingCount: Math.max(0, state.totalPendingCount - 1),
        }));
      }

      return response.success;
    } catch (error) {
      console.warn('Failed to decline comment:', error);
      return false;
    }
  },

  setReceivedComments: (comments: StoryComment[]) => {
    const unreadCount = comments.filter((c) => !c.isRead).length;
    const totalPendingCount = comments.filter((c) => c.status === 'PENDING').length;
    set({
      receivedComments: comments,
      unreadCount,
      totalPendingCount,
      lastFetched: Date.now(),
    });
  },

  addReceivedComment: (comment: StoryComment) => {
    set((state) => ({
      receivedComments: [comment, ...state.receivedComments],
      unreadCount: state.unreadCount + (comment.isRead ? 0 : 1),
      totalPendingCount: state.totalPendingCount + (comment.status === 'PENDING' ? 1 : 0),
    }));
  },

  addSentComment: (comment: StoryComment) => {
    set((state) => ({
      sentComments: [comment, ...state.sentComments],
    }));
  },

  updateCommentStatus: (commentId: string, status: StoryComment['status'], linkedMatchId?: number, conversationId?: string) => {
    set((state) => {
      const updatedComments = state.receivedComments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              status,
              linkedMatchId: linkedMatchId ?? c.linkedMatchId,
              conversationId: conversationId ?? c.conversationId,
            }
          : c
      );
      const totalPendingCount = updatedComments.filter((c) => c.status === 'PENDING').length;
      return {
        receivedComments: updatedComments,
        totalPendingCount,
      };
    });
  },

  markAsRead: async (commentId: string) => {
    // Optimistic update
    set((state) => {
      const updatedComments = state.receivedComments.map((c) =>
        c.id === commentId ? { ...c, isRead: true } : c
      );
      const unreadCount = updatedComments.filter((c) => !c.isRead).length;
      return {
        receivedComments: updatedComments,
        unreadCount,
      };
    });

    try {
      await storyCommentsApi.markCommentAsRead(commentId);
    } catch (error) {
      console.warn('Failed to mark comment as read:', error);
      // Revert on error - refetch
      get().fetchReceivedComments();
    }
  },

  markAllAsRead: async () => {
    // Optimistic update
    set((state) => ({
      receivedComments: state.receivedComments.map((c) => ({ ...c, isRead: true })),
      unreadCount: 0,
    }));

    try {
      await storyCommentsApi.markAllCommentsAsRead();
    } catch (error) {
      console.warn('Failed to mark all comments as read:', error);
      // Revert on error - refetch
      get().fetchReceivedComments();
    }
  },

  markAsReplied: (commentId: string, conversationId: string) => {
    set((state) => ({
      receivedComments: state.receivedComments.map((c) =>
        c.id === commentId ? { ...c, hasReplied: true, conversationId, isRead: true } : c
      ),
    }));
  },

  getUnreadComments: () => {
    return get().receivedComments.filter((c) => !c.isRead);
  },

  getPendingComments: () => {
    return get().receivedComments.filter((c) => c.status === 'PENDING');
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clear: () => {
    set({
      receivedComments: [],
      sentComments: [],
      unreadCount: 0,
      totalPendingCount: 0,
      isLoading: false,
      isSending: false,
      lastFetched: 0,
      error: null,
    });
  },
}));

// Selector hooks for optimized re-renders
export const selectUnreadCount = (state: StoryCommentsStore) => state.unreadCount;
export const selectReceivedComments = (state: StoryCommentsStore) => state.receivedComments;
export const selectPendingComments = (state: StoryCommentsStore) =>
  state.receivedComments.filter((c) => c.status === 'PENDING');
export const selectIsLoading = (state: StoryCommentsStore) => state.isLoading;
export const selectIsSending = (state: StoryCommentsStore) => state.isSending;
export const selectHasUnread = (state: StoryCommentsStore) => state.unreadCount > 0;
export const selectTotalPendingCount = (state: StoryCommentsStore) => state.totalPendingCount;
export const selectError = (state: StoryCommentsStore) => state.error;

export default useStoryCommentsStore;
