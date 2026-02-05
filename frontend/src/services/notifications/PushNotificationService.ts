/**
 * TANDER Push Notification Service
 *
 * Handles registration and management of push notifications via expo-notifications.
 * Works with Firebase Cloud Messaging on Android and APNs on iOS.
 *
 * CRITICAL: For Android, we use native FCM tokens (not Expo Push Tokens)
 * because the backend uses Firebase Admin SDK which only accepts FCM tokens.
 *
 * ANDROID INCOMING CALLS:
 * - Uses native foreground service for reliable ringing
 * - Full-screen intent for lock screen display
 * - Push deduplication to prevent ghost calls
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@services/api/client';

// Import incoming call services for Android
import {
  incomingCallNativeModule,
  pushDeduplicatorService,
  channelMonitorService,
  oemGuidanceService,
  initializeIncomingCallServices,
} from '@/services/incomingCall';

// Storage key for device token
const DEVICE_TOKEN_KEY = '@tander_device_token';
const DEVICE_TOKEN_TYPE_KEY = '@tander_device_token_type';
const NOTIFICATION_PERMISSION_KEY = '@tander_notification_permission';
const DEBUG_MODE = __DEV__ || true; // Enable debug logging

// Debug logger
const debugLog = (message: string, ...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(`[PushNotification] ${message}`, ...args);
  }
};

// Notification types matching backend
export type NotificationType =
  | 'new_match'
  | 'new_message'
  | 'new_like'
  | 'super_like'
  | 'missed_call'
  | 'incoming_call'
  | 'call_cancelled'  // P0-06: Caller cancelled the call
  | 'tandy_reminder';

export interface NotificationData {
  type: NotificationType;
  callerId?: string;
  callerName?: string;
  callerPhoto?: string;
  callType?: string;
  roomId?: string;
  callLogId?: string;
  conversationId?: string;
  [key: string]: string | undefined;
}

// Callback type for incoming call notifications
export type IncomingCallCallback = (data: {
  callerId: number;
  callerName: string;
  callerPhoto?: string;
  callType: 'voice' | 'video';
  roomId: string;
}) => void;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Push notification service class
 */
