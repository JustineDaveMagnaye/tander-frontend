/**
 * TANDER Channel Monitor Service
 *
 * Monitors the state of Android notification channels and provides
 * guidance to users when channels are disabled or misconfigured.
 *
 * This is important because users can manually disable channels
 * through system settings, which would prevent call notifications
 * from being delivered.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  incomingCallNativeModule,
  ChannelState,
  ChannelImportance,
} from './IncomingCallNativeModule';

// Storage keys
const STORAGE_KEYS = {
  CHANNEL_WARNING_DISMISSED: '@tander_channel_warning_dismissed',
  LAST_CHANNEL_CHECK: '@tander_last_channel_check',
};

// Channel IDs
export const CHANNEL_IDS = {
  INCOMING_CALLS: 'tander_incoming_calls',
  CALLS: 'tander_calls',
  MESSAGES: 'tander_messages',
  MATCHES: 'tander_matches',
  REMINDERS: 'tander_reminders',
} as const;

export type ChannelId = typeof CHANNEL_IDS[keyof typeof CHANNEL_IDS];

// Channel issue types
export type ChannelIssue =
  | 'channel_disabled'
  | 'low_importance'
  | 'sound_disabled'
  | 'vibration_disabled'
  | 'dnd_blocked'
  | 'channel_not_found';

export interface ChannelIssueInfo {
  issue: ChannelIssue;
  channelId: ChannelId;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  action: () => void;
}

/**
 * Channel Monitor Service
 */
