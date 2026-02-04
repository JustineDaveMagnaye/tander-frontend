/**
 * TANDER VoIP Push Service
 *
 * Handles VoIP push notifications for iOS using PushKit.
 * VoIP pushes are required for iOS to wake the app and show CallKit UI
 * when an incoming call arrives while the app is terminated.
 *
 * SETUP REQUIREMENTS:
 *
 * 1. Install react-native-voip-push-notification:
 *    npm install react-native-voip-push-notification
 *
 * 2. Enable VoIP Push capability in Xcode:
 *    - Open ios/tander.xcworkspace in Xcode
 *    - Go to Signing & Capabilities
 *    - Add "Push Notifications" capability
 *    - Add "Background Modes" capability
 *    - Enable "Voice over IP" in Background Modes
 *
 * 3. Create VoIP certificate in Apple Developer Portal:
 *    - Go to Certificates, Identifiers & Profiles
 *    - Create a VoIP Services Certificate
 *    - Download and install the certificate
 *
 * 4. Send VoIP token to backend (different from regular push token)
 *
 * 5. Backend must send VoIP pushes via APNs (not FCM):
 *    - Use apns-topic: com.tander.app.voip
 *    - Use apns-push-type: voip
 *
 * NOTE: This service only works on iOS. On Android, FCM HIGH priority
 * with react-native-callkeep is used instead.
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

// VoIP push data structure
export interface VoIPPushData {
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  callType: 'voice' | 'video';
  roomId: string;
  uuid: string; // Unique call identifier for CallKit
}

export type VoIPPushHandler = (data: VoIPPushData) => void;
export type VoIPTokenHandler = (token: string) => void;

// Check if VoIP push module is available and properly linked
let RNVoipPushNotification: any = null;
let voipPushEmitter: NativeEventEmitter | null = null;
let isVoIPAvailable = false;

try {
  const voipModule = NativeModules.RNVoipPushNotification;

  // Check if module exists AND has the required methods (properly linked)
  if (voipModule && typeof voipModule.requestPermissions === 'function') {
    RNVoipPushNotification = voipModule;
    voipPushEmitter = new NativeEventEmitter(RNVoipPushNotification);
    isVoIPAvailable = true;
    console.log('[VoIPPushService] Native module available');
  } else if (Platform.OS === 'ios') {
    console.log('[VoIPPushService] Native module not properly linked');
  }
} catch (e) {
  console.log('[VoIPPushService] react-native-voip-push-notification not available:', e);
}

/**
 * VoIP Push Service for iOS
 */
class VoIPPushService {
  private voipToken: string | null = null;
  private isRegistered = false;
  private onVoIPPush: VoIPPushHandler | null = null;
  private onTokenReceived: VoIPTokenHandler | null = null;

  /**
   * Check if VoIP push is available
   * Only available on iOS with react-native-voip-push-notification installed
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && isVoIPAvailable && RNVoipPushNotification !== null;
  }

  /**
   * Register for VoIP push notifications
   * This should be called early in the app lifecycle
   */
  async register(): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('[VoIPPushService] VoIP push not available on this platform');
      return null;
    }

    if (this.isRegistered) {
      return this.voipToken;
    }

    try {
      // Register for VoIP notifications
      RNVoipPushNotification.registerVoipToken();

      // Setup event listeners
      this.setupEventListeners();

      this.isRegistered = true;
      console.log('[VoIPPushService] Registered for VoIP push');

      // Return token if already available
      return this.voipToken;
    } catch (error) {
      console.warn('[VoIPPushService] Failed to register:', error);
      return null;
    }
  }

  /**
   * Setup event listeners for VoIP push events
   */
  private setupEventListeners(): void {
    if (!voipPushEmitter) return;

    // Token received
    voipPushEmitter.addListener('register', (token: string) => {
      console.log('[VoIPPushService] VoIP token received:', token.substring(0, 20) + '...');
      this.voipToken = token;

      if (this.onTokenReceived) {
        this.onTokenReceived(token);
      }
    });

    // VoIP push received
    voipPushEmitter.addListener('notification', (notification: any) => {
      console.log('[VoIPPushService] VoIP push received:', notification);

      // Parse the notification data
      const data: VoIPPushData = {
        callerId: notification.callerId || notification.caller_id || '',
        callerName: notification.callerName || notification.caller_name || 'Unknown',
        callerPhoto: notification.callerPhoto || notification.caller_photo,
        callType: notification.callType || notification.call_type || 'voice',
        roomId: notification.roomId || notification.room_id || '',
        uuid: notification.uuid || notification.call_uuid || '',
      };

      if (this.onVoIPPush) {
        this.onVoIPPush(data);
      }

      // Mark notification as completed
      // This is required by Apple to indicate the push was handled
      RNVoipPushNotification.onVoipNotificationCompleted(notification.uuid || '');
    });

    // Did load with events (app launched from VoIP push while terminated)
    voipPushEmitter.addListener('didLoadWithEvents', (events: any[]) => {
      console.log('[VoIPPushService] Did load with events:', events);

      if (events && events.length > 0) {
        // Process the most recent notification
        const latestNotification = events[events.length - 1];
        if (latestNotification.name === 'RNVoipPushRemoteNotificationsRegisteredEvent') {
          // Token received
          this.voipToken = latestNotification.data;
          if (this.onTokenReceived) {
            this.onTokenReceived(latestNotification.data);
          }
        } else if (latestNotification.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
          // Notification received
          const data: VoIPPushData = {
            callerId: latestNotification.data.callerId || '',
            callerName: latestNotification.data.callerName || 'Unknown',
            callerPhoto: latestNotification.data.callerPhoto,
            callType: latestNotification.data.callType || 'voice',
            roomId: latestNotification.data.roomId || '',
            uuid: latestNotification.data.uuid || '',
          };

          if (this.onVoIPPush) {
            this.onVoIPPush(data);
          }
        }
      }
    });
  }

  /**
   * Set handler for incoming VoIP push notifications
   * This should trigger CallKit to display the incoming call UI
   */
  setOnVoIPPush(handler: VoIPPushHandler): void {
    this.onVoIPPush = handler;
  }

  /**
   * Set handler for when VoIP token is received
   * The token should be sent to the backend for VoIP push delivery
   */
  setOnTokenReceived(handler: VoIPTokenHandler): void {
    this.onTokenReceived = handler;

    // If we already have a token, call the handler immediately
    if (this.voipToken) {
      handler(this.voipToken);
    }
  }

  /**
   * Get the current VoIP token
   */
  getToken(): string | null {
    return this.voipToken;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.onVoIPPush = null;
    this.onTokenReceived = null;
  }
}

// Export singleton instance
export const voipPushService = new VoIPPushService();

export default voipPushService;
