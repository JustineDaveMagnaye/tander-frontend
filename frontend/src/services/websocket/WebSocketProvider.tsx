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
import { Vibration, AppState, AppStateStatus, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import InCallManager from 'react-native-incall-manager';
import { stompService, CallEvent } from './StompService';
import { useAuthStore } from '@store/authStore';
import { usePresenceStore } from '@store/presenceStore';
import { IncomingCallModal } from '@features/messaging/components/IncomingCallModal';
import { pushNotificationService, NotificationData } from '@services/notifications';
import { twilioVideoService } from '@services/twilio';
import { getOnlineUsers } from '@services/api/presenceApi';
import { getCallStatus } from '@services/api/twilioApi';
import { apiClient } from '@services/api/client';
import * as Device from 'expo-device';
import { callKeepService } from '@services/callkeep';
import { voipPushService } from '@services/voip';

// Android-specific: Native incoming call module for foreground service
import {
  incomingCallNativeModule,
  pushDeduplicatorService,
} from '@services/incomingCall';

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

// Vibration pattern for incoming calls
// Note: We use setInterval instead of Vibration.vibrate(pattern, repeat) because
// the repeat parameter behaves differently on iOS (boolean) vs Android (repeat index)
// and Vibration.cancel() doesn't always work reliably on all Android devices.
const VIBRATION_PATTERN = [500, 200, 500, 200, 500];
const VIBRATION_INTERVAL = 2000; // Repeat every 2 seconds

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
  const callKeepUUIDRef = useRef<string | null>(null); // Track CallKit/CallKeep UUID

  // BUGFIX: Track processed call IDs to prevent duplicate modals on WebSocket reconnect
  const processedCallIds = useRef<Set<string>>(new Set());

  // BUG-110: Stop vibration and ringtone helper
  const stopVibration = useCallback(() => {
    console.log('[WebSocketProvider] 🔔 Stopping vibration and ringtone');

    // Clear the vibration interval FIRST
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
      console.log('[WebSocketProvider] 🔔 Vibration interval cleared');
    }

    // Cancel any ongoing vibration (call multiple times to be sure)
    Vibration.cancel();
    Vibration.cancel();

    // Stop the ringtone
    try {
      InCallManager.stopRingtone();
    } catch (e) {
      console.warn('[WebSocketProvider] Could not stop ringtone:', e);
    }

    console.log('[WebSocketProvider] 🔔 Vibration and ringtone stopped');
  }, []);

  // BUG-110: Start vibration and ringtone for incoming call
  const startVibration = useCallback(() => {
    console.log('[WebSocketProvider] 🔔 Starting vibration and ringtone');

    // Stop any existing vibration first
    stopVibration();

    // Start vibration using setInterval for reliable control
    // This approach gives us full control over stopping the vibration
    const vibrateOnce = () => {
      Vibration.vibrate(VIBRATION_PATTERN);
    };

    // Vibrate immediately
    vibrateOnce();

    // Set up interval to repeat vibration
    vibrationIntervalRef.current = setInterval(vibrateOnce, VIBRATION_INTERVAL);
    console.log('[WebSocketProvider] 🔔 Vibration interval started');

    // Start ringtone (uses system default ringtone)
    try {
      InCallManager.startRingtone('_DEFAULT_');
      console.log('[WebSocketProvider] 🔔 Ringtone started');
    } catch (e) {
      console.warn('[WebSocketProvider] Could not start ringtone:', e);
    }
  }, [stopVibration]);

  // Register VoIP token with backend (iOS only)
  const registerVoIPTokenWithBackend = useCallback(async (token: string) => {
    try {
      await apiClient.post('/api/notifications/register-voip-token', {
        token,
        platform: 'ios',
        deviceId: Device.modelName || 'unknown',
      });
      console.log('[WebSocketProvider] VoIP token registered with backend');
    } catch (error) {
      console.warn('[WebSocketProvider] Failed to register VoIP token:', error);
    }
  }, []);

  // Clear incoming call state
  const clearIncomingCall = useCallback((roomId?: string) => {
    stopVibration();
    console.log('[WebSocketProvider] 📞 Clearing incomingCall state');

    // Android: Dismiss native foreground service and full-screen intent (with error handling)
    if (Platform.OS === 'android' && roomId) {
      try {
        if (incomingCallNativeModule.isAvailable()) {
          incomingCallNativeModule.hideIncomingCall(roomId);
        }
      } catch (error) {
        console.warn('[WebSocketProvider] Error clearing native incoming call:', error);
      }
    }

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
      console.warn('[WebSocketProvider] Connection error:', error);
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
        console.warn('[WebSocketProvider] Push notification init error:', error);
      });

      // P0-03/P0-04: Initialize CallKeep for native call UI
      callKeepService.setup().then((success) => {
        if (success) {
          console.log('[WebSocketProvider] CallKeep initialized successfully');
        } else {
          console.log('[WebSocketProvider] CallKeep not available (fallback to IncomingCallModal)');
        }
      });

      // P0-02: Initialize VoIP push for iOS (PushKit)
      if (Platform.OS === 'ios') {
        // Register for VoIP push notifications
        voipPushService.register().then((token) => {
          if (token) {
            console.log('[WebSocketProvider] VoIP push registered, token:', token.substring(0, 20) + '...');
            registerVoIPTokenWithBackend(token);
          }
        });

        // Also listen for token refresh
        voipPushService.setOnTokenReceived((token) => {
          console.log('[WebSocketProvider] VoIP token refreshed');
          registerVoIPTokenWithBackend(token);
        });
      }
    }

    if (!isAuthenticated && isConnected) {
      disconnect();
      // Unregister push notifications on logout
      pushNotificationService.unregister().catch(console.warn);
      // End all calls on logout
      callKeepService.endAllCalls();
    }
  }, [isAuthenticated, user?.id, isConnected, isConnecting, connect, disconnect]);

  // Register incoming call push notification handler
  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle incoming call from push notification (when app is backgrounded/closed)
    const handleIncomingCallPush = async (data: {
      callerId: number;
      callerName: string;
      callerPhoto?: string;
      callType: 'voice' | 'video';
      roomId: string;
    }) => {
      console.log('[WebSocketProvider] Incoming call from push notification:', data);

      // P0-05: Verify call is still valid before showing modal (prevents ghost calls)
      try {
        const status = await getCallStatus(data.roomId);
        if (!status || !status.isActive) {
          console.log('[WebSocketProvider] 📞 Push: Call is no longer active, ignoring:', data.roomId);
          return;
        }
        console.log('[WebSocketProvider] 📞 Push: Call is valid, showing modal');
      } catch (error) {
        console.warn('[WebSocketProvider] 📞 Push: Could not verify call status, showing anyway:', error);
        // If we can't verify, show the modal anyway (network issue shouldn't block calls)
      }

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

    // P0-06: Handle call cancelled from push notification
    pushNotificationService.setOnCallCancelled((roomId: string) => {
      console.log('[WebSocketProvider] Call cancelled notification received:', roomId);
      if (incomingCall?.roomId === roomId) {
        clearIncomingCall(roomId);
        // Android: Also mark as cancelled in deduplicator
        if (Platform.OS === 'android') {
          pushDeduplicatorService.markCallCancelled(roomId);
        }
      }
      // Also end CallKeep call if active
      const callUUID = callKeepService.getCallUUIDByRoomId(roomId);
      if (callUUID) {
        callKeepService.reportEndCallWithReason(callUUID, 'remoteEnded');
      }
    });

    return () => {
      pushNotificationService.setOnIncomingCall(null);
      pushNotificationService.setOnCallCancelled(null);
    };
  }, [isAuthenticated, startVibration, incomingCall?.roomId, clearIncomingCall]);

  // Internal handler for accepting call (used by both IncomingCallModal and CallKeep)
  const handleAcceptCallInternal = useCallback((callData: IncomingCallData) => {
    console.log('[WebSocketProvider] 📞 handleAcceptCallInternal called:', callData);

    // Derive proper DM conversation ID from user IDs
    const currentUserId = user?.id ? (typeof user.id === 'string' ? parseInt(user.id, 10) : user.id) : null;
    const callerId = callData.callerId;
    let derivedConversationId = callData.roomId;

    if (currentUserId && callerId) {
      const smallerId = Math.min(currentUserId, callerId);
      const largerId = Math.max(currentUserId, callerId);
      derivedConversationId = `dm_${smallerId}_${largerId}`;
    }

    const callParams = {
      conversationId: derivedConversationId,
      userId: callData.callerId,
      userName: callData.callerName,
      userPhoto: callData.callerPhoto,
      callType: callData.callType === 'video' ? 'VIDEO' : 'AUDIO',
      isIncoming: true,
      roomName: callData.roomId,
    };

    console.log('[WebSocketProvider] Navigating to Call screen with params:', callParams);
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

    // Clear incoming call state after delay
    setTimeout(() => {
      setIncomingCall(null);
    }, 500);
  }, [navigation, user?.id]);

  // Android: Check for pending call intent OR active ringing call when app launches
  useEffect(() => {
    if (!isAuthenticated || Platform.OS !== 'android') return;
    if (!incomingCallNativeModule.isAvailable()) return;

    // Check once on mount for pending call intent or active ringing call
    const checkForActiveCall = async () => {
      try {
        // First check for pending (accepted) call intent
        const pendingCall = await incomingCallNativeModule.getPendingCallIntent();
        if (pendingCall && pendingCall.action === 'accept_call' && pendingCall.roomId) {
          console.log('[WebSocketProvider] 📞 Found pending call intent, auto-joining:', pendingCall);

          // Create call data and navigate directly to call screen
          const callData: IncomingCallData = {
            roomId: pendingCall.roomId,
            callerId: parseInt(pendingCall.callerId, 10) || 0,
            callerUsername: pendingCall.callerName,
            callerName: pendingCall.callerName,
            callType: (pendingCall.callType as 'voice' | 'video') || 'voice',
            callerPhoto: pendingCall.callerPhoto || undefined,
          };

          // Navigate to call screen directly (skip incoming call modal)
          handleAcceptCallInternal(callData);
          return; // Done, don't check for active call
        }

        // NEW: Check for active ringing call (user dismissed notification but service still running)
        const activeCall = await incomingCallNativeModule.getActiveCallInfo();
        if (activeCall && activeCall.roomId) {
          console.log('[WebSocketProvider] 📞 Found active incoming call, showing modal:', activeCall);

          // BUGFIX: Stop native service FIRST to prevent duplicate vibration
          // The native service has its own vibration running - we need to stop it
          // before React Native takes over with its own vibration.
          // Otherwise both vibrations run, and when user accepts, only RN vibration stops.
          incomingCallNativeModule.hideIncomingCall(activeCall.roomId);
          console.log('[WebSocketProvider] 📞 Stopped native service, React Native taking over');

          // Verify call is still valid on backend before showing modal
          try {
            const callStatus = await getCallStatus(activeCall.roomId);
            if (callStatus && callStatus.isActive) {
              // Show the incoming call modal
              setIncomingCall({
                roomId: activeCall.roomId,
                callerId: parseInt(activeCall.callerId, 10) || 0,
                callerUsername: activeCall.callerName,
                callerName: activeCall.callerName,
                callerPhoto: activeCall.callerPhoto,
                callType: (activeCall.callType as 'voice' | 'video') || 'voice',
              });
              startVibration();
              console.log('[WebSocketProvider] 📞 Active call verified, showing IncomingCallModal');
            } else {
              // Call ended/cancelled - don't show modal
              console.log('[WebSocketProvider] 📞 Call no longer active, not showing modal');
            }
          } catch (statusError) {
            console.warn('[WebSocketProvider] Failed to verify call status:', statusError);
            // Show modal anyway - better UX than ignoring
            setIncomingCall({
              roomId: activeCall.roomId,
              callerId: parseInt(activeCall.callerId, 10) || 0,
              callerUsername: activeCall.callerName,
              callerName: activeCall.callerName,
              callerPhoto: activeCall.callerPhoto,
              callType: (activeCall.callType as 'voice' | 'video') || 'voice',
            });
            startVibration();
          }
        }
      } catch (error) {
        console.warn('[WebSocketProvider] Error checking for active call:', error);
      }
    };

    checkForActiveCall();
  }, [isAuthenticated, handleAcceptCallInternal, startVibration]);

  // P0-03/P0-04: Setup CallKeep event handlers (CallKit for iOS, ConnectionService for Android)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle CallKeep answer (user answered via native call UI)
    callKeepService.setOnAnswerCall((callUUID: string, roomId: string) => {
      console.log('[WebSocketProvider] 📞 CallKeep: User answered call via native UI:', callUUID, roomId);
      callKeepUUIDRef.current = callUUID;

      // Find the incoming call data
      if (incomingCall?.roomId === roomId) {
        // Clear vibration and navigate to call screen
        stopVibration();
        handleAcceptCallInternal(incomingCall);
        callKeepService.answerIncomingCall(callUUID);
      }
    });

    // Handle CallKeep end (user ended via native call UI)
    callKeepService.setOnEndCall((callUUID: string, roomId: string) => {
      console.log('[WebSocketProvider] 📞 CallKeep: User ended call via native UI:', callUUID, roomId);
      callKeepUUIDRef.current = null;

      // If this is an incoming call being declined
      if (incomingCall?.roomId === roomId && incomingCall?.callerId) {
        stopVibration();
        stompService.rejectCall(roomId, incomingCall.callerId, 'declined');
        setIncomingCall(null);
      } else {
        // Active call being ended
        twilioVideoService.handleCallEnded(roomId, 'user_ended');
      }
    });

    // Handle CallKeep mute
    callKeepService.setOnMuteCall((callUUID: string, muted: boolean) => {
      console.log('[WebSocketProvider] 📞 CallKeep: Mute toggled:', callUUID, muted);
      // Notify TwilioVideoService to mute/unmute
      twilioVideoService.setMuted(muted);
    });

    // P0-02: Handle VoIP push for iOS (incoming call from PushKit)
    if (Platform.OS === 'ios') {
      voipPushService.setOnVoIPPush(async (data) => {
        console.log('[WebSocketProvider] 📞 VoIP push received:', data);

        // Display native CallKit UI immediately
        const callUUID = callKeepService.displayIncomingCall({
          callerId: parseInt(data.callerId, 10),
          callerName: data.callerName,
          callerPhoto: data.callerPhoto,
          callType: data.callType,
          roomId: data.roomId,
        });

        if (callUUID) {
          callKeepUUIDRef.current = callUUID;
          console.log('[WebSocketProvider] 📞 CallKit UI displayed:', callUUID);
        }

        // Also set the incoming call state for fallback
        setIncomingCall({
          roomId: data.roomId,
          callerId: parseInt(data.callerId, 10),
          callerUsername: data.callerName,
          callerName: data.callerName,
          callerPhoto: data.callerPhoto,
          callType: data.callType,
        });
      });
    }

    return () => {
      callKeepService.setOnAnswerCall(() => {});
      callKeepService.setOnEndCall(() => {});
      callKeepService.setOnMuteCall(() => {});
      if (Platform.OS === 'ios') {
        voipPushService.setOnVoIPPush(() => {});
      }
    };
  }, [isAuthenticated, incomingCall, stopVibration]);

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
    const unsubscribe = stompService.onCall(async (event: CallEvent) => {
      console.log('[WebSocketProvider] 📞 Call event received:', event);
      if (!isMountedRef.current) return;

      switch (event.type) {
        case 'incoming':
          console.log('[WebSocketProvider] 📞 INCOMING CALL - checking validity first');

          // BUGFIX Fix 6: Deduplication check - prevents duplicate modals on WebSocket reconnect
          const callKey = `${event.roomId}_${event.callerId}`;
          if (processedCallIds.current.has(callKey)) {
            console.log('[WebSocketProvider] 📞 Ignoring duplicate incoming call:', callKey);
            return;
          }
          // Add to processed set (with cleanup after 60s)
          processedCallIds.current.add(callKey);
          setTimeout(() => {
            processedCallIds.current.delete(callKey);
          }, 60000);

          // BUGFIX Fix 3: Check if already handling a call - send busy signal
          if (incomingCall !== null) {
            console.log('[WebSocketProvider] 📞 Already have incoming call, sending busy signal to:', event.roomId);
            stompService.rejectCall(event.roomId, event.callerId!, 'busy');
            return;
          }

          // P0-05: Verify call is still valid before showing modal (prevents ghost calls)
          // TEMPORARILY DISABLED: Backend returns 404 for new calls due to timing issue
          // TODO: Fix backend to commit transaction before sending WebSocket notification
          console.log('[WebSocketProvider] 📞 Showing incoming call modal for:', event.roomId);

          // P0-03/P0-04: Try to display native CallKit/ConnectionService UI first
          if (callKeepService.isAvailable()) {
            const callUUID = callKeepService.displayIncomingCall({
              callerId: event.callerId!,
              callerName: event.callerName || event.callerUsername!,
              callerPhoto: event.callerPhoto,
              callType: event.callType || 'voice',
              roomId: event.roomId,
            });
            if (callUUID) {
              callKeepUUIDRef.current = callUUID;
              console.log('[WebSocketProvider] 📞 Native call UI displayed:', callUUID);
            }
          }

          // Set incoming call state and start vibration (fallback modal will show if CallKeep unavailable)
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
            clearIncomingCall(event.roomId);
          }
          // Notify TwilioVideoService that the call was answered (for caller)
          twilioVideoService.handleCallAnswered(event.roomId);
          break;

        case 'rejected':
          console.log('[WebSocketProvider] 📞 CALL REJECTED - notifying TwilioVideoService');
          // Clear incoming call modal if showing
          if (incomingCall?.roomId === event.roomId) {
            clearIncomingCall(event.roomId);
          }
          // Notify TwilioVideoService that the call was rejected (for caller)
          twilioVideoService.handleCallRejected(event.roomId, event.reason || 'declined');
          break;

        case 'ended':
          console.log('[WebSocketProvider] CALL ENDED - notifying TwilioVideoService');
          // BUGFIX: Stop native Android service first (prevents 65s phantom ringing)
          if (Platform.OS === 'android' && event.roomId) {
            incomingCallNativeModule.hideIncomingCall(event.roomId);
          }
          // Clear incoming call modal if showing
          if (incomingCall?.roomId === event.roomId) {
            clearIncomingCall(event.roomId);
          }
          // P0-03/P0-04: End CallKeep call if active
          const endedCallUUID = callKeepService.getCallUUIDByRoomId(event.roomId);
          if (endedCallUUID) {
            callKeepService.reportEndCallWithReason(endedCallUUID, 'remoteEnded');
            callKeepUUIDRef.current = null;
          }
          // REL-006: Tell TwilioVideoService about the backend-initiated end
          twilioVideoService.handleCallEnded(event.roomId, event.reason);
          break;

        case 'cancelled':
          // P0-06: Handle call_cancelled - caller hung up before we answered
          console.log('[WebSocketProvider] 📞 CALL CANCELLED by caller');
          // BUGFIX: Stop native Android service first (prevents phantom ringing)
          if (Platform.OS === 'android' && event.roomId) {
            incomingCallNativeModule.hideIncomingCall(event.roomId);
            pushDeduplicatorService.markCallCancelled(event.roomId);
          }
          if (incomingCall?.roomId === event.roomId) {
            clearIncomingCall(event.roomId);
          }
          // P0-03/P0-04: End CallKeep call if active
          const cancelledCallUUID = callKeepService.getCallUUIDByRoomId(event.roomId);
          if (cancelledCallUUID) {
            callKeepService.reportEndCallWithReason(cancelledCallUUID, 'remoteEnded');
            callKeepUUIDRef.current = null;
          }
          break;

        case 'error':
          clearIncomingCall(incomingCall?.roomId);
          break;
      }
    });


    // Also listen for WebRTC hangup signals to handle caller timeout
    // ✅ FIX: Pass unique name to prevent duplicate callback registrations
    const unsubWebRTC = stompService.onWebRTCSignal((signal) => {
      if (signal.type === 'hangup' && incomingCall?.roomId === signal.roomName) {
        console.log('[WebSocketProvider] WEBRTC HANGUP received - clearing incoming call');
        // BUGFIX: Stop native Android service (prevents phantom ringing)
        if (Platform.OS === 'android' && signal.roomName) {
          incomingCallNativeModule.hideIncomingCall(signal.roomName);
        }
        clearIncomingCall(signal.roomName);
      }
    }, 'WebSocketProvider');

    return () => {
      unsubscribe();
      unsubWebRTC();
    };
  }, [incomingCall?.roomId, startVibration, clearIncomingCall]);

  // Handle app state changes (background/foreground signals and vibration)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Signal server about backgrounding (user stays "online" but marked as backgrounded)
        stompService.sendBackgroundSignal();
        // Don't stop vibration in background - let user know about call
      } else if (nextAppState === 'active') {
        // Signal server about returning to foreground
        stompService.sendForegroundSignal();

        // Resume vibration if there's still an incoming call in state
        if (incomingCall) {
          startVibration();
        } else if (Platform.OS === 'android' && isAuthenticated) {
          // BUGFIX: Check if native service has an active call that React doesn't know about
          // This happens when user opens app while native IncomingCallService is ringing
          try {
            if (incomingCallNativeModule.isAvailable()) {
              const activeCall = await incomingCallNativeModule.getActiveCallInfo();
              if (activeCall && activeCall.roomId) {
                console.log('[WebSocketProvider] 📞 App foregrounded - found active native call, showing modal:', activeCall.roomId);

                // BUGFIX: Stop native service FIRST to prevent duplicate vibration
                // Native service has its own vibration - stop it before RN takes over
                incomingCallNativeModule.hideIncomingCall(activeCall.roomId);
                console.log('[WebSocketProvider] 📞 Stopped native service, React Native taking over');

                setIncomingCall({
                  roomId: activeCall.roomId,
                  callerId: parseInt(activeCall.callerId, 10) || 0,
                  callerUsername: activeCall.callerName,
                  callerName: activeCall.callerName,
                  callerPhoto: activeCall.callerPhoto,
                  callType: (activeCall.callType as 'voice' | 'video') || 'voice',
                });
                startVibration();
              }
            }
          } catch (error) {
            console.warn('[WebSocketProvider] Error checking active call on foreground:', error);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [incomingCall, startVibration, isAuthenticated]);

  // Handle accept call (from IncomingCallModal)
  const handleAcceptCall = useCallback(() => {
    console.log('[WebSocketProvider] 📞 handleAcceptCall called, incomingCall:', incomingCall);
    if (!incomingCall) return;

    stopVibration();

    // Android: Dismiss native foreground service UI (with error handling)
    if (Platform.OS === 'android') {
      try {
        if (incomingCallNativeModule.isAvailable()) {
          incomingCallNativeModule.hideIncomingCall(incomingCall.roomId);
        }
        pushDeduplicatorService.markCallAccepted(incomingCall.roomId);
      } catch (error) {
        console.warn('[WebSocketProvider] Error in native accept handling:', error);
      }
    }

    // P0-03/P0-04: Report to CallKeep that call was answered
    if (callKeepUUIDRef.current) {
      callKeepService.answerIncomingCall(callKeepUUIDRef.current);
    }

    // Use internal handler for navigation
    handleAcceptCallInternal(incomingCall);
  }, [incomingCall, stopVibration, handleAcceptCallInternal]);

  // Handle decline call (from IncomingCallModal)
  const handleDeclineCall = useCallback(() => {
    console.log('[WebSocketProvider] 📞 handleDeclineCall called, incomingCall:', incomingCall);
    if (!incomingCall) return;

    stopVibration();

    // Android: Dismiss native foreground service UI (with error handling)
    if (Platform.OS === 'android') {
      try {
        if (incomingCallNativeModule.isAvailable()) {
          incomingCallNativeModule.hideIncomingCall(incomingCall.roomId);
        }
        pushDeduplicatorService.markCallDeclined(incomingCall.roomId);
      } catch (error) {
        console.warn('[WebSocketProvider] Error in native decline handling:', error);
      }
    }

    // P0-03/P0-04: Report to CallKeep that call was declined
    if (callKeepUUIDRef.current) {
      callKeepService.endCall(callKeepUUIDRef.current);
      callKeepUUIDRef.current = null;
    }

    stompService.rejectCall(incomingCall.roomId, incomingCall.callerId, 'declined');
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