class ChannelMonitorService {
  private channelStates: Map<ChannelId, ChannelState> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Check if monitoring is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && incomingCallNativeModule.isAvailable();
  }

  /**
   * Initialize the service and ensure channels exist
   */
  async initialize(): Promise<void> {
    if (!this.isAvailable()) {
      console.log('[ChannelMonitor] Not available on this platform');
      return;
    }

    // Ensure the notification channel exists
    incomingCallNativeModule.ensureNotificationChannel();

    // Perform initial check
    await this.checkAllChannels();
  }

  /**
   * Check all notification channels
   */
  async checkAllChannels(): Promise<Map<ChannelId, ChannelState>> {
    if (!this.isAvailable()) {
      return new Map();
    }

    const channelIds = Object.values(CHANNEL_IDS);

    for (const channelId of channelIds) {
      try {
        const state = await incomingCallNativeModule.getChannelState(channelId);
        this.channelStates.set(channelId, state);
        console.log(`[ChannelMonitor] Channel ${channelId}:`, state);
      } catch (error) {
        console.warn(`[ChannelMonitor] Failed to check channel ${channelId}:`, error);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_CHANNEL_CHECK, String(Date.now()));

    return this.channelStates;
  }

  /**
   * Check a specific channel
   */
  async checkChannel(channelId: ChannelId): Promise<ChannelState | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const state = await incomingCallNativeModule.getChannelState(channelId);
      this.channelStates.set(channelId, state);
      return state;
    } catch (error) {
      console.warn(`[ChannelMonitor] Failed to check channel ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Get cached channel state
   */
  getChannelState(channelId: ChannelId): ChannelState | undefined {
    return this.channelStates.get(channelId);
  }

  /**
   * Check if the incoming calls channel is properly configured
   */
  async isIncomingCallsChannelOK(): Promise<boolean> {
    const state = await this.checkChannel(CHANNEL_IDS.INCOMING_CALLS);
    if (!state) return false;

    return (
      state.exists &&
      state.enabled &&
      state.importance >= ChannelImportance.HIGH
    );
  }

  /**
   * Get issues with the incoming calls channel
   */
  async getIncomingCallsChannelIssues(): Promise<ChannelIssueInfo[]> {
    const issues: ChannelIssueInfo[] = [];
    const state = await this.checkChannel(CHANNEL_IDS.INCOMING_CALLS);

    if (!state) {
      return issues;
    }

    if (!state.exists) {
      issues.push({
        issue: 'channel_not_found',
        channelId: CHANNEL_IDS.INCOMING_CALLS,
        description: 'The incoming calls notification channel does not exist. Please restart the app.',
        severity: 'critical',
        action: () => incomingCallNativeModule.ensureNotificationChannel(),
      });
      return issues;
    }

    if (!state.enabled) {
      issues.push({
        issue: 'channel_disabled',
        channelId: CHANNEL_IDS.INCOMING_CALLS,
        description: 'Incoming call notifications are disabled. You will not receive call alerts.',
        severity: 'critical',
        action: () => incomingCallNativeModule.openChannelSettings(CHANNEL_IDS.INCOMING_CALLS),
      });
    }

    if (state.importance < ChannelImportance.HIGH) {
      issues.push({
        issue: 'low_importance',
        channelId: CHANNEL_IDS.INCOMING_CALLS,
        description: 'Incoming call notifications are set to low priority. Calls may not ring properly.',
        severity: 'critical',
        action: () => incomingCallNativeModule.openChannelSettings(CHANNEL_IDS.INCOMING_CALLS),
      });
    }

    if (!state.sound) {
      issues.push({
        issue: 'sound_disabled',
        channelId: CHANNEL_IDS.INCOMING_CALLS,
        description: 'Incoming call notification sounds are disabled. You may not hear incoming calls.',
        severity: 'warning',
        action: () => incomingCallNativeModule.openChannelSettings(CHANNEL_IDS.INCOMING_CALLS),
      });
    }

    if (!state.vibration) {
      issues.push({
        issue: 'vibration_disabled',
        channelId: CHANNEL_IDS.INCOMING_CALLS,
        description: 'Incoming call vibration is disabled.',
        severity: 'info',
        action: () => incomingCallNativeModule.openChannelSettings(CHANNEL_IDS.INCOMING_CALLS),
      });
    }

    if (!state.bypassDnd) {
      issues.push({
        issue: 'dnd_blocked',
        channelId: CHANNEL_IDS.INCOMING_CALLS,
        description: 'Incoming calls cannot bypass Do Not Disturb mode.',
        severity: 'warning',
        action: () => incomingCallNativeModule.openChannelSettings(CHANNEL_IDS.INCOMING_CALLS),
      });
    }

    return issues;
  }

  /**
   * Get issues with the messages channel
   */
  async getMessagesChannelIssues(): Promise<ChannelIssueInfo[]> {
    const issues: ChannelIssueInfo[] = [];
    const state = await this.checkChannel(CHANNEL_IDS.MESSAGES);

    if (!state) {
      return issues;
    }

    if (!state.exists || !state.enabled) {
      issues.push({
        issue: 'channel_disabled',
        channelId: CHANNEL_IDS.MESSAGES,
        description: 'Message notifications are disabled. You will not receive message alerts.',
        severity: 'warning',
        action: () => incomingCallNativeModule.openChannelSettings(CHANNEL_IDS.MESSAGES),
      });
    }

    return issues;
  }

  /**
   * Check if app notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    if (!this.isAvailable()) return true;
    return incomingCallNativeModule.areNotificationsEnabled();
  }

  /**
   * Open notification settings
   */
  openNotificationSettings(): void {
    if (!this.isAvailable()) return;
    incomingCallNativeModule.openNotificationSettings();
  }

  /**
   * Open channel settings
   */
  openChannelSettings(channelId: ChannelId): void {
    if (!this.isAvailable()) return;
    incomingCallNativeModule.openChannelSettings(channelId);
  }

  /**
   * Check if warning was dismissed
   */
  async isWarningDismissed(channelId: ChannelId): Promise<boolean> {
    const key = `${STORAGE_KEYS.CHANNEL_WARNING_DISMISSED}_${channelId}`;
    const dismissed = await AsyncStorage.getItem(key);
    return dismissed === 'true';
  }

  /**
   * Dismiss warning for a channel
   */
  async dismissWarning(channelId: ChannelId): Promise<void> {
    const key = `${STORAGE_KEYS.CHANNEL_WARNING_DISMISSED}_${channelId}`;
    await AsyncStorage.setItem(key, 'true');
  }

  /**
   * Reset all dismissed warnings
   */
  async resetDismissedWarnings(): Promise<void> {
    const channelIds = Object.values(CHANNEL_IDS);
    for (const channelId of channelIds) {
      const key = `${STORAGE_KEYS.CHANNEL_WARNING_DISMISSED}_${channelId}`;
      await AsyncStorage.removeItem(key);
    }
  }

  /**
   * Start periodic checking (optional)
   */
  startPeriodicCheck(intervalMs: number = 60000): void {
    this.stopPeriodicCheck();
    this.checkInterval = setInterval(() => {
      this.checkAllChannels();
    }, intervalMs);
  }

  /**
   * Stop periodic checking
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopPeriodicCheck();
    this.channelStates.clear();
  }
}

// Export singleton instance
export const channelMonitorService = new ChannelMonitorService();

export default channelMonitorService;
