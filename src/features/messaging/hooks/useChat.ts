/**
 * useChat Hook
 * Real-time chat functionality with STOMP WebSocket + REST API for message history
 *
 * Uses centralized presence store for accurate online status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { stompService, ChatMessage, TypingIndicator } from '@services/websocket';
import { useAuthStore } from '@store/authStore';
import { usePresenceStore } from '@store/presenceStore';
import { getMessages, sendMessage as sendMessageApi, markConversationAsRead, startConversation, ChatMessageDTO } from '@services/api/chatApi';

export type MessageType = 'text' | 'call';
export type CallMessageType = 'missed' | 'declined' | 'completed' | 'cancelled';

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  // Call message fields
  type?: MessageType;
  callType?: 'AUDIO' | 'VIDEO';
  callDuration?: number; // Duration in seconds
  callStatus?: CallMessageType;
}

interface UseChatOptions {
  conversationId: string;
  otherUserId: number;
}

export interface SendCallMessageParams {
  callType: 'AUDIO' | 'VIDEO';
  callStatus: CallMessageType;
  duration?: number; // Duration in seconds (for completed calls)
  isOutgoing: boolean;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean; // ✅ Lazy loading: expose loading state for pagination indicator
  isConnected: boolean;
  isOtherUserTyping: boolean;
  isOtherUserOnline: boolean;
  sendMessage: (text: string) => void;
  sendCallMessage: (params: SendCallMessageParams) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  markAsRead: () => void;
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
}

export function useChat({
  conversationId,
  otherUserId,
}: UseChatOptions): UseChatReturn {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // ✅ Lazy loading: separate state for pagination
  const [isConnected, setIsConnected] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Use centralized presence store for accurate online status
  const { onlineUserIds } = usePresenceStore();
  const isOtherUserOnline = onlineUserIds.has(otherUserId);

  const roomIdRef = useRef<string>('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageRef = useRef(0);
  const resolvedConvIdRef = useRef<number | null>(null); // Store resolved conversation ID for dm_X_Y format

  // Generate room ID
  useEffect(() => {
    if (user?.id && otherUserId) {
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      roomIdRef.current = stompService.generateDMRoomId(userId, otherUserId);
    }
  }, [user?.id, otherUserId]);

  // Subscribe to chat room and handle messages
  useEffect(() => {
    if (!roomIdRef.current || !user?.id) return;

    const roomId = roomIdRef.current;
    // Parse user ID once for consistent comparisons (user.id is string, backend uses number)
    const currentUserId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    let isSubscribed = false;

    // Function to subscribe when connected
    const subscribeToRoom = () => {
      if (isSubscribed) return;
      try {
        stompService.subscribeToChatRoom(roomId);
        isSubscribed = true;
        console.log('[useChat] Subscribed to room:', roomId);
      } catch (error) {
        console.warn('[useChat] Failed to subscribe, will retry on connection:', error);
      }
    };

    // Handle incoming messages
    const unsubMessage = stompService.onMessage((chatMessage: ChatMessage) => {
      // Only process messages for this room
      if (chatMessage.roomId !== roomId) return;

      const isOwn = chatMessage.senderId === currentUserId;

      const newMessage: Message = {
        id: chatMessage.messageId,
        text: chatMessage.text,
        sender: isOwn ? 'me' : 'them',
        time: new Date(chatMessage.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        status: chatMessage.status,
        timestamp: chatMessage.timestamp,
      };

      setMessages((prev) => {
        // Check for exact ID duplicate (server re-broadcast)
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }

        // For our own messages: replace the optimistic message (temp-xxx) with the server version
        // This prevents duplicate messages when STOMP echoes back our sent message
        if (isOwn) {
          const optimisticIndex = prev.findIndex(
            (m) => m.id.startsWith('temp-') && m.text === newMessage.text && m.sender === 'me'
          );
          if (optimisticIndex !== -1) {
            // Replace optimistic message with server message (preserving position)
            const updated = [...prev];
            updated[optimisticIndex] = newMessage;
            return updated;
          }
        }

        return [...prev, newMessage];
      });

      // Mark as delivered if from other user
      if (!isOwn) {
        stompService.markMessageAsDelivered(chatMessage.messageId, roomId);
      }
    });

    // Handle typing indicators
    const unsubTyping = stompService.onTyping((typing: TypingIndicator) => {
      if (typing.roomId !== roomId || typing.userId === currentUserId) return;

      setIsOtherUserTyping(typing.isTyping);

      // Auto-clear typing indicator after 3 seconds
      if (typing.isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherUserTyping(false);
        }, 3000);
      }
    });

    // Handle connection status changes
    const unsubConnection = stompService.onConnectionChange((connected) => {
      setIsConnected(connected);
      // ✅ FIX: Reset isSubscribed on disconnect to allow re-subscription on reconnect
      if (!connected) {
        isSubscribed = false;
      }
      // Subscribe when connection is established
      if (connected && !isSubscribed) {
        subscribeToRoom();
      }
    });

    // Check initial connection status and subscribe if already connected
    const initialConnected = stompService.isConnectedToServer();
    setIsConnected(initialConnected);
    if (initialConnected) {
      subscribeToRoom();
    }

    // Load initial messages from API (doesn't require STOMP)
    loadInitialMessages();

    return () => {
      unsubMessage();
      unsubTyping();
      unsubConnection();
      if (isSubscribed) {
        stompService.unsubscribeFromChatRoom(roomId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user?.id, otherUserId]);

  // Presence is now handled by centralized presenceStore
  // isOtherUserOnline is derived directly from the store above

  // ✅ FIX: Subscribe to read receipts and delivery receipts to update message status
  useEffect(() => {
    if (!roomIdRef.current || !user?.id) return;

    const roomId = roomIdRef.current;
    const currentUserId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

    // Subscribe to read receipts callback
    const unsubReadReceipt = stompService.onReadReceipt?.((receipt) => {
      console.log('[useChat] Read receipt received:', receipt, 'current roomId:', roomId);

      // ✅ FIX: Match by roomId OR conversationId (backend may send either)
      const matchesRoom = receipt.roomId === roomId ||
                          receipt.roomId === conversationId ||
                          String(receipt.conversationId) === conversationId;

      if (!matchesRoom) {
        console.log('[useChat] Read receipt roomId mismatch, ignoring');
        return;
      }

      // Only update if someone else read our messages
      if (receipt.readBy !== currentUserId) {
        console.log('[useChat] Marking messages as read from read receipt');
        // Mark all our sent messages as 'read'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender === 'me' && msg.status !== 'read'
              ? { ...msg, status: 'read' }
              : msg
          )
        );
      }
    });

    // ✅ Subscribe to delivery receipts callback
    const unsubDeliveryReceipt = stompService.onDeliveryReceipt?.((receipt) => {
      if (receipt.roomId !== roomId) return;
      // Only update if someone else received our message
      if (receipt.deliveredTo !== currentUserId) {
        console.log('[useChat] Delivery receipt received for message:', receipt.messageId);
        // Mark the specific message as 'delivered'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === receipt.messageId && msg.sender === 'me' && msg.status === 'sent'
              ? { ...msg, status: 'delivered' }
              : msg
          )
        );
      }
    });

    return () => {
      unsubReadReceipt?.();
      unsubDeliveryReceipt?.();
    };
  }, [user?.id, conversationId]);

  // Heartbeat polling for real-time message sync (backup for WebSocket)
  useEffect(() => {
    const HEARTBEAT_INTERVAL = 2000; // 2 seconds - ✅ Faster for better real-time feel
    const PAGE_SIZE = 20; // ✅ Consistent with lazy loading page size

    const heartbeat = setInterval(async () => {
      const convId = resolvedConvIdRef.current;
      if (!convId) return;

      try {
        const apiMessages = await getMessages(convId, { page: 0, size: PAGE_SIZE });
        const convertedMessages = apiMessages
          .map((dto: ChatMessageDTO) => {
            const currentUserId = user?.id ? (typeof user.id === 'string' ? parseInt(user.id, 10) : user.id) : null;
            const isOwn = dto.senderId === currentUserId;
            return {
              id: dto.id.toString(),
              text: dto.content,
              sender: isOwn ? 'me' : 'them',
              time: new Date(dto.sentAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }),
              status: dto.status.toLowerCase() as Message['status'],
              timestamp: new Date(dto.sentAt).getTime(),
            } as Message;
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = convertedMessages.filter(m => !existingIds.has(m.id) && !m.id.startsWith('temp-'));
          if (newMessages.length === 0) return prev;
          return [...prev, ...newMessages].sort((a, b) => a.timestamp - b.timestamp);
        });
      } catch {
        // Silent fail - WebSocket is primary, this is backup
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeat);
  }, [user?.id]);

  /**
   * Convert API message DTO to local Message format
   */
  const convertDTOToMessage = useCallback((dto: ChatMessageDTO): Message => {
    const currentUserId = user?.id ? (typeof user.id === 'string' ? parseInt(user.id, 10) : user.id) : null;
    const isOwn = dto.senderId === currentUserId;
    return {
      id: dto.id.toString(),
      text: dto.content,
      sender: isOwn ? 'me' : 'them',
      time: new Date(dto.sentAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      status: dto.status.toLowerCase() as Message['status'],
      timestamp: new Date(dto.sentAt).getTime(),
    };
  }, [user?.id]);

  /**
   * Load initial messages from REST API
   */
  const loadInitialMessages = async () => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      let convId: number;

      // Check if conversationId is a room ID format (dm_X_Y or call_X_Y_xxx)
      if (conversationId.startsWith('dm_') || conversationId.startsWith('call_')) {
        // Room ID format - need to get actual conversation ID from API
        // Format is dm_X_Y where X and Y are user IDs
        console.log('[useChat] Room ID format detected, looking up conversation for otherUserId:', otherUserId);

        if (!otherUserId || otherUserId === 0) {
          console.warn('[useChat] Cannot load messages: otherUserId not available');
          setIsLoading(false);
          return;
        }

        try {
          // Use startConversation API to get or create the conversation
          const conversation = await startConversation(otherUserId);
          convId = conversation.id;
          resolvedConvIdRef.current = convId; // Store for pagination
          console.log('[useChat] Got conversation ID from API:', convId);
        } catch (lookupError) {
          console.warn('[useChat] Failed to lookup conversation:', lookupError);
          setIsLoading(false);
          return;
        }
      } else {
        convId = parseInt(conversationId, 10);
        if (isNaN(convId)) {
          console.warn('[useChat] Invalid conversation ID format:', conversationId);
          setMessages([]);
          return;
        }
        resolvedConvIdRef.current = convId; // Store for pagination
      }

      // ✅ Lazy loading: Start with only 20 messages for fast initial render
      const PAGE_SIZE = 20;
      const apiMessages = await getMessages(convId, { page: 0, size: PAGE_SIZE });

      // Convert and sort by timestamp (API returns newest first for pagination)
      const convertedMessages = apiMessages
        .map(convertDTOToMessage)
        .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first for display

      setMessages(convertedMessages);
      pageRef.current = 0;
      setHasMoreMessages(apiMessages.length >= PAGE_SIZE);
    } catch (error) {
      console.warn('[useChat] Error loading messages:', error);
      // Don't clear messages on error - keep any existing
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load more messages (pagination) - ✅ Lazy loading with proper loading state
   */
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    // Prevent concurrent loads and unnecessary API calls
    if (!hasMoreMessages || isLoading || isLoadingMore || !conversationId) return;

    // Use resolved conversation ID if available (handles dm_X_Y format)
    const convId = resolvedConvIdRef.current;
    if (!convId) {
      console.warn('[useChat] Cannot load more messages: no resolved conversation ID');
      return;
    }

    const PAGE_SIZE = 20; // ✅ Same page size as initial load
    setIsLoadingMore(true);

    try {
      const nextPage = pageRef.current + 1;
      const apiMessages = await getMessages(convId, { page: nextPage, size: PAGE_SIZE });

      if (apiMessages.length === 0) {
        setHasMoreMessages(false);
      } else {
        // Convert and prepend older messages
        const convertedMessages = apiMessages
          .map(convertDTOToMessage)
          .sort((a, b) => a.timestamp - b.timestamp);

        setMessages((prev) => {
          // Filter out any duplicates
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = convertedMessages.filter((m) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });

        pageRef.current = nextPage;
        setHasMoreMessages(apiMessages.length >= PAGE_SIZE);
      }
    } catch (error) {
      console.warn('[useChat] Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreMessages, isLoading, isLoadingMore, conversationId, convertDTOToMessage]);

  /**
   * Send a message - uses STOMP if connected, REST API as fallback
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user?.id) return;

      const tempId = `temp-${Date.now()}`;
      const timestamp = Date.now();
      const trimmedText = text.trim();

      // Optimistically add message
      const optimisticMessage: Message = {
        id: tempId,
        text: trimmedText,
        sender: 'me',
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'sending',
        timestamp,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Check if STOMP is connected
      const isStompConnected = stompService.isConnectedToServer();

      if (isStompConnected && roomIdRef.current) {
        // Send via STOMP (real-time)
        stompService.sendMessage(roomIdRef.current, trimmedText, otherUserId);

        // Update status to sent after a short delay
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
          );
        }, 500);

        // Invalidate matches query to update hasFirstMessage status
        // This stops the 24-hour expiration timer
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      } else {
        // ✅ FIX: Send via REST API when STOMP is disconnected
        // This ensures the message is saved to the database
        console.log('[useChat] STOMP disconnected, sending via REST API');
        try {
          const savedMessage = await sendMessageApi({
            receiverId: otherUserId,
            content: trimmedText,
          });

          // Replace optimistic message with real one from server
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    id: savedMessage.id.toString(),
                    text: savedMessage.content,
                    sender: 'me',
                    time: new Date(savedMessage.sentAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }),
                    status: savedMessage.status.toLowerCase() as Message['status'],
                    timestamp: new Date(savedMessage.sentAt).getTime(),
                  }
                : m
            )
          );

          // Invalidate matches query to update hasFirstMessage status
          // This stops the 24-hour expiration timer
          queryClient.invalidateQueries({ queryKey: ['matches'] });
        } catch (error) {
          console.warn('[useChat] Failed to send message via REST API:', error);
          // Mark message as failed so user can see and retry
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, status: 'failed' as const } : m
            )
          );
        }
      }
    },
    [otherUserId, user?.id, queryClient]
  );

  /**
   * Send a call event message to the chat
   * This creates a special message that displays call history in the chat
   */
  const sendCallMessage = useCallback(
    (params: SendCallMessageParams) => {
      const { callType, callStatus, duration, isOutgoing } = params;

      // Generate call message text based on status
      let text = '';
      const callTypeLabel = callType === 'VIDEO' ? 'Video call' : 'Voice call';

      switch (callStatus) {
        case 'completed':
          const mins = Math.floor((duration || 0) / 60);
          const secs = (duration || 0) % 60;
          const durationStr = mins > 0
            ? `${mins}m ${secs}s`
            : `${secs}s`;
          text = `${callTypeLabel} - ${durationStr}`;
          break;
        case 'missed':
          text = isOutgoing ? `${callTypeLabel} - No answer` : `Missed ${callTypeLabel.toLowerCase()}`;
          break;
        case 'declined':
          text = isOutgoing ? `${callTypeLabel} - Declined` : `${callTypeLabel} - Declined`;
          break;
        case 'cancelled':
          text = `${callTypeLabel} - Cancelled`;
          break;
        default:
          text = callTypeLabel;
      }

      const timestamp = Date.now();
      const callMessage: Message = {
        id: `call-${timestamp}`,
        text,
        sender: isOutgoing ? 'me' : 'them',
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'sent',
        timestamp,
        type: 'call',
        callType,
        callDuration: duration,
        callStatus,
      };

      // Add to local messages
      setMessages((prev) => [...prev, callMessage]);

      // Also send as a text message so it persists in chat history
      // The message content includes a special prefix so it can be identified
      const persistentMessage = `📞 ${text}`;

      if (stompService.isConnectedToServer() && roomIdRef.current) {
        stompService.sendMessage(roomIdRef.current, persistentMessage, otherUserId);
      } else {
        // Fallback to REST API
        sendMessageApi({
          receiverId: otherUserId,
          content: persistentMessage,
        }).catch((error) => {
          console.warn('[useChat] Failed to persist call message:', error);
        });
      }
    },
    [otherUserId]
  );

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!roomIdRef.current) return;
      stompService.sendTypingIndicator(roomIdRef.current, conversationId, isTyping);
    },
    [conversationId]
  );

  /**
   * Mark messages as read - uses STOMP if connected, REST API as fallback
   * ✅ FIX: Include roomId for proper read receipt broadcasting
   * ✅ FIX: Use resolved numeric conversation ID for backend (avoids dm_X_Y format error)
   */
  const markAsRead = useCallback(async () => {
    if (!conversationId) return;

    // Use resolved conversation ID if available (handles dm_X_Y format)
    // Backend expects a numeric Long, not a string like "dm_6_9"
    const resolvedId = resolvedConvIdRef.current;
    const isRoomIdFormat = conversationId.startsWith('dm_') || conversationId.startsWith('call_');

    // Get numeric ID: prefer resolved ID, then try parsing conversationId
    const convId = resolvedId ?? (isRoomIdFormat ? NaN : parseInt(conversationId, 10));
    if (isNaN(convId)) {
      // No valid numeric ID yet - skip marking as read
      // This will resolve once loadInitialMessages completes
      console.log('[useChat] Skipping markAsRead: no resolved conversation ID yet');
      return;
    }

    // Try STOMP first if connected - send numeric ID, not dm_ format
    if (stompService.isConnectedToServer()) {
      // ✅ FIX: Send numeric conversationId (backend expects Long), plus roomId for broadcast
      stompService.markMessagesAsRead(String(convId), roomIdRef.current);
    } else {
      // Fallback to REST API
      try {
        await markConversationAsRead(convId);
      } catch (error) {
        console.warn('[useChat] Failed to mark as read via REST API:', error);
      }
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isLoadingMore, // ✅ Lazy loading: expose for pagination indicator
    isConnected,
    isOtherUserTyping,
    isOtherUserOnline,
    sendMessage,
    sendCallMessage,
    sendTypingIndicator,
    markAsRead,
    loadMoreMessages,
    hasMoreMessages,
  };
}

export default useChat;
