/**
 * TANDER Push Notification Service
 *
 * Handles registration and management of push notifications via expo-notifications.
 * Works with Firebase Cloud Messaging on Android and APNs on iOS.
 *
 * CRITICAL: For Android, we use native FCM tokens (not Expo Push Tokens)
 * because the backend uses Firebase Admin SDK which only accepts FCM tokens.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@services/api/client';

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
  private onNotificationReceived: ((data: NotificationData) => void) | null = null;
  private onNotificationTapped: ((data: NotificationData) => void) | null = null;
  private onIncomingCall: IncomingCallCallback | null = null;

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
    }

    // Get and register token
    try {
      const token = await this.getDeviceToken();
      if (token) {
        await this.registerTokenWithBackend(token);
        this.expoPushToken = token;
      }
    } catch (error) {
      console.error('Failed to get/register push token:', error);
    }

    // Set up notification listeners
    this.setupListeners();

    return true;
  }

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
          console.error('[PushNotificationService] FCM token error:', fcmError);

          // Show user alert about notification issue
          Alert.alert(
            'Notification Setup Issue',
            'Unable to set up push notifications. You may not receive call notifications when the app is closed. Please ensure Google Play Services is up to date.',
            [{ text: 'OK' }]
          );

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
      console.error('[PushNotificationService] Failed to get push token:', error);
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
      console.error('Failed to register token with backend:', error);

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
   */
  private handleIncomingCallNotification(data: NotificationData): void {
    if (!this.onIncomingCall) {
      console.warn('[PushNotificationService] No incoming call handler registered');
      return;
    }

    const callerId = data.callerId ? parseInt(data.callerId, 10) : 0;
    const callerName = data.callerName || 'Unknown';
    const callerPhoto = data.callerPhoto || undefined;
    const callType = (data.callType?.toLowerCase() === 'video' ? 'video' : 'voice') as 'voice' | 'video';
    const roomId = data.roomId || '';

    debugLog('Incoming call data - callerId:', callerId, 'callerName:', callerName, 'callerPhoto:', callerPhoto);

    if (!callerId || !roomId) {
      console.error('[PushNotificationService] Invalid incoming call data:', data);
      return;
    }

    this.onIncomingCall({
      callerId,
      callerName,
      callerPhoto,
      callType,
      roomId,
    });
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
        console.error('Failed to unregister token:', error);
      }
    }

    await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
    this.expoPushToken = null;
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
    this.onNotificationReceived = null;
    this.onNotificationTapped = null;
    this.onIncomingCall = null;
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
