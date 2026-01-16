/**
 * WebSocket Provider
 * Manages global STOMP WebSocket connection and incoming call handling
 *
 * QA Fixes Applied:
 * - BUG-003: Removed duplicate incoming call handler (now uses IncomingCallModal)
 * - BUG-108: Uses dedicated IncomingCallModal component
 * - BUG-110: Proper animation cleanup
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Vibration, AppState, AppStateStatus } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { stompService, CallEvent } from './StompService';
import { useAuthStore } from '@store/authStore';
import { usePresenceStore } from '@store/presenceStore';
import { IncomingCallModal } from '@features/messaging/components/IncomingCallModal';
import { pushNotificationService, NotificationData } from '@services/notifications';
import { twilioVideoService } from '@services/twilio';
import { getOnlineUsers } from '@services/api/presenceApi';

// Types - BUG-106: Consolidated IncomingCall type
export interface IncomingCallData {
  roomId: string;
  callerId: number;
  callerUsername: string;
  callerName: string;
  callType: 'voice' | 'video';
  callerPhoto?: string;
}

interface WebSocketContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  incomingCall: IncomingCallData | null;
  clearIncomingCall: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

// Vibration pattern for incoming calls (works on Android)
const VIBRATION_PATTERN = [0, 500, 200, 500];
const VIBRATION_REPEAT = true;

export function WebSocketProvider({ children }: WebSocketProviderProps): React.ReactElement {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // BUG-110: Stop vibration helper
  const stopVibration = useCallback(() => {
    Vibration.cancel();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  }, []);

  // BUG-110: Start vibration for incoming call
  const startVibration = useCallback(() => {
    stopVibration();
    Vibration.vibrate(VIBRATION_PATTERN, VIBRATION_REPEAT);
  }, [stopVibration]);

  // Clear incoming call state
  const clearIncomingCall = useCallback(() => {
    stopVibration();
    console.log('[WebSocketProvider] 📞 Navigation dispatched, clearing incomingCall after delay');
    // Small delay to ensure navigation completes
    setTimeout(() => {
      setIncomingCall(null);
    }, 200);
  }, [stopVibration]);

  // Initialize STOMP service
  useEffect(() => {
    isMountedRef.current = true;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

    stompService.initialize({
      baseUrl: apiUrl,
      debug: __DEV__,
    });

    return () => {
      isMountedRef.current = false;
      stopVibration();
    };
  }, [stopVibration]);

  // Connect function
  const connect = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !user?.username) {
      console.warn('[WebSocketProvider] Cannot connect: user not available');
      return false;
    }

    if (isConnecting || isConnected) {
      return isConnected;
    }

    setIsConnecting(true);

    try {
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const success = await stompService.connect(userId, user.username);
      if (isMountedRef.current) {
        setIsConnected(success);
      }
      return success;
    } catch (error) {
      console.error('[WebSocketProvider] Connection error:', error);
      if (isMountedRef.current) {
        setIsConnected(false);
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, [user?.id, user?.username, isConnecting, isConnected]);

  // Disconnect function
  const disconnect = useCallback(() => {
    stompService.disconnect();
    setIsConnected(false);
    clearIncomingCall();
  }, [clearIncomingCall]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id && !isConnected && !isConnecting) {
      connect();

      // Initialize push notifications
      pushNotificationService.initialize().then(async (enabled) => {
        if (enabled) {
          console.log('[WebSocketProvider] Push notifications initialized');
          // Check if app was opened from a notification (killed state)
          await pushNotificationService.checkInitialNotification();
          // Also verify token is valid
          await pushNotificationService.verifyAndRefreshToken();
        } else {
          console.log('[WebSocketProvider] Push notifications not enabled');
        }
      }).catch((error) => {
        console.error('[WebSocketProvider] Push notification init error:', error);
      });
    }

    if (!isAuthenticated && isConnected) {
      disconnect();
      // Unregister push notifications on logout
      pushNotificationService.unregister().catch(console.error);
    }
  }, [isAuthenticated, user?.id, isConnected, isConnecting, connect, disconnect]);

  // Register incoming call push notification handler
  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle incoming call from push notification (when app is backgrounded/closed)
    const handleIncomingCallPush = (data: {
      callerId: number;
      callerName: string;
      callerPhoto?: string;
      callType: 'voice' | 'video';
      roomId: string;
    }) => {
      console.log('[WebSocketProvider] Incoming call from push notification:', data);

      // Set incoming call state to show IncomingCallModal
      setIncomingCall({
        roomId: data.roomId,
        callerId: data.callerId,
        callerUsername: data.callerName, // Use callerName as username for push notifications
        callerName: data.callerName,
        callerPhoto: data.callerPhoto,
        callType: data.callType,
      });
      startVibration();
    };

    pushNotificationService.setOnIncomingCall(handleIncomingCallPush);

    return () => {
      pushNotificationService.setOnIncomingCall(null);
    };
  }, [isAuthenticated, startVibration]);

  // Listen for connection status changes
  useEffect(() => {
    const unsubscribe = stompService.onConnectionChange((connected) => {
      if (isMountedRef.current) {
        setIsConnected(connected);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ============================================================================
  // GLOBAL PRESENCE TRACKING - Using centralized Zustand store
  // ============================================================================
  const { setOnlineUsers, setUserOnline, setUserOffline, clear: clearPresence } = usePresenceStore();
  const receivedOnlineListRef = useRef(false);

  // REST API fallback for online users
  const fetchOnlineUsersFallback = useCallback(async () => {
    if (receivedOnlineListRef.current) return;

    try {
      console.log('[WebSocketProvider] Fetching online users via REST API fallback');
      const response = await getOnlineUsers();
      if (!receivedOnlineListRef.current) {
        setOnlineUsers(response.userIds);
        receivedOnlineListRef.current = true;
        console.log('[WebSocketProvider] REST API fallback: received', response.userIds.length, 'online users');
      }
    } catch (error) {
      console.warn('[WebSocketProvider] REST API fallback failed:', error);
    }
  }, [setOnlineUsers]);

  // Subscribe to presence updates at root level
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('[WebSocketProvider] Setting up global presence tracking (Zustand store)');
    receivedOnlineListRef.current = false;

    // Subscribe to individual presence changes -> update Zustand store
    const unsubPresence = stompService.onPresence((data) => {
      if (data.isOnline) {
        setUserOnline(data.userId);
      } else {
        setUserOffline(data.userId);
      }
    });

    // Subscribe to online users list -> update Zustand store
    const unsubOnlineList = stompService.onOnlineUsersList((data) => {
      receivedOnlineListRef.current = true;
      setOnlineUsers(data.userIds);
    });

    // Fallback: if WebSocket doesn't provide the list within 3 seconds, use REST API
    const fallbackTimeout = setTimeout(() => {
      if (!receivedOnlineListRef.current && isConnected) {
        fetchOnlineUsersFallback();
      }
    }, 3000);

    return () => {
      console.log('[WebSocketProvider] Cleaning up global presence tracking');
      clearTimeout(fallbackTimeout);
      unsubPresence();
      unsubOnlineList();
    };
  }, [isAuthenticated, isConnected, setOnlineUsers, setUserOnline, setUserOffline, fetchOnlineUsersFallback]);

  // Clear presence data on logout
  useEffect(() => {
    if (!isAuthenticated) {
      clearPresence();
    }
  }, [isAuthenticated, clearPresence]);

  // Handle push notification taps
  useEffect(() => {
    const handleNotificationTap = (data: NotificationData) => {
      if (!data?.type) return;

      switch (data.type) {
        case 'missed_call':
          // Navigate to call history or messages
          if (data.callerId) {
            navigation.navigate('MessagesTab');
          }
          break;

        case 'new_message':
          // Navigate to the conversation
          if (data.conversationId) {
            navigation.navigate('MessagesTab', {
              screen: 'Chat',
              params: { conversationId: data.conversationId },
            });
          } else {
            navigation.navigate('MessagesTab');
          }
          break;

        case 'new_match':
        case 'new_like':
        case 'super_like':
          // Navigate to matches
          navigation.navigate('MatchesTab');
          break;

        default:
          console.log('Unhandled notification type:', data.type);
      }
    };

    pushNotificationService.setOnNotificationTapped(handleNotificationTap);

    return () => {
      pushNotificationService.setOnNotificationTapped(() => {});
    };
  }, [navigation]);

  // BUG-003: Centralized incoming call handling
  useEffect(() => {
    console.log('[WebSocketProvider] 📞 Setting up call event listener');
    const unsubscribe = stompService.onCall((event: CallEvent) => {
      console.log('[WebSocketProvider] 📞 Call event received:', event);
      if (!isMountedRef.current) return;

      switch (event.type) {
        case 'incoming':
          console.log('[WebSocketProvider] 📞 INCOMING CALL - showing modal');
          // Set incoming call state and start vibration
          setIncomingCall({
            roomId: event.roomId,
            callerId: event.callerId!,
            callerUsername: event.callerUsername!,
            callerName: event.callerName || event.callerUsername!,
            callerPhoto: event.callerPhoto,
            callType: event.callType || 'voice',
          });
          startVibration();
          break;

        case 'answered':
          console.log('[WebSocketProvider] 📞 CALL ANSWERED - notifying TwilioVideoService');
          // Clear incoming call modal if showing
          if (incomingCall?.roomId === event.roomId) {
            clearIncomingCall();
          }
          // Notify TwilioVideoService that the call was answered (for caller)
          twilioVideoService.handleCallAnswered(event.roomId);
          break;

        case 'rejected':
          console.log('[WebSocketProvider] 📞 CALL REJECTED - notifying TwilioVideoService');
          // Clear incoming call modal if showing
          if (incomingCall?.roomId === event.roomId) {
            clearIncomingCall();
          }
          // Notify TwilioVideoService that the call was rejected (for caller)
          twilioVideoService.handleCallRejected(event.roomId, event.reason || 'declined');
          break;

        case 'ended':
          console.log('[WebSocketProvider] CALL ENDED - notifying TwilioVideoService');
          // Clear incoming call modal if showing
          if (incomingCall?.roomId === event.roomId) {
            clearIncomingCall();
          }
          // REL-006: Tell TwilioVideoService about the backend-initiated end
          twilioVideoService.handleCallEnded(event.roomId, event.reason);
          break;

        case 'error':
          clearIncomingCall();
          break;
      }
    });


    // Also listen for WebRTC hangup signals to handle caller timeout
    // ✅ FIX: Pass unique name to prevent duplicate callback registrations
    const unsubWebRTC = stompService.onWebRTCSignal((signal) => {
      if (signal.type === 'hangup' && incomingCall?.roomId === signal.roomName) {
        console.log('[WebSocketProvider] WEBRTC HANGUP received - clearing incoming call');
        clearIncomingCall();
      }
    }, 'WebSocketProvider');

    return () => {
      unsubscribe();
      unsubWebRTC();
    };
  }, [incomingCall?.roomId, startVibration, clearIncomingCall]);

  // Handle app state changes (background/foreground signals and vibration)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Signal server about backgrounding (user stays "online" but marked as backgrounded)
        stompService.sendBackgroundSignal();
        // Don't stop vibration in background - let user know about call
      } else if (nextAppState === 'active') {
        // Signal server about returning to foreground
        stompService.sendForegroundSignal();
        // Resume vibration if there's still an incoming call
        if (incomingCall) {
          startVibration();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [incomingCall, startVibration]);

  // Handle accept call
  const handleAcceptCall = useCallback(() => {
    console.log('[WebSocketProvider] 📞 handleAcceptCall called, incomingCall:', incomingCall);
    if (!incomingCall) return;

    stopVibration();

    // Derive proper DM conversation ID from user IDs (format: dm_{smallerId}_{largerId})
    const currentUserId = user?.id ? (typeof user.id === 'string' ? parseInt(user.id, 10) : user.id) : null;
    const callerId = incomingCall.callerId;
    let derivedConversationId = incomingCall.roomId; // fallback

    if (currentUserId && callerId) {
      const smallerId = Math.min(currentUserId, callerId);
      const largerId = Math.max(currentUserId, callerId);
      derivedConversationId = `dm_${smallerId}_${largerId}`;
    }
    console.log('[WebSocketProvider] 📞 Derived conversationId:', derivedConversationId, 'from currentUserId:', currentUserId, 'callerId:', callerId);

    // Navigate to call screen with roomName for Twilio
    // Use CommonActions.navigate for reliable nested navigation params passing
    const callParams = {
      conversationId: derivedConversationId,
      userId: incomingCall.callerId,
      userName: incomingCall.callerName,
      userPhoto: incomingCall.callerPhoto,
      callType: incomingCall.callType === 'video' ? 'VIDEO' : 'AUDIO',
      isIncoming: true,
      roomName: incomingCall.roomId,
    };
    console.log('[WebSocketProvider] Navigating to Call screen with params:', callParams);
    // Navigate to MessagesTab with Call screen
    // The safeNavigateBack in CallScreen handles the case where there's no previous screen
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: {
          screen: 'MessagesTab',
          params: {
            screen: 'Call',
            params: callParams,
          },
        },
      })
    );


    console.log('[WebSocketProvider] 📞 Navigation.navigate called, clearing incomingCall after delay');
    // Delay clearing to ensure navigation completes before modal dismisses
    setTimeout(() => {
      setIncomingCall(null);
    }, 500);
  }, [incomingCall, navigation, stopVibration, user]);

  // Handle decline call
  const handleDeclineCall = useCallback(() => {
    console.log('[WebSocketProvider] 📞 handleDeclineCall called, incomingCall:', incomingCall);
    if (!incomingCall) return;

    stopVibration();
    stompService.rejectCall(incomingCall.roomId, 'rejected');
    setIncomingCall(null);
  }, [incomingCall, stopVibration]);

  const contextValue: WebSocketContextValue = {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    incomingCall,
    clearIncomingCall,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
      <IncomingCallModal
        visible={incomingCall !== null}
        call={incomingCall ? {
          id: incomingCall.roomId,
          conversationId: incomingCall.roomId,
          caller: {
            id: String(incomingCall.callerId),
            name: incomingCall.callerName,
            profilePhoto: incomingCall.callerPhoto,
          },
          type: incomingCall.callType,
          timestamp: new Date(),
        } : null}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;
