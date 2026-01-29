/**
 * useConversations Hook
 * Fetches and manages conversation list with real-time updates
 *
 * Uses centralized presence store for accurate online status
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getConversations, ConversationDTO } from '@services/api/chatApi';
import { stompService } from '@services/websocket';
import { useAuthStore } from '@store/authStore';
import { usePresenceStore } from '@store/presenceStore';

export interface Conversation {
  id: string;
  odooConversationId: number;
  name: string;
  message: string;
  time: string;
  avatar: string;
  avatarUrl: string | null;
  online: boolean;
  unread: boolean;
  unreadCount: number;
  otherUserId: number;
  otherUsername: string;
  isVerified: boolean; // ID-verified user badge
  isTyping: boolean; // Real-time typing indicator
}

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Format relative time from date
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Convert backend DTO to frontend Conversation format
 */
function convertDTOToConversation(dto: ConversationDTO, currentUserId: number): Conversation {
  // Determine which user is "the other" user
  const isUser1 = dto.user1Id === currentUserId;
  const otherUserId = isUser1 ? dto.user2Id : dto.user1Id;
  const otherUsername = isUser1 ? dto.user2Username : dto.user1Username;
  const otherDisplayName = isUser1 ? dto.user2DisplayName : dto.user1DisplayName;
  const otherPhotoUrl = isUser1 ? dto.user2ProfilePhotoUrl : dto.user1ProfilePhotoUrl;

  // Format time
  const lastMessageDate = dto.lastMessageAt ? new Date(dto.lastMessageAt) : new Date(dto.createdAt);
  const timeStr = formatRelativeTime(lastMessageDate);

  // Get avatar initial
  const avatarInitial = otherDisplayName?.charAt(0).toUpperCase() || otherUsername?.charAt(0).toUpperCase() || '?';

  return {
    id: dto.id.toString(),
    odooConversationId: dto.id,
    name: otherDisplayName || otherUsername,
    message: dto.lastMessage || 'No messages yet',
    time: timeStr,
    avatar: avatarInitial,
    avatarUrl: otherPhotoUrl,
    online: false, // Will be updated by presence system
    unread: dto.unreadCount > 0,
    unreadCount: dto.unreadCount,
    otherUserId,
    otherUsername,
    isVerified: (dto as any).isOtherUserVerified ?? false, // Backend may not support yet
    isTyping: false, // Will be updated by typing indicator system
  };
}

export function useConversations(): UseConversationsReturn {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ? (typeof user.id === 'string' ? parseInt(user.id, 10) : user.id) : 0;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized presence store - this triggers re-renders when presence changes
  const { onlineUserIds, lastUpdated } = usePresenceStore();

  /**
   * Fetch conversations from API
   */
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getConversations();

      const converted = data
        .map((dto) => convertDTOToConversation(dto, currentUserId))
        // Filter out self-conversations (created before security fix)
        .filter((conv) => conv.otherUserId !== currentUserId);

      // Sort by most recent
      converted.sort((a, b) => {
        // Put unread first, then sort by time
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        return 0; // API already returns sorted
      });

      setConversations(converted);
    } catch (err) {
      console.warn('[useConversations] Error fetching:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /**
   * Listen for new messages to update conversation list
   */
  useEffect(() => {
    if (!user?.username) return;

    const unsubscribe = stompService.onMessage((message) => {
      // Update conversation with new message
      setConversations((prev) => {
        const updated = [...prev];
        const convIndex = updated.findIndex(
          (c) => c.odooConversationId.toString() === message.roomId
        );

        if (convIndex !== -1) {
          const conv = { ...updated[convIndex] };
          conv.message = message.text;
          conv.time = 'now';
          conv.unread = message.senderId !== currentUserId;
          if (conv.unread) {
            conv.unreadCount += 1;
          }

          // Move to top
          updated.splice(convIndex, 1);
          updated.unshift(conv);
        } else {
          // New conversation - refresh list
          fetchConversations();
        }

        return updated;
      });
    });

    return () => unsubscribe();
  }, [user?.username, currentUserId, fetchConversations]);

  /**
   * Listen for typing indicators to show "typing..." in conversation list
   */
  useEffect(() => {
    if (!user?.username) return;

    const unsubscribe = stompService.onTyping((event) => {
      setConversations((prev) => {
        const convIndex = prev.findIndex(
          (c) => c.odooConversationId.toString() === event.roomId
        );

        if (convIndex === -1) return prev;

        // Only update if the typing user is the OTHER user in the conversation
        const conv = prev[convIndex];
        if (event.userId === conv.otherUserId) {
          const updated = [...prev];
          updated[convIndex] = { ...conv, isTyping: event.isTyping };
          return updated;
        }

        return prev;
      });
    });

    return () => unsubscribe();
  }, [user?.username]);

  /**
   * Derive online status from centralized presence store
   * This effect runs whenever the presence store updates (lastUpdated changes)
   */
  useEffect(() => {
    if (conversations.length === 0) return;

    // Update conversations with current online status from store
    setConversations((prev) => {
      let hasChanges = false;
      const updated = prev.map((conv) => {
        const isOnline = onlineUserIds.has(conv.otherUserId);
        if (conv.online !== isOnline) {
          hasChanges = true;
          return { ...conv, online: isOnline };
        }
        return conv;
      });
      // Only return new array if there were changes
      return hasChanges ? updated : prev;
    });
  }, [onlineUserIds, lastUpdated]); // Re-run when presence store changes

  /**
   * Refresh when app comes to foreground
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchConversations();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [fetchConversations]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refresh,
  };
}

export default useConversations;
