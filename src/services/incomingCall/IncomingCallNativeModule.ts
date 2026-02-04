/**
 * TANDER Incoming Call Native Module
 *
 * TypeScript interface for the native Android IncomingCallModule.
 * Provides access to native incoming call functionality including:
 * - Foreground service for keeping app alive
 * - Full-screen intent for lock screen display
 * - Notification channel management
 * - OEM-specific settings access
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Pending call intent interface
export interface PendingCallIntent {
  action: string;
  roomId: string;
  callType: string;
  callerName: string;
  callerId: string;
  callerPhoto?: string;
}

// Active call info interface (for when app opens during an active ringing call)
export interface ActiveCallInfo {
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  callType: string;
  roomId: string;
}

// Native module interface
interface IncomingCallModuleInterface {
  showIncomingCall(
    callerId: string,
    callerName: string,
    callerPhoto: string | null,
    callType: string,
    roomId: string
  ): void;

  hideIncomingCall(roomId: string): void;

  isCallActive(): Promise<boolean>;

  getActiveCallInfo(): Promise<ActiveCallInfo | null>;

  getPendingCallIntent(): Promise<PendingCallIntent | null>;

  getChannelState(channelId: string): Promise<ChannelState>;

  areNotificationsEnabled(): Promise<boolean>;

  openNotificationSettings(): void;

  openChannelSettings(channelId: string): void;

  getDeviceInfo(): Promise<DeviceInfo>;

  isBatteryOptimizationIgnored(): Promise<boolean>;

  requestIgnoreBatteryOptimization(): void;

  openBatteryOptimizationSettings(): void;

  openAutoStartSettings(): void;

  canUseFullScreenIntent(): Promise<boolean>;

  openFullScreenIntentSettings(): void;

  ensureNotificationChannel(): void;

  runPreflightCheck(): Promise<PreflightCheckResult>;

  getActionableIssues(): Promise<ActionableIssue[]>;

  logDiagnostics(): void;

  setAuthToken(token: string): void;

  clearAuthToken(): void;
}

// Channel state interface
export interface ChannelState {
  exists: boolean;
  enabled: boolean;
  importance: number;
  sound: boolean;
  vibration: boolean;
  bypassDnd: boolean;
}

// Device info interface
export interface DeviceInfo {
  manufacturer: string;
  brand: string;
  model: string;
  sdkVersion: number;
  release: string;
}

// Call action event interface
export interface CallActionEvent {
  action: 'accepted' | 'declined' | 'timeout';
  roomId: string;
}

// Preflight check result interface
export interface PreflightCheckResult {
  notificationsEnabled: boolean;
  channelConfigured: boolean;
  channelExists: boolean;
  channelImportance: number;
  batteryOptimizationIgnored: boolean;
  fullScreenIntentAllowed: boolean;
  manufacturer: string;
  brand: string;
  model: string;
  sdkVersion: number;
  isAggressiveOEM: boolean;
  criticalRequirementsMet: boolean;
  fullyOptimized: boolean;
  serviceRunning: boolean;
}

// Actionable issue interface
export interface ActionableIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
}

// Channel importance levels
export const ChannelImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
} as const;

// Get the native module with error handling
let IncomingCallNative: IncomingCallModuleInterface | null = null;

try {
  if (Platform.OS === 'android') {
    IncomingCallNative = NativeModules.IncomingCallModule || null;
    if (!IncomingCallNative) {
      console.warn('[IncomingCallNative] Native module not found - native features will be disabled');
    }
  }
} catch (error) {
  console.warn('[IncomingCallNative] Failed to load native module:', error);
}

// Event emitter for call actions
let eventEmitter: NativeEventEmitter | null = null;

if (Platform.OS === 'android' && IncomingCallNative) {
  eventEmitter = new NativeEventEmitter(NativeModules.IncomingCallModule);
}

/**
 * Incoming Call Native Module Service
 *
 * Provides a high-level API for interacting with the native incoming call functionality.
 */
class IncomingCallNativeModuleService {
  private callActionListeners: ((event: CallActionEvent) => void)[] = [];
  private subscription: any = null;

  constructor() {
    this.setupEventListener();
  }

