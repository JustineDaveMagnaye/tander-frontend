/**
 * TANDER STOMP WebSocket Service
 * Handles real-time communication with Azure App Service backend
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import tokenStorage from '../storage/tokenStorage';

// Types
export interface StompConfig {
  baseUrl: string;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
  debug?: boolean;
}

export interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface TypingIndicator {
  roomId: string;
  conversationId: string;
  userId: number;
  username: string;
  isTyping: boolean;
  timestamp: number;
}

export interface CallEvent {
  type: 'incoming' | 'answered' | 'rejected' | 'ended' | 'error';
  roomId: string;
  callerId?: number;
  callerUsername?: string;
  callerName?: string;
  callerPhoto?: string;
  callType?: 'voice' | 'video';
  reason?: string;
  timestamp: number;
}

// WebRTC Signaling types
export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'error';
  roomName: string;
  fromUserId: number;
  fromUsername: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  reason?: string;
  error?: string;
  timestamp: number;
  callSessionId?: number; // REL-008: For signal deduplication across sessions
}

type MessageCallback = (message: ChatMessage) => void;
type TypingCallback = (typing: TypingIndicator) => void;
type CallCallback = (event: CallEvent) => void;
type ConnectionCallback = (connected: boolean) => void;
type PresenceCallback = (data: {
  userId: number;
  isOnline: boolean;
  lastSeen?: number;
  lastActive?: number;
  presenceStatus?: 'online' | 'recently_active' | 'offline';
}) => void;
// Type for the online users list data
interface OnlineUsersList {
  userIds: number[];
  count: number;
  timestamp: number;
}
type OnlineUsersListCallback = (data: OnlineUsersList) => void;
type ReadReceiptCallback = (receipt: { roomId: string; conversationId: number; readBy: number; timestamp: number }) => void;
type DeliveryReceiptCallback = (receipt: { roomId: string; messageId: string; deliveredTo: number; timestamp: number }) => void;
type WebRTCSignalCallback = (signal: WebRTCSignal) => void;

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

class StompService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private config: StompConfig | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  // ✅ PREMIUM: Removed max reconnect limit - keep trying forever with exponential backoff
  // private maxReconnectAttempts: number = 10;

  // QA-003: Exponential backoff for reconnection
  private readonly BASE_RECONNECT_DELAY = 1000; // Start at 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // Max 30 seconds

  // ✅ PREMIUM: Connection state for UI feedback
  private _connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private connectionStateCallbacks: Set<(state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void> = new Set();

  // ✅ FIX: Debounce connection state changes to prevent UI spam during rapid reconnection attempts
  private connectionStateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly CONNECTION_STATE_DEBOUNCE_MS = 500; // Wait 500ms before notifying state change

  // ✅ PREMIUM: Heartbeat watchdog for silent disconnect detection
  private lastHeartbeatReceived: number = 0;
  private heartbeatWatchdogId: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_WATCHDOG_INTERVAL = 10000; // Check every 10 seconds
  private readonly HEARTBEAT_TIMEOUT = 35000; // 35 seconds (server sends every 30s)

  // Callbacks
  private messageCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private callCallbacks: Set<CallCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private presenceCallbacks: Set<PresenceCallback> = new Set();
  private onlineUsersListCallbacks: Set<OnlineUsersListCallback> = new Set();
  private readReceiptCallbacks: Set<ReadReceiptCallback> = new Set();
  private deliveryReceiptCallbacks: Set<DeliveryReceiptCallback> = new Set();
  // ✅ FIX: Changed to Map with named keys to prevent duplicate callbacks from same source
  private webrtcCallbacks: Map<string, WebRTCSignalCallback> = new Map();
  private webrtcCallbackIdCounter: number = 0;

  // Current user info
  private currentUserId: number | null = null;
  private currentUsername: string | null = null;

  // ✅ FIX: Offline message queue
  // R4-001: Added max queue size limit to prevent memory issues
  private offlineMessageQueue: Array<{ roomId: string; text: string; receiverId: number }> = [];
  private readonly MAX_OFFLINE_QUEUE_SIZE = 50; // R4-001: Maximum queued messages

  // Application-level heartbeat interval
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

  // ✅ FIX: Cache the online users list so late-registering callbacks get it
  private cachedOnlineUsersList: OnlineUsersList | null = null;

  // ✅ FIX: Queue pending WebRTC signals for late-registering callbacks
  // Signals arrive before TwilioVideoService registers its callback (when user accepts call)
  private pendingWebRTCSignals: Array<{ signal: WebRTCSignal; timestamp: number }> = [];
  private readonly WEBRTC_SIGNAL_QUEUE_TTL = 60000; // 60 seconds TTL for queued signals

  // ✅ FIX: Deduplication for delivery receipts - prevents sending multiple receipts for same message
  private recentlyDeliveredMessageIds: Set<string> = new Set();
  private readonly DELIVERED_MESSAGE_CACHE_TTL = 30000; // 30 seconds
  private deliveredMessageCleanupTimer: ReturnType<typeof setInterval> | null = null;

  // ✅ FIX: Deduplication for outgoing messages - prevents sending duplicates when multiple callbacks trigger
  private recentlySentMessages: Map<string, number> = new Map(); // key -> timestamp
  private readonly SENT_MESSAGE_DEDUP_WINDOW = 2000; // 2 second window for duplicate detection

  // ✅ FIX: Deduplication for WebRTC hangup signals - prevents sending multiple hangups for same call
  private recentHangupRooms: Map<string, number> = new Map(); // roomName -> timestamp
  private readonly HANGUP_DEDUP_WINDOW = 5000; // 5 second window for duplicate detection

  /**
   * Initialize the STOMP service with configuration
   */
  initialize(config: StompConfig): void {
    this.config = {
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: __DEV__,
      ...config,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(userId: number, username: string): Promise<boolean> {
    if (!this.config) {
      console.warn('[StompService] Service not initialized. Call initialize() first.');
      return false;
    }

    this.currentUserId = userId;
    this.currentUsername = username;

    const token = await tokenStorage.getToken();
    if (!token) {
      console.warn('[StompService] No auth token available');
      return false;
    }

    return new Promise((resolve) => {
      // Build SockJS URL for Azure App Service (better proxy compatibility)
      const sockJsUrl = `${this.config!.baseUrl}/ws-sockjs`;

      if (this.config!.debug) {
        console.log('[StompService] Connecting via SockJS to:', sockJsUrl);
      }

      // QA-003: Calculate exponential backoff delay
      const calculateReconnectDelay = () => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
        const delay = Math.min(
          this.BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
          this.MAX_RECONNECT_DELAY
        );
        return delay;
      };

      this.client = new Client({
        // Use SockJS factory for better Azure App Service compatibility
        webSocketFactory: () => new SockJS(sockJsUrl) as WebSocket,

        connectHeaders: {
          Authorization: `Bearer ${token}`,
          'X-User-Id': userId.toString(),
          'X-Username': username,
        },

        // QA-003: Use exponential backoff for reconnection
        reconnectDelay: calculateReconnectDelay(),
        heartbeatIncoming: this.config!.heartbeatIncoming,
        heartbeatOutgoing: this.config!.heartbeatOutgoing,

        debug: (str) => {
          if (this.config!.debug) {
            console.log('[STOMP]', str);
          }
        },

        onConnect: () => {
          console.log('[StompService] Connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.setConnectionState('connected'); // ✅ PREMIUM: Update connection state
          this.setupUserSubscriptions();
          this.startHeartbeat(); // Start application-level heartbeat
          this.startHeartbeatWatchdog(); // ✅ PREMIUM: Start watchdog for silent disconnects
          this.flushOfflineMessageQueue(); // ✅ FIX: Send queued messages on reconnect
          this.notifyConnectionChange(true);
          resolve(true);
        },

        onDisconnect: () => {
          console.log('[StompService] Disconnected');
          this.stopHeartbeat(); // R7-008: Stop heartbeat to prevent orphaned intervals
          this.stopHeartbeatWatchdog(); // ✅ PREMIUM: Stop watchdog
          this.isConnected = false;
          this.setConnectionState('disconnected'); // ✅ PREMIUM: Update connection state
          this.notifyConnectionChange(false);
        },

        onStompError: (frame) => {
          console.warn('[StompService] STOMP error:', frame.headers['message']);
          this.isConnected = false;
          this.notifyConnectionChange(false);
          resolve(false);
        },

        onWebSocketError: (_event) => {
          // Use warn instead of error to avoid red screen in dev mode
          console.warn('[StompService] WebSocket connection failed - backend may be offline');
          this.reconnectAttempts++;
          // ✅ PREMIUM: Update connection state for UI
          this.setConnectionState('reconnecting');
          // QA-003: Log exponential backoff delay
          const nextDelay = Math.min(
            this.BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
            this.MAX_RECONNECT_DELAY
          );
          // ✅ PREMIUM: Removed max attempts limit - keep reconnecting forever
          console.log(`[StompService] Reconnect attempt ${this.reconnectAttempts}, next delay: ${nextDelay}ms`);
        },
      });

      this.client.activate();
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    // Stop heartbeat first
    this.stopHeartbeat();

    // ✅ FIX: Stop connection state debounce timer
    if (this.connectionStateDebounceTimer) {
      clearTimeout(this.connectionStateDebounceTimer);
      this.connectionStateDebounceTimer = null;
    }

    // ✅ FIX: Stop delivery receipt cleanup timer
    if (this.deliveredMessageCleanupTimer) {
      clearInterval(this.deliveredMessageCleanupTimer);
      this.deliveredMessageCleanupTimer = null;
    }
    this.recentlyDeliveredMessageIds.clear();
    this.recentlySentMessages.clear();
    this.recentHangupRooms.clear();

    if (this.client) {
      // Unsubscribe from all subscriptions
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();

      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      // ✅ FIX: Clear cached online users list on disconnect
      this.cachedOnlineUsersList = null;
      this.notifyConnectionChange(false);
      console.log('[StompService] Disconnected and cleaned up');
    }
  }

  /**
   * Check if connected - uses both internal flag and client's actual connection state
   */
  isConnectedToServer(): boolean {
    // Check both the internal flag and the client's actual connected state
    return this.isConnected && this.client?.connected === true;
  }

  /**
   * Internal check for connection - uses actual client state
   */
  private get connected(): boolean {
    return this.client?.connected === true;
  }

  /**
   * Setup user-specific subscriptions
   */
  private setupUserSubscriptions(): void {
    if (!this.client || !this.currentUsername) return;

    console.log('[StompService] 🔔 Setting up subscriptions for username:', this.currentUsername, 'userId:', this.currentUserId);
    console.log('[StompService] 🔔 Will subscribe to:');
    console.log('[StompService] 🔔   - /user/' + this.currentUsername + '/queue/messages');
    console.log('[StompService] 🔔   - /user/' + this.currentUsername + '/queue/calls');
    console.log('[StompService] 🔔   - /topic/calls.' + this.currentUsername);

    // Subscribe to personal message queue
    this.subscribe(
      `/user/${this.currentUsername}/queue/messages`,
      (message) => {
        const data = JSON.parse(message.body) as ChatMessage;
        this.messageCallbacks.forEach((cb) => cb(data));
      },
      'user-messages'
    );

    // Subscribe to incoming calls (user queue - legacy)
    this.subscribe(
      `/user/${this.currentUsername}/queue/calls`,
      (message) => {
        console.log('[StompService] 📞 INCOMING CALL received (user queue):', message.body);
        const data = JSON.parse(message.body);
        const callEvent: CallEvent = {
          type: 'incoming',
          roomId: data.roomId,
          callerId: data.callerId,
          callerUsername: data.callerUsername,
          callerName: data.callerName,
          callerPhoto: data.callerPhoto || data.callerProfilePhoto,
          callType: data.callType,
          timestamp: data.timestamp,
        };
        console.log('[StompService] 📞 Parsed call event:', callEvent);
        console.log('[StompService] 📞 Number of call callbacks:', this.callCallbacks.size);
        this.callCallbacks.forEach((cb) => cb(callEvent));
      },
      'user-calls'
    );

    // Subscribe to call events (direct topic - more reliable)
    // Handles: incoming_call, call_answered, call_declined
    this.subscribe(
      `/topic/calls.${this.currentUsername}`,
      (message) => {
        console.log('[StompService] 📞 Call event received (topic):', message.body);
        const data = JSON.parse(message.body);

        // Map backend event types to frontend CallEvent types
        let eventType: CallEvent['type'] = 'incoming';
        if (data.type === 'incoming_call') {
          eventType = 'incoming';
        } else if (data.type === 'call_answered') {
          eventType = 'answered';
        } else if (data.type === 'call_declined') {
          eventType = 'rejected';
        } else if (data.type === 'call_ended') {
          eventType = 'ended';
        } else if (data.type) {
          eventType = data.type;
        }

        const callEvent: CallEvent = {
          type: eventType,
          roomId: data.roomId || data.roomName,
          callerId: data.callerId || data.answeredBy || data.declinedBy,
          callerUsername: data.callerUsername || data.answeredByUsername || data.declinedByUsername,
          callerName: data.callerName || data.answeredByName || data.declinedByName,
          callerPhoto: data.callerPhoto || data.callerProfilePhoto,
          callType: data.callType,
          reason: data.reason,
          timestamp: data.timestamp,
        };
        console.log('[StompService] 📞 Parsed call event:', callEvent);
        console.log('[StompService] 📞 Triggering call callbacks');
        this.callCallbacks.forEach((cb) => cb(callEvent));
      },
      'topic-calls'
    );

    // Subscribe to call status updates
    this.subscribe(
      `/user/${this.currentUsername}/queue/call-status`,
      (message) => {
        const data = JSON.parse(message.body);
        const callEvent: CallEvent = {
          type: data.type || data.status,
          roomId: data.roomId,
          timestamp: data.timestamp || Date.now(),
        };
        this.callCallbacks.forEach((cb) => cb(callEvent));
      },
      'user-call-status'
    );

    // Subscribe to call errors
    this.subscribe(
      `/user/${this.currentUsername}/queue/call-error`,
      (message) => {
        const data = JSON.parse(message.body);
        const callEvent: CallEvent = {
          type: 'error',
          roomId: '',
          reason: data.error,
          timestamp: data.timestamp,
        };
        this.callCallbacks.forEach((cb) => cb(callEvent));
      },
      'user-call-error'
    );

    // Subscribe to presence updates
    this.subscribe(
      `/user/${this.currentUsername}/queue/presence`,
      (message) => {
        const data = JSON.parse(message.body);
        this.presenceCallbacks.forEach((cb) => cb(data));
      },
      'user-presence'
    );

    // Subscribe to read receipts (user queue)
    this.subscribe(
      `/user/${this.currentUsername}/queue/read-receipts`,
      (message) => {
        const data = JSON.parse(message.body);
        console.log('[StompService] Read receipt (user queue):', data);
        // ✅ FIX: Actually notify callbacks about read receipt!
        this.notifyReadReceipt({
          roomId: data.roomId || data.roomName || '',
          conversationId: data.conversationId,
          readBy: data.readBy || data.userId,
          timestamp: data.timestamp || Date.now(),
        });
      },
      'user-read-receipts'
    );

    // Subscribe to global presence topic (broadcasts when users go online/offline)
    this.subscribe(
      '/topic/presence',
      (message) => {
        const data = JSON.parse(message.body);
        // Convert to presence callback format
        const presenceUpdate = {
          userId: data.userId,
          isOnline: data.type === 'online',
          lastSeen: data.lastSeen,
          presenceStatus: data.type === 'online' ? 'online' as const : 'offline' as const,
        };

        // ✅ FIX: Update cached online users list when presence changes
        if (this.cachedOnlineUsersList) {
          const userIds = new Set(this.cachedOnlineUsersList.userIds);
          if (data.type === 'online') {
            userIds.add(data.userId);
          } else {
            userIds.delete(data.userId);
          }
          this.cachedOnlineUsersList = {
            ...this.cachedOnlineUsersList,
            userIds: Array.from(userIds),
            count: userIds.size,
            timestamp: Date.now(),
          };
        }

        this.presenceCallbacks.forEach((cb) => cb(presenceUpdate));
      },
      'global-presence'
    );

    // Subscribe to initial online users list (sent when user connects)
    this.subscribe(
      `/user/${this.currentUsername}/queue/online-users`,
      (message) => {
        const data = JSON.parse(message.body);
        console.log('[StompService] Received online users list:', data);
        if (data.type === 'online_users_list' && Array.isArray(data.userIds)) {
          const onlineUsersList: OnlineUsersList = {
            userIds: data.userIds,
            count: data.count || data.userIds.length,
            timestamp: data.timestamp || Date.now(),
          };
          // ✅ FIX: Cache the list for late-registering callbacks
          this.cachedOnlineUsersList = onlineUsersList;
          this.onlineUsersListCallbacks.forEach((cb) => cb(onlineUsersList));
        }
      },
      'user-online-users-list'
    );

    // Subscribe to WebRTC signaling messages (user queue)
    this.subscribe(
      `/user/${this.currentUsername}/queue/webrtc`,
      (message) => {
        console.log('[StompService] 📡 WebRTC signal received (queue):', message.body);
        const data = JSON.parse(message.body);
        const signal: WebRTCSignal = {
          type: data.type,
          roomName: data.roomName,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          sdp: data.sdp,
          candidate: data.candidate,
          reason: data.reason,
          error: data.error,
          timestamp: data.timestamp,
        };
        this.handleWebRTCSignal(signal);
      },
      'user-webrtc'
    );

    // Subscribe to WebRTC signaling messages (topic - more reliable)
    this.subscribe(
      `/topic/webrtc.${this.currentUsername}`,
      (message) => {
        console.log('[StompService] 📡 WebRTC signal received (topic):', message.body);
        const data = JSON.parse(message.body);
        const signal: WebRTCSignal = {
          type: data.type,
          roomName: data.roomName,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          sdp: data.sdp,
          candidate: data.candidate,
          reason: data.reason,
          error: data.error,
          timestamp: data.timestamp,
        };
        this.handleWebRTCSignal(signal);
      },
      'topic-webrtc'
    );

    // ✅ FIX: Request online users list AFTER subscriptions are set up
    // Delay to ensure server has processed all subscription requests
    // Also retry a few times in case of timing issues
    this.requestOnlineUsersListWithRetry();
  }

  /**
   * Request online users list with retry logic for reliability.
   */
  private requestOnlineUsersListWithRetry(): void {
    const delays = [300, 1000, 3000]; // Retry at 300ms, 1s, 3s

    delays.forEach((delay, index) => {
      setTimeout(() => {
        // Only request if we haven't received the list yet
        if (!this.cachedOnlineUsersList && this.connected) {
          console.log(`[StompService] Requesting online users list (attempt ${index + 1})`);
          this.requestOnlineUsersList();
        }
      }, delay);
    });
  }

  /**
   * Request the list of all online users from the server.
   * Called after subscriptions are set up to fix timing race condition.
   */
  requestOnlineUsersList(): void {
    if (!this.client?.connected) {
      console.warn('[StompService] Cannot request online users list: not connected');
      return;
    }

    console.log('[StompService] Requesting online users list');
    this.client.publish({
      destination: '/app/presence.getOnlineUsers',
      body: '{}', // Empty JSON object - endpoint doesn't require payload
    });
  }

  /**
   * Subscribe to a chat room
   */
  subscribeToChatRoom(roomId: string): void {
    if (!this.client) return;

    const subKey = `chat-${roomId}`;
    if (this.subscriptions.has(subKey)) return;

    // Subscribe to room messages
    this.subscribe(
      `/topic/chat/${roomId}`,
      (message) => {
        const data = JSON.parse(message.body) as ChatMessage;
        this.messageCallbacks.forEach((cb) => cb(data));
      },
      subKey
    );

    // Subscribe to typing indicators
    this.subscribe(
      `/topic/chat/${roomId}/typing`,
      (message) => {
        const data = JSON.parse(message.body) as TypingIndicator;
        this.typingCallbacks.forEach((cb) => cb(data));
      },
      `${subKey}-typing`
    );

    // Subscribe to read receipts for room
    this.subscribe(
      `/topic/chat/${roomId}/read`,
      (message) => {
        const data = JSON.parse(message.body);
        console.log('[StompService] Room read receipt:', data);
        // ✅ FIX: Notify callbacks about read receipt
        this.notifyReadReceipt({
          roomId: data.roomId || roomId,
          conversationId: data.conversationId,
          readBy: data.readBy,
          timestamp: data.timestamp,
        });
      },
      `${subKey}-read`
    );

    // Subscribe to delivery receipts
    this.subscribe(
      `/topic/chat/${roomId}/delivered`,
      (message) => {
        const data = JSON.parse(message.body);
        console.log('[StompService] Delivery receipt:', data);
        // ✅ FIX: Notify callbacks about delivery receipt
        this.notifyDeliveryReceipt({
          roomId: data.roomId || roomId,
          messageId: String(data.messageId),
          deliveredTo: data.deliveredTo,
          timestamp: data.timestamp,
        });
      },
      `${subKey}-delivered`
    );
  }

  /**
   * Unsubscribe from a chat room
   */
  unsubscribeFromChatRoom(roomId: string): void {
    const subKey = `chat-${roomId}`;
    this.unsubscribe(subKey);
    this.unsubscribe(`${subKey}-typing`);
    this.unsubscribe(`${subKey}-read`);
    this.unsubscribe(`${subKey}-delivered`);
  }

  /**
   * Subscribe to a call room
   */
  subscribeToCallRoom(roomId: string): void {
    if (!this.client) return;

    const subKey = `call-${roomId}`;
    if (this.subscriptions.has(subKey)) return;

    this.subscribe(
      `/topic/call/${roomId}`,
      (message) => {
        const data = JSON.parse(message.body);
        if (data.type && data.data) {
          const callEvent: CallEvent = {
            type: data.type.replace('call-', '') as CallEvent['type'],
            roomId: data.data.roomId,
            reason: data.data.reason,
            timestamp: data.data.timestamp,
          };
          this.callCallbacks.forEach((cb) => cb(callEvent));
        }
      },
      subKey
    );
  }

  /**
   * Unsubscribe from a call room
   */
  unsubscribeFromCallRoom(roomId: string): void {
    this.unsubscribe(`call-${roomId}`);
  }

  // ============================================================================
  // CHAT METHODS
  // ============================================================================

  /**
   * Send a chat message
   * ✅ FIX: Uses deduplication to prevent sending duplicate messages when multiple callbacks trigger
   */
  sendMessage(roomId: string, text: string, receiverId: number): void {
    // ✅ FIX: Deduplicate based on roomId + text content within a short window
    const dedupKey = `${roomId}:${text}:${receiverId}`;
    const now = Date.now();
    const lastSent = this.recentlySentMessages.get(dedupKey);

    if (lastSent && (now - lastSent) < this.SENT_MESSAGE_DEDUP_WINDOW) {
      // Duplicate message within dedup window, skip
      console.log('[StompService] Duplicate message detected, skipping');
      return;
    }

    // Update dedup cache
    this.recentlySentMessages.set(dedupKey, now);

    // Clean up old entries periodically
    if (this.recentlySentMessages.size > 100) {
      const cutoff = now - this.SENT_MESSAGE_DEDUP_WINDOW;
      for (const [key, timestamp] of this.recentlySentMessages.entries()) {
        if (timestamp < cutoff) {
          this.recentlySentMessages.delete(key);
        }
      }
    }

    // ✅ FIX: Use actual client connection state
    if (!this.client || !this.connected) {
      // R4-001: Check queue size before adding
      if (this.offlineMessageQueue.length >= this.MAX_OFFLINE_QUEUE_SIZE) {
        console.warn(`[StompService] R4-001: Offline queue full (${this.MAX_OFFLINE_QUEUE_SIZE} messages), dropping oldest message`);
        this.offlineMessageQueue.shift(); // Remove oldest message
      }
      console.warn('[StompService] Offline - queueing message for later delivery');
      this.offlineMessageQueue.push({ roomId, text, receiverId });
      return;
    }

    this.client.publish({
      destination: `/app/chat.send/${roomId}`,
      body: JSON.stringify({
        text,
        content: text,
        receiverId,
      }),
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(roomId: string, conversationId: string, isTyping: boolean): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: `/app/chat.typing/${roomId}`,
      body: JSON.stringify({
        conversationId,
        isTyping,
      }),
    });
  }

  /**
   * Mark messages as read
   * ✅ FIX: Include roomId for proper read receipt broadcasting
   */
  markMessagesAsRead(conversationId: string, roomId?: string): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({
        conversationId,
        roomId: roomId || conversationId, // Include roomId for broadcast targeting
      }),
    });
  }

  /**
   * Mark message as delivered
   * ✅ FIX: Uses deduplication to prevent sending multiple delivery receipts for the same message
   */
  markMessageAsDelivered(messageId: string, roomId: string): void {
    if (!this.client || !this.connected) return;

    // ✅ FIX: Check if we've already sent a delivery receipt for this message
    const cacheKey = `${roomId}:${messageId}`;
    if (this.recentlyDeliveredMessageIds.has(cacheKey)) {
      // Already sent delivery receipt for this message, skip
      return;
    }

    // Add to deduplication cache
    this.recentlyDeliveredMessageIds.add(cacheKey);

    // Start cleanup timer if not running
    if (!this.deliveredMessageCleanupTimer) {
      this.deliveredMessageCleanupTimer = setInterval(() => {
        // Clear the cache periodically
        this.recentlyDeliveredMessageIds.clear();
      }, this.DELIVERED_MESSAGE_CACHE_TTL);
    }

    this.client.publish({
      destination: '/app/chat.delivered',
      body: JSON.stringify({
        messageId,
        roomId,
      }),
    });
  }

  // ============================================================================
  // CALL METHODS
  // ============================================================================

  /**
   * Initiate a call
   */
  initiateCall(targetUserId: number, callType: 'voice' | 'video', callerName?: string): void {
    if (!this.client || !this.connected) {
      console.warn('[StompService] Cannot initiate call: not connected');
      return;
    }

    this.client.publish({
      destination: '/app/call.initiate',
      body: JSON.stringify({
        targetUserId,
        callType,
        callerName: callerName || this.currentUsername,
      }),
    });
  }

  /**
   * Answer a call
   */
  answerCall(roomId: string): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/call.answer',
      body: JSON.stringify({ roomId }),
    });
  }

  /**
   * Reject a call - sends hangup to caller with reason 'declined'
   * Uses /webrtc.hangup since backend has no /call.reject handler
   */
  rejectCall(roomId: string, callerId: number, reason: string = 'declined'): void {
    if (!this.client || !this.connected) {
      console.warn('[StompService] Cannot reject call - not connected');
      return;
    }

    console.log(`[StompService] 📞 Rejecting call ${roomId} from user ${callerId}, reason: ${reason}`);

    // Use webrtc.hangup which backend handles - it will notify the caller
    this.client.publish({
      destination: '/app/webrtc.hangup',
      body: JSON.stringify({
        roomName: roomId,
        targetUserId: callerId,
        reason: reason,
      }),
    });
  }

  /**
   * End a call
   */
  endCall(roomId: string, reason: string = 'ended'): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/call.end',
      body: JSON.stringify({ roomId, reason }),
    });
  }

  /**
   * Check user online status
   */
  checkUserOnline(userId: number): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/presence.check',
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * Check multiple users' online status at once
   */
  checkBulkUserOnline(userIds: number[]): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/presence.check-bulk',
      body: JSON.stringify({ userIds }),
    });
  }

  // ============================================================================
  // WEBRTC SIGNALING METHODS
  // ============================================================================

  /**
   * Send WebRTC SDP Offer to target user
   * REL-008: Includes optional callSessionId for signal deduplication
   */
  sendWebRTCOffer(roomName: string, targetUserId: number, sdp: RTCSessionDescriptionInit, callSessionId?: number): void {
    if (!this.client || !this.connected) {
      console.warn('[StompService] Cannot send WebRTC offer: not connected');
      return;
    }

    console.log('[StompService] 📡 Sending WebRTC offer to user', targetUserId, 'session:', callSessionId);
    this.client.publish({
      destination: '/app/webrtc.offer',
      body: JSON.stringify({
        roomName,
        targetUserId,
        sdp,
        callSessionId,
      }),
    });
  }

  /**
   * Send WebRTC SDP Answer to target user
   * REL-008: Includes optional callSessionId for signal deduplication
   */
  sendWebRTCAnswer(roomName: string, targetUserId: number, sdp: RTCSessionDescriptionInit, callSessionId?: number): void {
    if (!this.client || !this.connected) {
      console.warn('[StompService] Cannot send WebRTC answer: not connected');
      return;
    }

    console.log('[StompService] 📡 Sending WebRTC answer to user', targetUserId, 'session:', callSessionId);
    this.client.publish({
      destination: '/app/webrtc.answer',
      body: JSON.stringify({
        roomName,
        targetUserId,
        sdp,
        callSessionId,
      }),
    });
  }

  /**
   * Send WebRTC ICE Candidate to target user
   * REL-008: Includes optional callSessionId for signal deduplication
   */
  sendWebRTCIceCandidate(roomName: string, targetUserId: number, candidate: RTCIceCandidateInit, callSessionId?: number): void {
    if (!this.client || !this.connected) {
      return;
    }

    this.client.publish({
      destination: '/app/webrtc.ice',
      body: JSON.stringify({
        roomName,
        targetUserId,
        candidate,
        callSessionId,
      }),
    });
  }

  /**
   * Send WebRTC Hangup signal to target user
   * REL-008: Includes optional callSessionId for signal deduplication
   * ✅ FIX: Uses deduplication to prevent sending multiple hangup signals for same room
   */
  sendWebRTCHangup(roomName: string, targetUserId: number, reason: string = 'hangup', callSessionId?: number): void {
    if (!this.client || !this.connected) return;

    // ✅ FIX: Deduplicate hangup signals within a short window
    const now = Date.now();
    const lastHangup = this.recentHangupRooms.get(roomName);

    if (lastHangup && (now - lastHangup) < this.HANGUP_DEDUP_WINDOW) {
      console.log('[StompService] 📡 Duplicate hangup signal detected for room', roomName, ', skipping');
      return;
    }

    // Update dedup cache
    this.recentHangupRooms.set(roomName, now);

    // Clean up old entries
    if (this.recentHangupRooms.size > 10) {
      const cutoff = now - this.HANGUP_DEDUP_WINDOW;
      for (const [key, timestamp] of this.recentHangupRooms.entries()) {
        if (timestamp < cutoff) {
          this.recentHangupRooms.delete(key);
        }
      }
    }

    console.log('[StompService] 📡 Sending WebRTC hangup to user', targetUserId, 'session:', callSessionId);
    this.client.publish({
      destination: '/app/webrtc.hangup',
      body: JSON.stringify({
        roomName,
        targetUserId,
        reason,
        callSessionId,
      }),
    });
  }

  // ============================================================================
  // PRESENCE / HEARTBEAT METHODS
  // ============================================================================

  /**
   * Start application-level heartbeat.
   * Sends heartbeat every 30 seconds to indicate active usage.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Send initial heartbeat
    this.sendHeartbeat();

    // Set up interval
    this.heartbeatIntervalId = setInterval(() => {
      if (this.connected) {
        this.sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    console.log('[StompService] Started application-level heartbeat');
  }

  /**
   * Stop application-level heartbeat.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
      console.log('[StompService] Stopped application-level heartbeat');
    }
  }

  /**
   * Send a single heartbeat to the server.
   */
  private sendHeartbeat(): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/presence.heartbeat',
      body: JSON.stringify({ timestamp: Date.now() }),
    });
  }

  /**
   * Signal to the server that the app is going to background.
   * User stays "online" but marked as backgrounded.
   */
  sendBackgroundSignal(): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/presence.background',
      body: JSON.stringify({ timestamp: Date.now() }),
    });
    console.log('[StompService] Sent background signal');
  }

  /**
   * Signal to the server that the app has returned to foreground.
   */
  sendForegroundSignal(): void {
    if (!this.client || !this.connected) return;

    this.client.publish({
      destination: '/app/presence.foreground',
      body: JSON.stringify({ timestamp: Date.now() }),
    });
    console.log('[StompService] Sent foreground signal');
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  private subscribe(destination: string, callback: (message: IMessage) => void, key: string): void {
    if (!this.client) return;

    // FIX: If subscription already exists, unsubscribe first (handles reconnection with stale subscriptions)
    if (this.subscriptions.has(key)) {
      try {
        const existingSub = this.subscriptions.get(key);
        existingSub?.unsubscribe();
        console.log('[StompService] Cleared stale subscription for:', destination);
      } catch (e) {
        // Ignore unsubscribe errors for stale subscriptions (connection may have dropped)
        console.log('[StompService] Could not unsubscribe stale subscription (expected on reconnect):', destination);
      }
      this.subscriptions.delete(key);
    }

    // Check if client is connected before subscribing
    if (!this.client.connected) {
      console.warn('[StompService] Cannot subscribe - not connected yet:', destination);
      return;
    }

    try {
      const subscription = this.client.subscribe(destination, callback);
      this.subscriptions.set(key, subscription);

      if (this.config?.debug) {
        console.log('[StompService] Subscribed to:', destination);
      }
    } catch (error) {
      console.warn('[StompService] Subscription error:', error);
    }
  }

  private unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  // ============================================================================
  // CALLBACK REGISTRATION
  // ============================================================================

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onTyping(callback: TypingCallback): () => void {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  onCall(callback: CallCallback): () => void {
    this.callCallbacks.add(callback);
    console.log('[StompService] 📞 Call callback registered, total callbacks:', this.callCallbacks.size);
    return () => this.callCallbacks.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  onPresence(callback: PresenceCallback): () => void {
    this.presenceCallbacks.add(callback);
    return () => this.presenceCallbacks.delete(callback);
  }

  onOnlineUsersList(callback: OnlineUsersListCallback): () => void {
    this.onlineUsersListCallbacks.add(callback);

    // ✅ FIX: Immediately call callback with cached list if available
    // This fixes the timing issue where hooks register after list is received
    if (this.cachedOnlineUsersList) {
      console.log('[StompService] Providing cached online users list to new callback');
      callback(this.cachedOnlineUsersList);
    }

    return () => this.onlineUsersListCallbacks.delete(callback);
  }

  onReadReceipt(callback: ReadReceiptCallback): () => void {
    this.readReceiptCallbacks.add(callback);
    return () => this.readReceiptCallbacks.delete(callback);
  }

  onDeliveryReceipt(callback: DeliveryReceiptCallback): () => void {
    this.deliveryReceiptCallbacks.add(callback);
    return () => this.deliveryReceiptCallbacks.delete(callback);
  }

  /**
   * Register a WebRTC signal callback
   * @param callback The callback function
   * @param name Optional unique name for the callback source (e.g., 'TwilioVideoService', 'WebSocketProvider')
   *             If provided, replaces any existing callback with the same name (prevents duplicates)
   */
  onWebRTCSignal(callback: WebRTCSignalCallback, name?: string): () => void {
    // ✅ FIX: Use name-based registration to prevent duplicate callbacks from same source
    const callbackId = name || `anonymous_${++this.webrtcCallbackIdCounter}`;

    // If this source already has a callback, remove it first (dedupe)
    if (this.webrtcCallbacks.has(callbackId)) {
      console.log('[StompService] 📡 Replacing existing WebRTC callback:', callbackId);
    }

    this.webrtcCallbacks.set(callbackId, callback);
    console.log('[StompService] 📡 WebRTC callback registered:', callbackId, 'total callbacks:', this.webrtcCallbacks.size);

    // Deliver any pending WebRTC signals to the new callback
    this.deliverPendingWebRTCSignals(callback);

    return () => {
      this.webrtcCallbacks.delete(callbackId);
      console.log('[StompService] 📡 WebRTC callback removed:', callbackId, 'total callbacks:', this.webrtcCallbacks.size);
    };
  }

  /**
   * Handle incoming WebRTC signal - deliver to callbacks or queue if none registered
   */
  private handleWebRTCSignal(signal: WebRTCSignal): void {
    // Clean up old signals first
    this.cleanupOldWebRTCSignals();

    if (this.webrtcCallbacks.size > 0) {
      // Deliver to registered callbacks
      this.webrtcCallbacks.forEach((cb) => cb(signal));
    } else {
      // Queue the signal for late-registering callbacks
      console.log('[StompService] 📡 Queuing WebRTC signal (no callbacks registered):', signal.type, 'room:', signal.roomName);
      this.pendingWebRTCSignals.push({ signal, timestamp: Date.now() });
    }
  }

  /**
   * Deliver pending WebRTC signals to a newly registered callback
   */
  private deliverPendingWebRTCSignals(callback: WebRTCSignalCallback): void {
    if (this.pendingWebRTCSignals.length === 0) return;

    // Clean up old signals first
    this.cleanupOldWebRTCSignals();

    if (this.pendingWebRTCSignals.length > 0) {
      console.log(`[StompService] 📡 Delivering ${this.pendingWebRTCSignals.length} pending WebRTC signals`);
      for (const { signal } of this.pendingWebRTCSignals) {
        callback(signal);
      }
      // Clear the queue after delivering
      this.pendingWebRTCSignals = [];
    }
  }

  /**
   * Clean up WebRTC signals older than TTL
   */
  private cleanupOldWebRTCSignals(): void {
    const now = Date.now();
    const beforeCount = this.pendingWebRTCSignals.length;
    this.pendingWebRTCSignals = this.pendingWebRTCSignals.filter(
      ({ timestamp }) => now - timestamp < this.WEBRTC_SIGNAL_QUEUE_TTL
    );
    const removedCount = beforeCount - this.pendingWebRTCSignals.length;
    if (removedCount > 0) {
      console.log(`[StompService] 📡 Cleaned up ${removedCount} expired WebRTC signals`);
    }
  }

  private notifyReadReceipt(receipt: { roomId: string; conversationId: number; readBy: number; timestamp: number }): void {
    this.readReceiptCallbacks.forEach((cb) => cb(receipt));
  }

  private notifyDeliveryReceipt(receipt: { roomId: string; messageId: string; deliveredTo: number; timestamp: number }): void {
    this.deliveryReceiptCallbacks.forEach((cb) => cb(receipt));
  }

  /**
   * ✅ FIX: Flush offline message queue on reconnection
   * R4-002: Improved with proper re-queuing of failed messages
   */
  private flushOfflineMessageQueue(): void {
    if (this.offlineMessageQueue.length === 0) return;

    const queueLength = this.offlineMessageQueue.length;
    console.log(`[StompService] R4-002: Flushing ${queueLength} queued messages`);

    // Copy and clear the queue
    const queuedMessages = [...this.offlineMessageQueue];
    this.offlineMessageQueue = [];

    // Track failed messages for re-queuing
    const failedMessages: Array<{ roomId: string; text: string; receiverId: number }> = [];

    // Send each queued message
    for (const msg of queuedMessages) {
      // R4-002: Check connection state before each send
      if (!this.client || !this.connected) {
        console.warn('[StompService] R4-002: Connection lost during flush, re-queuing remaining messages');
        // Re-queue this and all remaining messages
        failedMessages.push(msg);
        continue;
      }

      try {
        // Directly publish instead of calling sendMessage to avoid re-queueing loop
        this.client.publish({
          destination: `/app/chat.send/${msg.roomId}`,
          body: JSON.stringify({
            text: msg.text,
            content: msg.text,
            receiverId: msg.receiverId,
          }),
        });
      } catch (error) {
        console.warn('[StompService] R4-002: Failed to send queued message:', error);
        // R4-002: Re-queue failed message
        failedMessages.push(msg);
      }
    }

    // R4-002: Re-add failed messages to queue (at the front to maintain order)
    if (failedMessages.length > 0) {
      console.log(`[StompService] R4-002: Re-queued ${failedMessages.length} failed messages`);
      this.offlineMessageQueue = [...failedMessages, ...this.offlineMessageQueue];
    } else {
      console.log(`[StompService] R4-002: Successfully flushed all ${queueLength} queued messages`);
    }
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => cb(connected));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate room ID for direct messages
   */
  generateDMRoomId(userId1: number, userId2: number): string {
    const min = Math.min(userId1, userId2);
    const max = Math.max(userId1, userId2);
    return `dm_${min}_${max}`;
  }

  /**
   * Generate room ID for calls
   */
  generateCallRoomId(userId1: number, userId2: number): string {
    const min = Math.min(userId1, userId2);
    const max = Math.max(userId1, userId2);
    return `call_${min}_${max}`;
  }

  getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  getCurrentUsername(): string | null {
    return this.currentUsername;
  }

  // ============================================================================
  // ✅ PREMIUM: CONNECTION STATE MANAGEMENT
  // ============================================================================

  /**
   * Get current connection state for UI display
   */
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting' {
    return this._connectionState;
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionState(callback: (state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void): () => void {
    this.connectionStateCallbacks.add(callback);
    // Immediately notify with current state
    callback(this._connectionState);
    return () => this.connectionStateCallbacks.delete(callback);
  }

  /**
   * Set connection state and notify subscribers
   * ✅ FIX: Debounces non-connected states to prevent UI spam during rapid reconnection attempts
   */
  private setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'): void {
    if (this._connectionState === state) {
      return; // No change
    }

    // Clear any pending debounce
    if (this.connectionStateDebounceTimer) {
      clearTimeout(this.connectionStateDebounceTimer);
      this.connectionStateDebounceTimer = null;
    }

    // 'connected' state should notify immediately - user wants to know they're connected
    if (state === 'connected') {
      console.log(`[StompService] Connection state: ${this._connectionState} -> ${state}`);
      this._connectionState = state;
      this.connectionStateCallbacks.forEach((cb) => cb(state));
      return;
    }

    // For non-connected states (connecting, reconnecting, disconnected), debounce to prevent spam
    // This prevents rapid "Connecting..." -> "No connection" -> "Connecting..." UI flicker
    this.connectionStateDebounceTimer = setTimeout(() => {
      if (this._connectionState !== state) {
        console.log(`[StompService] Connection state: ${this._connectionState} -> ${state}`);
        this._connectionState = state;
        this.connectionStateCallbacks.forEach((cb) => cb(state));
      }
      this.connectionStateDebounceTimer = null;
    }, this.CONNECTION_STATE_DEBOUNCE_MS);
  }

  // ============================================================================
  // ✅ PREMIUM: HEARTBEAT WATCHDOG FOR SILENT DISCONNECT DETECTION
  // ============================================================================

  /**
   * Start watchdog that detects silent disconnections
   * If no heartbeat received from server in HEARTBEAT_TIMEOUT, trigger reconnect
   */
  private startHeartbeatWatchdog(): void {
    this.lastHeartbeatReceived = Date.now();

    // Stop existing watchdog if any
    this.stopHeartbeatWatchdog();

    this.heartbeatWatchdogId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeatReceived;

      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT && this.isConnected) {
        console.warn(`[StompService] Heartbeat timeout (${timeSinceLastHeartbeat}ms) - triggering reconnect`);
        this.handleSilentDisconnect();
      }
    }, this.HEARTBEAT_WATCHDOG_INTERVAL);

    console.log('[StompService] Heartbeat watchdog started');
  }

  /**
   * Stop the heartbeat watchdog
   */
  private stopHeartbeatWatchdog(): void {
    if (this.heartbeatWatchdogId) {
      clearInterval(this.heartbeatWatchdogId);
      this.heartbeatWatchdogId = null;
      console.log('[StompService] Heartbeat watchdog stopped');
    }
  }

  /**
   * Record heartbeat received from server
   * Call this when any server message/pong is received
   */
  recordHeartbeat(): void {
    this.lastHeartbeatReceived = Date.now();
  }

  /**
   * Handle silent disconnect - reconnect without waiting for error
   */
  private handleSilentDisconnect(): void {
    console.log('[StompService] Handling silent disconnect');
    this.isConnected = false;
    this.setConnectionState('reconnecting');
    this.notifyConnectionChange(false);

    // Deactivate and reactivate to trigger reconnection
    if (this.client) {
      this.client.deactivate().then(() => {
        console.log('[StompService] Deactivated, will reconnect via built-in mechanism');
        // The STOMP client's reconnect logic will handle reconnection
        if (this.client && this.config) {
          this.client.activate();
        }
      });
    }
  }

  /**
   * ✅ PREMIUM: Public method to trigger manual reconnection
   * Uses stored credentials from initial connect()
   */
  reconnect(): void {
    if (this.isConnected) {
      console.log('[StompService] Already connected, skipping reconnect');
      return;
    }

    console.log('[StompService] Manual reconnect triggered');
    this.setConnectionState('reconnecting');

    // If we have stored credentials, use them
    if (this.currentUserId && this.currentUsername && this.config) {
      this.connect(this.currentUserId, this.currentUsername);
    } else if (this.client && this.config) {
      // Otherwise just reactivate the existing client
      this.client.activate();
    } else {
      console.warn('[StompService] Cannot reconnect - no stored credentials or config');
    }
  }
}

// Export singleton instance
export const stompService = new StompService();
export default stompService;
