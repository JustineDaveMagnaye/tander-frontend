/**
 * TANDER CallKeep Service
 *
 * Wraps react-native-callkeep to provide native call UI integration:
 * - iOS: CallKit integration (native call UI, lock screen, recent calls)
 * - Android: ConnectionService integration (native call UI, lock screen)
 *
 * SETUP REQUIREMENTS:
 *
 * 1. Install react-native-callkeep:
 *    npm install react-native-callkeep
 *
 * 2. For iOS - Update app.json to add background modes:
 *    "ios": {
 *      "infoPlist": {
 *        "UIBackgroundModes": ["voip", "audio", "fetch", "remote-notification"]
 *      }
 *    }
 *
 * 3. For iOS - Request VoIP Push entitlement from Apple (requires Apple Developer Program)
 *
 * 4. For Android - Add to AndroidManifest.xml:
 *    <uses-permission android:name="android.permission.BIND_TELECOM_CONNECTION_SERVICE"/>
 *    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
 *    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
 *    <uses-permission android:name="android.permission.CALL_PHONE" />
 *
 * 5. Rebuild the native app:
 *    npx expo prebuild
 *    npx expo run:android / npx expo run:ios
 */

import { Platform, NativeModules, NativeEventEmitter, AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// Define types for CallKeep
export interface CallKeepCall {
  callUUID: string;
  handle: string;
  handleType: 'generic' | 'number' | 'email';
  hasVideo: boolean;
  localizedCallerName: string;
  supportsHolding: boolean;
  supportsDTMF: boolean;
  supportsGrouping: boolean;
  supportsUngrouping: boolean;
}

export interface CallKeepOptions {
  ios: {
    appName: string;
    supportsVideo: boolean;
    maximumCallGroups: number;
    maximumCallsPerCallGroup: number;
    ringtoneSound?: string;
    includesCallsInRecents?: boolean;
  };
  android: {
    alertTitle: string;
    alertDescription: string;
    cancelButton: string;
    okButton: string;
    imageName: string;
    additionalPermissions: string[];
    selfManaged?: boolean;
  };
}

export interface IncomingCallData {
  callerId: number;
  callerName: string;
  callerPhoto?: string;
  callType: 'voice' | 'video';
  roomId: string;
}

// Callback types
export type AnswerCallHandler = (callUUID: string, roomId: string) => void;
export type EndCallHandler = (callUUID: string, roomId: string) => void;
export type MuteCallHandler = (callUUID: string, muted: boolean) => void;

// Check if CallKeep is available and properly linked
let RNCallKeep: any = null;
let callKeepEmitter: NativeEventEmitter | null = null;
let isCallKeepAvailable = false;

try {
  // Try to get react-native-callkeep native module
  const callKeepModule = NativeModules.RNCallKeep;

  // Check if module exists AND has the setup method (properly linked)
  if (callKeepModule && typeof callKeepModule.setup === 'function') {
    RNCallKeep = callKeepModule;
    callKeepEmitter = new NativeEventEmitter(RNCallKeep);
    isCallKeepAvailable = true;
    console.log('[CallKeepService] Native module available');
  } else {
    console.log('[CallKeepService] Native module not properly linked (missing setup method)');
  }
} catch (e) {
  console.log('[CallKeepService] react-native-callkeep not available:', e);
}

/**
 * CallKeep Service for native call integration
 */
class CallKeepService {
  private isSetup = false;
  private activeCalls: Map<string, { roomId: string; callerId: number }> = new Map();

  // Callbacks
  private onAnswerCall: AnswerCallHandler | null = null;
  private onEndCall: EndCallHandler | null = null;
  private onMuteCall: MuteCallHandler | null = null;

  /**
   * Check if CallKeep is available on this device
   */
  isAvailable(): boolean {
    return isCallKeepAvailable && RNCallKeep !== null;
  }

  /**
   * Setup CallKeep with configuration
   */
  async setup(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[CallKeepService] CallKeep not available - native call UI will not work');
      console.warn('[CallKeepService] To enable, install react-native-callkeep and rebuild the app');
      return false;
    }

    if (this.isSetup) {
      return true;
    }

    const options: CallKeepOptions = {
      ios: {
        appName: 'TANDER',
        supportsVideo: true,
        maximumCallGroups: 1,
        maximumCallsPerCallGroup: 1,
        ringtoneSound: 'ringtone.caf',
        includesCallsInRecents: true,
      },
      android: {
        alertTitle: 'Permissions Required',
        alertDescription: 'TANDER needs phone account permissions for incoming calls',
        cancelButton: 'Cancel',
        okButton: 'OK',
        imageName: 'ic_launcher',
        additionalPermissions: [],
        selfManaged: true, // Use self-managed ConnectionService
      },
    };

    try {
      await RNCallKeep.setup(options);
      this.setupEventListeners();
      this.isSetup = true;
      console.log('[CallKeepService] Setup complete');
      return true;
    } catch (error) {
      console.warn('[CallKeepService] Setup failed:', error);
      return false;
    }
  }

  /**
   * Setup event listeners for CallKit/ConnectionService events
   */
  private setupEventListeners(): void {
    if (!callKeepEmitter) return;

    // User answered the call
    callKeepEmitter.addListener('answerCall', ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKeepService] Answer call:', callUUID);
      const callData = this.activeCalls.get(callUUID);
      if (callData && this.onAnswerCall) {
        this.onAnswerCall(callUUID, callData.roomId);
      }
    });

    // User ended the call
    callKeepEmitter.addListener('endCall', ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKeepService] End call:', callUUID);
      const callData = this.activeCalls.get(callUUID);
      if (callData && this.onEndCall) {
        this.onEndCall(callUUID, callData.roomId);
      }
      this.activeCalls.delete(callUUID);
    });

    // User toggled mute
    callKeepEmitter.addListener('didPerformSetMutedCallAction', ({ callUUID, muted }: { callUUID: string; muted: boolean }) => {
      console.log('[CallKeepService] Mute call:', callUUID, muted);
      if (this.onMuteCall) {
        this.onMuteCall(callUUID, muted);
      }
    });

    // Call was activated (audio session started)
    callKeepEmitter.addListener('didActivateAudioSession', () => {
      console.log('[CallKeepService] Audio session activated');
    });

    // User toggled hold (we don't support hold, but handle it)
    callKeepEmitter.addListener('didToggleHoldCallAction', ({ callUUID, hold }: { callUUID: string; hold: boolean }) => {
      console.log('[CallKeepService] Hold call:', callUUID, hold);
      // We don't support hold - just end the call
      if (hold) {
        this.endCall(callUUID);
      }
    });
  }

  /**
   * Display incoming call UI
   * Returns the callUUID for tracking
   */
  displayIncomingCall(data: IncomingCallData): string | null {
    if (!this.isAvailable() || !this.isSetup) {
      console.log('[CallKeepService] Cannot display incoming call - not setup');
      return null;
    }

    const callUUID = uuidv4().toUpperCase();

    try {
      RNCallKeep.displayIncomingCall(
        callUUID,
        data.roomId, // handle (phone number or identifier)
        data.callerName, // localizedCallerName
        'generic', // handleType
        data.callType === 'video' // hasVideo
      );

      this.activeCalls.set(callUUID, {
        roomId: data.roomId,
        callerId: data.callerId,
      });

      console.log('[CallKeepService] Displayed incoming call:', callUUID);
      return callUUID;
    } catch (error) {
      console.warn('[CallKeepService] Failed to display incoming call:', error);
      return null;
    }
  }

  /**
   * Start an outgoing call
   */
  startCall(roomId: string, calleeName: string, hasVideo: boolean): string | null {
    if (!this.isAvailable() || !this.isSetup) {
      return null;
    }

    const callUUID = uuidv4().toUpperCase();

    try {
      RNCallKeep.startCall(callUUID, roomId, calleeName, 'generic', hasVideo);
      this.activeCalls.set(callUUID, { roomId, callerId: 0 });
      console.log('[CallKeepService] Started outgoing call:', callUUID);
      return callUUID;
    } catch (error) {
      console.warn('[CallKeepService] Failed to start call:', error);
      return null;
    }
  }

  /**
   * Report that the call was answered (update system call state)
   */
  answerIncomingCall(callUUID: string): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.answerIncomingCall(callUUID);
    } catch (error) {
      console.warn('[CallKeepService] Failed to answer call:', error);
    }
  }

  /**
   * Report that the outgoing call started connecting
   */
  reportConnectingOutgoingCall(callUUID: string): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.reportConnectingOutgoingCallWithUUID(callUUID);
    } catch (error) {
      console.warn('[CallKeepService] Failed to report connecting:', error);
    }
  }

  /**
   * Report that the call is connected
   */
  reportConnectedCall(callUUID: string): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.reportConnectedOutgoingCallWithUUID(callUUID);
    } catch (error) {
      console.warn('[CallKeepService] Failed to report connected:', error);
    }
  }

  /**
   * End a call
   */
  endCall(callUUID: string): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.endCall(callUUID);
      this.activeCalls.delete(callUUID);
      console.log('[CallKeepService] Ended call:', callUUID);
    } catch (error) {
      console.warn('[CallKeepService] Failed to end call:', error);
    }
  }

  /**
   * End all active calls
   */
  endAllCalls(): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.endAllCalls();
      this.activeCalls.clear();
      console.log('[CallKeepService] Ended all calls');
    } catch (error) {
      console.warn('[CallKeepService] Failed to end all calls:', error);
    }
  }

  /**
   * Report incoming call ended (declined, missed, cancelled)
   */
  reportEndCallWithReason(callUUID: string, reason: 'failed' | 'remoteEnded' | 'unanswered' | 'answeredElsewhere' | 'declinedElsewhere'): void {
    if (!this.isAvailable()) return;

    // Map reason to CallKeep constants
    const reasonMap: Record<string, number> = {
      failed: 1,
      remoteEnded: 2,
      unanswered: 3,
      answeredElsewhere: 4,
      declinedElsewhere: 5,
    };

    try {
      RNCallKeep.reportEndCallWithUUID(callUUID, reasonMap[reason] || 2);
      this.activeCalls.delete(callUUID);
    } catch (error) {
      console.warn('[CallKeepService] Failed to report end call:', error);
    }
  }

  /**
   * Update call display (e.g., when caller name is resolved)
   */
  updateDisplay(callUUID: string, callerName: string, handle: string): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.updateDisplay(callUUID, callerName, handle);
    } catch (error) {
      console.warn('[CallKeepService] Failed to update display:', error);
    }
  }

  /**
   * Set the mute state
   */
  setMutedCall(callUUID: string, muted: boolean): void {
    if (!this.isAvailable()) return;
    try {
      RNCallKeep.setMutedCall(callUUID, muted);
    } catch (error) {
      console.warn('[CallKeepService] Failed to set muted:', error);
    }
  }

  /**
   * Set callbacks
   */
  setOnAnswerCall(handler: AnswerCallHandler): void {
    this.onAnswerCall = handler;
  }

  setOnEndCall(handler: EndCallHandler): void {
    this.onEndCall = handler;
  }

  setOnMuteCall(handler: MuteCallHandler): void {
    this.onMuteCall = handler;
  }

  /**
   * Get active call by roomId
   */
  getCallUUIDByRoomId(roomId: string): string | undefined {
    for (const [uuid, data] of this.activeCalls.entries()) {
      if (data.roomId === roomId) {
        return uuid;
      }
    }
    return undefined;
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.activeCalls.size > 0;
  }

  /**
   * Get the current active call count
   */
  getActiveCallCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Check if phone has phone account permission (Android)
   */
  async checkPhoneAccountPermission(): Promise<boolean> {
    if (!this.isAvailable() || Platform.OS !== 'android') {
      return true;
    }
    try {
      return await RNCallKeep.checkPhoneAccountEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Prompt user to enable phone account (Android)
   */
  async promptPhoneAccountPermission(): Promise<void> {
    if (!this.isAvailable() || Platform.OS !== 'android') {
      return;
    }
    try {
      await RNCallKeep.checkPhoneAccountEnabled();
    } catch (error) {
      console.warn('[CallKeepService] Failed to prompt phone account:', error);
    }
  }
}

// Export singleton instance
export const callKeepService = new CallKeepService();

export default callKeepService;