  /**
   * Check if the native module is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && IncomingCallNative !== null;
  }

  /**
   * Set up the event listener for call actions
   */
  private setupEventListener(): void {
    if (!eventEmitter) return;

    this.subscription = eventEmitter.addListener('onCallAction', (event: CallActionEvent) => {
      console.log('[IncomingCallNative] Received call action:', event);
      this.callActionListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.warn('[IncomingCallNative] Error in call action listener:', error);
        }
      });
    });
  }

  /**
   * Add a listener for call actions (accept, decline, timeout)
   */
  addCallActionListener(listener: (event: CallActionEvent) => void): () => void {
    this.callActionListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.callActionListeners.indexOf(listener);
      if (index > -1) {
        this.callActionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Show incoming call UI with foreground service
   */
  showIncomingCall(
    callerId: string | number,
    callerName: string,
    callerPhoto: string | undefined | null,
    callType: 'voice' | 'video',
    roomId: string
  ): void {
    if (!IncomingCallNative) {
      console.warn('[IncomingCallNative] Module not available');
      return;
    }

    console.log('[IncomingCallNative] Showing incoming call:', { callerId, callerName, callType, roomId });

    IncomingCallNative.showIncomingCall(
      String(callerId),
      callerName,
      callerPhoto || null,
      callType,
      roomId
    );
  }

  /**
   * Hide incoming call UI and stop service
   */
  hideIncomingCall(roomId: string): void {
    if (!IncomingCallNative) {
      console.warn('[IncomingCallNative] Module not available');
      return;
    }

    console.log('[IncomingCallNative] Hiding incoming call:', roomId);
    IncomingCallNative.hideIncomingCall(roomId);
  }

  /**
   * Check if there's an active incoming call
   */
  async isCallActive(): Promise<boolean> {
    if (!IncomingCallNative) return false;
    return IncomingCallNative.isCallActive();
  }

  /**
   * Get the current active incoming call info (if IncomingCallService is running)
   * Used when app opens during an active ringing call to show the IncomingCallModal
   */
  async getActiveCallInfo(): Promise<ActiveCallInfo | null> {
    if (!IncomingCallNative) return null;
    // Check if method exists before calling (may not be implemented in older builds)
    if (typeof IncomingCallNative.getActiveCallInfo !== 'function') {
      console.log('[IncomingCallNative] getActiveCallInfo method not available in native module');
      return null;
    }
    try {
      const result = await IncomingCallNative.getActiveCallInfo();
      if (result) {
        console.log('[IncomingCallNative] Found active call info:', result);
      }
      return result;
    } catch (error) {
      console.warn('[IncomingCallNative] Error getting active call info:', error);
      return null;
    }
  }

  /**
   * Check if the app was launched with a pending call action (accept from notification/activity)
   * Call this on app startup to auto-join calls that were accepted from native UI
   */
  async getPendingCallIntent(): Promise<PendingCallIntent | null> {
    if (!IncomingCallNative) return null;
    // Check if method exists before calling (may not be implemented in dev builds)
    if (typeof IncomingCallNative.getPendingCallIntent !== 'function') {
      console.log('[IncomingCallNative] getPendingCallIntent method not available in native module');
      return null;
    }
    try {
      const result = await IncomingCallNative.getPendingCallIntent();
      if (result) {
        console.log('[IncomingCallNative] Found pending call intent:', result);
      }
      return result;
    } catch (error) {
      console.warn('[IncomingCallNative] Error getting pending call intent:', error);
      return null;
    }
  }

  /**
   * Get the state of a notification channel
   */
  async getChannelState(channelId: string): Promise<ChannelState> {
    if (!IncomingCallNative) {
      return {
        exists: false,
        enabled: false,
        importance: 0,
        sound: false,
        vibration: false,
        bypassDnd: false,
      };
    }
    return IncomingCallNative.getChannelState(channelId);
  }

  /**
   * Check if notifications are enabled for the app
   */
  async areNotificationsEnabled(): Promise<boolean> {
    if (!IncomingCallNative) return true;
    return IncomingCallNative.areNotificationsEnabled();
  }

  /**
   * Open the app's notification settings
   */
  openNotificationSettings(): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.openNotificationSettings();
  }

  /**
   * Open a specific notification channel's settings
   */
  openChannelSettings(channelId: string): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.openChannelSettings(channelId);
  }

  /**
   * Get device information for OEM detection
   */
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    if (!IncomingCallNative) return null;
    return IncomingCallNative.getDeviceInfo();
  }

  /**
   * Check if battery optimization is ignored (app whitelisted)
   */
  async isBatteryOptimizationIgnored(): Promise<boolean> {
    if (!IncomingCallNative) return true;
    return IncomingCallNative.isBatteryOptimizationIgnored();
  }

  /**
   * Request to ignore battery optimizations
   */
  requestIgnoreBatteryOptimization(): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.requestIgnoreBatteryOptimization();
  }

  /**
   * Open battery optimization settings
   */
  openBatteryOptimizationSettings(): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.openBatteryOptimizationSettings();
  }

  /**
   * Open OEM-specific auto-start settings
   */
  openAutoStartSettings(): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.openAutoStartSettings();
  }

  /**
   * Check if full-screen intent permission is granted (Android 14+)
   */
  async canUseFullScreenIntent(): Promise<boolean> {
    if (!IncomingCallNative) return true;
    return IncomingCallNative.canUseFullScreenIntent();
  }

  /**
   * Open full-screen intent settings (Android 14+)
   */
  openFullScreenIntentSettings(): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.openFullScreenIntentSettings();
  }

  /**
   * Ensure the incoming calls notification channel exists
   */
  ensureNotificationChannel(): void {
    if (!IncomingCallNative) return;
    IncomingCallNative.ensureNotificationChannel();
  }

  /**
   * Run comprehensive pre-flight system check
   * Returns all critical status indicators at once
   */
  async runPreflightCheck(): Promise<PreflightCheckResult | null> {
    if (!IncomingCallNative) {
      console.log('[IncomingCallNative] Module not available, skipping preflight check');
      return null;
    }

    try {
      const result = await IncomingCallNative.runPreflightCheck();
      console.log('[IncomingCallNative] Preflight check result:', {
        critical: result.criticalRequirementsMet,
        optimized: result.fullyOptimized,
        device: `${result.manufacturer} ${result.model}`,
      });
      return result;
    } catch (error) {
      console.warn('[IncomingCallNative] Preflight check failed:', error);
      return null;
    }
  }

  /**
   * Get list of issues that need user action
   */
  async getActionableIssues(): Promise<ActionableIssue[]> {
    if (!IncomingCallNative) {
      return [];
    }

    try {
      return await IncomingCallNative.getActionableIssues();
    } catch (error) {
      console.warn('[IncomingCallNative] Failed to get actionable issues:', error);
      return [];
    }
  }

  /**
   * Execute action for an issue (opens the relevant settings screen)
   */
  executeIssueAction(action: string): void {
    if (!IncomingCallNative) return;

    switch (action) {
      case 'openNotificationSettings':
        this.openNotificationSettings();
        break;
      case 'openChannelSettings':
        this.openChannelSettings('tander_incoming_calls');
        break;
      case 'ensureNotificationChannel':
        this.ensureNotificationChannel();
        break;
      case 'requestIgnoreBatteryOptimization':
        this.requestIgnoreBatteryOptimization();
        break;
      case 'openFullScreenIntentSettings':
        this.openFullScreenIntentSettings();
        break;
      case 'openAutoStartSettings':
        this.openAutoStartSettings();
        break;
      default:
        console.warn('[IncomingCallNative] Unknown action:', action);
    }
  }

  /**
   * Log diagnostic info for debugging
   */
  logDiagnostics(): void {
    if (!IncomingCallNative) {
      console.log('[IncomingCallNative] Module not available, cannot log diagnostics');
      return;
    }
    IncomingCallNative.logDiagnostics();
  }

  /**
   * Initialize with automatic setup and issue detection
   * Returns true if all critical requirements are met
   */
  async initializeWithCheck(): Promise<{
    success: boolean;
    issues: ActionableIssue[];
    preflight: PreflightCheckResult | null;
  }> {
    console.log('[IncomingCallNative] Initializing with check...');

    // Ensure channel exists
    this.ensureNotificationChannel();

    // Run preflight check
    const preflight = await this.runPreflightCheck();

    // Get actionable issues
    const issues = await this.getActionableIssues();

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const success = criticalIssues.length === 0;

    if (!success) {
      console.warn('[IncomingCallNative] Critical issues found:', criticalIssues.map(i => i.id));
    } else {
      console.log('[IncomingCallNative] All critical requirements met');
    }

    // Log diagnostics in dev mode
    if (__DEV__) {
      this.logDiagnostics();
    }

    return { success, issues, preflight };
  }

  /**
   * Store auth token in native SharedPreferences for native API calls
   * This is needed for decline functionality when app is killed
   */
  setAuthToken(token: string): void {
    if (!IncomingCallNative) {
      console.log('[IncomingCallNative] Module not available, cannot store auth token');
      return;
    }
    // Check if method exists before calling (may not be implemented in dev builds)
    if (typeof IncomingCallNative.setAuthToken !== 'function') {
      console.log('[IncomingCallNative] setAuthToken method not available in native module');
      return;
    }
    try {
      IncomingCallNative.setAuthToken(token);
      console.log('[IncomingCallNative] Auth token stored in native prefs');
    } catch (error) {
      console.warn('[IncomingCallNative] Failed to store auth token:', error);
    }
  }

  /**
   * Clear auth token from native SharedPreferences on logout
   */
  clearAuthToken(): void {
    if (!IncomingCallNative) {
      console.log('[IncomingCallNative] Module not available, cannot clear auth token');
      return;
    }
    // Check if method exists before calling (may not be implemented in dev builds)
    if (typeof IncomingCallNative.clearAuthToken !== 'function') {
      console.log('[IncomingCallNative] clearAuthToken method not available in native module');
      return;
    }
    try {
      IncomingCallNative.clearAuthToken();
      console.log('[IncomingCallNative] Auth token cleared from native prefs');
    } catch (error) {
      console.warn('[IncomingCallNative] Failed to clear auth token:', error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.callActionListeners = [];
  }
}

// Export singleton instance
export const incomingCallNativeModule = new IncomingCallNativeModuleService();

export default incomingCallNativeModule;