class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private tokenRefreshListener: Notifications.Subscription | null = null; // P1-03: Token refresh listener
  private onNotificationReceived: ((data: NotificationData) => void) | null = null;
  private onNotificationTapped: ((data: NotificationData) => void) | null = null;
  private onIncomingCall: IncomingCallCallback | null = null;
  private onCallCancelled: ((roomId: string) => void) | null = null; // P0-06: Call cancelled callback

  /**
   * Initialize push notifications
   * Should be called after user authentication
   */
  async initialize(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return false;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'denied');
      return false;
    }

    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();

      // Initialize native incoming call services (foreground service, OEM guidance, etc.)
      try {
        await initializeIncomingCallServices();
        debugLog('Android incoming call services initialized');

        // Set up native call action listener
        this.setupNativeCallActionListener();
      } catch (error) {
        debugLog('Failed to initialize incoming call services:', error);
      }
    }

    // Get and register token
    try {
      const token = await this.getDeviceToken();
      if (token) {
        await this.registerTokenWithBackend(token);
        this.expoPushToken = token;
      }
    } catch (error) {
      console.warn('Failed to get/register push token:', error);
    }

    // Set up notification listeners
    this.setupListeners();

    return true;
  }

  /**
   * Set up listener for native call actions (accept/decline from notification or activity)
   */
  private setupNativeCallActionListener(): void {
    if (Platform.OS !== 'android') return;

    const unsubscribe = incomingCallNativeModule.addCallActionListener((event) => {
      debugLog('Native call action received:', event);

      if (event.action === 'accepted' && this.onIncomingCall) {
        // User accepted from native UI - need to forward to RN
        // The call data should have been stored when we showed the native UI
        debugLog('Call accepted from native UI, roomId:', event.roomId);
      } else if (event.action === 'declined') {
        // User declined from native UI
        debugLog('Call declined from native UI');
        pushDeduplicatorService.markCallDeclined(event.roomId);
      } else if (event.action === 'timeout') {
        // Call timed out (60s)
        debugLog('Call timed out');
        pushDeduplicatorService.markCallTimeout(event.roomId);
      }
    });

    // Store unsubscribe function for cleanup
    this.nativeCallActionUnsubscribe = unsubscribe;
  }

  private nativeCallActionUnsubscribe: (() => void) | null = null;

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // HIGH PRIORITY: Incoming calls channel - maximum importance for ringing
    await Notifications.setNotificationChannelAsync('tander_incoming_calls', {
      name: 'Incoming Calls',
      description: 'Incoming call notifications that ring your phone',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default', // TODO: Use custom ringtone 'ringtone'
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF7518',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Bypass Do Not Disturb for incoming calls
      enableVibrate: true,
      enableLights: true,
    });

    // Main calls channel (for missed calls)
    await Notifications.setNotificationChannelAsync('tander_calls', {
      name: 'Calls',
      description: 'Missed call notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF7518',
    });

    // Messages channel
    await Notifications.setNotificationChannelAsync('tander_messages', {
      name: 'Messages',
      description: 'New message notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    // Matches channel
    await Notifications.setNotificationChannelAsync('tander_matches', {
      name: 'Matches',
      description: 'New match and like notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

    // Reminders channel
    await Notifications.setNotificationChannelAsync('tander_reminders', {
      name: 'Reminders',
      description: 'Tandy reminders and other notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  /**
   * Get the device push token
   * For Android: Uses FCM token directly (required by Firebase backend)
   * For iOS: Uses Expo push token
   *
   * CRITICAL: Android MUST use FCM token, not Expo Push Token.
   * The backend uses Firebase Admin SDK which only accepts FCM tokens.
   */
  private async getDeviceToken(): Promise<string | null> {
    try {
      debugLog('Getting device token for platform:', Platform.OS);

      // For Android, we MUST use FCM token (native device token)
      if (Platform.OS === 'android') {
        try {
          debugLog('Requesting FCM device token...');
          const tokenResult = await Notifications.getDevicePushTokenAsync();
          const deviceToken = tokenResult.data;

          // Validate token format - FCM tokens are long alphanumeric strings
          if (!deviceToken || deviceToken.length < 100) {
            debugLog('WARNING: FCM token seems invalid, length:', deviceToken?.length);
          }

          // Make sure it's not an Expo token (which starts with "ExponentPushToken")
          if (deviceToken.startsWith('ExponentPushToken')) {
            debugLog('ERROR: Got Expo token instead of FCM token!');
            throw new Error('Got Expo token instead of FCM token');
          }

          debugLog('FCM token obtained successfully, length:', deviceToken.length);
          debugLog('FCM token preview:', deviceToken.substring(0, 50) + '...');

          await AsyncStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
          await AsyncStorage.setItem(DEVICE_TOKEN_TYPE_KEY, 'fcm');

          return deviceToken;
        } catch (fcmError: any) {
          debugLog('CRITICAL: Failed to get FCM token:', fcmError.message);
          console.warn('[PushNotificationService] FCM token error:', fcmError);

          // Don't show alert on initial app launch - just log the error
          // The user can still use the app, they just won't get push notifications
          // when the app is closed. This is a non-critical issue for initial testing.
          debugLog('Push notifications will not work when app is closed');

          // Do NOT fall back to Expo token - it won't work with our backend
          return null;
        }
      }

      // For iOS, use Expo push token
      if (Platform.OS === 'ios') {
        debugLog('Requesting Expo push token for iOS...');
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });

        debugLog('Expo push token obtained:', token);
        await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
        await AsyncStorage.setItem(DEVICE_TOKEN_TYPE_KEY, 'expo');

        return token;
      }

      return null;
    } catch (error: any) {
      debugLog('Failed to get push token:', error.message);
      console.warn('[PushNotificationService] Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Verify the stored token is valid and re-register if needed
   */
  async verifyAndRefreshToken(): Promise<boolean> {
    try {
      const storedToken = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
      const tokenType = await AsyncStorage.getItem(DEVICE_TOKEN_TYPE_KEY);

      debugLog('Stored token type:', tokenType);
      debugLog('Stored token preview:', storedToken?.substring(0, 50) + '...');

      // On Android, if we have an Expo token stored, we need to get FCM token
      if (Platform.OS === 'android' && tokenType === 'expo') {
        debugLog('Android has Expo token stored - refreshing to FCM token');
        const newToken = await this.getDeviceToken();
        if (newToken) {
          await this.registerTokenWithBackend(newToken);
          return true;
        }
        return false;
      }

      // Verify token is still valid by re-registering
      if (storedToken) {
        await this.registerTokenWithBackend(storedToken);
        return true;
      }

      return false;
    } catch (error) {
      debugLog('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Register device token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const deviceId = Device.modelName || undefined;

      debugLog('Registering token with backend...');
      debugLog('Platform:', platform);
      debugLog('Device ID:', deviceId);
      debugLog('Token preview:', token.substring(0, 50) + '...');

      const response = await apiClient.post('/api/notifications/register-token', {
        token,
        platform,
        deviceId,
      });

      debugLog('Token registration successful:', response);
      console.log('[PushNotification] Device token registered with backend successfully');
    } catch (error: any) {
      debugLog('Token registration failed:', error.message);
      console.warn('Failed to register token with backend:', error);

      // Show error to user
      if (error.statusCode === 401) {
        debugLog('Auth error - user may need to re-login');
      }
      // Don't throw - app should still work without push notifications
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    debugLog('Setting up notification listeners...');

    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      debugLog('Notification received in foreground:', notification.request.content);

      const data = notification.request.content.data as NotificationData;

      // Handle incoming call notifications specially
      if (data?.type === 'incoming_call' && this.onIncomingCall) {
        debugLog('Incoming call notification received:', data);
        this.handleIncomingCallNotification(data);
        return; // Don't forward to general handler
      }

      // P0-06: Handle call_cancelled notifications
      if (data?.type === 'call_cancelled' && this.onCallCancelled) {
        debugLog('Call cancelled notification received:', data);
        const roomId = data.roomId || data.roomName;
        if (roomId) {
          this.onCallCancelled(roomId);
        }
        return;
      }

      if (this.onNotificationReceived) {
        this.onNotificationReceived(data);
      }
    });

    // Listen for notification responses (user tapped on notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      debugLog('Notification tapped:', response.notification.request.content);

      const data = response.notification.request.content.data as NotificationData;

      // Handle incoming call tap - answer the call
      if (data?.type === 'incoming_call' && this.onIncomingCall) {
        debugLog('Incoming call notification tapped:', data);
        this.handleIncomingCallNotification(data);
        return;
      }

      if (this.onNotificationTapped) {
        this.onNotificationTapped(data);
      }
    });

    // P1-03: Listen for token refresh events
    // This is called when the OS refreshes the push token (can happen at any time)
    if (Platform.OS === 'android') {
      // For Android, listen for FCM token refresh
      this.tokenRefreshListener = Notifications.addPushTokenListener(async (tokenData) => {
        debugLog('P1-03: Token refresh received:', tokenData.data.substring(0, 50) + '...');

        // Validate it's not an Expo token (Android should use FCM)
        if (tokenData.data.startsWith('ExponentPushToken')) {
          debugLog('P1-03: Ignoring Expo token on Android');
          return;
        }

        // Update stored token and re-register with backend
        await AsyncStorage.setItem(DEVICE_TOKEN_KEY, tokenData.data);
        await AsyncStorage.setItem(DEVICE_TOKEN_TYPE_KEY, 'fcm');
        this.expoPushToken = tokenData.data;

        await this.registerTokenWithBackend(tokenData.data);
        debugLog('P1-03: Token refresh registered with backend');
      });
    }

    debugLog('Notification listeners set up successfully');
  }

  /**
   * Check for initial notification when app was opened from killed state
   * This should be called after the app has fully initialized and handlers are set
   */
  async checkInitialNotification(): Promise<void> {
    try {
      debugLog('Checking for initial notification (app opened from killed state)...');

      const lastResponse = await Notifications.getLastNotificationResponseAsync();

      if (lastResponse) {
        const data = lastResponse.notification.request.content.data as NotificationData;
        debugLog('Found initial notification:', data);

        // Handle incoming call if app was opened by tapping a call notification
        if (data?.type === 'incoming_call') {
          debugLog('App was opened from incoming call notification');

          // Wait a bit for handlers to be registered
          setTimeout(() => {
            if (this.onIncomingCall) {
              this.handleIncomingCallNotification(data);
            } else {
              debugLog('No incoming call handler registered yet, will retry...');
              // Retry after another second
              setTimeout(() => {
                if (this.onIncomingCall) {
                  this.handleIncomingCallNotification(data);
                }
              }, 1000);
            }
          }, 500);
        }
      } else {
        debugLog('No initial notification found');
      }
    } catch (error) {
      debugLog('Error checking initial notification:', error);
    }
  }

  /**
   * Handle incoming call notification and trigger the callback
   * On Android, this will:
   * 1. Check for duplicate/cancelled calls (ghost call prevention)
   * 2. Start the native foreground service with ringtone
   * 3. Show full-screen intent on lock screen
   * 4. Forward to RN callback for IncomingCallModal
   */
  private handleIncomingCallNotification(data: NotificationData): void {
    const callerId = data.callerId ? parseInt(data.callerId, 10) : 0;
    const callerName = data.callerName || 'Unknown';
    const callerPhoto = data.callerPhoto || undefined;
    const callType = (data.callType?.toLowerCase() === 'video' ? 'video' : 'voice') as 'voice' | 'video';
    const roomId = data.roomId || '';
    const callId = data.callLogId || roomId; // Use callLogId if available for deduplication

    debugLog('Incoming call data - callerId:', callerId, 'callerName:', callerName, 'callType:', callType);
    debugLog('Incoming call - roomId:', roomId, 'callId:', callId);

    if (!callerId || !roomId) {
      console.warn('[PushNotificationService] Invalid incoming call data:', data);
      return;
    }

    // GHOST CALL PREVENTION: Check if this call should be processed
    if (Platform.OS === 'android') {
      try {
        // Check if this is a duplicate or already cancelled call
        if (!pushDeduplicatorService.shouldProcessCall(callId, roomId)) {
          debugLog('Ignoring call - duplicate or cancelled:', callId);
          return;
        }

        // Mark call as received
        pushDeduplicatorService.markCallReceived(callId, roomId);

        // Start native foreground service with ringtone and full-screen intent
        // This is wrapped in try-catch as native module may not be available
        if (incomingCallNativeModule.isAvailable()) {
          incomingCallNativeModule.showIncomingCall(
            callerId,
            callerName,
            callerPhoto,
            callType,
            roomId
          );
        } else {
          debugLog('Native incoming call module not available, using RN fallback only');
        }

        // Mark call as shown
        pushDeduplicatorService.markCallShown(callId);
      } catch (error) {
        debugLog('Error in native incoming call handling:', error);
        // Continue to RN fallback even if native fails
      }
    }

    // Forward to RN callback for IncomingCallModal
    if (this.onIncomingCall) {
      this.onIncomingCall({
        callerId,
        callerName,
        callerPhoto,
        callType,
        roomId,
      });
    } else {
      console.warn('[PushNotificationService] No incoming call handler registered');
    }
  }

  /**
   * Dismiss incoming call UI (called when call ends or is answered/declined)
   */
  dismissIncomingCall(roomId: string): void {
    if (Platform.OS === 'android') {
      try {
        if (incomingCallNativeModule.isAvailable()) {
          incomingCallNativeModule.hideIncomingCall(roomId);
        }
      } catch (error) {
        debugLog('Error dismissing native incoming call:', error);
      }
    }
  }

  /**
   * Check if OEM guidance should be shown to the user
   */
  async shouldShowOEMGuidance(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return oemGuidanceService.shouldShowGuidance();
  }

  /**
   * Check if channel issues exist that need user attention
   */
  async getChannelIssues(): Promise<any[]> {
    if (Platform.OS !== 'android') return [];
    return channelMonitorService.getIncomingCallsChannelIssues();
  }

  /**
   * Set callback for when notification is received while app is open
   */
  setOnNotificationReceived(callback: (data: NotificationData) => void): void {
    this.onNotificationReceived = callback;
  }

  /**
   * Set callback for when user taps a notification
   */
  setOnNotificationTapped(callback: (data: NotificationData) => void): void {
    this.onNotificationTapped = callback;
  }

  /**
   * Set callback for incoming call notifications
   * This is called when a push notification indicates an incoming call,
   * allowing the app to show the IncomingCallModal even when backgrounded.
   */
  setOnIncomingCall(callback: IncomingCallCallback | null): void {
    this.onIncomingCall = callback;
  }

  /**
   * Unregister push token (call on logout)
   */
  async unregister(): Promise<void> {
    const token = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    if (token) {
      try {
        // Use POST with token in body since DELETE doesn't support body in this client
        await apiClient.post('/api/notifications/unregister-token', { token, action: 'unregister' });
      } catch (error) {
        console.warn('Failed to unregister token:', error);
      }
    }

    await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
    this.expoPushToken = null;
  }

  /**
   * P0-06: Set callback for when a call is cancelled by the caller
   */
  setOnCallCancelled(callback: ((roomId: string) => void) | null): void {
    this.onCallCancelled = callback;
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    // P1-03: Clean up token refresh listener
    if (this.tokenRefreshListener) {
      this.tokenRefreshListener.remove();
      this.tokenRefreshListener = null;
    }
    // Clean up native call action listener
    if (this.nativeCallActionUnsubscribe) {
      this.nativeCallActionUnsubscribe();
      this.nativeCallActionUnsubscribe = null;
    }
    this.onNotificationReceived = null;
    this.onNotificationTapped = null;
    this.onIncomingCall = null;
    this.onCallCancelled = null;
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  /**
   * Schedule a local notification (for testing or reminders)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    seconds: number = 1
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: seconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false } : null,
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
